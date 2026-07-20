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
  private val onViewDetails: () -> Unit,
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
    val tailor = IncomingAlertManager.isTailor(payload)
    val level = serviceLevel()
    val instantDelivery = !tailor && level.contains("INSTANT", ignoreCase = true)
    val accent = if (instantDelivery) Color.rgb(220, 38, 38) else Color.rgb(246, 163, 19)
    val deep = Color.rgb(11, 34, 65)
    val muted = Color.rgb(101, 116, 138)
    val cardBackground = if (instantDelivery) Color.rgb(255, 245, 245) else Color.WHITE

    setBackgroundColor(if (instantDelivery) Color.argb(238, 58, 8, 8) else Color.argb(238, 7, 13, 24))
    isClickable = true
    setPadding(dp(18), dp(36), dp(18), dp(36))

    val card = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(22), dp(22), dp(22), dp(22))
      background = rounded(cardBackground, 8f, if (instantDelivery) Color.rgb(248, 113, 113) else Color.rgb(239, 207, 146), 1)
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
    headingColumn.addView(label(payload.optString("title").ifBlank { "Incoming order" }, 22f, deep, Typeface.BOLD))
    headingColumn.addView(label(if (instantDelivery) "Instant response needed" else "Immediate response requested", 13f, muted, Typeface.BOLD).apply {
      setPadding(0, dp(4), 0, 0)
    })

    timer.apply {
      setTextColor(accent)
      textSize = 16f
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      setPadding(dp(12), dp(10), dp(12), dp(10))
      background = rounded(Color.rgb(17, 17, 17), 12f)
    }
    header.addView(timer, LinearLayout.LayoutParams(dp(72), LayoutParams.WRAP_CONTENT).apply { leftMargin = dp(12) })

    card.addView(chip(if (level.isBlank()) if (tailor) "TAILOR REQUEST" else "DELIVERY REQUEST" else level, accent).apply {
      setPadding(dp(12), dp(8), dp(12), dp(8))
    }, LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT).apply {
      topMargin = dp(18)
      gravity = Gravity.START
    })

    val body = payload.optString("body").ifBlank { "A new order is waiting for your response." }
    card.addView(label(body, 14f, Color.rgb(37, 42, 51), Typeface.NORMAL).apply {
      setPadding(0, dp(12), 0, dp(12))
      setLineSpacing(0f, 1.14f)
      maxLines = 3
    }, LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))

    val details = details(tailor)
    if (details.isNotEmpty()) {
      val detailList = LinearLayout(context).apply {
        orientation = LinearLayout.VERTICAL
      }
      card.addView(detailList, LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
        bottomMargin = dp(12)
      })
      details.take(5).forEachIndexed { index, item ->
        detailList.addView(infoRow(item.first, item.second, index == details.lastIndex.coerceAtMost(4), accent))
      }
    }

    val requestId = IncomingAlertManager.requestKey(payload)
    card.addView(label("Request #${requestId.take(8).uppercase()}", 12f, muted, Typeface.BOLD).apply {
      gravity = Gravity.START
      setPadding(0, 0, 0, dp(14))
    }, LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))

    val buttons = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
    }
    card.addView(buttons, LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, dp(58)))
    buttons.addView(button("Reject", Color.rgb(37, 42, 51), Color.WHITE, onDecline), LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 1f).apply { rightMargin = dp(5) })
    buttons.addView(button("View details", Color.WHITE, deep, onViewDetails, Color.rgb(219, 226, 236)), LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 1f).apply {
      leftMargin = dp(5)
      rightMargin = dp(5)
    })
    buttons.addView(
      button(if (tailor) "Send quote" else "Accept", accent, Color.rgb(17, 17, 17), onAccept),
      LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 1f).apply { leftMargin = dp(5) }
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
    background = rounded(backgroundColor, 8f)
    isClickable = true
    isFocusable = true
    setOnClickListener { onClick() }
  }

  private fun button(text: String, backgroundColor: Int, textColor: Int, onClick: () -> Unit, strokeColor: Int): View =
    button(text, backgroundColor, textColor, onClick).apply {
      background = rounded(backgroundColor, 8f, strokeColor, 1)
    }

  private fun chip(text: String, color: Int) = TextView(context).apply {
    this.text = text.uppercase()
    textSize = 12f
    setTextColor(color)
    typeface = Typeface.DEFAULT_BOLD
    background = rounded(Color.argb(24, Color.red(color), Color.green(color), Color.blue(color)), 8f, color, 1)
  }

  private fun infoRow(caption: String, value: String, last: Boolean, accent: Int) = LinearLayout(context).apply {
    orientation = LinearLayout.HORIZONTAL
    gravity = Gravity.CENTER_VERTICAL
    setPadding(0, dp(8), 0, dp(8))
    if (!last) background = rounded(Color.TRANSPARENT, 0f, Color.rgb(238, 242, 247), 1)
    addView(label(caption, 12f, Color.rgb(101, 116, 138), Typeface.BOLD), LinearLayout.LayoutParams(dp(92), LayoutParams.WRAP_CONTENT))
    addView(label(value, 14f, if (caption == "Type") accent else Color.rgb(11, 34, 65), Typeface.BOLD).apply {
      gravity = Gravity.END
      maxLines = 2
    }, LinearLayout.LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f))
  }

  private fun serviceLevel(): String {
    val raw = listOf(
      payload.optString("serviceLevel"),
      payload.optString("orderType"),
      payload.optString("requestKind"),
      payload.optString("urgency"),
      payload.optString("deliveryType")
    ).firstOrNull { it.isNotBlank() } ?: ""
    val upper = raw.replace('_', ' ').uppercase()
    return when {
      upper.contains("INSTANT") -> "INSTANT"
      upper.contains("SAME") -> "SAME DAY"
      upper.contains("EXPRESS") -> "EXPRESS"
      upper.isNotBlank() -> upper
      else -> ""
    }
  }

  private fun details(tailor: Boolean): List<Pair<String, String>> {
    val rows = mutableListOf<Pair<String, String>>()
    if (tailor) {
      addIfPresent(rows, "Cloth", first("clothType", "cloth", "itemType"))
      addIfPresent(rows, "Work", first("workType", "stitchingType", "service"))
      addIfPresent(rows, "Customer", first("customerName", "customer"))
      addIfPresent(rows, "Pickup", first("pickupAddress", "pickup"))
      addIfPresent(rows, "Type", serviceLevel())
    } else {
      addIfPresent(rows, "Type", serviceLevel())
      addIfPresent(rows, "Pickup", first("pickupAddress", "pickup", "pickupArea"))
      addIfPresent(rows, "Drop", first("dropAddress", "drop", "dropArea"))
      addIfPresent(rows, "Earnings", first("expectedEarnings", "earnings"))
      addIfPresent(rows, "Customer", first("customerName", "customer"))
    }

    val jsonRows = payload.optJSONArray("rows")
    if (jsonRows != null) {
      for (index in 0 until jsonRows.length()) {
        val row = jsonRows.optJSONObject(index) ?: continue
        val label = row.optString("label")
        val value = row.optString("value")
        if (label.isNotBlank() && value.isNotBlank() && rows.none { it.first.equals(label, ignoreCase = true) }) {
          rows.add(label to value)
        }
      }
    }
    return rows
  }

  private fun addIfPresent(rows: MutableList<Pair<String, String>>, label: String, value: String) {
    if (value.isNotBlank()) rows.add(label to value)
  }

  private fun first(vararg keys: String): String {
    for (key in keys) {
      val value = payload.optString(key)
      if (value.isNotBlank() && value != "null") return value
    }
    return ""
  }

  private fun rounded(color: Int, radiusDp: Float, strokeColor: Int? = null, strokeWidthDp: Int = 0) = GradientDrawable().apply {
    shape = GradientDrawable.RECTANGLE
    setColor(color)
    cornerRadius = dp(radiusDp.toInt()).toFloat()
    if (strokeColor != null && strokeWidthDp > 0) setStroke(dp(strokeWidthDp), strokeColor)
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
