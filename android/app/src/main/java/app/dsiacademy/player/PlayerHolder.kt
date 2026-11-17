package app.dsiacademy.player

import android.content.Context
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer

/** Un seul ExoPlayer pour toute l'app (audio et vidéo). À appeler depuis le thread principal. */
@OptIn(UnstableApi::class)
object PlayerHolder {
  private var player: ExoPlayer? = null

  /**
   * Démarrage plus rapide : la lecture commence dès 1 s de données (2,5 s par défaut)
   * et reprend après une coupure dès 2 s (5 s par défaut). Le tampon reste large
   * (30 s à 60 s) pour tenir sur un réseau instable.
   */
  private fun loadControl() = DefaultLoadControl.Builder()
    .setBufferDurationsMs(
      /* minBufferMs = */ 30_000,
      /* maxBufferMs = */ 60_000,
      /* bufferForPlaybackMs = */ 1_000,
      /* bufferForPlaybackAfterRebufferMs = */ 2_000,
    )
    .build()

  fun get(context: Context): ExoPlayer =
    player ?: ExoPlayer.Builder(context.applicationContext)
      .setLoadControl(loadControl())
      .setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(C.USAGE_MEDIA)
          .setContentType(C.AUDIO_CONTENT_TYPE_UNKNOWN)
          .build(),
        true,
      )
      .setHandleAudioBecomingNoisy(true)
      .setWakeMode(C.WAKE_MODE_NETWORK)
      .build()
      .also { player = it }

  fun release() {
    player?.release()
    player = null
  }
}
