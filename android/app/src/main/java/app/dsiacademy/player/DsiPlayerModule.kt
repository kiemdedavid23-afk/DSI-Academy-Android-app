package app.dsiacademy.player

import android.app.PictureInPictureParams
import android.content.Intent
import android.content.pm.ActivityInfo
import android.net.Uri
import android.os.Build
import android.util.Rational
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.C
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.HttpDataSource
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

/** Pont JS ↔ Media3. Toutes les actions passent par le thread principal. L'adresse n'est jamais journalisée. */
@androidx.annotation.OptIn(markerClass = [UnstableApi::class])
class DsiPlayerModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  @Volatile private var lastError: String? = null
  private var listening = false

  override fun getName() = "DsiPlayer"

  private fun ui(block: () -> Unit) = UiThreadUI(block)
  private fun UiThreadUI(block: () -> Unit) = UiThreadUtil.runOnUiThread(block)

  private fun codeOf(e: PlaybackException): String {
    var cause: Throwable? = e
    while (cause != null) {
      if (cause is HttpDataSource.InvalidResponseCodeException) return "HTTP_${cause.responseCode}"
      cause = cause.cause
    }
    return when (e.errorCode) {
      PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED,
      PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT -> "NETWORK"
      PlaybackException.ERROR_CODE_PARSING_CONTAINER_MALFORMED,
      PlaybackException.ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED,
      PlaybackException.ERROR_CODE_DECODING_FAILED,
      PlaybackException.ERROR_CODE_DECODER_INIT_FAILED -> "UNSUPPORTED"
      else -> "PLAYER"
    }
  }

  @ReactMethod
  fun load(url: String, title: String, artist: String?, artwork: String?, startMs: Double, audioService: Boolean, promise: Promise) {
    ui {
      val p = PlayerHolder.get(ctx)
      if (!listening) {
        listening = true
        p.addListener(object : Player.Listener {
          override fun onPlayerError(error: PlaybackException) {
            lastError = codeOf(error)
          }
        })
      }
      lastError = null
      p.repeatMode = Player.REPEAT_MODE_OFF
      p.volume = 1f
      val meta = MediaMetadata.Builder().setTitle(title).setArtist(artist)
        .setArtworkUri(artwork?.let { Uri.parse(it) }).build()
      p.setMediaItem(MediaItem.Builder().setUri(url).setMediaMetadata(meta).build(), startMs.toLong())
      p.prepare()
      p.playWhenReady = true
      if (audioService) {
        ctx.startService(Intent(ctx, DsiPlaybackService::class.java))
      }
      promise.resolve(null)
    }
  }

  @ReactMethod fun play() = ui { PlayerHolder.get(ctx).play() }
  @ReactMethod fun pause() = ui { PlayerHolder.get(ctx).pause() }
  @ReactMethod fun seekTo(ms: Double) = ui { PlayerHolder.get(ctx).seekTo(ms.toLong()) }
  @ReactMethod fun setSpeed(speed: Double) = ui { PlayerHolder.get(ctx).setPlaybackSpeed(speed.toFloat()) }

  /** Lecture en boucle du contenu en cours. */
  @ReactMethod
  fun setLoop(enabled: Boolean) = ui {
    PlayerHolder.get(ctx).repeatMode = if (enabled) Player.REPEAT_MODE_ONE else Player.REPEAT_MODE_OFF
  }

  /** Volume du lecteur, de 0 (muet) à 1. */
  @ReactMethod
  fun setVolume(volume: Double) = ui {
    PlayerHolder.get(ctx).volume = volume.toFloat().coerceIn(0f, 1f)
  }

  /** Image dans l'image (Android 8 et plus), format 16:9. */
  @ReactMethod
  fun enterPip() {
    ui {
      val activity = ctx.currentActivity ?: return@ui
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        try {
          activity.enterPictureInPictureMode(
            PictureInPictureParams.Builder().setAspectRatio(Rational(16, 9)).build(),
          )
        } catch (_: IllegalStateException) {
          // Image dans l'image refusée par le système : on reste en lecture normale.
        }
      }
    }
  }

  @ReactMethod
  fun getState(promise: Promise) {
    ui {
      val p = PlayerHolder.get(ctx)
      val map = Arguments.createMap()
      map.putBoolean("playing", p.isPlaying)
      map.putString(
        "state",
        when (p.playbackState) {
          Player.STATE_BUFFERING -> "buffering"
          Player.STATE_READY -> "ready"
          Player.STATE_ENDED -> "ended"
          else -> "idle"
        },
      )
      map.putDouble("positionMs", p.currentPosition.toDouble())
      map.putDouble("durationMs", if (p.duration == C.TIME_UNSET) 0.0 else p.duration.toDouble())
      map.putDouble("speed", p.playbackParameters.speed.toDouble())
      if (lastError != null) map.putString("error", lastError) else map.putNull("error")
      promise.resolve(map)
    }
  }

  @ReactMethod
  fun setFullscreen(enabled: Boolean) {
    ui {
      val activity = ctx.currentActivity ?: return@ui
      activity.requestedOrientation =
        if (enabled) ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE else ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
      val controller = WindowInsetsControllerCompat(activity.window, activity.window.decorView)
      if (enabled) {
        controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(WindowInsetsCompat.Type.systemBars())
      } else {
        controller.show(WindowInsetsCompat.Type.systemBars())
      }
    }
  }

  @ReactMethod
  fun release() {
    ui {
      val p = PlayerHolder.get(ctx)
      p.stop()
      p.clearMediaItems()
      lastError = null
      ctx.stopService(Intent(ctx, DsiPlaybackService::class.java))
    }
  }
}
