package expo.modules.evcsms

import android.content.Context

object EvcSmsPrefs {
  private const val PREFS = "expo_evc_sms"
  private const val KEY_ENABLED = "enabled_v1"

  fun isEnabled(context: Context): Boolean {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    return prefs.getBoolean(KEY_ENABLED, false)
  }

  fun setEnabled(context: Context, enabled: Boolean) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    prefs.edit().putBoolean(KEY_ENABLED, enabled).apply()
  }
}

