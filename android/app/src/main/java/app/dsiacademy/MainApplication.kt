package app.dsiacademy

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import app.dsiacademy.pdf.DsiPdfPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
          add(DsiPdfPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    CrashLogger.install(this)
    try {
      loadReactNative(this)
    } catch (error: Throwable) {
      // Le démarrage de React Native a échoué : on garde la cause pour l'afficher au lieu de fermer l'app.
      CrashLogger.record(this, "Échec au démarrage de React Native", error)
    }
  }
}
