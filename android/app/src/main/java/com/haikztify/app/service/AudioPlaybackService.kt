package com.haikztify.app.service

import android.app.Notification
import android.app.PendingIntent
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Binder
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import com.haikztify.app.HaikztifyApp
import com.haikztify.app.R
import com.haikztify.app.ui.MainActivity
import kotlinx.coroutines.*
import java.net.URL

class AudioPlaybackService : MediaSessionService() {

    companion object {
        private const val TAG = "AudioPlaybackService"
        private const val NOTIFICATION_ID = 1001
    }

    private var mediaSession: MediaSession? = null
    private var exoPlayer: ExoPlayer? = null
    private val binder = LocalBinder()
    private val serviceScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    // Track info for notification
    private var currentTitle: String = "Haikztify"
    private var currentArtist: String = "Unknown Artist"
    private var currentArtworkUrl: String = ""
    private var currentArtworkBitmap: Bitmap? = null

    // Callback to WebView
    var onTrackEnded: (() -> Unit)? = null
    var onPlayStateChanged: ((Boolean) -> Unit)? = null

    inner class LocalBinder : Binder() {
        fun getService(): AudioPlaybackService = this@AudioPlaybackService
    }

    override fun onBind(intent: Intent?): IBinder? {
        // If it's MediaSessionService binding, let parent handle it
        val superBinder = super.onBind(intent)
        return superBinder ?: binder
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service created")

        exoPlayer = ExoPlayer.Builder(this)
            .setHandleAudioBecomingNoisy(true)  // Pause when headphones disconnected
            .setWakeMode(androidx.media3.common.C.WAKE_MODE_NETWORK)  // Keep WiFi alive
            .build()
            .apply {
                addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(playbackState: Int) {
                        when (playbackState) {
                            Player.STATE_ENDED -> {
                                Log.d(TAG, "Track ended, calling onTrackEnded")
                                onTrackEnded?.invoke()
                            }
                            Player.STATE_READY -> {
                                updateNotification()
                            }
                        }
                    }

                    override fun onIsPlayingChanged(isPlaying: Boolean) {
                        onPlayStateChanged?.invoke(isPlaying)
                        updateNotification()
                    }
                })
            }

        val sessionActivityPendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        mediaSession = MediaSession.Builder(this, exoPlayer!!)
            .setSessionActivity(sessionActivityPendingIntent)
            .build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    // ========== Public API for WebView bridge ==========

    fun playUrl(url: String) {
        Log.d(TAG, "playUrl: $url")
        exoPlayer?.let { player ->
            val mediaItem = MediaItem.Builder()
                .setUri(url)
                .setMediaMetadata(
                    MediaMetadata.Builder()
                        .setTitle(currentTitle)
                        .setArtist(currentArtist)
                        .build()
                )
                .build()
            player.setMediaItem(mediaItem)
            player.prepare()
            player.play()
            startForegroundNotification()
        }
    }

    fun setTrackMeta(title: String, artist: String, artworkUrl: String) {
        currentTitle = title
        currentArtist = artist
        currentArtworkUrl = artworkUrl
        // Load artwork async
        if (artworkUrl.isNotBlank()) {
            serviceScope.launch(Dispatchers.IO) {
                try {
                    val stream = URL(artworkUrl).openStream()
                    currentArtworkBitmap = BitmapFactory.decodeStream(stream)
                    stream.close()
                    withContext(Dispatchers.Main) {
                        updateNotification()
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to load artwork: ${e.message}")
                }
            }
        }
    }

    fun pausePlayback() {
        exoPlayer?.pause()
    }

    fun resumePlayback() {
        exoPlayer?.play()
    }

    fun seekTo(positionMs: Long) {
        exoPlayer?.seekTo(positionMs)
    }

    fun setVolume(volume: Float) {
        exoPlayer?.volume = volume.coerceIn(0f, 1f)
    }

    fun isPlaying(): Boolean = exoPlayer?.isPlaying == true

    fun getCurrentPositionMs(): Long = exoPlayer?.currentPosition ?: 0

    fun getDurationMs(): Long = exoPlayer?.duration ?: 0

    fun stopPlayback() {
        exoPlayer?.stop()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    // ========== Notification ==========

    private fun startForegroundNotification() {
        val notification = buildNotification()
        startForeground(NOTIFICATION_ID, notification)
    }

    private fun updateNotification() {
        try {
            val notification = buildNotification()
            val manager = getSystemService(android.app.NotificationManager::class.java)
            manager.notify(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to update notification: ${e.message}")
        }
    }

    private fun buildNotification(): Notification {
        val contentIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val isPlaying = exoPlayer?.isPlaying == true

        val builder = NotificationCompat.Builder(this, HaikztifyApp.CHANNEL_ID)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setSmallIcon(R.drawable.ic_music_note)
            .setContentIntent(contentIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(isPlaying)
            .setSilent(true)
            .setStyle(
                androidx.media3.session.MediaStyleNotificationHelper.MediaStyle(mediaSession!!)
            )

        // Album art
        currentArtworkBitmap?.let {
            builder.setLargeIcon(it)
        }

        return builder.build()
    }

    // ========== Lifecycle ==========

    override fun onDestroy() {
        serviceScope.cancel()
        mediaSession?.run {
            player.release()
            release()
        }
        mediaSession = null
        exoPlayer = null
        super.onDestroy()
        Log.d(TAG, "Service destroyed")
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        // Keep playing when app is swiped away
        val player = mediaSession?.player
        if (player != null && player.playWhenReady) {
            // Keep the service running
            Log.d(TAG, "Task removed but still playing, keeping service alive")
        } else {
            stopSelf()
        }
    }
}
