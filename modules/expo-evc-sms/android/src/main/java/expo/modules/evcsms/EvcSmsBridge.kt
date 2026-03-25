package expo.modules.evcsms

import android.content.Context
import android.util.Log
/**
 * Lightweight bridge between the manifest BroadcastReceiver and the Expo module.
 * - If the JS runtime is active, the module registers a sink and events are delivered immediately.
 * - If not, we persist parsed rows in SQLite (see SmsBroadcastReceiver).
 */
object EvcSmsBridge {
  private const val TAG = "ExpoEvcSms"

  @Volatile
  private var sink: ((sender: String, body: String, bodyLen: Int, forwarded: Boolean) -> Unit)? = null

  fun setSink(s: ((String, String, Int, Boolean) -> Unit)?) {
    sink = s
  }

  fun onSms(context: Context, sender: String, body: String, forwarded: Boolean) {
    val len = body.length
    val currentSink = sink
    if (currentSink != null) {
      currentSink(sender, body, len, forwarded)
      return
    }
    // When app runtime isn't active, SMS is persisted by the manifest receiver into SQLite.
    // We intentionally do not store raw SMS bodies here.
  }

  fun flushQueued(context: Context, deliver: (sender: String, body: String) -> Unit) {
    // No-op: legacy queue removed.
  }
}

