package app.dsiacademy

import android.content.Context
import android.os.Build
import android.util.Log
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Journal de plantage : enregistre la cause exacte d'un arrêt (erreur native ou erreur JavaScript fatale)
 * dans un fichier, pour l'afficher à la prochaine ouverture (CrashReportActivity).
 */
object CrashLogger {
  private const val FILE_NAME = "last_crash.txt"
  private var installed = false

  private fun file(context: Context) = File(context.applicationContext.filesDir, FILE_NAME)

  fun install(context: Context) {
    if (installed) return
    installed = true
    val app = context.applicationContext
    val previous = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, error ->
      record(app, "Plantage (thread « ${thread.name} »)", error)
      previous?.uncaughtException(thread, error)
    }
  }

  fun record(context: Context, title: String, error: Throwable) {
    try {
      val date = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date())
      val version = try {
        val info = context.packageManager.getPackageInfo(context.packageName, 0)
        "${info.versionName} (${info.longVersionCode})"
      } catch (e: Throwable) {
        "?"
      }
      val text = buildString {
        appendLine("DSI Academy — rapport de plantage")
        appendLine("Date : $date")
        appendLine("Version : $version")
        appendLine("Appareil : ${Build.MANUFACTURER} ${Build.MODEL}, Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
        appendLine("Type : $title")
        appendLine()
        append(Log.getStackTraceString(error))
      }
      file(context).writeText(text)
    } catch (ignored: Throwable) {
      // Ne jamais planter dans le gestionnaire de plantage.
    }
  }

  fun pending(context: Context): String? {
    val f = file(context)
    return if (f.exists()) f.readText() else null
  }

  fun clear(context: Context) {
    file(context).delete()
  }
}
