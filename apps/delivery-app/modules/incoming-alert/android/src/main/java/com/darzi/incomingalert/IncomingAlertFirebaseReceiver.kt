package com.darzi.incomingalert

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * This receiver renders the first user-visible alert synchronously in the FCM
 * delivery window. React Native Firebase still receives the same broadcast and
 * starts headless JS, but alert visibility no longer depends on JS booting.
 */
class IncomingAlertFirebaseReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val extras = intent.extras ?: return
    val payload = IncomingAlertManager.bundleToPayload(extras)
    if (!IncomingAlertManager.isIncoming(payload)) return
    if (IncomingAlertManager.isAppInForeground(context)) return
    IncomingAlertManager.show(context, payload)
  }
}
