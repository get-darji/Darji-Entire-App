package com.darzi.incomingalert

import android.app.ActivityManager
import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

internal object IncomingAlertManager {
  const val CHANNEL_ID = "darji-incoming-orders-v3"
  const val EXTRA_PAYLOAD = "darji.incomingAlert.payload"
  const val EXTRA_ACTION = "darji.incomingAlert.action"
  const val ACTION_ACCEPT = "com.darzi.incomingalert.ACCEPT"
  const val ACTION_DECLINE = "com.darzi.incomingalert.DECLINE"
  const val ACTION_VIEW = "com.darzi.incomingalert.VIEW"
  const val ACTION_CLOSED = "com.darzi.incomingalert.CLOSED"

  private const val PREFS = "darji.incomingAlert"
  private const val CURRENT_PAYLOAD = "currentPayload"
  private const val CURRENT_KEY = "currentKey"
  private const val PENDING_ACTION = "pendingAction"
  private const val DEFAULT_DURATION_MS = 30_000L
  private const val MAX_DURATION_MS = 60_000L

  fun bundleToPayload(bundle: Bundle): JSONObject {
    val payload = JSONObject()
    for (key in bundle.keySet()) {
      if (key.startsWith("google.") || key.startsWith("gcm.") || key == "from" || key == "collapse_key") continue
      when (val value = bundle.get(key)) {
        is String, is Number, is Boolean -> payload.put(key, value)
      }
    }
    bundle.getString("gcm.n.title")?.let { if (!payload.has("title")) payload.put("title", it) }
    bundle.getString("gcm.n.body")?.let { if (!payload.has("body")) payload.put("body", it) }
    return payload
  }

  fun isIncoming(payload: JSONObject): Boolean {
    if (payload.optString("darjiIncomingRequest").equals("true", ignoreCase = true)) return true
    if (payload.optString("channelId") == CHANNEL_ID || payload.optString("channelId") == "darji-incoming-requests-v1") return true
    val category = payload.optString("categoryId") + " " + payload.optString("categoryIdentifier")
    if (category.contains("TAILOR_NEW_REQUEST") || category.contains("DELIVERY_PICKUP_REQUEST")) return true
    val kind = (payload.optString("type") + " " + payload.optString("event")).uppercase(Locale.ROOT)
    return kind.contains("INCOMING") || kind.contains("NEW_REQUEST") || kind.contains("REQUEST_CREATED") ||
      kind.contains("TASK_CREATED") || kind.contains("DELIVERY_BATCH_READY") || kind.contains("PICKUP_ASSIGNED")
  }

  fun requestKey(payload: JSONObject): String {
    for (key in arrayOf("requestId", "taskId", "pickupId", "orderId", "id", "batchId")) {
      val value = payload.optString(key)
      if (value.isNotBlank()) return value
    }
    return "current"
  }

  fun notificationId(key: String): Int = (key.hashCode() and Int.MAX_VALUE).coerceAtLeast(1000)

  fun remainingMs(payload: JSONObject): Long {
    val explicitMillis = payload.optLong("expiresAtMillis", 0L)
    val expiresAt = if (explicitMillis > 0) explicitMillis else parseTimestamp(payload.optString("expiresAt"))
    if (expiresAt <= 0) return DEFAULT_DURATION_MS
    return (expiresAt - System.currentTimeMillis()).coerceIn(0L, MAX_DURATION_MS)
  }

