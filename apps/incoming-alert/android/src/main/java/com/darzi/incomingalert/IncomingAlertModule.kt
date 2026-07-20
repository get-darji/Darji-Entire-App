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
      openSettings(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
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

  private fun openSettings(action: String) {
    val intent = Intent(action, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      context.startActivity(intent)
    } catch (_: Exception) {
      val fallback = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(fallback)
    }
  }
}
