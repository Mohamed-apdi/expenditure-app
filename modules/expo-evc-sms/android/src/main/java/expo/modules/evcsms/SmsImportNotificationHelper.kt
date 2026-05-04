package expo.modules.evcsms

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

/**
 * Queued SMS path only: shows a local notification when JS was not live.
 * Does not request [Manifest.permission.POST_NOTIFICATIONS]; returns false if denied.
 */
object SmsImportNotificationHelper {
  const val CHANNEL_ID = "sms-import-detected"

  fun tryShowTransactionCaptured(context: Context, notificationId: Int): Boolean {
    return try {
      if (Build.VERSION.SDK_INT >= 33) {
        if (
          ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.POST_NOTIFICATIONS,
          ) != PackageManager.PERMISSION_GRANTED
        ) {
          return false
        }
      }

      val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && !nm.areNotificationsEnabled()) {
        return false
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val ch = NotificationChannel(
          CHANNEL_ID,
          "SMS import detected",
          NotificationManager.IMPORTANCE_DEFAULT,
        )
        nm.createNotificationChannel(ch)
      }

      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
        ?: return false
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      val piFlags =
        if (Build.VERSION.SDK_INT >= 23) {
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
          PendingIntent.FLAG_UPDATE_CURRENT
        }
      val pending = PendingIntent.getActivity(context, notificationId, launch, piFlags)

      val notif = NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(android.R.drawable.ic_dialog_info)
        .setContentTitle("Transaction captured")
        .setContentText("Open Qoondeeye to save it to your records.")
        .setContentIntent(pending)
        .setAutoCancel(true)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .build()

      nm.notify(notificationId, notif)
      true
    } catch (_: Throwable) {
      false
    }
  }
}
