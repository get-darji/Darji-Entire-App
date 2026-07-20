package com.darzi.incomingalert

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject
import kotlin.math.ceil

internal class IncomingAlertView(
  context: Context,
  private val payload: JSONObject,
  private val onAccept: () -> Unit,
  private val onDecline: () -> Unit,
  private val onTimeout: () -> Unit
) : FrameLayout(context) {
  private val handler = Handler(Looper.getMainLooper())
  private val timer = TextView(context)
  private val expiresAt = System.currentTimeMillis() + IncomingAlertManager.remainingMs(payload)
  private var timedOut = false

  private val tick = object : Runnable {
    override fun run() {
      val remaining = (expiresAt - System.currentTimeMillis()).coerceAtLeast(0L)
      timer.text = "00:${ceil(remaining / 1000.0).toInt().toString().padStart(2, '0')}"
      if (remaining <= 0) {
        if (!timedOut) {
          timedOut = true
          onTimeout()
        }
        return
      }
      handler.postDelayed(this, 250L)
    }
  }

  init {
    setBackgroundColor(Color.argb(238, 7, 13, 24))
    isClickable = true
    setPadding(dp(18), dp(36), dp(18), dp(36))

    val card = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(22), dp(22), dp(22), dp(22))
      background = rounded(Color.WHITE, 18f, Color.rgb(239, 207, 146), 1)
      elevation = dp(12).toFloat()
    }
    addView(card, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT, Gravity.CENTER).apply {
      leftMargin = dp(2)
      rightMargin = dp(2)
    })

    val header = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    card.addView(header, LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))

    val headingColumn = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
    header.addView(headingColumn, LinearLayout.LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f))
    headingColumn.addView(label(payload.optString("title").ifBlank { "Incoming order" }, 22f, Color.rgb(11, 34, 65), Typeface.BOLD))
    headingColumn.addView(label("Immediate response requested", 13f, Color.rgb(101, 116, 138), Typeface.BOLD).apply {
      setPadding(0, dp(4), 0, 0)
    })

    timer.apply {
      setTextColor(Color.rgb(246, 163, 19))
      textSize = 16f
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      setPadding(dp(12), dp(10), dp(12), dp(10))
      background = rounded(Color.rgb(17, 17, 17), 12f)
    }
    header.addView(timer, LinearLayout.LayoutParams(dp(72), LayoutParams.WRAP_CONTENT).apply { leftMargin = dp(12) })

    card.addView(label(payload.optString("body").ifBlank { "A new order is waiting for your response." }, 15f, Color.rgb(37, 42, 51), Typeface.NORMAL).apply {
      setPadding(0, dp(18), 0, dp(18))
      setLineSpacing(0f, 1.18f)
    }, LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))

    val requestId = IncomingAlertManager.requestKey(payload)
    card.addView(label("Request #${requestId.take(8).uppercase()}", 12f, Color.rgb(101, 116, 138), Typeface.BOLD).apply {
      gravity = Gravity.START
      setPadding(0, 0, 0, dp(16))
    }, LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))

    val buttons = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
    }
    card.addView(buttons, LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, dp(58)))
    buttons.addView(button("Reject", Color.rgb(37, 42, 51), Color.WHITE, onDecline), LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 1f).apply {
      rightMargin = dp(6)
    })
    buttons.addView(
      button(if (IncomingAlertManager.isTailor(payload)) "Send quote" else "Accept", Color.rgb(246, 163, 19), Color.rgb(17, 17, 17), onAccept),
      LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 1f).apply { leftMargin = dp(6) }
    )

    handler.post(tick)
  }

  fun dispose() {
    handler.removeCallbacksAndMessages(null)
  }

  private fun label(text: String, size: Float, color: Int, style: Int) = TextView(context).apply {
    this.text = text
    textSize = size
    setTextColor(color)
    typeface = Typeface.create(Typeface.DEFAULT, style)
  }

  private fun button(text: String, backgroundColor: Int, textColor: Int, onClick: () -> Unit): View = TextView(context).apply {
    this.text = text
    textSize = 16f
    setTextColor(textColor)
    typeface = Typeface.DEFAULT_BOLD
    gravity = Gravity.CENTER
    background = rounded(backgroundColor, 14f)
    isClickable = true
    isFocusable = true
    setOnClickListener { onClick() }
  }

  private fun rounded(color: Int, radiusDp: Float, strokeColor: Int? = null, strokeWidthDp: Int = 0) = GradientDrawable().apply {
    shape = GradientDrawable.RECTANGLE
    setColor(color)
    cornerRadius = dp(radiusDp.toInt()).toFloat()
    if (strokeColor != null && strokeWidthDp > 0) setStroke(dp(strokeWidthDp), strokeColor)
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
