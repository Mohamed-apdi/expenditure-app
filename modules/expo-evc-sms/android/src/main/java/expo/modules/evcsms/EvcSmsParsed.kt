package expo.modules.evcsms

data class EvcSmsParsed(
  val kind: String,
  val sender: String,
  val amount: Double?,
  val dateIso: String?,
  val tarRaw: String?,
  val phone: String?,
  val name: String?,
  val merchantName: String?,
  val noticeSummary: String?,
  val slot: Int? = null,
  val subId: Long? = null
)

