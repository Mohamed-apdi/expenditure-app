package expo.modules.evcsms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.telephony.SubscriptionManager
import android.util.Log

/**
 * Manifest-registered SMS receiver for best reliability on newer Android/OEM builds.
 * Only forwards EVC-related messages (privacy).
 */
class SmsBroadcastReceiver : BroadcastReceiver() {
  private val tag = "ExpoEvcSms"

  override fun onReceive(context: Context?, intent: Intent?) {
    if (context == null) return
    val appCtx = context.applicationContext
    if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION != intent?.action) return
    if (!EvcSmsPrefs.isEnabled(appCtx)) return

    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    if (messages.isEmpty()) return

    val sim = extractSimInfo(intent, messages)
    val body = messages.joinToString(separator = "") { it.messageBody ?: "" }
    val sender = messages[0].originatingAddress?.trim() ?: ""

    val forwarded = shouldForward(sender, body)
    Log.i(tag, "manifestReceiver(sender=$sender, bodyLen=${body.length}, forwarded=$forwarded, slot=${sim.slot}, subId=${sim.subId})")

    if (!forwarded) return

    val parsed = EvcSmsParser.parse(sender, body).copy(
      slot = sim.slot,
      subId = sim.subId
    )
    if (parsed.kind == "ignored") return
    // If JS is running, it applies from the live event — do not queue the same SMS (would duplicate on resume).
    val deliveredLive = EvcSmsBridge.notifySmsReceived(
      sender = sender,
      body = body,
      forwarded = forwarded,
      slot = sim.slot,
      subId = sim.subId
    )
    if (!deliveredLive) {
      // Privacy: persist only parsed fields (never full SMS).
      // applicationContext: same DB path as JS peek/delete; survives receiver Context quirks.
      EvcSmsDb(appCtx).insert(parsed)
    }
  }

  private data class SimInfo(
    val slot: Int?,
    val subId: Long?
  )

  private fun extractSimInfo(intent: Intent, messages: Array<android.telephony.SmsMessage>): SimInfo {
    // Prefer standardized extras if present (may vary by OEM/OS for SMS_RECEIVED_ACTION).
    val extras = intent.extras
    val slotFromExtras = extras?.let { b ->
      when {
        b.containsKey("slot") -> b.getInt("slot", -1)
        b.containsKey(SubscriptionManager.EXTRA_SLOT_INDEX) -> b.getInt(SubscriptionManager.EXTRA_SLOT_INDEX, -1)
        b.containsKey("android.telephony.extra.SLOT_INDEX") -> b.getInt("android.telephony.extra.SLOT_INDEX", -1)
        else -> -1
      }
    } ?: -1
    val slot = slotFromExtras.takeIf { it >= 0 }

    val subFromExtras = extras?.let { b ->
      when {
        b.containsKey("subscription") -> (b.get("subscription") as? Number)?.toLong()
        b.containsKey(SubscriptionManager.EXTRA_SUBSCRIPTION_INDEX) ->
          b.getInt(SubscriptionManager.EXTRA_SUBSCRIPTION_INDEX, -1).takeIf { it >= 0 }?.toLong()
        b.containsKey("android.telephony.extra.SUBSCRIPTION_INDEX") ->
          b.getInt("android.telephony.extra.SUBSCRIPTION_INDEX", -1).takeIf { it >= 0 }?.toLong()
        else -> null
      }
    }

    // Some devices expose subscription id on SmsMessage. Use reflection to stay compatible.
    val subFromMessage = try {
      val m0 = messages[0]
      val method = m0.javaClass.methods.firstOrNull {
        it.name == "getSubscriptionId" || it.name == "getSubId"
      }
      (method?.invoke(m0) as? Number)?.toLong()
    } catch (_: Throwable) {
      null
    }

    // Some devices return 0 for unknown subscription on SmsMessage; treat that as "missing".
    val subFromMessageSafe = subFromMessage?.takeIf { it > 0 }
    val subId = subFromMessageSafe ?: subFromExtras
    val derivedSlot = if (subId != null) {
      try {
        // Returns 0/1 for SIM slot index on modern Android, no extra permission required.
        SubscriptionManager.getSlotIndex(subId.toInt()).takeIf { it >= 0 }
      } catch (_: Throwable) {
        null
      }
    } else null

    return SimInfo(
      slot = slot ?: derivedSlot,
      subId = subId
    )
  }

  private fun shouldForward(originatingAddress: String, body: String): Boolean {
    val addr = originatingAddress.uppercase().replace(Regex("\\s+"), "")
    if (addr == "192" || addr == "NOTICE") return true
    if (body.contains("EVCPLUS", ignoreCase = true)) return true
    return false
  }
}

