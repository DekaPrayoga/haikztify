package com.haikztify.app.service

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView

/**
 * JavaScript ↔ Native bridge.
 *
 * From JS: window.NativeAudio.play(url), .pause(), .resume(), etc.
 * From Kotlin: evaluateJavascript() callbacks into the WebView.
 */
class AudioBridge(
    private val webView: WebView,
    private val getService: () -> AudioPlaybackService?
) {
    companion object {
        private const val TAG = "AudioBridge"
    }

    private val mainHandler = Handler(Looper.getMainLooper())

    // ========== JS → Native ==========

    @JavascriptInterface
    fun play(url: String) {
        Log.d(TAG, "JS → play: $url")
        mainHandler.post {
            getService()?.playUrl(url)
        }
    }

    @JavascriptInterface
    fun pause() {
        Log.d(TAG, "JS → pause")
        mainHandler.post {
            getService()?.pausePlayback()
        }
    }

    @JavascriptInterface
    fun resume() {
        Log.d(TAG, "JS → resume")
        mainHandler.post {
            getService()?.resumePlayback()
        }
    }

    @JavascriptInterface
    fun seekTo(positionMs: Long) {
        mainHandler.post {
            getService()?.seekTo(positionMs)
        }
    }

    @JavascriptInterface
    fun setVolume(volume: Float) {
        mainHandler.post {
            getService()?.setVolume(volume)
        }
    }

    @JavascriptInterface
    fun setTrackMeta(title: String, artist: String, artworkUrl: String) {
        Log.d(TAG, "JS → setTrackMeta: $title - $artist")
        mainHandler.post {
            getService()?.setTrackMeta(title, artist, artworkUrl)
        }
    }

    @JavascriptInterface
    fun stop() {
        mainHandler.post {
            getService()?.stopPlayback()
        }
    }

    @JavascriptInterface
    fun isPlaying(): Boolean {
        return getService()?.isPlaying() == true
    }

    @JavascriptInterface
    fun getCurrentPosition(): Long {
        return getService()?.getCurrentPositionMs() ?: 0
    }

    @JavascriptInterface
    fun getDuration(): Long {
        return getService()?.getDurationMs() ?: 0
    }

    // ========== Native → JS ==========

    fun notifyTrackEnded() {
        mainHandler.post {
            webView.evaluateJavascript("window.__onNativeTrackEnded && window.__onNativeTrackEnded()", null)
        }
    }

    fun notifyPlayStateChanged(isPlaying: Boolean) {
        mainHandler.post {
            webView.evaluateJavascript(
                "window.__onNativePlayStateChanged && window.__onNativePlayStateChanged($isPlaying)", null
            )
        }
    }

    fun notifyPositionUpdate(posMs: Long, durationMs: Long) {
        mainHandler.post {
            webView.evaluateJavascript(
                "window.__onNativePositionUpdate && window.__onNativePositionUpdate($posMs, $durationMs)", null
            )
        }
    }
}
