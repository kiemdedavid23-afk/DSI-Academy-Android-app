package app.dsiacademy.pdf

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import okhttp3.Call
import okhttp3.Request
import okhttp3.ResponseBody
import java.io.ByteArrayOutputStream
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
        val call = SharedHttp.client.newCall(Request.Builder().url(url).build())
        calls[requestId] = call
        val data = call.execute().use { res ->
          if (!res.isSuccessful) { promise.reject("HTTP_${res.code}", "status"); return@execute }
          if ((res.header("Content-Type") ?: "").lowercase().startsWith("text/html")) {
            promise.reject("SOURCE_HTML_PAGE", "html"); return@execute
          }
          val len = res.body?.contentLength() ?: -1
          if (len > maxBytes) { promise.reject("TOO_LARGE", "too large"); return@execute }
          val bytes = readBody(res.body, len, maxBytes.toLong(), requestId)
          if (bytes == null) { promise.reject("TOO_LARGE", "too large"); return@execute }
          bytes
        }
        promise.resolve(DocParsers.parse(format, data))
      } catch (e: DocException) {
        promise.reject(e.code, e.message)
      } catch (e: IOException) {
        promise.reject(if (calls[requestId]?.isCanceled() == true) "ABORTED" else "NETWORK", e.message)
      } catch (e: Exception) {
        promise.reject("DOC_INVALID", e.message)
      } finally {
        calls.remove(requestId)
        SharedHttp.progress.remove(requestId)
      }
    }
  }

  /** Lit la réponse en mémoire en publiant les octets reçus ; null si elle dépasse `max`. */
  private fun readBody(body: ResponseBody?, total: Long, max: Long, requestId: String): ByteArray? {
    if (body == null) return ByteArray(0)
    val prog = longArrayOf(0L, total.coerceAtLeast(0L))
    SharedHttp.progress[requestId] = prog
    val out = ByteArrayOutputStream(if (total in 1..max) total.toInt() else 64 * 1024)
    val buf = ByteArray(64 * 1024)
    body.byteStream().use { input ->
      while (true) {
        val n = input.read(buf)
        if (n < 0) break
        if (prog[0] + n > max) return null
        out.write(buf, 0, n)
        prog[0] += n
      }
    }
    return out.toByteArray()
  }

  /** Octets reçus et attendus du téléchargement en cours. */
  @ReactMethod
  fun getProgress(requestId: String, promise: Promise) {
    val p = SharedHttp.progress[requestId]
    val map = Arguments.createMap()
    map.putDouble("loaded", (p?.get(0) ?: 0L).toDouble())
    map.putDouble("total", (p?.get(1) ?: 0L).toDouble())
    promise.resolve(map)
  }

  @ReactMethod
  fun cancelOpen(requestId: String) {
    calls[requestId]?.cancel()
  }
}
