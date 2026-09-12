package vn.khachsan.so.owner

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.view.View
import kotlin.math.min

enum class AnioIcon {
    HOME, BED, CALENDAR, BELL, USER, SEARCH,
    BARS, COINS, TASKS, USER_ADD, WRENCH,
}

/** Lightweight line icons so the UI is identical on every Android device. */
class AnioIconView(
    context: Context,
    private val icon: AnioIcon,
    color: Int,
) : View(context) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
        this.color = color
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val side = min(width, height).toFloat()
        val scale = side / 32f
        val cx = width / 2f
        val cy = height / 2f
        fun x(value: Float) = cx + (value - 16f) * scale
        fun y(value: Float) = cy + (value - 16f) * scale
        paint.strokeWidth = 2.25f * scale

        when (icon) {
            AnioIcon.HOME -> {
                val roof = Path().apply { moveTo(x(5f), y(15f)); lineTo(x(16f), y(6f)); lineTo(x(27f), y(15f)) }
                canvas.drawPath(roof, paint)
                val house = Path().apply { moveTo(x(8f), y(13f)); lineTo(x(8f), y(27f)); lineTo(x(24f), y(27f)); lineTo(x(24f), y(13f)) }
                canvas.drawPath(house, paint)
                canvas.drawRect(x(14f), y(20f), x(18f), y(27f), paint)
            }
            AnioIcon.BED -> {
                canvas.drawLine(x(6f), y(7f), x(6f), y(27f), paint)
                canvas.drawLine(x(26f), y(16f), x(26f), y(27f), paint)
                canvas.drawLine(x(6f), y(23f), x(26f), y(23f), paint)
                canvas.drawRect(x(8f), y(11f), x(14f), y(17f), paint)
                val mattress = Path().apply { moveTo(x(14f), y(14f)); lineTo(x(22f), y(14f)); quadTo(x(26f), y(14f), x(26f), y(18f)); lineTo(x(26f), y(21f)); lineTo(x(6f), y(21f)) }
                canvas.drawPath(mattress, paint)
            }
            AnioIcon.CALENDAR -> {
                canvas.drawRoundRect(RectF(x(5f), y(8f), x(27f), y(27f)), 3f * scale, 3f * scale, paint)
                canvas.drawLine(x(5f), y(14f), x(27f), y(14f), paint)
                canvas.drawLine(x(11f), y(5f), x(11f), y(11f), paint)
                canvas.drawLine(x(21f), y(5f), x(21f), y(11f), paint)
            }
            AnioIcon.BELL -> {
                val bell = Path().apply {
                    moveTo(x(7f), y(23f)); quadTo(x(10f), y(20f), x(10f), y(14f))
                    quadTo(x(10f), y(7f), x(16f), y(7f)); quadTo(x(22f), y(7f), x(22f), y(14f))
                    quadTo(x(22f), y(20f), x(25f), y(23f)); close()
                }
                canvas.drawPath(bell, paint)
                canvas.drawArc(RectF(x(13f), y(23f), x(19f), y(28f)), 0f, 180f, false, paint)
            }
            AnioIcon.USER -> {
                canvas.drawCircle(x(16f), y(10f), 5f * scale, paint)
                canvas.drawArc(RectF(x(7f), y(17f), x(25f), y(29f)), 185f, 170f, false, paint)
            }
            AnioIcon.SEARCH -> {
                canvas.drawCircle(x(13f), y(13f), 7f * scale, paint)
                canvas.drawLine(x(18f), y(18f), x(27f), y(27f), paint)
            }
            AnioIcon.BARS -> {
                canvas.drawLine(x(8f), y(25f), x(8f), y(19f), paint)
                canvas.drawLine(x(16f), y(25f), x(16f), y(13f), paint)
                canvas.drawLine(x(24f), y(25f), x(24f), y(7f), paint)
            }
            AnioIcon.COINS -> {
                repeat(3) { index ->
                    val top = 7f + index * 5f
                    canvas.drawOval(RectF(x(7f), y(top), x(20f), y(top + 5f)), paint)
                }
                canvas.drawOval(RectF(x(17f), y(10f), x(27f), y(14f)), paint)
                canvas.drawLine(x(27f), y(12f), x(27f), y(22f), paint)
                canvas.drawArc(RectF(x(17f), y(18f), x(27f), y(23f)), 0f, 180f, false, paint)
            }
            AnioIcon.TASKS -> {
                canvas.drawRoundRect(RectF(x(7f), y(8f), x(25f), y(28f)), 2f * scale, 2f * scale, paint)
                canvas.drawRoundRect(RectF(x(12f), y(5f), x(20f), y(10f)), 2f * scale, 2f * scale, paint)
                canvas.drawLine(x(11f), y(16f), x(14f), y(19f), paint); canvas.drawLine(x(14f), y(19f), x(19f), y(14f), paint)
                canvas.drawLine(x(11f), y(23f), x(21f), y(23f), paint)
            }
            AnioIcon.USER_ADD -> {
                canvas.drawCircle(x(13f), y(9f), 5f * scale, paint)
                canvas.drawArc(RectF(x(5f), y(17f), x(21f), y(29f)), 185f, 170f, false, paint)
                canvas.drawLine(x(24f), y(17f), x(24f), y(27f), paint)
                canvas.drawLine(x(19f), y(22f), x(29f), y(22f), paint)
            }
            AnioIcon.WRENCH -> {
                val wrench = Path().apply {
                    moveTo(x(20f), y(7f)); quadTo(x(26f), y(5f), x(28f), y(8f)); lineTo(x(23f), y(13f))
                    quadTo(x(21f), y(15f), x(18f), y(13f)); lineTo(x(8f), y(25f))
                    quadTo(x(6f), y(27f), x(4f), y(25f)); quadTo(x(3f), y(23f), x(5f), y(21f))
                    lineTo(x(16f), y(11f)); quadTo(x(15f), y(7f), x(20f), y(7f))
                }
                canvas.drawPath(wrench, paint)
            }
        }
    }
}
