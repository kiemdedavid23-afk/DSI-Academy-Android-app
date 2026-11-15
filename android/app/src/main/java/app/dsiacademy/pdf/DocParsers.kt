package app.dsiacademy.pdf

import android.text.Html
import org.json.JSONArray
import org.json.JSONObject
import org.xmlpull.v1.XmlPullParser
import org.xmlpull.v1.XmlPullParserFactory
import java.io.ByteArrayInputStream
import java.util.zip.ZipInputStream

/** Livres en mémoire → liste de blocs {k:"h"|"p", l:niveau, x:texte}. Aucun fichier écrit. */
class DocException(val code: String) : Exception(code)

object DocParsers {
  private const val HEAD = "\u0001"
  private const val MAX_CHARS = 4_000_000

  fun parse(format: String, data: ByteArray): String {
    val blocks = JSONArray()
    when (format.lowercase()) {
      "epub" -> epub(data, blocks)
      "docx" -> docx(data, blocks)
      "mobi" -> html(mobiHtml(data), blocks)
      else -> throw DocException("UNSUPPORTED_FORMAT")
    }
    if (blocks.length() == 0) throw DocException("DOC_EMPTY")
    return blocks.toString()
  }

  private fun add(out: JSONArray, kind: String, level: Int, text: String) {
    val t = text.replace('\u00A0', ' ').trim()
    if (t.isEmpty()) return
    out.put(JSONObject().put("k", kind).put("l", level).put("x", t))
  }

  /** HTML (EPUB, MOBI) → blocs. Titres h1–h3 repérés, images ignorées. */
  fun html(src: String, out: JSONArray) {
    var h = src
    h = Regex("(?is)<(head|script|style)\\b.*?</\\1>").replace(h, " ")
    h = Regex("(?is)<h([1-3])\\b[^>]*>(.*?)</h\\1>").replace(h) { "\n$HEAD${it.groupValues[1]}${it.groupValues[2]}\n" }
    h = Regex("(?i)<(br|/p|/div|/li|/tr|mbp:pagebreak)\\b[^>]*>").replace(h) { "${it.value}\n" }
    val text = Html.fromHtml(h, Html.FROM_HTML_MODE_LEGACY).toString()
    for (line in text.split('\n')) {
      val l = line.trim()
      if (l.startsWith(HEAD) && l.length > 2) add(out, "h", l[1].digitToIntOrNull() ?: 2, l.substring(2))
      else add(out, "p", 0, l.removePrefix(HEAD))
    }
  }

  private fun unzip(data: ByteArray, keep: (String) -> Boolean): Map<String, ByteArray> {
    val files = LinkedHashMap<String, ByteArray>()
    ZipInputStream(ByteArrayInputStream(data)).use { zip ->
      while (true) {
        val e = zip.nextEntry ?: break
        if (!e.isDirectory && keep(e.name)) files[e.name] = zip.readBytes()
      }
    }
    return files
  }

  private fun attr(parser: XmlPullParser, name: String): String? = parser.getAttributeValue(null, name)

  private fun epub(data: ByteArray, out: JSONArray) {
    val files = unzip(data) {
      val n = it.lowercase()
      n.endsWith(".xhtml") || n.endsWith(".html") || n.endsWith(".htm") || n.endsWith(".opf") || n.endsWith("container.xml")
    }
    val container = files["META-INF/container.xml"]?.toString(Charsets.UTF_8)
      ?: throw DocException("DOC_INVALID")
    val opfPath = Regex("full-path=\"([^\"]+)\"").find(container)?.groupValues?.get(1)
      ?: throw DocException("DOC_INVALID")
    val opf = files[opfPath]?.toString(Charsets.UTF_8) ?: throw DocException("DOC_INVALID")
    val base = opfPath.substringBeforeLast('/', "")
    val manifest = HashMap<String, String>()
    Regex("(?is)<item\\b[^>]*>").findAll(opf).forEach { m ->
      val tag = m.value
      val id = Regex("\\bid=\"([^\"]*)\"").find(tag)?.groupValues?.get(1)
      val href = Regex("\\bhref=\"([^\"]*)\"").find(tag)?.groupValues?.get(1)
      if (id != null && href != null) manifest[id] = href
    }
    var chars = 0
    for (m in Regex("(?is)<itemref\\b[^>]*idref=\"([^\"]*)\"").findAll(opf)) {
      val href = manifest[m.groupValues[1]] ?: continue
      val path = java.net.URLDecoder.decode(if (base.isEmpty()) href else "$base/$href", "UTF-8")
        .replace(Regex("#.*$"), "")
      val bytes = files[path] ?: continue
      html(bytes.toString(Charsets.UTF_8), out)
      chars += bytes.size
      if (chars > MAX_CHARS) break
    }
  }

