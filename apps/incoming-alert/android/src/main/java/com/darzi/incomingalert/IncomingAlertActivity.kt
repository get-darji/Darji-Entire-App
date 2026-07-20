package com.darzi.incomingalert

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import org.json.JSONObject

class IncomingAlertActivity : Activity() {
  private var content: IncomingAlertView? = null
  private val closeReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      finishAndRemoveTask()
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
    }
    registerCloseReceiver()
    render(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    render(intent)
  }

  private fun render(sourceIntent: Intent) {
    val serialized = sourceIntent.getStringExtra(IncomingAlertManager.EXTRA_PAYLOAD)
    val payload = try {
      if (serialized != null) JSONObject(serialized) else IncomingAlertManager.currentPayload(this)
    } catch (_: Exception) {
      null
    } ?: run {
      finish()
      return
    }
    content?.dispose()
    val view = IncomingAlertView(
      this,
      payload,
      onAccept = {
        val action = if (IncomingAlertManager.isTailor(payload)) "SEND_QUOTE" else "ACCEPT"
        IncomingAlertManager.performAction(this, action, payload)
        finish()
      },
      onDecline = {
        IncomingAlertManager.performAction(this, "DECLINE", payload)
        finish()
      },
      onViewDetails = {
        IncomingAlertManager.performAction(this, "VIEW_DETAILS", payload)
        finish()
      },
      onTimeout = {
        IncomingAlertManager.dismiss(this, IncomingAlertManager.requestKey(payload))
        finish()
      }
    )
    content = view
    setContentView(view)
  }

  private fun registerCloseReceiver() {
    val filter = IntentFilter(IncomingAlertManager.ACTION_CLOSED)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) registerReceiver(closeReceiver, filter, RECEIVER_NOT_EXPORTED)
    else {
      @Suppress("DEPRECATION")
      registerReceiver(closeReceiver, filter)
    }
  }

  @Deprecated("The incoming request must be explicitly accepted or rejected")
  override fun onBackPressed() = Unit

  override fun onDestroy() {
    content?.dispose()
    try { unregisterReceiver(closeReceiver) } catch (_: Exception) { }
    super.onDestroy()
  }
}
