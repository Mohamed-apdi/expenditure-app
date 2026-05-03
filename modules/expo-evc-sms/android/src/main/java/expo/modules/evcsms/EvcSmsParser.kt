package expo.modules.evcsms

/**
 * Backward-compatible entry; implementation lives in [SmsImportParser].
 */
object EvcSmsParser {
  fun classify(sender: String, body: String): String =
    SmsImportParser.parse(sender, body).kind

  fun parse(sender: String, body: String): EvcSmsParsed =
    SmsImportParser.parse(sender, body)
}
