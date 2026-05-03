package expo.modules.evcsms

import java.util.Locale

object SmsProviderDetect {
  private fun digitsOnly(s: String): String = s.filter { it.isDigit() }

  private fun normalizeSender(sender: String): String =
    sender.trim().uppercase(Locale.ROOT).replace("\\s+".toRegex(), "")

  /**
   * Which provider this SMS belongs to for forwarding (never "somtel" until implemented).
   */
  fun detectProvider(sender: String, body: String): String? {
    val d = digitsOnly(sender)
    val bu = body.uppercase(Locale.ROOT)

    if (body.contains("[-JEEB-]", ignoreCase = true) || d == "898" || normalizeSender(sender) == "898") {
      return "somnet_jeeb"
    }

    if (
      bu.contains("SALAAM APP:") ||
      bu.contains("AYAA LAGU WAREEJIYAY KONTADAADA") ||
      bu.contains("AYAA LA DHIGAY KOONTO") ||
      bu.contains("KANA TIMID EVC+") ||
      bu.contains("KANA TIMID #EX:")
    ) {
      return "salaam_bank"
    }

    val sNorm = normalizeSender(sender)
    if (sNorm == "NOTICE" || sNorm == "192" || d == "192") {
      return "evc"
    }
    if (
      bu.contains("[-EVCPLUS-]") ||
      bu.contains("EVCPLUS") ||
      body.lowercase(Locale.ROOT).contains("evc plus")
    ) {
      return "evc"
    }

    return null
  }
}
