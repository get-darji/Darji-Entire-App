package com.darzi.incomingalert

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import android.util.Log
import org.json.JSONObject

class IncomingAlertMessagingService : FirebaseMessagingService() {
  override fun onMessageReceived(message: RemoteMessage) {
    val payload = JSONObject()
    for ((key, value) in message.data) {
      payload.put(key, value)
    }
    message.notification?.title?.let { if (!payload.has("title")) payload.put("title", it) }
    message.notification?.body?.let { if (!payload.has("body")) payload.put("body", it) }
    Log.d("DarjiIncomingAlert", "FCM service received message keys=${payload.keys().asSequence().joinToString(",")} incoming=${IncomingAlertManager.isIncoming(payload)} foreground=${IncomingAlertManager.isAppInForeground(this)}")
    if (!IncomingAlertManager.isIncoming(payload)) return
    IncomingAlertManager.show(this, payload)
  }
}
