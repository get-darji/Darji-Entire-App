package com.darzi.incomingalert

import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.WindowManager
import org.json.JSONObject

class IncomingAlertOverlayService : Service() {
  private var windowManager: WindowManager? = null
  private var overlay: IncomingAlertView? = null
  private var activeRequestKey: String? = null
  private val timeoutHandler = Handler(Looper.getMainLooper())
  private var timeoutRunnable: Runnable? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val serialized = intent?.getStringExtra(IncomingAlertManager.EXTRA_PAYLOAD)
    val payload = try {
      if (serialized != null) JSONObject(serialized) else IncomingAlertManager.currentPayload(this)
    } catch (_: Exception) {
      null
    } ?: run {
      stopSelf()
      return START_NOT_STICKY
    }
    if (IncomingAlertManager.remainingMs(payload) <= 0) {
      IncomingAlertManager.dismiss(this, IncomingAlertManager.requestKey(payload))
      stopSelf()
      return START_NOT_STICKY
    }
    activeRequestKey = IncomingAlertManager.requestKey(payload)

    IncomingAlertManager.createChannel(this)
    val id = IncomingAlertManager.notificationId(IncomingAlertManager.requestKey(payload))
    val notification = IncomingAlertManager.buildNotification(this, payload)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(id, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(id, notification)
    }

    timeoutRunnable?.let(timeoutHandler::removeCallbacks)
    timeoutRunnable = Runnable {
      IncomingAlertManager.dismiss(this, IncomingAlertManager.requestKey(payload))
    }.also { timeoutHandler.postDelayed(it, IncomingAlertManager.remainingMs(payload)) }

    if (Settings.canDrawOverlays(this) && !IncomingAlertManager.isDeviceLocked(this)) {
      showOverlay(payload)
    } else {
      Log.d("DarjiIncomingAlert", "Overlay skipped overlays=${Settings.canDrawOverlays(this)} locked=${IncomingAlertManager.isDeviceLocked(this)}")
    }
    return START_NOT_STICKY
  }

  private fun showOverlay(payload: JSONObject) {
    removeOverlay()
    val manager = getSystemService(WindowManager::class.java)
    val view = IncomingAlertView(
      this,
      payload,
      onAccept = {
        val action = IncomingAlertManager.actionForAccept(payload)
        IncomingAlertManager.performAction(this, action, payload)
      },
      onDecline = { IncomingAlertManager.performAction(this, "DECLINE", payload) },
      onViewDetails = { IncomingAlertManager.performAction(this, "VIEW_DETAILS", payload) },
      onTimeout = { IncomingAlertManager.dismiss(this, IncomingAlertManager.requestKey(payload)) }
    )
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else WindowManager.LayoutParams.TYPE_PHONE
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      type,
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED,
      PixelFormat.TRANSLUCENT
    ).apply { gravity = Gravity.CENTER }
    try {
      manager.addView(view, params)
      windowManager = manager
      overlay = view
      Log.d("DarjiIncomingAlert", "Overlay added key=${IncomingAlertManager.requestKey(payload)}")
    } catch (error: Exception) {
      Log.w("DarjiIncomingAlert", "Failed to add overlay key=${IncomingAlertManager.requestKey(payload)}", error)
      view.dispose()
    }
  }

  private fun removeOverlay() {
    overlay?.let { view ->
      view.dispose()
      try { windowManager?.removeView(view) } catch (_: Exception) { }
    }
    overlay = null
    windowManager = null
  }

  override fun onDestroy() {
    timeoutRunnable?.let(timeoutHandler::removeCallbacks)
    timeoutRunnable = null
    removeOverlay()
    IncomingAlertManager.stopAlertSignal(this, activeRequestKey)
    activeRequestKey = null
    super.onDestroy()
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    IncomingAlertManager.dismiss(this, activeRequestKey)
    stopSelf()
    super.onTaskRemoved(rootIntent)
  }
}
