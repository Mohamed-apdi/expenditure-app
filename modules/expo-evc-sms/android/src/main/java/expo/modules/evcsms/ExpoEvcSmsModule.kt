package expo.modules.evcsms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * JS bridge for EVC SMS. Incoming SMS are delivered only via [SmsBroadcastReceiver]
 * + [EvcSmsBridge] (single path) — no second dynamic SMS_RECEIVED receiver.
 */
class ExpoEvcSmsModule : Module() {
  private var bridgeActive = false
  private val tag = "ExpoEvcSms"

  /**
   * SQLite queue lives in app storage; only needs a stable [Context].
   * Prefer [appContext.reactContext] but fall back to [appContext.currentActivity] when the bridge
   * isn't attached yet (avoids peek returning empty on cold start).
   */
  private fun dbContext(): Context? {
    return appContext.reactContext?.applicationContext
      ?: appContext.currentActivity?.applicationContext
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoEvcSms")

    Events("onEvcSms", "onSmsDebug")

    AsyncFunction("setListeningEnabled") { enabled: Boolean ->
      setBridgeEnabled(enabled)
    }

    Function("getListeningEnabled") {
      bridgeActive
    }

    Function("getDebugState") {
      val ctx = appContext.reactContext?.applicationContext
      if (ctx == null) {
        mapOf(
          "hasReactContext" to false,
          "receiverRegistered" to bridgeActive
        )
      } else {
        val hasReceive = ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
        val enabledPref = EvcSmsPrefs.isEnabled(ctx)
        mapOf(
          "hasReactContext" to true,
          "receiverRegistered" to bridgeActive,
          "hasReceiveSms" to hasReceive,
          "enabledPref" to enabledPref
        )
      }
    }

    Function("setNativeEnabled") { enabled: Boolean ->
      dbContext()?.let { EvcSmsPrefs.setEnabled(it, enabled) }
      true
    }

    Function("peekPendingRows") { limit: Int ->
      val ctx = dbContext() ?: return@Function emptyList<Map<String, Any?>>()
      return@Function EvcSmsDb(ctx).peek(limit)
    }

    Function("deletePendingRowsByIds") { ids: List<Any?> ->
      val ctx = dbContext() ?: return@Function false
      val longs = ids.mapNotNull { (it as? Number)?.toLong() }
      EvcSmsDb(ctx).deleteByIds(longs)
      true
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
      setBridgeEnabled(false)
      EvcSmsBridge.setSink(null)
    }
  }

  private fun setBridgeEnabled(enabled: Boolean) {
    appContext.reactContext?.applicationContext ?: return
    if (enabled) {
      if (bridgeActive) return
      Log.i(tag, "EVC SMS bridge on (manifest receiver + sink only)")
      bridgeActive = true
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
    } else {
      if (!bridgeActive) return
      Log.i(tag, "EVC SMS bridge off")
      bridgeActive = false
      EvcSmsBridge.setSink(null)
    }
  }
}
