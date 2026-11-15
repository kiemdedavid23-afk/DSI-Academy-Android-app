package app.dsiacademy.player

import android.content.Context
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.exoplayer.ExoPlayer

/** Un seul ExoPlayer pour toute l'app (audio et vidéo). À appeler depuis le thread principal. */
object PlayerHolder {
  private var player: ExoPlayer? = null

  fun get(context: Context): ExoPlayer =
    player ?: ExoPlayer.Builder(context.applicationContext)
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
