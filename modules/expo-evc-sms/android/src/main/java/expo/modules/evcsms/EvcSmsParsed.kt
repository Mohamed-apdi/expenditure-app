package expo.modules.evcsms

data class EvcSmsParsed(
  val provider: String,
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
  val subId: Long? = null,
  val rawType: String? = null,
  val reference: String? = null,
  val transactionId: String? = null,
  val accountNumber: String? = null,
  val balance: Double? = null,
  val currency: String? = null,
  val note: String? = null,
)
