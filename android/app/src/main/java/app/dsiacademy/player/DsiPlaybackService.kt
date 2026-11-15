package app.dsiacademy.player

import android.content.Intent
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

/**
 * Service de lecture : notification média, écran verrouillé, boutons du casque.
 * Il enveloppe le lecteur partagé ; la lecture continue app en arrière-plan.
 */
class DsiPlaybackService : MediaSessionService() {
  private var session: MediaSession? = null

  override fun onCreate() {
    super.onCreate()
    session = MediaSession.Builder(this, PlayerHolder.get(this)).build()
  }

  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = session

  override fun onTaskRemoved(rootIntent: Intent?) {
    val p = session?.player
    if (p == null || !p.playWhenReady || p.mediaItemCount == 0) {
      stopSelf()
    }
  }

  override fun onDestroy() {
    session?.release()
    session = null
    super.onDestroy()
  }
}
