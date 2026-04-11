package expo.modules.evcsms

import java.util.Locale
import java.util.regex.Pattern

object EvcSmsParser {
  private val amountRe = Pattern.compile("\\$\\s*([\\d]+(?:[\\.,]\\d+)?)", Pattern.CASE_INSENSITIVE)
  private val tarRe = Pattern.compile("Tar:\\s*(\\d{1,2}/\\d{1,2}/\\d{2,4})\\s+(\\d{1,2}:\\d{1,2}:\\d{1,2})", Pattern.CASE_INSENSITIVE)
  private val telRe = Pattern.compile("Tel:\\s*(\\+?\\d[\\d\\s-]{6,20})", Pattern.CASE_INSENSITIVE)
  private val phoneLooseRe = Pattern.compile("(?:\\+?252|0)?\\d{9,12}|\\b\\d{9}\\b")

  fun classify(sender: String, body: String): String {
    val s = sender.trim().uppercase(Locale.ROOT).replace("\\s+".toRegex(), "")
    val b = body.trim().lowercase(Locale.ROOT).replace("\\s+".toRegex(), " ")
    if (s == "NOTICE") return "bundle_notice"
    if (s != "192" && !b.contains("evcplus")) return "ignored"

    if (b.contains("ugu shubtay")) return "topup"
    if (b.contains("ka heshay") || b.contains("laguu soo diray") || b.contains(" heshay ")) return "receive"
    if (b.contains("uwareejisay") || b.contains("diray") || b.contains("wareejisay")) {
      // Merchant often contains Tel:
      return if (b.contains("tel:")) "send_merchant" else "send_p2p"
    }
    return "ignored"
  }

  fun parse(sender: String, body: String): EvcSmsParsed {
    val senderTrim = sender.trim()
    val kind = classify(senderTrim, body)
    val amount = extractAmount(body)
    val tar = parseTar(body)

    if (kind == "bundle_notice") {
      return EvcSmsParsed(
        kind = kind,
        sender = senderTrim,
        amount = null,
        dateIso = null,
        tarRaw = null,
        phone = null,
        name = null,
        merchantName = null,
        noticeSummary = summarizeNotice(body)
      )
    }

    val phone = when (kind) {
      "send_merchant" -> extractPhone(body) ?: extractTel(body)
      "send_p2p" -> extractPhone(body)
      "receive" -> extractReceivePhone(body) ?: extractPhone(body)
      "topup" -> extractTopupPhone(body) ?: extractPhone(body)
      else -> extractPhone(body)
    }

    val name = if (kind == "send_p2p") extractP2PName(body) else null
    val merchant = if (kind == "send_merchant") extractMerchantName(body) else null

    return EvcSmsParsed(
      kind = kind,
      sender = senderTrim,
      amount = amount,
      dateIso = tar.first,
      tarRaw = tar.second,
      phone = phone,
      name = name,
      merchantName = merchant,
      noticeSummary = null
    )
  }

  private fun extractAmount(body: String): Double? {
    val m = amountRe.matcher(body)
    if (!m.find()) return null
    val raw = m.group(1) ?: return null
    return raw.replace(",", ".").toDoubleOrNull()
  }

  private fun parseTar(body: String): Pair<String?, String?> {
    val m = tarRe.matcher(body)
    if (!m.find()) return Pair(null, null)
    val date = m.group(1) ?: return Pair(null, m.group(0))
    val time = m.group(2) ?: return Pair(null, m.group(0))
    val parts = date.split("/")
    if (parts.size != 3) return Pair(null, m.group(0))
    val dd = parts[0].toIntOrNull() ?: return Pair(null, m.group(0))
    val mm = (parts[1].toIntOrNull() ?: return Pair(null, m.group(0))) - 1
    var yy = parts[2].toIntOrNull() ?: return Pair(null, m.group(0))
    if (yy < 100) yy += 2000
    val t = time.split(":").map { it.toIntOrNull() ?: 0 }
    val hh = t.getOrElse(0) { 0 }
    val mi = t.getOrElse(1) { 0 }
    val ss = t.getOrElse(2) { 0 }
    val dt = java.util.Calendar.getInstance()
    dt.set(yy, mm, dd, hh, mi, ss)
    dt.set(java.util.Calendar.MILLISECOND, 0)
    val iso = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
      timeZone = java.util.TimeZone.getTimeZone("UTC")
    }.format(dt.time)
    return Pair(iso, m.group(0))
  }

  private fun extractTel(body: String): String? {
    val m = telRe.matcher(body)
    return if (m.find()) (m.group(1) ?: "").replace("\\s".toRegex(), "") else null
  }

  private fun extractPhone(body: String): String? {
    val m = phoneLooseRe.matcher(body)
    return if (m.find()) m.group(0)?.replace("\\s".toRegex(), "") else null
  }

  private fun extractReceivePhone(body: String): String? {
    val re = Pattern.compile("ka\\s+heshay\\s+(\\+?\\d[\\d\\s]+)", Pattern.CASE_INSENSITIVE)
    val m = re.matcher(body)
    return if (m.find()) (m.group(1) ?: "").replace("\\s".toRegex(), "") else null
  }

  private fun extractTopupPhone(body: String): String? {
    val re = Pattern.compile("ugu\\s+shubtay\\s+(\\+?\\d[\\d\\s]+)", Pattern.CASE_INSENSITIVE)
    val m = re.matcher(body)
    return if (m.find()) (m.group(1) ?: "").replace("\\s".toRegex(), "") else null
  }

  private fun extractP2PName(body: String): String? {
    val re = Pattern.compile("uwareejisay\\s+(.+?)\\s*\\(\\d[\\d\\s]+\\)", Pattern.CASE_INSENSITIVE)
    val m = re.matcher(body)
    return if (m.find()) m.group(1)?.trim() else null
  }

  private fun extractMerchantName(body: String): String? {
    val re = Pattern.compile("uwareejisay\\s+(.+?)\\s*\\(\\d+\\)", Pattern.CASE_INSENSITIVE)
    val m = re.matcher(body)
    return if (m.find()) m.group(1)?.trim() else null
  }

  private fun summarizeNotice(body: String): String {
    val one = body.replace("\\s+".toRegex(), " ").trim()
    return if (one.length > 160) one.substring(0, 157) + "..." else one
  }
}

