package com.haikztify.app.service

import android.app.Notification
import android.app.PendingIntent
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
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

    private var currentTitle: String = "Haikztify"
    private var currentArtist: String = "Unknown Artist"
    private var currentArtworkUrl: String = ""
    private var currentArtworkBitmap: Bitmap? = null

    var onTrackEnded: (() -> Unit)? = null
    var onPlayStateChanged: ((Boolean) -> Unit)? = null

    inner class LocalBinder : Binder() {
        fun getService(): AudioPlaybackService = this@AudioPlaybackService
    }

    override fun onBind(intent: Intent?): IBinder? {
        return super.onBind(intent) ?: binder
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service created")

        val player = ExoPlayer.Builder(this)
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(androidx.media3.common.C.WAKE_MODE_NETWORK)
            .build()

        player.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                when (playbackState) {
                    Player.STATE_ENDED -> {
                        Log.d(TAG, "Track ended")
                        onTrackEnded?.invoke()
                    }
                    Player.STATE_READY -> updateNotificationSafe()
                    Player.STATE_IDLE, Player.STATE_BUFFERING -> { /* no-op */ }
                }
            }

            override fun onIsPlayingChanged(isPlaying: Boolean) {
                onPlayStateChanged?.invoke(isPlaying)
                updateNotificationSafe()
            }

            override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                Log.e(TAG, "ExoPlayer error: ${error.message}")
                // Notify JS so it can advance to next track
                onTrackEnded?.invoke()
            }
        })

        exoPlayer = player

        val sessionActivityIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        mediaSession = MediaSession.Builder(this, player)
            .setSessionActivity(sessionActivityIntent)
            .build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = mediaSession

    // ── Public API ────────────────────────────────────────────────────────────

    fun playUrl(url: String) {
        val player = exoPlayer ?: return
        Log.d(TAG, "playUrl: ${url.take(80)}")
        try {
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
            startForegroundNotificationSafe()
        } catch (e: Exception) {
            Log.e(TAG, "playUrl error: ${e.message}")
        }
    }

    fun setTrackMeta(title: String, artist: String, artworkUrl: String) {
        currentTitle = title.ifBlank { "Haikztify" }
        currentArtist = artist.ifBlank { "Unknown Artist" }
        currentArtworkUrl = artworkUrl

        if (artworkUrl.isNotBlank()) {
            serviceScope.launch(Dispatchers.IO) {
                try {
                    val stream = URL(artworkUrl).openStream()
                    val bitmap = BitmapFactory.decodeStream(stream)
                    stream.close()
                    withContext(Dispatchers.Main) {
                        currentArtworkBitmap = bitmap
                        updateNotificationSafe()
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to load artwork: ${e.message}")
                }
            }
        } else {
            currentArtworkBitmap = null
        }
    }

    fun pausePlayback() { exoPlayer?.pause() }
    fun resumePlayback() { exoPlayer?.play() }

    fun seekTo(positionMs: Long) {
        try { exoPlayer?.seekTo(positionMs) }
        catch (e: Exception) { Log.w(TAG, "seekTo error: ${e.message}") }
    }

    fun setVolume(volume: Float) {
        exoPlayer?.volume = volume.coerceIn(0f, 1f)
    }

    fun isPlaying(): Boolean = exoPlayer?.isPlaying == true
    fun getCurrentPositionMs(): Long = exoPlayer?.currentPosition ?: 0L
    fun getDurationMs(): Long = exoPlayer?.duration.let { d -> if (d == null || d < 0) 0L else d }

    fun stopPlayback() {
        try {
            exoPlayer?.stop()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        } catch (e: Exception) {
            Log.w(TAG, "stopPlayback error: ${e.message}")
        }
    }

    // ── Notification ─────────────────────────────────────────────────────────

    private fun startForegroundNotificationSafe() {
        try {
            val notification = buildNotification()
            startForeground(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.e(TAG, "startForeground error: ${e.message}")
        }
    }

    private fun updateNotificationSafe() {
        try {
            val notification = buildNotification()
            val manager = getSystemService(android.app.NotificationManager::class.java)
            manager?.notify(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.w(TAG, "updateNotification error: ${e.message}")
        }
    }

    private fun buildNotification(): Notification {
        val session = mediaSession ?: throw IllegalStateException("MediaSession is null")

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
                androidx.media3.session.MediaStyleNotificationHelper.MediaStyle(session)
            )

        currentArtworkBitmap?.let { builder.setLargeIcon(it) }

        return builder.build()
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onTaskRemoved(rootIntent: Intent?) {
        val player = mediaSession?.player
        if (player != null && player.playWhenReady) {
            Log.d(TAG, "Task removed but still playing — keeping service alive")
        } else {
            stopSelf()
        }
    }

    override fun onDestroy() {
        serviceScope.cancel()
        try {
            mediaSession?.run {
                player.release()
                release()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error releasing mediaSession: ${e.message}")
        }
        mediaSession = null
        exoPlayer = null
        onTrackEnded = null
        onPlayStateChanged = null
        super.onDestroy()
        Log.d(TAG, "Service destroyed")
    }
}
