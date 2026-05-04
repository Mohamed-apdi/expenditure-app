package expo.modules.evcsms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.telephony.SubscriptionManager
import android.util.Log

/**
 * Manifest-registered SMS receiver. Forwards only when global SMS import is on,
 * a supported provider is detected, and that provider is enabled in native prefs.
 */
class SmsBroadcastReceiver : BroadcastReceiver() {
  private val tag = "ExpoEvcSms"

  override fun onReceive(context: Context?, intent: Intent?) {
    if (context == null) return
    val appCtx = context.applicationContext
    if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION != intent?.action) return

    val cfg = EvcSmsPrefs.getSmsImportConfig(appCtx)
    if (!cfg.globalEnabled) return

    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    if (messages.isEmpty()) return

    val sim = extractSimInfo(intent, messages)
    val body = messages.joinToString(separator = "") { it.messageBody ?: "" }
    val sender = messages[0].originatingAddress?.trim() ?: ""

    val forwarded = shouldForward(appCtx, sender, body)
    Log.i(tag, "manifestReceiver(sender=$sender, bodyLen=${body.length}, forwarded=$forwarded, slot=${sim.slot}, subId=${sim.subId})")

    if (!forwarded) return

    val parsed = SmsImportParser.parse(sender, body).copy(
      slot = sim.slot,
      subId = sim.subId,
    )
    if (parsed.kind == "ignored") return

    val deliveredLive = EvcSmsBridge.notifySmsReceived(
      sender = sender,
      body = body,
      forwarded = forwarded,
      slot = sim.slot,
      subId = sim.subId,
    )
    if (!deliveredLive) {
      val db = EvcSmsDb(appCtx)
      val rowId = db.insert(parsed)
      if (rowId != -1L &&
        parsed.kind != "bundle_notice" &&
        cfg.importTransactionNotificationsEnabled
      ) {
        val notificationId = ((rowId % 1_000_000L) + 9_000_000L).toInt()
        if (SmsImportNotificationHelper.tryShowTransactionCaptured(appCtx, notificationId)) {
          db.markCapturedNotificationShown(rowId)
        }
      }
    }
  }

  private data class SimInfo(
    val slot: Int?,
    val subId: Long?,
  )

  private fun extractSimInfo(intent: Intent, messages: Array<android.telephony.SmsMessage>): SimInfo {
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

    val subFromMessage = try {
      val m0 = messages[0]
      val method = m0.javaClass.methods.firstOrNull {
        it.name == "getSubscriptionId" || it.name == "getSubId"
      }
      (method?.invoke(m0) as? Number)?.toLong()
    } catch (_: Throwable) {
      null
    }

    val subFromMessageSafe = subFromMessage?.takeIf { it > 0 }
    val subId = subFromMessageSafe ?: subFromExtras
    val derivedSlot = if (subId != null) {
      try {
        SubscriptionManager.getSlotIndex(subId.toInt()).takeIf { it >= 0 }
      } catch (_: Throwable) {
        null
      }
    } else null

    return SimInfo(
      slot = slot ?: derivedSlot,
      subId = subId,
    )
  }

  private fun shouldForward(context: Context, originatingAddress: String, body: String): Boolean {
    val provider = SmsProviderDetect.detectProvider(originatingAddress, body) ?: return false
    if (provider == "somtel") return false
    return EvcSmsPrefs.isProviderEnabled(context, provider)
  }
}
