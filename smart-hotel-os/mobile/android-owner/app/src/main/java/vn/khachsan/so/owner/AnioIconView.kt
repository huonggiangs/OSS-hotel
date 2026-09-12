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

/** Bộ icon vector 24 × 24, đồng nhất nét và không phụ thuộc bộ icon của hãng máy. */
class AnioIconView(context: Context, private val icon: AnioIcon, color: Int) : View(context) {
    private val line = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
        this.color = color
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val side = min(width, height).toFloat()
        val scale = side / 24f
        val left = (width - side) / 2f
        val top = (height - side) / 2f
        fun x(value: Float) = left + value * scale
        fun y(value: Float) = top + value * scale
        fun rect(l: Float, t: Float, r: Float, b: Float) = RectF(x(l), y(t), x(r), y(b))
        line.strokeWidth = 1.8f * scale

        when (icon) {
            AnioIcon.HOME -> {
                canvas.drawPath(Path().apply { moveTo(x(3f), y(11f)); lineTo(x(12f), y(3.8f)); lineTo(x(21f), y(11f)) }, line)
                canvas.drawPath(Path().apply { moveTo(x(5.2f), y(9.5f)); lineTo(x(5.2f), y(20.2f)); lineTo(x(18.8f), y(20.2f)); lineTo(x(18.8f), y(9.5f)) }, line)
                canvas.drawRoundRect(rect(10f, 14f, 14f, 20.2f), scale, scale, line)
            }
            AnioIcon.BED -> {
                canvas.drawLine(x(3.5f), y(4f), x(3.5f), y(21f), line)
                canvas.drawLine(x(20.5f), y(12f), x(20.5f), y(21f), line)
                canvas.drawRoundRect(rect(5.5f, 8f, 10.5f, 12.5f), 1.2f * scale, 1.2f * scale, line)
                canvas.drawPath(Path().apply { moveTo(x(10.5f), y(10f)); lineTo(x(17.2f), y(10f)); quadTo(x(20.5f), y(10f), x(20.5f), y(13.2f)); lineTo(x(20.5f), y(17f)); lineTo(x(3.5f), y(17f)) }, line)
                canvas.drawLine(x(3.5f), y(19.5f), x(20.5f), y(19.5f), line)
            }
            AnioIcon.CALENDAR -> {
                canvas.drawRoundRect(rect(3.5f, 5.5f, 20.5f, 21f), 2.2f * scale, 2.2f * scale, line)
                canvas.drawLine(x(3.5f), y(10f), x(20.5f), y(10f), line)
                canvas.drawLine(x(8f), y(3f), x(8f), y(7.8f), line)
                canvas.drawLine(x(16f), y(3f), x(16f), y(7.8f), line)
            }
            AnioIcon.BELL -> {
                canvas.drawPath(Path().apply {
                    moveTo(x(4f), y(18f)); quadTo(x(7f), y(15.5f), x(7f), y(10.5f))
                    quadTo(x(7f), y(4.8f), x(12f), y(4.8f)); quadTo(x(17f), y(4.8f), x(17f), y(10.5f))
                    quadTo(x(17f), y(15.5f), x(20f), y(18f)); close()
                }, line)
                canvas.drawPath(Path().apply { moveTo(x(9.5f), y(20f)); quadTo(x(12f), y(22.3f), x(14.5f), y(20f)) }, line)
            }
            AnioIcon.USER -> {
                canvas.drawCircle(x(12f), y(7.5f), 4f * scale, line)
                canvas.drawPath(Path().apply { moveTo(x(4.5f), y(21f)); quadTo(x(5.2f), y(14.5f), x(12f), y(14.5f)); quadTo(x(18.8f), y(14.5f), x(19.5f), y(21f)) }, line)
            }
            AnioIcon.SEARCH -> {
                canvas.drawCircle(x(10.5f), y(10.5f), 6.3f * scale, line)
                canvas.drawLine(x(15.1f), y(15.1f), x(21f), y(21f), line)
            }
            AnioIcon.BARS -> {
                canvas.drawLine(x(5f), y(20f), x(5f), y(15.5f), line)
                canvas.drawLine(x(12f), y(20f), x(12f), y(10f), line)
                canvas.drawLine(x(19f), y(20f), x(19f), y(4.5f), line)
            }
            AnioIcon.COINS -> {
                canvas.drawOval(rect(3.5f, 5f, 13.5f, 8.5f), line)
                canvas.drawPath(Path().apply { moveTo(x(3.5f), y(6.8f)); lineTo(x(3.5f), y(14.5f)); quadTo(x(8.5f), y(18f), x(13.5f), y(14.5f)); lineTo(x(13.5f), y(6.8f)) }, line)
                canvas.drawPath(Path().apply { moveTo(x(3.5f), y(10.5f)); quadTo(x(8.5f), y(14f), x(13.5f), y(10.5f)) }, line)
                canvas.drawOval(rect(11f, 9f, 20.5f, 12.3f), line)
                canvas.drawPath(Path().apply { moveTo(x(11f), y(10.7f)); lineTo(x(11f), y(17.5f)); quadTo(x(15.8f), y(20.8f), x(20.5f), y(17.5f)); lineTo(x(20.5f), y(10.7f)) }, line)
                canvas.drawPath(Path().apply { moveTo(x(11f), y(14.2f)); quadTo(x(15.8f), y(17.5f), x(20.5f), y(14.2f)) }, line)
            }
            AnioIcon.TASKS -> {
                canvas.drawRoundRect(rect(5f, 5.5f, 19f, 21f), 1.8f * scale, 1.8f * scale, line)
                canvas.drawRoundRect(rect(9f, 3f, 15f, 7f), 1.3f * scale, 1.3f * scale, line)
                canvas.drawPath(Path().apply { moveTo(x(8f), y(12f)); lineTo(x(10.3f), y(14.3f)); lineTo(x(15.8f), y(9.5f)) }, line)
                canvas.drawLine(x(8f), y(17.5f), x(16f), y(17.5f), line)
            }
            AnioIcon.USER_ADD -> {
                canvas.drawCircle(x(9.5f), y(7f), 3.8f * scale, line)
                canvas.drawPath(Path().apply { moveTo(x(3.5f), y(19.5f)); quadTo(x(4.2f), y(13.5f), x(9.5f), y(13.5f)); quadTo(x(12.8f), y(13.5f), x(14.2f), y(15.8f)) }, line)
                canvas.drawLine(x(18f), y(13.5f), x(18f), y(21f), line)
                canvas.drawLine(x(14.2f), y(17.2f), x(21.8f), y(17.2f), line)
            }
            AnioIcon.WRENCH -> {
                canvas.drawPath(Path().apply {
                    moveTo(x(14.8f), y(4.2f)); quadTo(x(19.5f), y(2.8f), x(21.2f), y(5.5f)); lineTo(x(17.3f), y(9.4f))
                    quadTo(x(15.8f), y(10.9f), x(13.4f), y(9.8f)); lineTo(x(6.5f), y(18.5f))
                    quadTo(x(5f), y(20.4f), x(3.4f), y(18.8f)); quadTo(x(2.1f), y(17.3f), x(3.8f), y(15.8f))
                    lineTo(x(12.1f), y(8.5f)); quadTo(x(11.3f), y(5.5f), x(14.8f), y(4.2f))
                }, line)
                canvas.drawCircle(x(5.2f), y(17.5f), 0.7f * scale, line)
            }
        }
    }
}