  private fun docx(data: ByteArray, out: JSONArray) {
    val doc = unzip(data) { it == "word/document.xml" }["word/document.xml"]
      ?: throw DocException("DOC_INVALID")
    val p = XmlPullParserFactory.newInstance().newPullParser()
    p.setInput(ByteArrayInputStream(doc), "UTF-8")
    val sb = StringBuilder()
    var level = 0
    var inText = false
    var ev = p.eventType
    while (ev != XmlPullParser.END_DOCUMENT) {
      when (ev) {
        XmlPullParser.START_TAG -> when (p.name) {
          "w:p" -> { sb.setLength(0); level = 0 }
          "w:pStyle" -> {
            val v = (attr(p, "w:val") ?: "").lowercase()
            if (v == "title") level = 1
            else Regex("^(heading|titre)\\s*([1-3])").find(v)?.let { level = it.groupValues[2].toInt() }
          }
          "w:t" -> inText = true
          "w:tab" -> sb.append(' ')
          "w:br" -> sb.append(' ')
        }
        XmlPullParser.TEXT -> if (inText) sb.append(p.text)
        XmlPullParser.END_TAG -> when (p.name) {
          "w:t" -> inText = false
          "w:p" -> if (level > 0) add(out, "h", level, sb.toString()) else add(out, "p", 0, sb.toString())
        }
      }
      ev = p.next()
    }
  }

  // ---- MOBI (PalmDOC, compression 1 ou 2 ; KF8/Huffman non gérés) ----
  private fun u16(b: ByteArray, o: Int) = ((b[o].toInt() and 0xFF) shl 8) or (b[o + 1].toInt() and 0xFF)
  private fun u32(b: ByteArray, o: Int) = (u16(b, o).toLong() shl 16) or u16(b, o + 2).toLong()

  private fun mobiHtml(b: ByteArray): String {
    if (b.size < 100) throw DocException("DOC_INVALID")
    val n = u16(b, 76)
    val offs = IntArray(n + 1) { if (it < n) u32(b, 78 + it * 8).toInt() else b.size }
    val r0 = offs[0]
    val compression = u16(b, r0)
    val records = u16(b, r0 + 8)
    if (u16(b, r0 + 12) != 0) throw DocException("DOC_ENCRYPTED")
    if (compression != 1 && compression != 2) throw DocException("DOC_UNSUPPORTED_MOBI")
    val encoding = if (b.size > r0 + 32) u32(b, r0 + 28).toInt() else 65001
    val hdrLen = u32(b, r0 + 20).toInt()
    val extra = if (hdrLen >= 0xE4 && b.size > r0 + 0xF4) u16(b, r0 + 0xF2) else 0
    val out = java.io.ByteArrayOutputStream()
    for (i in 1..minOf(records, n - 1)) {
      var end = offs[i + 1]
      var start = offs[i]
      if (end > b.size || start >= end) continue
      end -= trailing(b, start, end, extra)
      val rec = b.copyOfRange(start, end)
      if (compression == 2) palmDecompress(rec, out) else out.write(rec)
      if (out.size() > MAX_CHARS * 2) break
    }
    return String(out.toByteArray(), if (encoding == 65001) Charsets.UTF_8 else charset("windows-1252"))
  }

  private fun trailing(b: ByteArray, start: Int, end: Int, flags: Int): Int {
    var num = 0
    var f = flags shr 1
    while (f != 0) {
      if (f and 1 != 0) num += trailingEntry(b, start, end - num)
      f = f shr 1
    }
    if (flags and 1 != 0 && end - num - 1 >= start) num += (b[end - num - 1].toInt() and 3) + 1
    return num.coerceAtMost(end - start)
  }

  private fun trailingEntry(b: ByteArray, start: Int, end: Int): Int {
    var bit = 0
    var res = 0
    var pos = end
    while (pos > start) {
      val v = b[pos - 1].toInt() and 0xFF
      res = res or ((v and 0x7F) shl bit)
      bit += 7
      pos -= 1
      if (v and 0x80 != 0 || bit >= 28 || pos == start) break
    }
    return res
  }

  private fun palmDecompress(src: ByteArray, out: java.io.ByteArrayOutputStream) {
    val buf = java.io.ByteArrayOutputStream()
    var i = 0
    val w = ArrayList<Byte>(src.size * 3)
    while (i < src.size) {
      val c = src[i++].toInt() and 0xFF
      when {
        c == 0 || c in 9..0x7F -> w.add(c.toByte())
        c in 1..8 -> { var k = 0; while (k < c && i < src.size) { w.add(src[i++]); k++ } }
        c >= 0xC0 -> { w.add(' '.code.toByte()); w.add((c xor 0x80).toByte()) }
        else -> {
          if (i >= src.size) break
          val pair = (c shl 8) or (src[i++].toInt() and 0xFF)
          val dist = (pair and 0x3FFF) shr 3
          val len = (pair and 7) + 3
          for (k in 0 until len) { if (dist <= 0 || dist > w.size) break; w.add(w[w.size - dist]) }
        }
      }
    }
    w.forEach { buf.write(it.toInt()) }
    out.write(buf.toByteArray())
  }
}
