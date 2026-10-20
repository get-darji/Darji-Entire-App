package com.darji.incomingalert

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.graphics.BitmapFactory
import android.os.Build
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Standard Android rendering for admin campaigns; incoming-order handling remains separate. */
internal object RichNotificationRenderer {
  fun show(context: Context, payload: JSONObject) {
    val channelId = payload.optString("channelId").ifBlank { "darji-alerts-v2" }
    val manager = context.getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) manager.createNotificationChannel(NotificationChannel(channelId, "Darji Alerts", NotificationManager.IMPORTANCE_HIGH))
    val title = payload.optString("title").ifBlank { "Darji" }.take(120)
    val body = payload.optString("body").take(500)
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply { flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP or android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP }
    val content = PendingIntent.getActivity(context, payload.toString().hashCode(), launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val icon = context.applicationInfo.icon.takeIf { it != 0 } ?: android.R.drawable.stat_notify_more
    val builder = NotificationCompat.Builder(context, channelId)
      .setSmallIcon(icon).setLargeIcon(BitmapFactory.decodeResource(context.resources, icon)).setColor(0xFFF98A04.toInt())
      .setContentTitle(title).setContentText(body).setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setContentIntent(content).setAutoCancel(true).setPriority(NotificationCompat.PRIORITY_HIGH)
    bitmap(payload.optString("largeIconUrl")).let { if (it != null) builder.setLargeIcon(it) }
    bitmap(payload.optString("imageUrl")).let { if (it != null) builder.setStyle(NotificationCompat.BigPictureStyle().bigPicture(it).bigLargeIcon(null as android.graphics.Bitmap?)) }
    manager.notify(payload.optString("campaignId", title).hashCode() and Int.MAX_VALUE, builder.build())
  }

  private fun bitmap(url: String) = try {
    if (!url.startsWith("https://")) null else (URL(url).openConnection() as HttpURLConnection).run { connectTimeout = 4_000; readTimeout = 6_000; inputStream.use { BitmapFactory.decodeStream(it) } }
  } catch (_: Exception) { null }
}
