package expo.modules.evcsms

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone
import java.util.regex.Pattern

/**
 * Multi-provider SMS parse. Must match TypeScript [parseSmsTransaction].
 */
object SmsImportParser {
  private const val TRANSFER_BANK = "Transfer to bank"

  private val evcToBankRe = Pattern.compile(
    "waxaad\\s+\\$?\\s*([\\d.]+)\\s+ku\\s+shubtay\\s+Bank\\s+account:\\s*(.+?)\\s*\\(([^)]+)\\)",
    Pattern.CASE_INSENSITIVE,
  )
  /** Hormuud uses `haraagaagu` and `haraagagu` spellings (1–2 a's before `gu`). */
  private val haraagaRe = Pattern.compile(
    "haraaga{1,2}gu\\s+waa\\s+[\\$\uFF04\uFE69]?\\s*([\\d.]+)",
    Pattern.CASE_INSENSITIVE,
  )
  /** ASCII `$`, fullwidth `＄`, small `﹩`. */
  private val amountRe = Pattern.compile(
    "[\\$\uFF04\uFE69]\\s*([\\d]+(?:[\\.,]\\d+)?)",
    Pattern.CASE_INSENSITIVE,
  )
  private val tarRe = Pattern.compile(
    "Tar:\\s*(\\d{1,2}/\\d{1,2}/\\d{2,4})\\s+(\\d{1,2}:\\d{1,2}:\\d{1,2})",
    Pattern.CASE_INSENSITIVE,
  )
  private val telRe = Pattern.compile("Tel:\\s*(\\+?\\d[\\d\\s-]{6,20})", Pattern.CASE_INSENSITIVE)
  private val phoneLooseRe = Pattern.compile("(?:\\+?252|0)?\\d{9,12}|\\b\\d{9}\\b")
  private val somnetReceiveRe = Pattern.compile(
    "ayaad\\s+ka\\s+heshay\\s+(.+?)\\((\\d[\\d\\s]+)\\)\\s*,\\s*(\\d{1,2}/\\d{1,2}/\\d{2,4}\\s+\\d{1,2}:\\d{1,2}:\\d{1,2})",
    Pattern.CASE_INSENSITIVE,
  )
  /** `waxaad $ X ka heshay NAME(38XXXX54)` — id digits / mask (X), not arbitrary parens (e.g. URLs). */
  private val kaHeshayNameParensRe = Pattern.compile(
    "ka\\s+heshay\\s+(.+?)\\s*\\(([^)]+)\\)",
    Pattern.CASE_INSENSITIVE,
  )
  private val kaHeshayParensIdOk = Pattern.compile("^[\\d+.\\sXx]{3,24}$")
  private val salaamAppSendRe = Pattern.compile(
    "Salaam App:\\s*(\\d*\\.?\\d+)\\s*USD\\s+ayaad\\s+u\\s+wareejisay\\s+(.+?)\\(([^)]+)\\)\\s*,\\s*xilliga:\\s*([^,\\n]+)",
    Pattern.CASE_INSENSITIVE,
  )
  private val salaamTransferInRe = Pattern.compile(
    "(\\d*\\.?\\d+)\\s+USD,\\s*AYAA\\s+LAGU\\s+WAREEJIYAY\\s+KONTADAADA\\s+(\\S+?)\\.\\s+KANA\\s+TIMID\\s+(.+?)\\s+Xarunta:\\s*([^,]+),\\s*Tix:\\s*(\\d+)\\s*,\\s*Xilliga:\\s*([^\\n.]+)",
    Pattern.CASE_INSENSITIVE,
  )
  private val salaamOwnEvcRe = Pattern.compile(
    "(\\d*\\.?\\d+)\\s+USD,\\s*AYAA\\s+LAGU\\s+WAREEJIYAY\\s+KONTADAADA\\s+(\\S+?)\\.\\s+KANA\\s+TIMID\\s+#EX:[\\s\\S]*?#REF:\\s*(\\d+)[\\s\\S]*?Xarunta:\\s*([^,]+),\\s*Tix:\\s*(\\d+)\\s*,\\s*Xilliga:\\s*([^\\n.]+)",
    Pattern.CASE_INSENSITIVE,
  )
  private val salaamExtEvcRe = Pattern.compile(
    "(\\d*\\.?\\d+)\\s+USD,\\s*AYAA\\s+LA\\s+DHIGAY\\s+KOONTO\\s+(\\S+)\\s+KANA\\s+TIMID\\s+EVC\\+\\s*(\\d[\\d\\s]*)[\\s\\S]*?FAAHFAAHIN:\\s*([^,]+)[\\s\\S]*?Tix:\\s*(\\d+)[\\s\\S]*?Xilliga:\\s*([^\\n.]+)",
    Pattern.CASE_INSENSITIVE,
  )
  /** Debit from bank account via linked bank card (Somali template). */
  private val salaamBankCardDebitRe = Pattern.compile(
    "(\\d*\\.?\\d+)\\s*USD\\s*,\\s*ayaa\\s+laga\\s+saaray\\s+(?:koontadaada|kontadaada)\\s+bangiga\\s+(\\S+?)\\s+ayado\\s+la\\s+istimaalayo\\s+Card\\s+kaaga\\s+bangiga\\.?\\s*Xarunta:\\s*([^,]+),\\s*Tix:\\s*(\\d+)\\s*,\\s*Xilliga:\\s*([^\\n.]+)",
    Pattern.CASE_INSENSITIVE,
  )

