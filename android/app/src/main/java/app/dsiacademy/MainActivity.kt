package app.dsiacademy

import android.content.Intent
import android.os.Bundle
import app.dsiacademy.player.PlayerHolder
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "DSIAcademy"

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // Un plantage précédent a laissé un rapport : on l'affiche avant tout.
    if (CrashLogger.pending(this) != null) {
      startActivity(Intent(this, CrashReportActivity::class.java))
      finish()
      return
    }
    // Préchauffage : on construit le lecteur une fois l'écran affiché, pour que la
    // première ouverture d'un audio ou d'une vidéo ne paie pas ce coût.
    window.decorView.post { PlayerHolder.get(this) }
  }

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
