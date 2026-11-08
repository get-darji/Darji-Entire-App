package com.darji.customer

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import java.util.concurrent.Executors
import java.net.HttpURLConnection
import java.net.URL

class RichNotificationFirebaseReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val extras = intent.extras ?: return
    val data = extras.keySet().associateWith { extras.get(it)?.toString().orEmpty() }
    if (data["darjiRichNotification"] != "true") return
    val pendingResult = goAsync()
    notificationExecutor.execute {
      try {
        showRichNotification(context.applicationContext, data)
      } catch (error: Exception) {
        Log.w("DarjiPush", "Failed to build rich push notification", error)
      } finally {
        pendingResult.finish()
      }
    }
  }

  private fun showRichNotification(context: Context, data: Map<String, String>) {
    val channelId = data["channelId"] ?: "darji-alerts-v2"
    val manager = context.getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) manager.createNotificationChannel(NotificationChannel(channelId, "Darji Alerts", NotificationManager.IMPORTANCE_HIGH))
    val title = (data["richTitle"] ?: data["title"])?.take(120).orEmpty().ifBlank { "Darji" }
    val body = (data["richBodyText"] ?: data["body"])?.take(500).orEmpty()
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP }
    val pending = PendingIntent.getActivity(context, data.hashCode(), launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val icon = context.applicationInfo.icon.takeIf { it != 0 } ?: android.R.drawable.stat_notify_more
    val builder = NotificationCompat.Builder(context, channelId).setSmallIcon(icon).setLargeIcon(BitmapFactory.decodeResource(context.resources, icon)).setColor(0xFFF98A04.toInt()).setContentTitle(title).setContentText(body).setStyle(NotificationCompat.BigTextStyle().bigText(body)).setContentIntent(pending).addAction(android.R.drawable.ic_menu_view, "View", pending).setAutoCancel(true).setPriority(NotificationCompat.PRIORITY_HIGH)
    bitmap(data["largeIconUrl"]).let { if (it != null) builder.setLargeIcon(it) }
    bitmap(data["imageUrl"]).let { if (it != null) builder.setStyle(NotificationCompat.BigPictureStyle().bigPicture(it).bigLargeIcon(null as android.graphics.Bitmap?)) }
    manager.notify((data["campaignId"] ?: title).hashCode() and Int.MAX_VALUE, builder.build())
  }

  private fun bitmap(rawUrl: String?): android.graphics.Bitmap? {
    if (rawUrl.isNullOrBlank() || !rawUrl.startsWith("https://")) return null
    return try {
      (URL(rawUrl).openConnection() as HttpURLConnection).run {
        connectTimeout = 3_500
        readTimeout = 3_500
        instanceFollowRedirects = true
        try {
          if (responseCode !in 200..299) null else inputStream.use { BitmapFactory.decodeStream(it) }
        } finally {
          disconnect()
        }
      }
    } catch (_: Exception) { null }
  }

  companion object {
    private val notificationExecutor = Executors.newCachedThreadPool()
  }
}