  private val salaamMerchantWords = listOf(
    "MARKET", "CASHIER", "SHOP", "STORE", "HOTEL", "RESTAURANT", "CAFE", "PHARMACY",
    "SUPERMARKET", "COMPANY", "TRADING", "ELECTRONIC", "FUEL", "PETROL", "STATION",
    "SCHOOL", "UNIVERSITY", "CLINIC", "HOSPITAL",
  )

  fun parse(sender: String, body: String): EvcSmsParsed {
    val senderTrim = sender.trim()
    val bodyNorm = prioritizeEvcHeaderBody(body)
    val provider = SmsProviderDetect.detectProvider(senderTrim, bodyNorm) ?: return ignoredRow(senderTrim)
    return when (provider) {
      "salaam_bank" -> parseSalaam(bodyNorm, senderTrim) ?: ignoredRow(senderTrim)
      "somnet_jeeb", "evc" -> parseEvcShaped(provider, senderTrim, bodyNorm)
      else -> ignoredRow(senderTrim)
    }
  }

  /** Bank / carrier multipart SMS sometimes prepends a line (e.g. MSISDN) before the EVC header. */
  private fun prioritizeEvcHeaderBody(body: String): String {
    val s = body.replace("\r\n", "\n")
    val p = Pattern.compile("\\[-\\s*EVCPlus\\s*-\\]", Pattern.CASE_INSENSITIVE)
    val m = p.matcher(s)
    if (!m.find() || m.start() < 1) return body
    val prefix = s.substring(0, m.start()).trim()
    val fromHeader = s.substring(m.start()).trim()
    if (prefix.isEmpty() || fromHeader.isEmpty()) return body
    return "$fromHeader\n$prefix"
  }

  private fun ignoredRow(sender: String) = EvcSmsParsed(
    provider = "evc",
    kind = "ignored",
    sender = sender,
    amount = null,
    dateIso = null,
    tarRaw = null,
    phone = null,
    name = null,
    merchantName = null,
    noticeSummary = null,
  )

  private fun norm(s: String): String = s.trim().lowercase(Locale.ROOT).replace("\\s+".toRegex(), " ")

  private val dirtayLeadRe =
    Pattern.compile("\\bayaad\\s+u\\s+dirtay\\b|\\bu\\s+dirtay\\b", Pattern.CASE_INSENSITIVE)

  /** Somnet-style send; skips `Tixraac:` digits mistaken as MSISDN. */
  private fun extractSendP2pCounterpartyPhone(inner: String, tix: String?): String? {
    val dm = dirtayLeadRe.matcher(inner)
    if (dm.find()) {
      val tail = inner.substring(dm.start())
      val paren = Pattern.compile("\\(\\s*(252\\d{9})\\s*\\)").matcher(tail)
      if (paren.find()) return paren.group(1)
      val m252 = Pattern.compile("252\\d{9}").matcher(tail)
      if (m252.find()) return m252.group()
    }
    val preTar = inner.split(Pattern.compile("\\bTar:", Pattern.CASE_INSENSITIVE), limit = 2)[0]
    val early = Pattern.compile("252\\d{9}").matcher(preTar)
    if (early.find()) return early.group()

    val pm = phoneLooseRe.matcher(inner)
    while (pm.find()) {
      val p = pm.group().replace("\\s".toRegex(), "")
      if (tix != null && p == tix) continue
      return p
    }
    return null
  }

  private fun parseAmountLoose(raw: String): Double? {
    val n = raw.replace(",", ".").toDoubleOrNull()
    return if (n != null && n > 0) n else null
  }

