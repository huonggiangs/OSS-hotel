package vn.khachsan.so.owner

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.view.View
import kotlin.math.max

class RoomDonutView(context: Context) : View(context) {
    private var values = listOf(0f, 0f, 0f, 0f)
    private val colors = listOf(Color.rgb(0, 194, 120), Color.rgb(38, 99, 218), Color.rgb(255, 187, 20), Color.rgb(232, 48, 71))
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = context.resources.displayMetrics.density * 20f; strokeCap = Paint.Cap.BUTT }
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(7, 14, 44); textAlign = Paint.Align.CENTER; typeface = android.graphics.Typeface.DEFAULT_BOLD }

    fun setCounts(vacant: Int, occupied: Int, dirty: Int, maintenance: Int) {
        values = listOf(vacant.toFloat(), occupied.toFloat(), dirty.toFloat(), maintenance.toFloat())
        invalidate()
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val wanted = (resources.displayMetrics.density * 150).toInt()
        setMeasuredDimension(resolveSize(wanted, widthMeasureSpec), resolveSize(wanted, heightMeasureSpec))
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val padding = paint.strokeWidth / 2 + 4
        val size = minOf(width, height).toFloat()
        val left = (width - size) / 2 + padding
        val top = (height - size) / 2 + padding
        val oval = RectF(left, top, left + size - padding * 2, top + size - padding * 2)
        val total = values.sum()
        if (total <= 0f) {
            paint.color = Color.rgb(226, 230, 239)
            canvas.drawArc(oval, 0f, 360f, false, paint)
        } else {
            var start = -90f
            values.forEachIndexed { index, value ->
                val sweep = value / total * 360f
                paint.color = colors[index]
                canvas.drawArc(oval, start, sweep, false, paint)
                start += sweep
            }
        }
        textPaint.textSize = resources.displayMetrics.scaledDensity * 22
        canvas.drawText(total.toInt().toString(), width / 2f, height / 2f, textPaint)
        textPaint.typeface = android.graphics.Typeface.DEFAULT
        textPaint.textSize = resources.displayMetrics.scaledDensity * 11
        canvas.drawText("phòng", width / 2f, height / 2f + resources.displayMetrics.density * 19, textPaint)
    }
}

class FinanceLineView(context: Context) : View(context) {
    private var revenue = emptyList<Float>()
    private var expense = emptyList<Float>()
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)

    fun setData(revenueValues: List<Float>, expenseValues: List<Float>) {
        revenue = revenueValues
        expense = expenseValues
        invalidate()
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), (resources.displayMetrics.density * 150).toInt())
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val left = resources.displayMetrics.density * 8
        val right = width - resources.displayMetrics.density * 8
        val top = resources.displayMetrics.density * 10
        val bottom = height - resources.displayMetrics.density * 16
        paint.strokeWidth = 1f
        paint.color = Color.rgb(226, 233, 246)
        repeat(4) { index ->
            val y = top + (bottom - top) * index / 3f
            canvas.drawLine(left, y, right, y, paint)
        }
        val all = revenue + expense
        val ceiling = max(all.maxOrNull() ?: 0f, 1f)
        drawSeries(canvas, revenue, ceiling, Color.rgb(40, 74, 177), left, right, top, bottom)
        drawSeries(canvas, expense, ceiling, Color.rgb(204, 47, 66), left, right, top, bottom)
    }

    private fun drawSeries(canvas: Canvas, values: List<Float>, ceiling: Float, left: Float, right: Float, top: Float, bottom: Float) {
        if (values.isEmpty()) return
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = resources.displayMetrics.density * 2.3f
        val path = android.graphics.Path()
        values.forEachIndexed { index, value ->
            val x = if (values.size == 1) (left + right) / 2 else left + (right - left) * index / (values.size - 1)
            val y = bottom - (bottom - top) * value / ceiling
            if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }
        canvas.drawPath(path, paint)
        paint.style = Paint.Style.FILL
        values.forEachIndexed { index, value ->
            val x = if (values.size == 1) (left + right) / 2 else left + (right - left) * index / (values.size - 1)
            val y = bottom - (bottom - top) * value / ceiling
            canvas.drawCircle(x, y, resources.displayMetrics.density * 3.2f, paint)
        }
    }

    private fun drawSeries(canvas: Canvas, values: List<Float>, ceiling: Float, color: Int, left: Float, right: Float, top: Float, bottom: Float) {
        paint.color = color
        drawSeries(canvas, values, ceiling, left, right, top, bottom)
    }
}
