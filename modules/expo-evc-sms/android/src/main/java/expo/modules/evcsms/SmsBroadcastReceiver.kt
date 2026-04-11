package expo.modules.evcsms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

/**
 * Manifest-registered SMS receiver for best reliability on newer Android/OEM builds.
 * Only forwards EVC-related messages (privacy).
 */
class SmsBroadcastReceiver : BroadcastReceiver() {
  private val tag = "ExpoEvcSms"

  override fun onReceive(context: Context?, intent: Intent?) {
    if (context == null) return
    if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION != intent?.action) return
    if (!EvcSmsPrefs.isEnabled(context)) return

    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    if (messages.isEmpty()) return

    val body = messages.joinToString(separator = "") { it.messageBody ?: "" }
    val sender = messages[0].originatingAddress?.trim() ?: ""

    val forwarded = shouldForward(sender, body)
    Log.i(tag, "manifestReceiver(sender=$sender, bodyLen=${body.length}, forwarded=$forwarded)")

    if (!forwarded) return

    val parsed = EvcSmsParser.parse(sender, body)
    if (parsed.kind == "ignored") return
    // If JS is running, it applies from the live event — do not queue the same SMS (would duplicate on resume).
    val deliveredLive = EvcSmsBridge.notifySmsReceived(sender, body, forwarded)
    if (!deliveredLive) {
      // Privacy: persist only parsed fields (never full SMS).
      EvcSmsDb(context).insert(parsed)
    }
  }

  private fun shouldForward(originatingAddress: String, body: String): Boolean {
    val addr = originatingAddress.uppercase().replace(Regex("\\s+"), "")
    if (addr == "192" || addr == "NOTICE") return true
    if (body.contains("EVCPLUS", ignoreCase = true)) return true
    return false
  }
}