  /** haraaga / balances may be zero */
  private fun parseBalanceLoose(raw: String): Double? {
    val n = raw.replace(",", ".").toDoubleOrNull()
    return if (n != null && n >= 0) n else null
  }

  private fun stripJeeb(body: String): String =
    Pattern.compile("^\\[-JEEB-\\]\\s*", Pattern.CASE_INSENSITIVE).matcher(body).replaceFirst("").trim()

  private fun classifyEvcShaped(provider: String, senderNorm: String, body: String, inner: String): String {
    val b = norm(inner)
    if (provider == "evc" && senderNorm == "NOTICE") return "bundle_notice"
    if (evcToBankRe.matcher(inner).find()) return "send_p2p"
    if (b.contains("ugu shubtay")) return "topup"
    if (
      b.contains("ka heshay") || b.contains("laguu soo diray") || b.contains("ayaad ka heshay") ||
      Pattern.compile("\\bheshay\\b").matcher(b).find()
    ) {
      return "receive"
    }
    if (
      b.contains("uwareejisay") || b.contains("u wareejisay") ||
      b.contains("diray") || b.contains("wareejisay") ||
      b.contains("ayaad u dirtay") || b.contains("u dirtay")
    ) {
      return if (b.contains("tel:") && b.contains("uwareejisay")) "send_merchant" else "send_p2p"
    }
    return "ignored"
  }

  private fun extractAmount(body: String): Double? {
    val m = amountRe.matcher(body)
    if (!m.find()) return null
    return parseAmountLoose(m.group(1) ?: return null)
  }

  private fun extractBalanceWaa(body: String): Double? {
    val re = Pattern.compile(
      "\\bwaa\\s+[\\$\uFF04\uFE69]\\s*([\\d]+(?:[\\.,]\\d+)?)",
      Pattern.CASE_INSENSITIVE,
    )
    var last: Double? = null
    val m = re.matcher(body)
    while (m.find()) {
      last = parseAmountLoose(m.group(1) ?: continue)
    }
    return last
  }

