package com.haikztify.app.service

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import java.lang.ref.WeakReference

/**
 * JavaScript ↔ Native bridge.
 *
 * JS → Native: window.NativeAudio.play(url), .pause(), .resume(), etc.
 * Native → JS: evaluateJavascript() callbacks into the WebView.
 *
 * Uses WeakReference to WebView to prevent memory leaks.
 * All calls are try-caught to prevent crashes from JS bridge exceptions.
 */
class AudioBridge(
    webView: WebView,
    private val getService: () -> AudioPlaybackService?
) {
    companion object {
        private const val TAG = "AudioBridge"
    }

    // Weak ref so WebView can be GC'd if activity is destroyed
    private val webViewRef = WeakReference(webView)
    private val mainHandler = Handler(Looper.getMainLooper())

    // ── JS → Native ──────────────────────────────────────────────────────────

    @JavascriptInterface
    fun play(url: String) {
        if (url.isBlank()) {
            Log.w(TAG, "play() called with blank URL — ignoring")
            return
        }
        Log.d(TAG, "JS → play: ${url.take(80)}")
        mainHandler.post {
            try { getService()?.playUrl(url) }
            catch (e: Exception) { Log.e(TAG, "play error: ${e.message}") }
        }
    }

    @JavascriptInterface
    fun pause() {
        Log.d(TAG, "JS → pause")
        mainHandler.post {
            try { getService()?.pausePlayback() }
            catch (e: Exception) { Log.e(TAG, "pause error: ${e.message}") }
        }
    }

    @JavascriptInterface
    fun resume() {
        Log.d(TAG, "JS → resume")
        mainHandler.post {
            try { getService()?.resumePlayback() }
            catch (e: Exception) { Log.e(TAG, "resume error: ${e.message}") }
        }
    }

    @JavascriptInterface
    fun seekTo(positionMs: Long) {
        mainHandler.post {
            try { getService()?.seekTo(positionMs) }
            catch (e: Exception) { Log.e(TAG, "seekTo error: ${e.message}") }
        }
    }

    @JavascriptInterface
    fun setVolume(volume: Float) {
        mainHandler.post {
            try { getService()?.setVolume(volume) }
            catch (e: Exception) { Log.e(TAG, "setVolume error: ${e.message}") }
        }
    }

    @JavascriptInterface
    fun setTrackMeta(title: String, artist: String, artworkUrl: String) {
        Log.d(TAG, "JS → setTrackMeta: $title – $artist")
        mainHandler.post {
            try { getService()?.setTrackMeta(title, artist, artworkUrl) }
            catch (e: Exception) { Log.e(TAG, "setTrackMeta error: ${e.message}") }
        }
    }

    @JavascriptInterface
    fun stop() {
        mainHandler.post {
            try { getService()?.stopPlayback() }
            catch (e: Exception) { Log.e(TAG, "stop error: ${e.message}") }
        }
    }

    @JavascriptInterface
    fun isPlaying(): Boolean = try {
        getService()?.isPlaying() == true
    } catch (e: Exception) { false }

    @JavascriptInterface
    fun getCurrentPosition(): Long = try {
        getService()?.getCurrentPositionMs() ?: 0L
    } catch (e: Exception) { 0L }

    @JavascriptInterface
    fun getDuration(): Long = try {
        getService()?.getDurationMs() ?: 0L
    } catch (e: Exception) { 0L }

    // ── Native → JS ──────────────────────────────────────────────────────────

    fun notifyTrackEnded() {
        evaluateJs("window.__onNativeTrackEnded && window.__onNativeTrackEnded()")
    }

    fun notifyPlayStateChanged(isPlaying: Boolean) {
        evaluateJs("window.__onNativePlayStateChanged && window.__onNativePlayStateChanged($isPlaying)")
    }

    fun notifyPositionUpdate(posMs: Long, durationMs: Long) {
        evaluateJs("window.__onNativePositionUpdate && window.__onNativePositionUpdate($posMs, $durationMs)")
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun evaluateJs(js: String) {
        mainHandler.post {
            val wv = webViewRef.get()
            if (wv == null) {
                Log.w(TAG, "WebView GC'd — skipping JS eval")
                return@post
            }
            try {
                wv.evaluateJavascript(js, null)
            } catch (e: Exception) {
                Log.w(TAG, "evaluateJavascript error: ${e.message}")
            }
        }
    }
}
