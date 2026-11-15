package app.dsiacademy.pdf

import android.os.ProxyFileDescriptorCallback
import android.system.ErrnoException
import android.system.OsConstants
import androidx.annotation.RequiresApi
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.IOException

/**
 * Lecture d'un fichier distant par blocs (requêtes Range), cache en mémoire
 * uniquement : aucun octet n'est écrit sur le disque.
 */
class RangeSource(
  private val url: String,
  val size: Long,
  private val client: OkHttpClient,
) {
  private val blockSize = 256 * 1024
  private val maxBlocks = 192 // ~48 Mio en mémoire
  @Volatile var lastError: String? = null

  private val cache = object : LinkedHashMap<Long, ByteArray>(16, 0.75f, true) {
    override fun removeEldestEntry(eldest: MutableMap.MutableEntry<Long, ByteArray>?): Boolean =
      size > maxBlocks
  }

  @Synchronized
  fun read(offset: Long, length: Int, out: ByteArray): Int {
    if (offset >= size) return 0
    val end = minOf(size, offset + length)
    var pos = offset
    var written = 0
    while (pos < end) {
      val idx = pos / blockSize
      val block = cache[idx] ?: fetch(idx).also { cache[idx] = it }
      val inBlock = (pos - idx * blockSize).toInt()
      val n = minOf(block.size - inBlock, (end - pos).toInt())
      if (n <= 0) break
      System.arraycopy(block, inBlock, out, written, n)
      pos += n
      written += n
    }
    return written
  }

  private fun fetch(idx: Long): ByteArray {
    val start = idx * blockSize
    val endIncl = minOf(size - 1, start + blockSize - 1)
    val req = Request.Builder().url(url).header("Range", "bytes=$start-$endIncl").build()
    client.newCall(req).execute().use { res ->
      if (res.code != 206) {
        lastError = "HTTP_${res.code}"
        throw IOException("range ${res.code}")
      }
      return res.body?.bytes() ?: throw IOException("empty").also { lastError = "NETWORK" }
    }
  }
}

@RequiresApi(26)
class RangeCallback(private val source: RangeSource) : ProxyFileDescriptorCallback() {
  override fun onGetSize(): Long = source.size

  override fun onRead(offset: Long, size: Int, data: ByteArray): Int =
    try {
      source.read(offset, size, data)
    } catch (e: IOException) {
      if (source.lastError == null) source.lastError = "NETWORK"
      throw ErrnoException("read", OsConstants.EIO)
    }

  override fun onRelease() {}
}