  private fun extractHaraagaagu(body: String): Double? {
    val m = haraagaRe.matcher(body)
    if (!m.find()) return null
    return parseBalanceLoose(m.group(1) ?: return null)
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
    val dt = Calendar.getInstance()
    dt.set(yy, mm, dd, hh, mi, ss)
    dt.set(Calendar.MILLISECOND, 0)
    val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
      timeZone = TimeZone.getTimeZone("UTC")
    }.format(dt.time)
    return Pair(iso, m.group(0))
  }

  private fun parseDdMmYyTime(raw: String): Pair<String?, String?> {
    val p = Pattern.compile(
      "^(\\d{1,2})/(\\d{1,2})/(\\d{2,4})\\s+(\\d{1,2}):(\\d{1,2}):(\\d{1,2})",
    )
    val m = p.matcher(raw.trim())
    if (!m.find()) return Pair(null, raw)
    val day = m.group(1).toInt()
    val month = m.group(2).toInt() - 1
    var year = m.group(3).toInt()
    if (year < 100) year += 2000
    val hh = m.group(4).toInt()
    val mi = m.group(5).toInt()
    val ss = m.group(6).toInt()
    val dt = Calendar.getInstance()
    dt.set(year, month, day, hh, mi, ss)
    dt.set(Calendar.MILLISECOND, 0)
    val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
      timeZone = TimeZone.getTimeZone("UTC")
    }.format(dt.time)
    return Pair(iso, raw)
  }

  private fun parseSalaamBankDate(raw: String): Pair<String?, String?> {
    val p = Pattern.compile(
      "^(\\d{1,2})-(\\d{1,2})-(\\d{4})\\s+(\\d{1,2}):(\\d{1,2}):(\\d{1,2})\\s*(AM|PM)",
      Pattern.CASE_INSENSITIVE,
    )
    val m = p.matcher(raw.trim())
    if (!m.find()) return Pair(null, raw)
    var hour = m.group(4).toInt()
    val min = m.group(5).toInt()
    val sec = m.group(6).toInt()
    val ap = m.group(7).uppercase(Locale.ROOT)
    if (ap == "PM" && hour < 12) hour += 12
    if (ap == "AM" && hour == 12) hour = 0
    val day = m.group(1).toInt()
    val month = m.group(2).toInt() - 1
    val year = m.group(3).toInt()
    val dt = Calendar.getInstance()
    dt.set(year, month, day, hour, min, sec)
    dt.set(Calendar.MILLISECOND, 0)
    val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
      timeZone = TimeZone.getTimeZone("UTC")
    }.format(dt.time)
    return Pair(iso, raw)
  }

  private fun parseSalaamAppDate(raw: String): Pair<String?, String?> {
    val p = Pattern.compile(
      "^(\\d{1,2})/(\\d{1,2})/(\\d{4})\\s+(\\d{1,2}):(\\d{1,2}):(\\d{1,2})\\s*(AM|PM)",
      Pattern.CASE_INSENSITIVE,
    )
    val m = p.matcher(raw.trim())
    if (!m.find()) return Pair(null, raw)
    var hour = m.group(4).toInt()
    val min = m.group(5).toInt()
    val sec = m.group(6).toInt()
    val ap = m.group(7).uppercase(Locale.ROOT)
    if (ap == "PM" && hour < 12) hour += 12
    if (ap == "AM" && hour == 12) hour = 0
    val month = m.group(1).toInt() - 1
    val day = m.group(2).toInt()
    val year = m.group(3).toInt()
    val dt = Calendar.getInstance()
    dt.set(year, month, day, hour, min, sec)
    dt.set(Calendar.MILLISECOND, 0)
    val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
      timeZone = TimeZone.getTimeZone("UTC")
    }.format(dt.time)
    return Pair(iso, raw)
  }

  private fun salaamMerchantHeuristic(name: String, id: String): Boolean {
    val compact = id.replace("\\s".toRegex(), "")
    if (compact.isNotEmpty() && compact.length < 9) return true
    val u = name.uppercase(Locale.ROOT)
    return salaamMerchantWords.any { u.contains(it) }
  }

  private fun summarizeNotice(body: String): String {
    val one = body.replace("\\s+".toRegex(), " ").trim()
    return if (one.length > 160) one.substring(0, 157) + "..." else one
  }

  private fun parseEvcShaped(provider: String, senderTrim: String, body: String): EvcSmsParsed {
    val senderNorm = senderTrim.uppercase(Locale.ROOT).let {
      when {
        it == "192" || it == "+192" -> "192"
        it == "NOTICE" -> "NOTICE"
        senderTrim.replace("\\D".toRegex(), "") == "192" -> "192"
        else -> it.replace("\\s+".toRegex(), "")
      }
    }
    val inner = if (provider == "somnet_jeeb") stripJeeb(body) else body
    val kind = classifyEvcShaped(provider, senderNorm, body, inner)
    if (kind == "ignored") return ignoredRow(senderTrim).copy(provider = provider)

    val tar = parseTar(inner)
    if (kind == "bundle_notice") {
      return EvcSmsParsed(
        provider = provider,
        kind = kind,
        sender = senderTrim,
        amount = null,
        dateIso = tar.first,
        tarRaw = tar.second,
        phone = null,
        name = null,
        merchantName = null,
        noticeSummary = summarizeNotice(body),
      )
    }

    val bankM = evcToBankRe.matcher(inner)
    if (kind == "send_p2p" && bankM.find()) {
      val amt = parseAmountLoose(bankM.group(1) ?: "") ?: return ignoredRow(senderTrim).copy(provider = provider)
      val tar2 = parseTar(inner)
      return EvcSmsParsed(
        provider = provider,
        kind = "send_p2p",
        sender = senderTrim,
        amount = amt,
        dateIso = tar2.first ?: tar.first,
        tarRaw = tar2.second ?: tar.second,
        phone = null,
        name = bankM.group(2)?.trim(),
        merchantName = null,
        noticeSummary = null,
        rawType = "evc_to_bank",
        accountNumber = bankM.group(3)?.trim(),
        balance = extractHaraagaagu(inner),
        currency = "USD",
        note = TRANSFER_BANK,
      )
    }

    var dateIso = tar.first
    var tarRaw = tar.second
    val primary = extractAmount(inner)
    val balanceAfter = extractBalanceWaa(inner) ?: extractHaraagaagu(inner)

    if (kind == "receive") {
      val sr = somnetReceiveRe.matcher(inner)
      if (sr.find()) {
        val d = parseDdMmYyTime(sr.group(3) ?: "")
        if (d.first != null) dateIso = d.first
        if (d.second != null) tarRaw = d.second
        return EvcSmsParsed(
          provider = provider,
          kind = "receive",
          sender = senderTrim,
          amount = primary,
          dateIso = dateIso,
          tarRaw = tarRaw,
          phone = sr.group(2)?.replace("\\s".toRegex(), ""),
          name = sr.group(1)?.trim(),
          merchantName = null,
          noticeSummary = null,
          balance = balanceAfter,
          currency = if (primary != null) "USD" else null,
        )
      }
    }

    var phone: String? = null
    var name: String? = null
    var merchant: String? = null
    var rawTypeOut: String? = null
    var referenceOut: String? = null
    when (kind) {
      "send_merchant" -> {
        val re = Pattern.compile("uwareejisay\\s+(.+?)\\s*\\(\\d+\\)", Pattern.CASE_INSENSITIVE)
        val m = re.matcher(inner)
        if (m.find()) merchant = m.group(1)?.trim()
        val tm = telRe.matcher(inner)
        phone = if (tm.find()) tm.group(1)?.replace("\\s".toRegex(), "") else {
          val pm = phoneLooseRe.matcher(inner)
          if (pm.find()) pm.group(0)?.replace("\\s".toRegex(), "") else null
        }
      }
      "send_p2p" -> {
        val tixM = Pattern.compile("Tixraac:\\s*(\\d+)", Pattern.CASE_INSENSITIVE).matcher(inner)
        val tix: String? = if (tixM.find()) {
          val raw = tixM.group(1)?.trim()
          referenceOut = raw
          raw?.replace("\\s".toRegex(), "")
        } else null

        val uw = Pattern.compile("uwareejisay\\s+(.+?)\\s*\\(\\d[\\d\\s]+\\)", Pattern.CASE_INSENSITIVE).matcher(inner)
        if (uw.find()) name = uw.group(1)?.trim()

        phone = extractSendP2pCounterpartyPhone(inner, tix)
      }
      "receive" -> {
        val knp = kaHeshayNameParensRe.matcher(inner)
        if (knp.find()) {
          val idRaw = (knp.group(2) ?: "").replace("\\s".toRegex(), "")
          if (knp.group(1) != null && idRaw.length >= 3 && kaHeshayParensIdOk.matcher(idRaw).matches()) {
            name = knp.group(1)?.trim()
            phone = idRaw
          }
        }
        if (phone == null) {
          val ka = Pattern.compile("ka\\s+heshay\\s+(\\+?\\d[\\d\\s]+)", Pattern.CASE_INSENSITIVE).matcher(inner)
          val laguu =
            Pattern.compile("laguu\\s+soo\\s+diray\\s+(\\+?\\d[\\d\\s]+)", Pattern.CASE_INSENSITIVE).matcher(inner)
          phone = when {
            ka.find() -> ka.group(1)?.replace("\\s".toRegex(), "")
            laguu.find() -> laguu.group(1)?.replace("\\s".toRegex(), "")
            else -> null
          }
        }
        if (
          Pattern.compile("via\\s+salaam", Pattern.CASE_INSENSITIVE).matcher(inner).find() ||
          inner.contains("Salaam Somali Bank", ignoreCase = true)
        ) {
          rawTypeOut = "evc_receive_from_bank"
        }
      }
      "topup" -> {
        val re = Pattern.compile("ugu\\s+shubtay\\s+(\\+?\\d[\\d\\s]+)", Pattern.CASE_INSENSITIVE)
        val m = re.matcher(inner)
        if (m.find()) phone = m.group(1)?.replace("\\s".toRegex(), "")
      }
    }

    return EvcSmsParsed(
      provider = provider,
      kind = kind,
      sender = senderTrim,
      amount = primary,
      dateIso = dateIso,
      tarRaw = tarRaw,
      phone = phone,
      name = name,
      merchantName = merchant,
      noticeSummary = null,
      balance = balanceAfter,
      currency = if (primary != null) "USD" else null,
      rawType = rawTypeOut,
      reference = referenceOut,
    )
  }

  private fun parseSalaam(body: String, senderTrim: String): EvcSmsParsed? {
    val bu = body.uppercase(Locale.ROOT)
    val bl = body.lowercase(Locale.ROOT)

    if (bu.contains("SALAAM APP:") && bl.contains("ayaad u wareejisay")) {
      val m = salaamAppSendRe.matcher(body)
      if (!m.find()) return null
      val amount = parseAmountLoose(m.group(1) ?: return null) ?: return null
      val namePart = m.group(2)?.trim() ?: return null
      val idPart = m.group(3)?.trim() ?: return null
      val d = parseSalaamAppDate(m.group(4) ?: "")
      val merchant = salaamMerchantHeuristic(namePart, idPart)
      return EvcSmsParsed(
        provider = "salaam_bank",
        kind = if (merchant) "send_merchant" else "send_p2p",
        sender = senderTrim,
        amount = amount,
        dateIso = d.first,
        tarRaw = d.second,
        phone = idPart.replace("\\s".toRegex(), ""),
        name = if (merchant) null else namePart,
        merchantName = if (merchant) namePart else null,
        noticeSummary = null,
        currency = "USD",
        rawType = if (merchant) "salaam_app_send_merchant" else "salaam_app_send",
      )
    }

    if (Pattern.compile("\\bayaa\\s+laga\\s+saaray\\b", Pattern.CASE_INSENSITIVE).matcher(body).find() &&
      Pattern.compile("card\\s+kaaga\\s+bangiga", Pattern.CASE_INSENSITIVE).matcher(body).find()
    ) {
      val mCard = salaamBankCardDebitRe.matcher(body)
      if (mCard.find()) {
        val amountCard = parseAmountLoose(mCard.group(1) ?: return null) ?: return null
        val dCard = parseSalaamBankDate(mCard.group(5)?.trim() ?: "")
        val tix = mCard.group(4)?.trim() ?: return null
        val outlet = mCard.group(3)?.trim() ?: return null
        return EvcSmsParsed(
          provider = "salaam_bank",
          kind = "send_merchant",
          sender = senderTrim,
          amount = amountCard,
          dateIso = dCard.first,
          tarRaw = dCard.second,
          phone = null,
          name = null,
          merchantName = outlet,
          noticeSummary = null,
          accountNumber = mCard.group(2)?.trim(),
          reference = tix,
          transactionId = tix,
          currency = "USD",
          note = "Salaam Bank card",
          rawType = "salaam_bank_card_debit",
        )
      }
    }

    if (bu.contains("AYAA LAGU WAREEJIYAY KONTADAADA") && bu.contains("KANA TIMID #EX:")) {
      val m = salaamOwnEvcRe.matcher(body)
      if (!m.find()) return null
      val amount = parseAmountLoose(m.group(1) ?: return null) ?: return null
      val d = parseSalaamBankDate(m.group(6)?.trim() ?: "")
      return EvcSmsParsed(
        provider = "salaam_bank",
        kind = "receive",
        sender = senderTrim,
        amount = amount,
        dateIso = d.first,
        tarRaw = d.second,
        phone = null,
        name = "Own EVC transfer",
        merchantName = null,
        noticeSummary = null,
        accountNumber = m.group(2)?.trim()?.trimEnd('.'),
        reference = m.group(3),
        transactionId = m.group(5),
        currency = "USD",
        note = "Own EVC transfer",
        rawType = "salaam_own_evc_to_bank",
      )
    }

    if (bu.contains("AYAA LA DHIGAY KOONTO") && bu.contains("KANA TIMID EVC+")) {
      val m = salaamExtEvcRe.matcher(body)
      if (!m.find()) return null
      val amount = parseAmountLoose(m.group(1) ?: return null) ?: return null
      val d = parseSalaamBankDate(m.group(6)?.trim() ?: "")
      return EvcSmsParsed(
        provider = "salaam_bank",
        kind = "receive",
        sender = senderTrim,
        amount = amount,
        dateIso = d.first,
        tarRaw = d.second,
        phone = m.group(3)?.replace("\\s".toRegex(), ""),
        name = m.group(4)?.trim(),
        merchantName = null,
        noticeSummary = null,
        accountNumber = m.group(2)?.trim(),
        transactionId = m.group(5),
        currency = "USD",
        rawType = "salaam_external_evc_to_bank",
      )
    }

    if (bu.contains("AYAA LAGU WAREEJIYAY KONTADAADA")) {
      val m = salaamTransferInRe.matcher(body)
      if (!m.find()) return null
      val amount = parseAmountLoose(m.group(1) ?: return null) ?: return null
      val d = parseSalaamBankDate(m.group(6)?.trim() ?: "")
      return EvcSmsParsed(
        provider = "salaam_bank",
        kind = "receive",
        sender = senderTrim,
        amount = amount,
        dateIso = d.first,
        tarRaw = d.second,
        phone = null,
        name = m.group(3)?.trim(),
        merchantName = null,
        noticeSummary = null,
        accountNumber = m.group(2)?.trim()?.trimEnd('.'),
        transactionId = m.group(5),
        currency = "USD",
        rawType = "salaam_bank_transfer_in",
      )
    }

    return null
  }
}
