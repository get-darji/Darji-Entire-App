package com.darzi.incomingalert

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * This receiver renders the first user-visible alert synchronously in the FCM
 * delivery window. React Native Firebase still receives the same broadcast and
 * starts headless JS, but alert visibility no longer depends on JS booting.
 */
class IncomingAlertFirebaseReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val extras = intent.extras ?: return
    val payload = IncomingAlertManager.bundleToPayload(extras)
    Log.d("DarjiIncomingAlert", "FCM broadcast received action=${intent.action} keys=${payload.keys().asSequence().joinToString(",")} incoming=${IncomingAlertManager.isIncoming(payload)} foreground=${IncomingAlertManager.isAppInForeground(context)}")
    if (!IncomingAlertManager.isIncoming(payload)) return
    IncomingAlertManager.show(context, payload)
  }
}
