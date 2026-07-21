package com.darzi.incomingalert

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONObject

class IncomingAlertActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val serialized = intent.getStringExtra(IncomingAlertManager.EXTRA_PAYLOAD) ?: return
    val payload = try { JSONObject(serialized) } catch (_: Exception) { return }
    val action = intent.getStringExtra(IncomingAlertManager.EXTRA_ACTION) ?: return
    IncomingAlertManager.performAction(context, action, payload)
  }
}
