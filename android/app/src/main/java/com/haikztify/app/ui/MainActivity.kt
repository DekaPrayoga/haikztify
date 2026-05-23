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
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.webkit.*
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import com.haikztify.app.BuildConfig
import com.haikztify.app.R
import com.haikztify.app.service.AudioBridge
import com.haikztify.app.service.AudioPlaybackService
import kotlinx.coroutines.*

class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "MainActivity"
        private val WEB_URL: String = BuildConfig.WEB_URL.ifBlank { "" }
        private const val MAX_RETRY_DELAY_MS = 8_000L
    }

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var setupView: FrameLayout

    // Offline/error overlay (inflated lazily)
    private var errorView: View? = null

    private var audioService: AudioPlaybackService? = null
    private var audioBridge: AudioBridge? = null
    private var serviceBound = false
    private val mainScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    private var positionUpdateJob: Job? = null
    private var retryJob: Job? = null
    private var retryCount = 0

    // ── Service connection ──────────────────────────────────────────────────
    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
            val localBinder = binder as? AudioPlaybackService.LocalBinder ?: return
            audioService = localBinder.getService()
            serviceBound = true
            Log.d(TAG, "AudioService connected")

            audioService?.onTrackEnded = { audioBridge?.notifyTrackEnded() }
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

    // ── Notification permission launcher ───────────────────────────────────
    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> Log.d(TAG, "Notification permission: $granted") }

    // ── onCreate ────────────────────────────────────────────────────────────
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Edge-to-edge
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.BLACK
        window.navigationBarColor = Color.BLACK

        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        setupView = findViewById(R.id.setupView)

        requestNotificationPermission()
        startAndBindAudioService()

        // ── Back press (modern API — replaces deprecated onBackPressed()) ──
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    webView.canGoBack() -> webView.goBack()
                    else -> moveTaskToBack(true) // keep music playing
                }
            }
        })

        if (WEB_URL.isBlank()) {
            showSetupScreen()
        } else {
            setupView.visibility = View.GONE
            setupWebView()
            loadUrl()
        }
    }

    // ── Audio service lifecycle ─────────────────────────────────────────────
    private fun startAndBindAudioService() {
        val intent = Intent(this, AudioPlaybackService::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
            bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start audio service: ${e.message}")
        }
    }

    // ── WebView setup ───────────────────────────────────────────────────────
    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.visibility = View.VISIBLE

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
            userAgentString = "$userAgentString HaikztifyApp/1.0"
            @Suppress("DEPRECATION")
            setRenderPriority(WebSettings.RenderPriority.HIGH)
        }
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                progressBar.visibility = View.VISIBLE
                hideErrorView()
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                progressBar.visibility = View.GONE
                retryCount = 0
                retryJob?.cancel()
                injectAudioBridge()
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.startsWith(WEB_URL) || url.startsWith("javascript:")) return false
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url)))
                    true
                } catch (e: Exception) {
                    Log.w(TAG, "Cannot open external URL: $url")
                    true
                }
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request?.isForMainFrame != true) return
                val desc = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
                    error?.description?.toString() ?: "Unknown error"
                else "Network error"
                Log.e(TAG, "WebView main-frame error: $desc")
                progressBar.visibility = View.GONE
                showErrorViewAndScheduleRetry()
            }

            // API < 23 fallback
            @Suppress("OVERRIDE_DEPRECATION")
            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) return
                Log.e(TAG, "WebView error $errorCode: $description")
                progressBar.visibility = View.GONE
                showErrorViewAndScheduleRetry()
            }

            override fun onReceivedHttpError(
                view: WebView?,
                request: WebResourceRequest?,
                errorResponse: HttpErrorResponse?
            ) {
                if (request?.isForMainFrame != true) return
                val code = errorResponse?.statusCode ?: 0
                Log.w(TAG, "HTTP error $code on main frame")
                if (code >= 500) showErrorViewAndScheduleRetry()
            }

            override fun onReceivedSslError(
                view: WebView?,
                handler: SslErrorHandler?,
                error: android.net.http.SslError?
            ) {
                // Reject SSL errors — do NOT call handler.proceed() in production
                handler?.cancel()
                Log.e(TAG, "SSL error: ${error?.primaryError}")
                showErrorViewAndScheduleRetry()
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                if (newProgress >= 100) progressBar.visibility = View.GONE
            }

            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                if (BuildConfig.DEBUG) {
                    Log.d("WebView", "${consoleMessage?.message()} [${consoleMessage?.lineNumber()}]")
                }
                return true
            }

            // Allow file chooser (needed for file upload inside WebView)
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<android.net.Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean = false // handled by default; return false = use system chooser
        }

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    // ── Load URL with network check ─────────────────────────────────────────
    private fun loadUrl() {
        if (!isNetworkAvailable()) {
            showErrorViewAndScheduleRetry()
            return
        }
        webView.loadUrl(WEB_URL)
    }

    private fun isNetworkAvailable(): Boolean {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = cm.activeNetwork ?: return false
            val caps = cm.getNetworkCapabilities(network) ?: return false
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        } else {
            @Suppress("DEPRECATION")
            cm.activeNetworkInfo?.isConnected == true
        }
    }

    // ── Error view & retry ──────────────────────────────────────────────────
    private fun showErrorViewAndScheduleRetry() {
        showErrorView()
        retryJob?.cancel()
        retryCount++
        // Exponential back-off capped at MAX_RETRY_DELAY_MS
        val delay = minOf(1_500L * (1 shl (retryCount - 1).coerceAtMost(3)), MAX_RETRY_DELAY_MS)
        Log.d(TAG, "Scheduling retry #$retryCount in ${delay}ms")
        retryJob = mainScope.launch {
            delay(delay)
            if (isNetworkAvailable()) {
                hideErrorView()
                loadUrl()
            } else {
                showErrorViewAndScheduleRetry()
            }
        }
    }

    private fun showErrorView() {
        setupView.visibility = View.VISIBLE

        val msg = if (isNetworkAvailable())
            "Gagal memuat halaman.\nCek koneksi internetmu."
        else
            "Tidak ada koneksi internet.\nPastikan WiFi atau data aktif."

        try {
            setupView.findViewById<TextView>(R.id.setupText)?.text = msg
        } catch (_: Exception) {}

        val retryAction = {
            retryJob?.cancel()
            retryCount = 0
            hideErrorView()
            loadUrl()
        }

        // Tap anywhere on overlay = retry
        setupView.setOnClickListener { retryAction() }

        // Tap the Retry button specifically
        try {
            setupView.findViewById<TextView>(R.id.retryButton)?.setOnClickListener { retryAction() }
        } catch (_: Exception) {}
    }

    private fun hideErrorView() {
        setupView.visibility = View.GONE
        setupView.setOnClickListener(null)
        try {
            setupView.findViewById<TextView>(R.id.retryButton)?.setOnClickListener(null)
        } catch (_: Exception) {}
    }

    // ── Setup screen (blank WEB_URL) ────────────────────────────────────────
    private fun showSetupScreen() {
        setupView.visibility = View.VISIBLE
        webView.visibility = View.GONE
        progressBar.visibility = View.GONE
    }

    // ── JS Audio Bridge injection ────────────────────────────────────────────
    private fun injectAudioBridge() {
        val js = buildAudioBridgeJs()
        try {
            webView.evaluateJavascript(js, null)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to inject audio bridge: ${e.message}")
        }
    }

    private fun buildAudioBridgeJs(): String = """
        (function() {
            if (window.__haikztifyBridgeInjected) return;
            window.__haikztifyBridgeInjected = true;
            console.log('[Haikztify] Injecting native audio bridge...');

            window.__setTrackMeta = function(title, artist, cover) {
                if (window.NativeAudio && window.NativeAudio.setTrackMeta) {
                    try { window.NativeAudio.setTrackMeta(title || 'Unknown', artist || 'Unknown', cover || ''); }
                    catch(e) { console.warn('[Haikztify] setTrackMeta failed:', e); }
                }
            };

            class FakeAudio {
                constructor(src) {
                    this._src = src || '';
                    this._volume = 1.0;
                    this._paused = true;
                    this._currentTime = 0;
                    this._duration = 0;
                    this._eventListeners = {};
                    this._readyState = 0;

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
                    setTimeout(() => {
                        this._readyState = 4;
                        this._fireEvent('canplay');
                        this._fireEvent('loadedmetadata');
                    }, 50);
                }

                get volume() { return this._volume; }
                set volume(val) {
                    this._volume = val;
                    if (window.NativeAudio && window.NativeAudio.setVolume) {
                        try { window.NativeAudio.setVolume(val); } catch(e) {}
                    }
                }

                get currentTime() { return this._currentTime; }
                set currentTime(val) {
                    this._currentTime = val;
                    if (window.NativeAudio && window.NativeAudio.seekTo) {
                        try { window.NativeAudio.seekTo(Math.floor(val * 1000)); } catch(e) {}
                    }
                }

                get duration() { return this._duration; }
                get paused() { return this._paused; }
                get readyState() { return this._readyState; }
                get ended() { return false; }

                play() {
                    if (!window.NativeAudio) return Promise.reject(new Error('NativeAudio not available'));
                    try {
                        if (this._src && this._paused) {
                            window.NativeAudio.play(this._src);
                        } else if (!this._paused || !this._src) {
                            if (window.NativeAudio.resume) window.NativeAudio.resume();
                        }
                        this._paused = false;
                        this._fireEvent('play');
                        return Promise.resolve();
                    } catch(e) {
                        return Promise.reject(e);
                    }
                }

                pause() {
                    if (window.NativeAudio && window.NativeAudio.pause) {
                        try { window.NativeAudio.pause(); } catch(e) {}
                    }
                    this._paused = true;
                    this._fireEvent('pause');
                }

                load() {
                    this._readyState = 4;
                    this._fireEvent('canplay');
                }

                addEventListener(event, callback) {
                    if (!this._eventListeners[event]) this._eventListeners[event] = [];
                    this._eventListeners[event].push(callback);
                }

                removeEventListener(event, callback) {
                    if (this._eventListeners[event]) {
                        this._eventListeners[event] = this._eventListeners[event].filter(cb => cb !== callback);
                    }
                }

                _fireEvent(event) {
                    const handler = this['on' + event];
                    if (typeof handler === 'function') {
                        try { handler.call(this); } catch(e) { console.error('[FakeAudio] on' + event, e); }
                    }
                    (this._eventListeners[event] || []).forEach(cb => {
                        try { cb.call(this, { type: event, target: this }); }
                        catch(e) { console.error('[FakeAudio] listener error on ' + event, e); }
                    });
                }

                cloneNode() { return new FakeAudio(this._src); }
                canPlayType() { return 'probably'; }
            }

            window.Audio = function(src) { return new FakeAudio(src); };

            const origCreateElement = document.createElement.bind(document);
            document.createElement = function(tag, options) {
                if (typeof tag === 'string' && tag.toLowerCase() === 'audio') return new FakeAudio();
                return origCreateElement(tag, options);
            };

            console.log('[Haikztify] Native audio bridge ready \u2713');
        })();
    """.trimIndent()

    // ── Position polling ─────────────────────────────────────────────────────
    private fun startPositionUpdates() {
        stopPositionUpdates()
        positionUpdateJob = mainScope.launch {
            while (isActive) {
                try {
                    audioService?.let { svc ->
                        audioBridge?.notifyPositionUpdate(
                            svc.getCurrentPositionMs(),
                            svc.getDurationMs()
                        )
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Position update error: ${e.message}")
                }
                delay(500)
            }
        }
    }

    private fun stopPositionUpdates() {
        positionUpdateJob?.cancel()
        positionUpdateJob = null
    }

    // ── Permissions ──────────────────────────────────────────────────────────
    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────
    override fun onResume() {
        super.onResume()
        if (audioService?.isPlaying() == true) startPositionUpdates()
    }

    override fun onPause() {
        super.onPause()
        // Music keeps playing via AudioPlaybackService — don't stop anything
    }

    override fun onDestroy() {
        retryJob?.cancel()
        mainScope.cancel()
        stopPositionUpdates()
        if (serviceBound) {
            try { unbindService(serviceConnection) } catch (_: Exception) {}
            serviceBound = false
        }
        try { webView.stopLoading(); webView.destroy() } catch (_: Exception) {}
        super.onDestroy()
    }
}
