package app.dsiacademy

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

/** Écran natif (indépendant de React Native) qui affiche la cause exacte du dernier plantage. */
class CrashReportActivity : Activity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val report = CrashLogger.pending(this) ?: "Aucun rapport."
    val pad = (16 * resources.displayMetrics.density).toInt()

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(pad, pad * 2, pad, pad)
      setBackgroundColor(0xFFFFFFFF.toInt())
    }
    root.addView(TextView(this).apply {
      text = "L'app s'est arrêtée à la dernière ouverture"
      textSize = 18f
      setTypeface(typeface, Typeface.BOLD)
      setTextColor(0xFF111111.toInt())
    })
    root.addView(TextView(this).apply {
      text = "Copie ce rapport et envoie-le (appui long pour sélectionner)."
      textSize = 13f
      setTextColor(0xFF555555.toInt())
      setPadding(0, pad / 2, 0, pad / 2)
    })

    val scroll = ScrollView(this)
    scroll.addView(TextView(this).apply {
      text = report
      textSize = 11f
      typeface = Typeface.MONOSPACE
      setTextColor(0xFF111111.toInt())
      setTextIsSelectable(true)
    })
    root.addView(scroll, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))

    val buttons = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
    }
    buttons.addView(Button(this).apply {
      text = "Copier le rapport"
      setOnClickListener {
        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cm.setPrimaryClip(ClipData.newPlainText("rapport", report))
        Toast.makeText(this@CrashReportActivity, "Rapport copié", Toast.LENGTH_SHORT).show()
      }
    })
    buttons.addView(Button(this).apply {
      text = "Partager"
      setOnClickListener {
        val send = Intent(Intent.ACTION_SEND).apply {
          type = "text/plain"
          putExtra(Intent.EXTRA_TEXT, report)
        }
        startActivity(Intent.createChooser(send, "Partager le rapport"))
      }
    })
    buttons.addView(Button(this).apply {
      text = "Continuer vers l'app"
      setOnClickListener {
        CrashLogger.clear(this@CrashReportActivity)
        startActivity(Intent(this@CrashReportActivity, MainActivity::class.java))
        finish()
      }
    })
    root.addView(buttons)
    setContentView(root)
  }
}
