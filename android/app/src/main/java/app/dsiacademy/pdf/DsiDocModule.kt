package app.dsiacademy.pdf

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.Call
import okhttp3.Request
import java.io.IOException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

/** Lecteur EPUB / MOBI / DOCX : lu en mémoire chez la source, analysé en natif, jamais écrit sur le disque. */
class DsiDocModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val calls = ConcurrentHashMap<String, Call>()
  private val pool = Executors.newCachedThreadPool()

  override fun getName() = "DsiDoc"

  @ReactMethod
  fun open(requestId: String, url: String, format: String, maxBytes: Double, promise: Promise) {
    pool.execute {
      try {
        if (!url.startsWith("https://")) { promise.reject("INVALID_URL", "https only"); return@execute }
        val call = OkHttpClientProvider.createClient().newCall(Request.Builder().url(url).build())
        calls[requestId] = call
        val data = call.execute().use { res ->
          if (!res.isSuccessful) { promise.reject("HTTP_${res.code}", "status"); return@execute }
          if ((res.header("Content-Type") ?: "").lowercase().startsWith("text/html")) {
            promise.reject("SOURCE_HTML_PAGE", "html"); return@execute
          }
          val len = res.body?.contentLength() ?: -1
          if (len > maxBytes) { promise.reject("TOO_LARGE", "too large"); return@execute }
          val bytes = res.body?.bytes() ?: ByteArray(0)
          if (bytes.size > maxBytes) { promise.reject("TOO_LARGE", "too large"); return@execute }
          bytes
        }
        promise.resolve(DocParsers.parse(format, data))
      } catch (e: DocException) {
        promise.reject(e.code, e.message)
      } catch (e: IOException) {
        promise.reject(if (calls[requestId]?.isCanceled == true) "ABORTED" else "NETWORK", e.message)
      } catch (e: Exception) {
        promise.reject("DOC_INVALID", e.message)
      } finally {
        calls.remove(requestId)
      }
    }
  }

  @ReactMethod
  fun cancelOpen(requestId: String) {
    calls[requestId]?.cancel()
  }
}
