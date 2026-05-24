package com.haikztify.app.service

import android.app.PendingIntent
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Binder
import android.os.IBinder
import android.util.Log
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import com.haikztify.app.ui.MainActivity
import kotlinx.coroutines.*
import java.net.URL

class AudioPlaybackService : MediaSessionService() {

    companion object {
        private const val TAG = "AudioPlaybackService"
    }

    private var mediaSession: MediaSession? = null
    private var exoPlayer: ExoPlayer? = null
    private val binder = LocalBinder()
    private val serviceScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    private var currentTitle: String = "HaikzTify"
    private var currentArtist: String = ""
    private var currentArtworkUrl: String = ""
    private var pendingPlay: String? = null

    var onTrackEnded: (() -> Unit)? = null
    var onPlayStateChanged: ((Boolean) -> Unit)? = null

    inner class LocalBinder : Binder() {
        fun getService(): AudioPlaybackService = this@AudioPlaybackService
    }

    override fun onBind(intent: Intent?): IBinder {
        val superBinder = super.onBind(intent)
        return superBinder ?: binder
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service created")

        exoPlayer = ExoPlayer.Builder(this)
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(androidx.media3.common.C.WAKE_MODE_NETWORK)
            .build()

        exoPlayer?.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                if (state == Player.STATE_ENDED) {
                    mainThread { onTrackEnded?.invoke() }
                }
            }
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                mainThread { onPlayStateChanged?.invoke(isPlaying) }
            }
        })

        val intent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        mediaSession = MediaSession.Builder(this, exoPlayer!!)
            .setSessionActivity(intent)
            .build()

        // Play any URL that was queued before service was ready
        pendingPlay?.let { url ->
            pendingPlay = null
            internalPlay(url)
        }
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = mediaSession

    // ── Public API called from AudioBridge ──────────────────────────────────

    fun playUrl(url: String) {
        if (exoPlayer == null) { pendingPlay = url; return }
        internalPlay(url)
    }

    private fun internalPlay(url: String) {
        val player = exoPlayer ?: return
        val item = MediaItem.Builder()
            .setUri(Uri.parse(url))
            .setMediaMetadata(
                MediaMetadata.Builder()
                    .setTitle(currentTitle)
                    .setArtist(currentArtist)
                    .build()
            )
            .build()
        player.setMediaItem(item)
        player.prepare()
        player.play()
    }

    fun setTrackMeta(title: String, artist: String, artworkUrl: String) {
        currentTitle = title
        currentArtist = artist
        currentArtworkUrl = artworkUrl
        // Update metadata on the current media item so notification refreshes
        val player = exoPlayer ?: return
        if (player.mediaItemCount == 0) return
        val uri = player.currentMediaItem?.localConfiguration?.uri ?: return
        val updated = MediaItem.Builder()
            .setUri(uri)
            .setMediaMetadata(
                MediaMetadata.Builder()
                    .setTitle(title)
                    .setArtist(artist)
                    .build()
            )
            .build()
        player.replaceMediaItem(0, updated)
        // Load artwork in background and set it
        if (artworkUrl.isNotBlank()) {
            serviceScope.launch(Dispatchers.IO) {
                try {
                    val bmp = URL(artworkUrl).openStream().use { BitmapFactory.decodeStream(it) }
                    withContext(Dispatchers.Main) { updateArtwork(bmp) }
                } catch (e: Exception) {
                    Log.w(TAG, "Artwork load failed: ${e.message}")
                }
            }
        }
    }

    private fun updateArtwork(bmp: Bitmap) {
        val player = exoPlayer ?: return
        if (player.mediaItemCount == 0) return
        val uri = player.currentMediaItem?.localConfiguration?.uri ?: return
        val updated = MediaItem.Builder()
            .setUri(uri)
            .setMediaMetadata(
                MediaMetadata.Builder()
                    .setTitle(currentTitle)
                    .setArtist(currentArtist)
                    .setArtworkData(bitmapToBytes(bmp), MediaMetadata.PICTURE_TYPE_FRONT_COVER)
                    .build()
            )
            .build()
        player.replaceMediaItem(0, updated)
    }

    private fun bitmapToBytes(bmp: Bitmap): ByteArray {
        val stream = java.io.ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.JPEG, 85, stream)
        return stream.toByteArray()
    }

    fun pausePlayback() { exoPlayer?.pause() }
    fun resumePlayback() { exoPlayer?.play() }
    fun stopPlayback() { exoPlayer?.stop(); exoPlayer?.clearMediaItems() }
    fun seekTo(positionMs: Long) { exoPlayer?.seekTo(positionMs) }
    fun setVolume(volume: Float) { exoPlayer?.volume = volume.coerceIn(0f, 1f) }
    fun isPlaying(): Boolean = exoPlayer?.isPlaying == true
    fun getCurrentPositionMs(): Long = exoPlayer?.currentPosition ?: 0
    fun getDurationMs(): Long = exoPlayer?.duration ?: 0

    private fun mainThread(block: () -> Unit) {
        serviceScope.launch(Dispatchers.Main) { block() }
    }

    // ── Lifecycle ───────────────────────────────────────────────────────────

    override fun onTaskRemoved(rootIntent: Intent?) {
        if (exoPlayer?.isPlaying != true) stopSelf()
    }

    override fun onDestroy() {
        serviceScope.cancel()
        try {
            mediaSession?.player?.release()
            mediaSession?.release()
        } catch (e: Exception) {
            Log.w(TAG, "Error releasing session: ${e.message}")
        }
        mediaSession = null
        exoPlayer = null
        super.onDestroy()
    }
}
