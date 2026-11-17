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
 * dans le cache privé de l'app (jamais dans le stockage partagé) et gardé 24 h
 * (300 Mo au plus) ; il est effacé à la déconnexion. Sans clé de cache, il est
 * effacé à la fermeture.
 */
class DsiPdfModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

  private class Session(
    var file: File?,
    var fd: ParcelFileDescriptor,
    var renderer: PdfRenderer,
    var thread: HandlerThread? = null,
    val url: String? = null,
    val maxBytes: Long = 0L,
    val cacheKey: String? = null,
  ) {
    @Volatile var background = false
    /** Fichier du cache de 24 h : jamais effacé à la fermeture de la session. */
    @Volatile var keep = false
  }

  private val sessions = ConcurrentHashMap<String, Session>()
  private val pendingCalls = ConcurrentHashMap<String, Call>()
  private val downloads = Executors.newCachedThreadPool()
  private val renders = Executors.newSingleThreadExecutor()

  private val dir: File
    get() = File(reactApplicationContext.cacheDir, "dsi-pdf").also { it.mkdirs() }

  /** Cache privé des PDF (24 h), un fichier par contenu. */
  private val cacheDirPdf: File
    get() = File(reactApplicationContext.cacheDir, "dsi-pdf-cache").also { it.mkdirs() }

  init {
    purge()
    trimCache()
  }

  override fun getName() = "DsiPdf"

  private companion object {
    /** En dessous : téléchargement complet puis affichage. Au-dessus : première page par lecture partielle, fichier complet en arrière-plan. */
    const val SMALL_PDF_BYTES = 1L * 1024 * 1024
    const val CACHE_TTL_MS = 24L * 60 * 60 * 1000
    const val CACHE_MAX_BYTES = 300L * 1024 * 1024
    const val PART_MAX_AGE_MS = 60L * 60 * 1000
  }

  /** Clé de cache sûre pour un nom de fichier (chiffres, lettres, tiret) ; null si inutilisable. */
  private fun safeKey(raw: String?): String? =
    raw?.takeIf { it.isNotBlank() && it.length <= 40 && it.all { c -> c.isLetterOrDigit() || c == '-' || c == '_' } }

  private fun isFresh(f: File): Boolean =
    f.exists() && f.length() > 0 && System.currentTimeMillis() - f.lastModified() <= CACHE_TTL_MS

  /** Supprime les fichiers expirés (24 h), les téléchargements abandonnés, puis les plus anciens au-delà de 300 Mo. */
  private fun trimCache() {
    try {
      val now = System.currentTimeMillis()
      cacheDirPdf.listFiles()?.forEach {
        val age = now - it.lastModified()
        if ((it.name.endsWith(".part") && age > PART_MAX_AGE_MS) || (!it.name.endsWith(".part") && age > CACHE_TTL_MS)) it.delete()
      }
      val pdfs = cacheDirPdf.listFiles { f -> f.name.endsWith(".pdf") }?.sortedBy { it.lastModified() } ?: return
      var total = pdfs.sumOf { it.length() }
      for (f in pdfs) {
        if (total <= CACHE_MAX_BYTES) break
        total -= f.length()
        f.delete()
      }
    } catch (_: Exception) {
      // Nettoyage au mieux.
    }
  }

  /** Le téléchargement terminé devient le fichier du cache (remplace l'ancien). */
  private fun promote(part: File, key: String): File {
    val dest = File(cacheDirPdf, "$key.pdf")
    if (dest.exists()) dest.delete()
    if (!part.renameTo(dest)) return part
    dest.setLastModified(System.currentTimeMillis())
    trimCache()
    return dest
  }

  /** Ouvre le PDF depuis le cache s'il a moins de 24 h. Renvoie true si la promesse est réglée. */
  private fun openFromCache(handle: String, key: String, promise: Promise): Boolean {
    val f = File(cacheDirPdf, "$key.pdf")
    if (!isFresh(f)) return false
    return try {
      val fd = ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY)
      val renderer = try {
        PdfRenderer(fd)
      } catch (e: Exception) {
        fd.close(); f.delete()
        return false
      }
      sessions[handle] = Session(f, fd, renderer, cacheKey = key).also { it.keep = true }
      val map = Arguments.createMap()
      map.putString("handle", handle)
      map.putInt("pageCount", renderer.pageCount)
      promise.resolve(map)
      true
    } catch (e: Exception) {
      f.delete()
      false
    }
  }

  /** Télécharge `url` dans `target` ; false au moindre souci (refus, page web, trop gros, annulation). */
  private fun downloadTo(url: String, target: File, maxBytes: Long, callKey: String): Boolean {
    return try {
      val call = SharedHttp.client.newCall(Request.Builder().url(url).build())
      pendingCalls[callKey] = call
      var ok = false
      call.execute().use { res ->
        val body = res.body
        if (!res.isSuccessful || body == null) return@use
        if ((res.header("Content-Type") ?: "").lowercase().startsWith("text/html")) return@use
        if (body.contentLength() > maxBytes) return@use
        var total = 0L
        FileOutputStream(target).use { out ->
          val buf = ByteArray(64 * 1024)
          val input = body.byteStream()
          while (true) {
            val n = input.read(buf)
            if (n < 0) break
            total += n
            if (total > maxBytes) { total = -1L; break }
            out.write(buf, 0, n)
          }
        }
        ok = total > 0
      }
      if (ok) {
        ok = target.inputStream().use { ins ->
          val head = ByteArray(5)
          ins.read(head) == 5 && String(head, Charsets.ISO_8859_1) == "%PDF-"
        }
      }
      if (!ok) target.delete()
      ok
    } catch (e: Exception) {
      target.delete()
      false
    } finally {
      pendingCalls.remove(callKey)
    }
  }

  /** Préchargement du module suivant : le PDF est déposé dans le cache, sans l'ouvrir. Ne rejette jamais. */
  @ReactMethod
  fun prefetch(requestId: String, url: String, maxBytes: Double, cacheKey: String, promise: Promise) {
    downloads.execute {
      val key = safeKey(cacheKey)
      if (key == null || !url.startsWith("https://")) {
        promise.resolve(false)
        return@execute
      }
      val dest = File(cacheDirPdf, "$key.pdf")
      if (isFresh(dest)) {
        promise.resolve(true)
        return@execute
      }
      val part = File(cacheDirPdf, "$key.${UUID.randomUUID()}.part")
      val ok = downloadTo(url, part, maxBytes.toLong(), "pf_$requestId")
      if (ok) promote(part, key)
      promise.resolve(ok)
    }
  }

  /** Vide le cache (déconnexion) et annule les préchargements en cours. */
  @ReactMethod
  fun clearCache(promise: Promise) {
    pendingCalls.keys.filter { it.startsWith("pf_") }.forEach { pendingCalls.remove(it)?.cancel() }
    cacheDirPdf.listFiles()?.forEach { it.delete() }
    promise.resolve(null)
  }

  private fun purge() {
    dir.listFiles()?.forEach { it.delete() }
  }

  @ReactMethod
  fun open(requestId: String, url: String, maxBytes: Double, cacheKey: String, promise: Promise) {
    downloads.execute {
      val handle = UUID.randomUUID().toString()
      val key = safeKey(cacheKey)
      var file = File(dir, "$handle.pdf")
      try {
        if (!url.startsWith("https://")) {
          promise.reject("INVALID_URL", "https only")
          return@execute
        }
        if (key != null && openFromCache(handle, key, promise)) {
          return@execute
        }
        if (Build.VERSION.SDK_INT >= 26 && tryRanged(handle, url, maxBytes.toLong(), key, promise)) {
          return@execute
        }
        if (key != null) {
          file = File(cacheDirPdf, "$key.$handle.part")
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
        if (key != null) {
          file = promote(file, key)
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
        sessions[handle] = Session(file, fd, renderer, cacheKey = key).also { it.keep = key != null && file.name == "$key.pdf" }
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
  private fun tryRanged(handle: String, url: String, maxBytes: Long, key: String?, promise: Promise): Boolean {
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
      sessions[handle] = Session(null, fd, renderer, thread, url, maxBytes, key)
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
      val ck = session.cacheKey
      var file = if (ck != null) File(cacheDirPdf, "$ck.$handle.part") else File(dir, "$handle.pdf")
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
        if (ck != null) {
          file = promote(file, ck)
        }
        val ready = file
        renders.execute { swapToFile(handle, session, ready) }
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
      if (sessions[handle] !== session) { if (session.cacheKey == null) file.delete(); return }
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
        session.keep = session.cacheKey != null && file.name == "${session.cacheKey}.pdf"
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
      if (!session.keep) session.file?.delete()
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
