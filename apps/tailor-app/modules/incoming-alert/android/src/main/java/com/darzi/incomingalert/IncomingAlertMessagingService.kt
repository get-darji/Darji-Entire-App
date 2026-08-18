package com.darzi.incomingalert

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import org.json.JSONObject

class IncomingAlertMessagingService : FirebaseMessagingService() {
  override fun onMessageReceived(message: RemoteMessage) {
    val payload = JSONObject()
    for ((key, value) in message.data) {
      payload.put(key, value)
    }
    message.notification?.title?.let { if (!payload.has("title")) payload.put("title", it) }
    message.notification?.body?.let { if (!payload.has("body")) payload.put("body", it) }
    if (!IncomingAlertManager.isIncoming(payload)) return
    if (IncomingAlertManager.isAppInForeground(this)) return
    IncomingAlertManager.show(this, payload)
  }
}
