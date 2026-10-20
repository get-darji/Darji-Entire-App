package com.darji.customer

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.os.Build
import androidx.core.app.NotificationCompat
import java.net.HttpURLConnection
import java.net.URL

class RichNotificationFirebaseReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val data = intent.extras?.keySet()?.associateWith { intent.extras?.getString(it) ?: "" } ?: return
    if (data["darjiRichNotification"] != "true") return
    val channelId = data["channelId"] ?: "darji-alerts-v2"
    val manager = context.getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) manager.createNotificationChannel(NotificationChannel(channelId, "Darji Alerts", NotificationManager.IMPORTANCE_HIGH))
    val title = data["title"]?.take(120).orEmpty().ifBlank { "Darji" }
    val body = data["body"]?.take(500).orEmpty()
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP }
    val pending = PendingIntent.getActivity(context, data.hashCode(), launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val icon = context.applicationInfo.icon.takeIf { it != 0 } ?: android.R.drawable.stat_notify_more
    val builder = NotificationCompat.Builder(context, channelId).setSmallIcon(icon).setLargeIcon(BitmapFactory.decodeResource(context.resources, icon)).setColor(0xFFF98A04.toInt()).setContentTitle(title).setContentText(body).setStyle(NotificationCompat.BigTextStyle().bigText(body)).setContentIntent(pending).setAutoCancel(true).setPriority(NotificationCompat.PRIORITY_HIGH)
    bitmap(data["largeIconUrl"]).let { if (it != null) builder.setLargeIcon(it) }
    bitmap(data["imageUrl"]).let { if (it != null) builder.setStyle(NotificationCompat.BigPictureStyle().bigPicture(it).bigLargeIcon(null as android.graphics.Bitmap?)) }
    manager.notify((data["campaignId"] ?: title).hashCode() and Int.MAX_VALUE, builder.build())
  }

  private fun bitmap(rawUrl: String?) = try {
    if (rawUrl.isNullOrBlank() || !rawUrl.startsWith("https://")) null else (URL(rawUrl).openConnection() as HttpURLConnection).run { connectTimeout = 4_000; readTimeout = 6_000; inputStream.use { BitmapFactory.decodeStream(it) } }
  } catch (_: Exception) { null }
}
