package app.dsiacademy.pdf

import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.OkHttpClient

/**
 * Un seul client réseau pour les modules PDF et document : les connexions déjà
 * ouvertes (TLS compris) sont réutilisées entre le sondage et le téléchargement.
 */
object SharedHttp {
  val client: OkHttpClient by lazy { OkHttpClientProvider.createClient() }
}