  private fun parseTimestamp(value: String): Long {
    if (value.isBlank()) return 0L
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      try {
        return java.time.Instant.parse(value).toEpochMilli()
      } catch (_: Exception) {
        // Fall through for timestamps without an ISO-8601 zone suffix.
      }
    }
    return try {
      SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
      }.parse(value)?.time ?: 0L
    } catch (_: Exception) {
      0L
    }
  }

  fun isAppInForeground(context: Context): Boolean {
    val process = ActivityManager.RunningAppProcessInfo()
    ActivityManager.getMyMemoryState(process)
    return process.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
  }

  fun canDrawOverlays(context: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)

  fun canUseFullScreenIntent(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return true
    return context.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()
  }

  fun notificationsEnabled(context: Context): Boolean =
    context.getSystemService(NotificationManager::class.java).areNotificationsEnabled()

  fun createChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java)
    val soundId = context.resources.getIdentifier("requests", "raw", context.packageName)
    val soundUri = if (soundId != 0) Uri.parse("android.resource://${context.packageName}/$soundId") else Settings.System.DEFAULT_NOTIFICATION_URI
    val audioAttributes = AudioAttributes.Builder()
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
      .build()
    val channel = NotificationChannel(CHANNEL_ID, "Incoming orders", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Urgent Tailor and Delivery Partner order requests"
      enableLights(true)
      lightColor = Color.rgb(246, 163, 19)
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 700, 250, 700, 250, 900)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      setBypassDnd(false)
      setSound(soundUri, audioAttributes)
    }
    manager.createNotificationChannel(channel)
  }

  fun show(context: Context, payload: JSONObject) {
    if (!isIncoming(payload) || remainingMs(payload) <= 0) return
    val appContext = context.applicationContext
    val key = requestKey(payload)
    val id = notificationId(key)
    appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putString(CURRENT_PAYLOAD, payload.toString())
      .putString(CURRENT_KEY, key)
      .apply()
    createChannel(appContext)
    appContext.getSystemService(NotificationManager::class.java).notify(id, buildNotification(appContext, payload))

    if (!isAppInForeground(appContext)) {
      val serviceIntent = Intent(appContext, IncomingAlertOverlayService::class.java).putExtra(EXTRA_PAYLOAD, payload.toString())
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) appContext.startForegroundService(serviceIntent)
        else appContext.startService(serviceIntent)
      } catch (_: Exception) {
        // High-priority FCM normally permits this start. If Android/OEM policy rejects
        // it, the already-posted heads-up/full-screen notification remains the fallback.
      }
    }
  }

  fun buildNotification(context: Context, payload: JSONObject): Notification {
    val key = requestKey(payload)
    val id = notificationId(key)
    val title = payload.optString("title").ifBlank { "Incoming order" }
    val body = payload.optString("body").ifBlank { "A new order is waiting for your response." }
    val payloadString = payload.toString()
    val activityIntent = Intent(context, IncomingAlertActivity::class.java).putExtra(EXTRA_PAYLOAD, payloadString)
    val activityPendingIntent = PendingIntent.getActivity(
      context,
      id,
      activityIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val acceptAction = if (isTailor(payload)) "SEND_QUOTE" else "ACCEPT"
    val acceptLabel = if (isTailor(payload)) "Send quote" else "Accept"
    val acceptIntent = actionPendingIntent(context, id, ACTION_ACCEPT, acceptAction, payloadString)
    val declineIntent = actionPendingIntent(context, id, ACTION_DECLINE, "DECLINE", payloadString)
    val iconId = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
      .takeIf { it != 0 } ?: context.applicationInfo.icon

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(context, CHANNEL_ID) else Notification.Builder(context)
    builder
      .setSmallIcon(iconId)
      .setColor(Color.rgb(246, 163, 19))
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(Notification.BigTextStyle().bigText(body))
      .setContentIntent(activityPendingIntent)
      .setCategory(Notification.CATEGORY_CALL)
      .setPriority(Notification.PRIORITY_MAX)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setAutoCancel(false)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setWhen(System.currentTimeMillis())
      .setShowWhen(true)
      .addAction(Notification.Action.Builder(0, acceptLabel, acceptIntent).build())
      .addAction(Notification.Action.Builder(0, "Reject", declineIntent).build())

    if (canUseFullScreenIntent(context)) {
      builder.setFullScreenIntent(activityPendingIntent, true)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      builder.setTimeoutAfter(remainingMs(payload))
    } else {
      val soundId = context.resources.getIdentifier("requests", "raw", context.packageName)
      val soundUri = if (soundId != 0) Uri.parse("android.resource://${context.packageName}/$soundId") else Settings.System.DEFAULT_NOTIFICATION_URI
      builder.setSound(soundUri)
      builder.setVibrate(longArrayOf(0, 700, 250, 700, 250, 900))
    }

    return builder.build().apply {
      flags = flags or Notification.FLAG_INSISTENT or Notification.FLAG_ONGOING_EVENT
    }
  }

  private fun actionPendingIntent(
    context: Context,
    notificationId: Int,
    intentAction: String,
    appAction: String,
    payload: String
  ): PendingIntent {
    val intent = Intent(context, IncomingAlertActionReceiver::class.java)
      .setAction(intentAction)
      .putExtra(EXTRA_ACTION, appAction)
      .putExtra(EXTRA_PAYLOAD, payload)
    return PendingIntent.getBroadcast(
      context,
      notificationId xor intentAction.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  fun isTailor(payload: JSONObject): Boolean {
    val category = payload.optString("categoryId") + payload.optString("categoryIdentifier")
    val kind = payload.optString("type") + payload.optString("event")
    return category.contains("TAILOR", ignoreCase = true) || kind.contains("TAILOR", ignoreCase = true)
  }

  fun currentPayload(context: Context): JSONObject? {
    val value = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(CURRENT_PAYLOAD, null) ?: return null
    return try { JSONObject(value) } catch (_: Exception) { null }
  }

  fun performAction(context: Context, action: String, payload: JSONObject) {
    val pending = JSONObject().put("actionIdentifier", action).put("data", payload)
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(PENDING_ACTION, pending.toString()).commit()
    dismiss(context, requestKey(payload))
    context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { launchIntent ->
      launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      launchIntent.putExtra(EXTRA_ACTION, action)
      launchIntent.putExtra(EXTRA_PAYLOAD, payload.toString())
      context.startActivity(launchIntent)
    }
  }

  fun consumePendingAction(context: Context): String? {
    val preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    synchronized(this) {
      val value = preferences.getString(PENDING_ACTION, null)
      if (value != null) preferences.edit().remove(PENDING_ACTION).commit()
      return value
    }
  }

  fun dismiss(context: Context, requestedKey: String? = null) {
    val appContext = context.applicationContext
    val preferences = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val currentKey = preferences.getString(CURRENT_KEY, null)
    val key = requestedKey ?: currentKey
    if (key != null) appContext.getSystemService(NotificationManager::class.java).cancel(notificationId(key))
    if (requestedKey == null || requestedKey == currentKey) {
      preferences.edit().remove(CURRENT_PAYLOAD).remove(CURRENT_KEY).apply()
      appContext.stopService(Intent(appContext, IncomingAlertOverlayService::class.java))
      appContext.sendBroadcast(Intent(ACTION_CLOSED).setPackage(appContext.packageName))
    }
  }

  fun isDeviceLocked(context: Context): Boolean =
    context.getSystemService(KeyguardManager::class.java).isKeyguardLocked
}
