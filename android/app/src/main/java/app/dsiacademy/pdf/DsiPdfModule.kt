package app.dsiacademy.pdf

import android.graphics.Bitmap
import android.content.Context
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.ParcelFileDescriptor
import android.os.storage.StorageManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import okhttp3.Call
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

/**
 * Lecteur PDF natif (android.graphics.pdf.PdfRenderer). Le fichier est écrit
 * dans le cache privé de l'app (jamais dans le stockage partagé) et effacé à
 * la fermeture, au démarrage du module et à la destruction du contexte.
 */
class DsiPdfModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

  private class Session(
    var file: File?,
    var fd: ParcelFileDescriptor,
    var renderer: PdfRenderer,
    var thread: HandlerThread? = null,
    val url: String? = null,
    val maxBytes: Long = 0L,
  ) {
    @Volatile var background = false
  }

  private val sessions = ConcurrentHashMap<String, Session>()
  private val pendingCalls = ConcurrentHashMap<String, Call>()
  private val downloads = Executors.newCachedThreadPool()
  private val renders = Executors.newSingleThreadExecutor()

  private val dir: File
    get() = File(reactApplicationContext.cacheDir, "dsi-pdf").also { it.mkdirs() }

  init {
    purge()
  }

  override fun getName() = "DsiPdf"

  private companion object {
    /** En dessous : téléchargement complet puis affichage. Au-dessus : première page par lecture partielle, fichier complet en arrière-plan. */
    const val SMALL_PDF_BYTES = 1L * 1024 * 1024
  }

  private fun purge() {
    dir.listFiles()?.forEach { it.delete() }
  }

  @ReactMethod
  fun open(requestId: String, url: String, maxBytes: Double, promise: Promise) {
    downloads.execute {
      val handle = UUID.randomUUID().toString()
      val file = File(dir, "$handle.pdf")
      try {
        if (!url.startsWith("https://")) {
          promise.reject("INVALID_URL", "https only")
          return@execute
        }
        if (Build.VERSION.SDK_INT >= 26 && tryRanged(handle, url, maxBytes.toLong(), promise)) {
          return@execute
        }
        val call = SharedHttp.client.newCall(Request.Builder().url(url).build())
        pendingCalls[requestId] = call
        call.execute().use { res ->
          if (!res.isSuccessful) {
            promise.reject("HTTP_${res.code}", "source status ${res.code}")
            return@execute
          }
          val type = res.header("Content-Type")?.lowercase() ?: ""
          if (type.startsWith("text/html")) {
            promise.reject("SOURCE_HTML_PAGE", "html instead of file")
            return@execute
          }
          val body = res.body ?: run {
            promise.reject("NETWORK", "empty body")
            return@execute
          }
          val prog = longArrayOf(0L, body.contentLength().coerceAtLeast(0L))
          SharedHttp.progress[requestId] = prog
          var total = 0L
          FileOutputStream(file).use { out ->
            val buf = ByteArray(64 * 1024)
            val input = body.byteStream()
            while (true) {
              val n = input.read(buf)
              if (n < 0) break
              total += n
              prog[0] = total
              if (total > maxBytes) {
                promise.reject("TOO_LARGE", "file too large")
                file.delete()
                return@execute
              }
              out.write(buf, 0, n)
            }
          }
        }
        val fd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
        val renderer = try {
          PdfRenderer(fd)
        } catch (e: SecurityException) {
          fd.close(); file.delete()
          promise.reject("PDF_PROTECTED", "password protected")
          return@execute
        } catch (e: IOException) {
          fd.close(); file.delete()
          promise.reject("PDF_INVALID", "not a valid pdf")
          return@execute
        }
        sessions[handle] = Session(file, fd, renderer)
        val map = Arguments.createMap()
        map.putString("handle", handle)
        map.putInt("pageCount", renderer.pageCount)
        promise.resolve(map)
      } catch (e: IOException) {
        file.delete()
        promise.reject(if (pendingCalls[requestId]?.isCanceled() == true) "ABORTED" else "NETWORK", e.message)
      } catch (e: Exception) {
        file.delete()
        promise.reject("NETWORK", e.message)
      } finally {
        pendingCalls.remove(requestId)
        SharedHttp.progress.remove(requestId)
      }
    }
  }

  /** Lecture par morceaux (API 26+). Renvoie true si la promesse est réglée ; false → repli téléchargement complet. */
  private fun tryRanged(handle: String, url: String, maxBytes: Long, promise: Promise): Boolean {
    val client = SharedHttp.client
    val probe = Request.Builder().url(url).header("Range", "bytes=0-0").build()
    val size: Long
    client.newCall(probe).execute().use { res ->
      if (res.code in listOf(401, 403, 404, 410, 429) || res.code >= 500) {
        promise.reject("HTTP_${res.code}", "source status ${res.code}")
        return true
      }
      if ((res.header("Content-Type") ?: "").lowercase().startsWith("text/html")) {
        promise.reject("SOURCE_HTML_PAGE", "html instead of file")
        return true
      }
      val total = res.header("Content-Range")?.substringAfter('/')?.toLongOrNull()
      if (res.code != 206 || total == null || total <= 0) return false
      // Très petit fichier : un seul téléchargement est plus rapide que plusieurs
      // requêtes par blocs. Sinon la première page s'affiche par lecture partielle.
      if (total <= SMALL_PDF_BYTES) return false
      size = total
    }
    val source = RangeSource(url, size, client)
    val thread = HandlerThread("dsi-pdf-proxy").also { it.start() }
    val sm = reactApplicationContext.getSystemService(Context.STORAGE_SERVICE) as StorageManager
    val fd = sm.openProxyFileDescriptor(
      ParcelFileDescriptor.MODE_READ_ONLY, RangeCallback(source), Handler(thread.looper),
    )
    try {
      val renderer = PdfRenderer(fd)
      sessions[handle] = Session(null, fd, renderer, thread, url, maxBytes)
      val map = Arguments.createMap()
      map.putString("handle", handle)
      map.putInt("pageCount", renderer.pageCount)
      promise.resolve(map)
    } catch (e: Exception) {
      fd.close(); thread.quitSafely()
      val err = source.lastError
      promise.reject(
        when {
          err != null -> err
          e is SecurityException -> "PDF_PROTECTED"
          else -> "PDF_INVALID"
        },
        e.message,
      )
    }
    return true
  }

  /** Octets reçus et attendus du téléchargement en cours (0 si inconnu ou lecture par morceaux). */
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
    pendingCalls[requestId]?.cancel()
  }

  @ReactMethod
  fun renderPage(handle: String, index: Int, targetWidth: Int, promise: Promise) {
    renders.execute {
      val session = sessions[handle]
      if (session == null) {
        promise.reject("CLOSED", "session closed")
        return@execute
      }
      try {
        val width = targetWidth.coerceIn(200, 1600)
        val out = File(dir, "${handle}_${index}_$width.jpg")
        synchronized(session) {
          if (index < 0 || index >= session.renderer.pageCount) {
            promise.reject("BAD_PAGE", "page out of range")
            return@execute
          }
          session.renderer.openPage(index).use { page ->
            val scale = width.toFloat() / page.width
            val height = (page.height * scale).toInt().coerceAtLeast(1)
            if (!out.exists()) {
              val bmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
              bmp.eraseColor(Color.WHITE)
              page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
              FileOutputStream(out).use { bmp.compress(Bitmap.CompressFormat.JPEG, 85, it) }
              bmp.recycle()
            }
            val map = Arguments.createMap()
            map.putString("uri", "file://${out.absolutePath}")
            map.putInt("width", width)
            map.putInt("height", height)
            promise.resolve(map)
          }
        }
        startBackgroundDownload(handle, session)
      } catch (e: Exception) {
        promise.reject("RENDER_FAILED", e.message)
      }
    }
  }

  /** Après la première page : télécharge le fichier complet en arrière-plan, puis bascule dessus. */
  private fun startBackgroundDownload(handle: String, session: Session) {
    val url = session.url ?: return
    if (session.file != null || session.background) return
    session.background = true
    downloads.execute {
      val file = File(dir, "$handle.pdf")
      val key = "bg_$handle"
      try {
        val call = SharedHttp.client.newCall(Request.Builder().url(url).build())
        pendingCalls[key] = call
        call.execute().use { res ->
          if (!res.isSuccessful) return@execute
          if ((res.header("Content-Type") ?: "").lowercase().startsWith("text/html")) return@execute
          val body = res.body ?: return@execute
          var total = 0L
          FileOutputStream(file).use { out ->
            val buf = ByteArray(64 * 1024)
            val input = body.byteStream()
            while (true) {
              val n = input.read(buf)
              if (n < 0) break
              total += n
              if (total > session.maxBytes) { file.delete(); return@execute }
              out.write(buf, 0, n)
            }
          }
        }
        renders.execute { swapToFile(handle, session, file) }
      } catch (e: Exception) {
        file.delete()
      } finally {
        pendingCalls.remove(key)
      }
    }
  }

  /** Remplace la lecture partielle par le fichier local complet (sur le fil de rendu). */
  private fun swapToFile(handle: String, session: Session, file: File) {
    synchronized(session) {
      if (sessions[handle] !== session) { file.delete(); return }
      try {
        val fd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
        val renderer = try {
          PdfRenderer(fd)
        } catch (e: Exception) {
          fd.close(); file.delete()
          return
        }
        val oldRenderer = session.renderer
        val oldFd = session.fd
        val oldThread = session.thread
        session.renderer = renderer
        session.fd = fd
        session.file = file
        session.thread = null
        try { oldRenderer.close() } catch (_: Exception) {}
        try { oldFd.close() } catch (_: Exception) {}
        oldThread?.quitSafely()
      } catch (e: Exception) {
        file.delete()
      }
    }
  }

  @ReactMethod
  fun close(handle: String, promise: Promise) {
    renders.execute {
      closeSession(handle)
      promise.resolve(null)
    }
  }

  private fun closeSession(handle: String) {
    pendingCalls.remove("bg_$handle")?.cancel()
    File(dir, "$handle.pdf").delete()
    val session = sessions.remove(handle) ?: return
    synchronized(session) {
      try { session.renderer.close() } catch (_: Exception) {}
      try { session.fd.close() } catch (_: Exception) {}
      session.file?.delete()
      session.thread?.quitSafely()
      dir.listFiles { f -> f.name.startsWith("${handle}_") }?.forEach { it.delete() }
    }
  }

  override fun invalidate() {
    sessions.keys.toList().forEach { closeSession(it) }
    pendingCalls.values.forEach { it.cancel() }
    super.invalidate()
  }
}
