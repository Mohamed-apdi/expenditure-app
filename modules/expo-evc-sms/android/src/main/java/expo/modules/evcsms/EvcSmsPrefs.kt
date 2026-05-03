package expo.modules.evcsms

import android.content.Context
import org.json.JSONObject

object EvcSmsPrefs {
  private const val PREFS = "expo_evc_sms"
  /** Legacy single flag — used when JSON config absent. */
  private const val KEY_ENABLED = "enabled_v1"
  private const val KEY_SMS_IMPORT_CONFIG = "sms_import_config_v1"

  data class SmsImportConfig(
    val globalEnabled: Boolean,
    val providerEvc: Boolean,
    val providerSomnetJeeb: Boolean,
    val providerSalaamBank: Boolean,
    val providerSomtel: Boolean,
  )

  private fun defaultFromLegacy(context: Context): SmsImportConfig {
    val legacy = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false)
    return SmsImportConfig(
      globalEnabled = legacy,
      providerEvc = legacy,
      providerSomnetJeeb = false,
      providerSalaamBank = false,
      providerSomtel = false,
    )
  }

  fun getSmsImportConfig(context: Context): SmsImportConfig {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val raw = prefs.getString(KEY_SMS_IMPORT_CONFIG, null) ?: return defaultFromLegacy(context)
    return try {
      val o = JSONObject(raw)
      SmsImportConfig(
        globalEnabled = o.optBoolean("globalEnabled", false),
        providerEvc = o.optBoolean("providerEvc", false),
        providerSomnetJeeb = o.optBoolean("providerSomnetJeeb", false),
        providerSalaamBank = o.optBoolean("providerSalaamBank", false),
        providerSomtel = o.optBoolean("providerSomtel", false),
      )
    } catch (_: Exception) {
      defaultFromLegacy(context)
    }
  }

  fun setSmsImportConfig(context: Context, config: SmsImportConfig) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val o = JSONObject()
    o.put("globalEnabled", config.globalEnabled)
    o.put("providerEvc", config.providerEvc)
    o.put("providerSomnetJeeb", config.providerSomnetJeeb)
    o.put("providerSalaamBank", config.providerSalaamBank)
    o.put("providerSomtel", config.providerSomtel)
    prefs.edit().putString(KEY_SMS_IMPORT_CONFIG, o.toString()).apply()
    // Keep legacy key aligned for older code paths
    prefs.edit().putBoolean(KEY_ENABLED, config.globalEnabled).apply()
  }

  /** @deprecated Prefer [getSmsImportConfig]. */
  fun isEnabled(context: Context): Boolean = getSmsImportConfig(context).globalEnabled

  /** Legacy bridge from JS `setNativeEnabled`: ON = global + EVC; OFF = all providers off. */
  fun setEnabled(context: Context, enabled: Boolean) {
    if (!enabled) {
      setSmsImportConfig(context, SmsImportConfig(false, false, false, false, false))
      return
    }
    val cur = getSmsImportConfig(context)
    setSmsImportConfig(context, cur.copy(globalEnabled = true, providerEvc = true))
  }

  fun isProviderEnabled(context: Context, provider: String): Boolean {
    val c = getSmsImportConfig(context)
    return when (provider) {
      "evc" -> c.providerEvc
      "somnet_jeeb" -> c.providerSomnetJeeb
      "salaam_bank" -> c.providerSalaamBank
      "somtel" -> c.providerSomtel
      else -> false
    }
  }
}
