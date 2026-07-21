package com.darzi.incomingalert

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

class IncomingAlertModule : Module() {
  private val context: Context
    get() = appContext.reactContext?.applicationContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("DarjiIncomingAlert")

    AsyncFunction("configureAsync") {
      IncomingAlertManager.createChannel(context)
    }

    AsyncFunction("showAsync") { payloadJson: String ->
      IncomingAlertManager.show(context, JSONObject(payloadJson))
    }

    AsyncFunction("dismissAsync") { requestKey: String? ->
      IncomingAlertManager.dismiss(context, requestKey)
    }

    AsyncFunction("consumePendingActionAsync") {
      IncomingAlertManager.consumePendingAction(context)
    }

    AsyncFunction("getPermissionStateAsync") {
      mapOf(
        "androidApiLevel" to Build.VERSION.SDK_INT,
        "canDrawOverlays" to IncomingAlertManager.canDrawOverlays(context),
        "canUseFullScreenIntent" to IncomingAlertManager.canUseFullScreenIntent(context),
        "notificationsEnabled" to IncomingAlertManager.notificationsEnabled(context)
      )
    }

    AsyncFunction("openOverlaySettingsAsync") {
      openOverlaySettings()
    }

    AsyncFunction("openFullScreenIntentSettingsAsync") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        openSettings(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
      } else {
        val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
          .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
    }
  }

  private fun openOverlaySettings() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      openApplicationDetails()
      return
    }
    // Android's public API for SYSTEM_ALERT_WINDOW accepts package:<id> and
    // opens the app-specific "Display over other apps" toggle on stock Android.
    // A few OEM builds ignore the package URI and show the full app list; in
    // that case the app details fallback is the closest legal public screen.
    val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      context.startActivity(intent)
    } catch (_: Exception) {
      openApplicationDetails()
    }
  }

  private fun openSettings(action: String) {
    val intent = Intent(action, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      context.startActivity(intent)
    } catch (_: Exception) {
      openApplicationDetails()
    }
  }

  private fun openApplicationDetails() {
    val fallback = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(fallback)
  }
}
