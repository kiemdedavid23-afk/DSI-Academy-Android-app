package app.dsiacademy.pdf

import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

/**
 * Un seul client réseau pour les modules PDF et document : les connexions déjà
 * ouvertes (TLS compris) sont réutilisées entre le sondage et le téléchargement.
 */
object SharedHttp {
  /** Téléchargements en cours, par identifiant de demande : [octets reçus, octets attendus]. */
  val progress = java.util.concurrent.ConcurrentHashMap<String, LongArray>()

  /** Délais explicites : sans eux, une source qui ne répond pas bloque le chargement sans fin. */
  val client: OkHttpClient by lazy {
    OkHttpClientProvider.createClient().newBuilder()
      .connectTimeout(20, TimeUnit.SECONDS)
      .readTimeout(30, TimeUnit.SECONDS)
      .build()
  }
}
