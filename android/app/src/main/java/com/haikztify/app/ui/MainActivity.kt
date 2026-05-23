package com.haikztify.app.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.webkit.*
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.haikztify.app.BuildConfig
import com.haikztify.app.R
import com.haikztify.app.service.AudioBridge
import com.haikztify.app.service.AudioPlaybackService
import kotlinx.coroutines.*

class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "MainActivity"
        // ===== SET YOUR URL HERE =====
        private val WEB_URL: String = BuildConfig.WEB_URL.ifBlank {
            "" // Will show setup screen if empty
        }
    }

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var setupView: FrameLayout

    private var audioService: AudioPlaybackService? = null
    private var audioBridge: AudioBridge? = null
    private var serviceBound = false
    private val mainScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    // Position update job
    private var positionUpdateJob: Job? = null

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
            val localBinder = binder as? AudioPlaybackService.LocalBinder
            audioService = localBinder?.getService()
            serviceBound = true
            Log.d(TAG, "AudioService connected")

            // Wire up callbacks
            audioService?.onTrackEnded = {
                audioBridge?.notifyTrackEnded()
            }
            audioService?.onPlayStateChanged = { isPlaying ->
                audioBridge?.notifyPlayStateChanged(isPlaying)
                if (isPlaying) startPositionUpdates() else stopPositionUpdates()
            }
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            audioService = null
            serviceBound = false
            Log.d(TAG, "AudioService disconnected")
        }
    }

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        Log.d(TAG, "Notification permission granted: $granted")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Fullscreen immersive
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.BLACK
        window.navigationBarColor = Color.BLACK

        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        setupView = findViewById(R.id.setupView)

        // Request notification permission (Android 13+)
        requestNotificationPermission()

        // Start and bind audio service
        val serviceIntent = Intent(this, AudioPlaybackService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
        bindService(serviceIntent, serviceConnection, Context.BIND_AUTO_CREATE)

        if (WEB_URL.isBlank()) {
            showSetupScreen()
        } else {
            setupView.visibility = View.GONE
            setupWebView()
            webView.loadUrl(WEB_URL)
        }
    }

    private fun showSetupScreen() {
        setupView.visibility = View.VISIBLE
        webView.visibility = View.GONE
        progressBar.visibility = View.GONE
        // The setup screen layout tells the user to set the URL in build.gradle.kts
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.visibility = View.VISIBLE

        // Create bridge
        audioBridge = AudioBridge(webView) { audioService }
        webView.addJavascriptInterface(audioBridge!!, "NativeAudio")

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowContentAccess = true
            allowFileAccess = true
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            userAgentString = userAgentString + " HaikztifyApp/1.0"

            // Performance
            setRenderPriority(WebSettings.RenderPriority.HIGH)
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
        }

        // Enable remote debugging in debug builds
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                progressBar.visibility = View.GONE
                // Inject the audio bridge override script
                injectAudioBridge()
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                // Keep navigation inside WebView for same-origin
                if (url.startsWith(WEB_URL) || url.startsWith("javascript:")) {
                    return false
                }
                // Open external links in browser
                val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url))
                startActivity(intent)
                return true
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request?.isForMainFrame == true) {
                    Log.e(TAG, "WebView error: ${error?.description}")
                    // Show retry after 3 seconds
                    mainScope.launch {
                        delay(3000)
                        view?.loadUrl(WEB_URL)
                    }
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                if (newProgress >= 100) {
                    progressBar.visibility = View.GONE
                }
            }

            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                Log.d("WebView", "${consoleMessage?.message()} [${consoleMessage?.lineNumber()}]")
                return true
            }
        }

        // Keep screen on while playing (optional)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    /**
     * Inject JavaScript that intercepts HTML5 Audio and routes it through NativeAudio.
     * This is the key magic — the website's playerStore uses `new Audio()` and `.play()`,
     * and we transparently redirect those calls to ExoPlayer via the bridge.
     */
    private fun injectAudioBridge() {
        val js = """
        (function() {
            if (window.__haikztifyBridgeInjected) return;
            window.__haikztifyBridgeInjected = true;

            console.log('[Haikztify] Injecting native audio bridge...');

            // Store reference to real Audio for non-music sounds if needed
            const RealAudio = window.Audio;

            // Track metadata setter (called from playerStore patch)
            window.__setTrackMeta = function(title, artist, cover) {
                if (window.NativeAudio) {
                    window.NativeAudio.setTrackMeta(title || 'Unknown', artist || 'Unknown', cover || '');
                }
            };

            // Fake Audio class that proxies to NativeAudio
            class FakeAudio {
                constructor(src) {
                    this._src = src || '';
                    this._volume = 1.0;
                    this._paused = true;
                    this._currentTime = 0;
                    this._duration = 0;
                    this._eventListeners = {};
                    this._readyState = 0;

                    // Register for native callbacks
                    window.__onNativeTrackEnded = () => {
                        this._paused = true;
                        this._fireEvent('ended');
                    };
                    window.__onNativePlayStateChanged = (isPlaying) => {
                        this._paused = !isPlaying;
                        this._fireEvent(isPlaying ? 'play' : 'pause');
                    };
                    window.__onNativePositionUpdate = (posMs, durMs) => {
                        this._currentTime = posMs / 1000;
                        this._duration = durMs / 1000;
                        this._fireEvent('timeupdate');
                    };
                }

                get src() { return this._src; }
                set src(val) {
                    this._src = val;
                    this._readyState = 0;
                    // Don't auto-play on src set; wait for .play()
                    setTimeout(() => {
                        this._readyState = 4;
                        this._fireEvent('canplay');
                        this._fireEvent('loadedmetadata');
                    }, 50);
                }

                get volume() { return this._volume; }
                set volume(val) {
                    this._volume = val;
                    if (window.NativeAudio) {
                        window.NativeAudio.setVolume(val);
                    }
                }

                get currentTime() { return this._currentTime; }
                set currentTime(val) {
                    this._currentTime = val;
                    if (window.NativeAudio) {
                        window.NativeAudio.seekTo(Math.floor(val * 1000));
                    }
                }

                get duration() { return this._duration; }
                get paused() { return this._paused; }
                get readyState() { return this._readyState; }
                get ended() { return false; }

                play() {
                    if (window.NativeAudio && this._src) {
                        if (this._paused && this._src) {
                            window.NativeAudio.play(this._src);
                        } else {
                            window.NativeAudio.resume();
                        }
                        this._paused = false;
                        this._fireEvent('play');
                        return Promise.resolve();
                    }
                    return Promise.reject('NativeAudio not available');
                }

                pause() {
                    if (window.NativeAudio) {
                        window.NativeAudio.pause();
                    }
                    this._paused = true;
                    this._fireEvent('pause');
                }

                load() {
                    // No-op, native handles loading
                    this._readyState = 4;
                    this._fireEvent('canplay');
                }

                addEventListener(event, callback) {
                    if (!this._eventListeners[event]) {
                        this._eventListeners[event] = [];
                    }
                    this._eventListeners[event].push(callback);
                }

                removeEventListener(event, callback) {
                    if (this._eventListeners[event]) {
                        this._eventListeners[event] = this._eventListeners[event].filter(cb => cb !== callback);
                    }
                }

                _fireEvent(event) {
                    // on-handler
                    const handler = this['on' + event];
                    if (typeof handler === 'function') {
                        try { handler.call(this); } catch(e) { console.error(e); }
                    }
                    // addEventListener handlers
                    const listeners = this._eventListeners[event] || [];
                    listeners.forEach(cb => {
                        try { cb.call(this, { type: event, target: this }); } catch(e) { console.error(e); }
                    });
                }

                // Stubs
                cloneNode() { return new FakeAudio(this._src); }
                canPlayType(type) { return 'probably'; }
            }

            // Override global Audio constructor
            window.Audio = function(src) {
                return new FakeAudio(src);
            };

            // Also patch document.createElement for <audio> elements
            const origCreateElement = document.createElement.bind(document);
            document.createElement = function(tag, options) {
                if (tag.toLowerCase() === 'audio') {
                    return new FakeAudio();
                }
                return origCreateElement(tag, options);
            };

            console.log('[Haikztify] Native audio bridge ready ✓');
        })();
        """.trimIndent()

        webView.evaluateJavascript(js, null)
    }

    // ========== Position updates ==========

    private fun startPositionUpdates() {
        stopPositionUpdates()
        positionUpdateJob = mainScope.launch {
            while (isActive) {
                audioService?.let { service ->
                    audioBridge?.notifyPositionUpdate(
                        service.getCurrentPositionMs(),
                        service.getDurationMs()
                    )
                }
                delay(500) // Update every 500ms
            }
        }
    }

    private fun stopPositionUpdates() {
        positionUpdateJob?.cancel()
        positionUpdateJob = null
    }

    // ========== Permissions ==========

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this, Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    // ========== Lifecycle ==========

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            // Minimize app instead of closing (keep music playing)
            moveTaskToBack(true)
        }
    }

    override fun onDestroy() {
        mainScope.cancel()
        stopPositionUpdates()
        if (serviceBound) {
            unbindService(serviceConnection)
            serviceBound = false
        }
        webView.destroy()
        super.onDestroy()
    }

    // Don't stop service on pause — this is what enables background playback
    override fun onPause() {
        super.onPause()
        // Music keeps playing via AudioPlaybackService
    }

    override fun onResume() {
        super.onResume()
        // Resume position updates when app comes back to foreground
        if (audioService?.isPlaying() == true) {
            startPositionUpdates()
        }
    }
}
