package expo.modules.evcsms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.provider.Telephony
import android.util.Log
import androidx.core.content.ContextCompat
import android.Manifest
import android.content.pm.PackageManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoEvcSmsModule : Module() {
  private var receiver: BroadcastReceiver? = null
  private val tag = "ExpoEvcSms"

  override fun definition() = ModuleDefinition {
    Name("ExpoEvcSms")

    Events("onEvcSms", "onSmsDebug")

    AsyncFunction("setListeningEnabled") { enabled: Boolean ->
      setReceiverEnabled(enabled)
    }

    Function("getListeningEnabled") {
      receiver != null
    }

    Function("getDebugState") {
      val ctx = appContext.reactContext?.applicationContext
      if (ctx == null) {
        mapOf(
          "hasReactContext" to false,
          "receiverRegistered" to (receiver != null)
        )
      } else {
        val hasReceive = ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
        val hasRead = ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED
        val enabledPref = EvcSmsPrefs.isEnabled(ctx)
        mapOf(
          "hasReactContext" to true,
          "receiverRegistered" to (receiver != null),
          "hasReceiveSms" to hasReceive,
          "hasReadSms" to hasRead,
          "enabledPref" to enabledPref
        )
      }
    }

    Function("setNativeEnabled") { enabled: Boolean ->
      val ctx = appContext.reactContext?.applicationContext
      if (ctx != null) {
        EvcSmsPrefs.setEnabled(ctx, enabled)
      }
      true
    }

    Function("fetchAndClearPending") { limit: Int ->
      val ctx = appContext.reactContext?.applicationContext ?: return@Function emptyList<Map<String, Any?>>()
      return@Function EvcSmsDb(ctx).fetchAndClear(limit)
    }

    Function("emitTestEvent") { sender: String, body: String ->
      Log.i(tag, "emitTestEvent(sender=$sender, bodyLen=${body.length})")
      sendEvent(
        "onEvcSms",
        mapOf(
          "sender" to sender,
          "body" to body
        )
      )
      true
    }

    OnDestroy {
      setReceiverEnabled(false)
      EvcSmsBridge.setSink(null)
    }
  }

  private fun setReceiverEnabled(enabled: Boolean) {
    val appCtx = appContext.reactContext?.applicationContext ?: return
    if (enabled) {
      if (receiver != null) return
      Log.i(tag, "Registering SMS_RECEIVED receiver")
      // Register sink for manifest receiver delivery while app is alive
      EvcSmsBridge.setSink { sender, body, bodyLen, forwarded ->
        sendEvent(
          "onSmsDebug",
          mapOf(
            "sender" to sender,
            "bodyLen" to bodyLen,
            "forwarded" to forwarded
          )
        )
        if (forwarded) {
          sendEvent(
            "onEvcSms",
            mapOf(
              "sender" to sender,
              "body" to body
            )
          )
        }
      }

      receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
          if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION != intent?.action) return
          val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
          if (messages.isEmpty()) return
          val fullBody = messages.joinToString(separator = "") { it.messageBody ?: "" }
          val originatingAddress = messages[0].originatingAddress?.trim() ?: ""
          Log.i(tag, "onReceive(sender=$originatingAddress, bodyLen=${fullBody.length})")
          val forwarded = shouldForward(originatingAddress, fullBody)
          // Privacy-safe debug signal: sender + length + forwarded flag only.
          sendEvent(
            "onSmsDebug",
            mapOf(
              "sender" to originatingAddress,
              "bodyLen" to fullBody.length,
              "forwarded" to forwarded
            )
          )
          if (!forwarded) return
          Log.i(tag, "forwarding(sender=$originatingAddress)")
          sendEvent(
            "onEvcSms",
            mapOf(
              "sender" to originatingAddress,
              "body" to fullBody
            )
          )
        }
      }
      val filter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        appCtx.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        @Suppress("UnspecifiedRegisterReceiverFlag")
        appCtx.registerReceiver(receiver, filter)
      }
    } else {
      val r = receiver ?: return
      Log.i(tag, "Unregistering SMS_RECEIVED receiver")
      try {
        appCtx.unregisterReceiver(r)
      } catch (_: Exception) {
      }
      receiver = null
      EvcSmsBridge.setSink(null)
    }
  }

  private fun shouldForward(originatingAddress: String, body: String): Boolean {
    val addr = originatingAddress.uppercase()
    val compactAddr = addr.replace(Regex("\\s+"), "")
    if (compactAddr == "192" || compactAddr == "NOTICE") return true
    if (body.contains("EVCPLUS", ignoreCase = true)) return true
    return false
  }
}
