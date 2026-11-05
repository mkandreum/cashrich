package win.xyoncloud.cashrich

import android.content.Context
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.Dp
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.double
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** Avatares y medallas dibujados: los mismos trazos que la web (web/shared/art.json, caja 64x64). */
sealed class Shape(val color: Color, val alpha: Float) {
    class Circle(val x: Float, val y: Float, val r: Float, c: Color, a: Float) : Shape(c, a)
    class Oval(val x: Float, val y: Float, val rx: Float, val ry: Float, c: Color, a: Float) : Shape(c, a)
    class Fill(val d: String, c: Color, a: Float) : Shape(c, a)
    class Line(val d: String, val w: Float, c: Color, a: Float) : Shape(c, a)
}

object Art {
    private var avatars: Map<String, List<Shape>> = emptyMap()
    private var badges: Map<String, List<Shape>> = emptyMap()

    fun init(context: Context) {
        if (avatars.isNotEmpty()) return
        val root = Json.parseToJsonElement(context.assets.open("art.json").bufferedReader().use { it.readText() }).jsonObject
        avatars = parse(root["avatars"]!!.jsonObject)
        badges = parse(root["badges"]!!.jsonObject)
    }

    private fun parse(o: JsonObject): Map<String, List<Shape>> = o.mapValues { (_, list) ->
        (list as JsonArray).map { e ->
            val s = e.jsonObject
            fun f(k: String) = s.getValue(k).jsonPrimitive.double.toFloat()
            val c = Color(android.graphics.Color.parseColor(s.getValue("f").jsonPrimitive.content))
            val a = f("a")
            when (s.getValue("t").jsonPrimitive.content) {
                "c" -> Shape.Circle(f("x"), f("y"), f("r"), c, a)
                "e" -> Shape.Oval(f("x"), f("y"), f("rx"), f("ry"), c, a)
                "p" -> Shape.Fill(s.getValue("d").jsonPrimitive.content, c, a)
                else -> Shape.Line(s.getValue("d").jsonPrimitive.content, f("w"), c, a)
            }
        }
    }

    fun avatar(id: String): List<Shape>? = avatars[id]
    fun badge(id: String): List<Shape>? = badges[id]
}

private val pathCache = HashMap<String, Path>()
private fun pathOf(d: String) = pathCache.getOrPut(d) { PathParser().parsePathString(d).toPath() }

fun DrawScope.drawShapes(shapes: List<Shape>) {
    for (s in shapes) when (s) {
        is Shape.Circle -> drawCircle(s.color, s.r, Offset(s.x, s.y), s.alpha)
        is Shape.Oval -> drawOval(s.color, Offset(s.x - s.rx, s.y - s.ry), Size(s.rx * 2, s.ry * 2), s.alpha)
        is Shape.Fill -> drawPath(pathOf(s.d), s.color, s.alpha)
        is Shape.Line -> drawPath(pathOf(s.d), s.color, s.alpha, Stroke(s.w, cap = StrokeCap.Round, join = StrokeJoin.Round))
    }
}

/** Dibuja un avatar o una medalla; si el id no existe, no pinta nada. */
@Composable
fun Glyph(id: String, size: Dp, modifier: Modifier = Modifier) {
    val shapes = Art.badge(id) ?: Art.avatar(id) ?: return
    Canvas(modifier.size(size)) {
        val k = this.size.minDimension / 64f
        scale(k, k, pivot = Offset.Zero) { drawShapes(shapes) }
    }
}

/** Pinta las formas sobre un lienzo de Android (texturas de las fichas 3D). */
fun paintShapesNative(canvas: android.graphics.Canvas, shapes: List<Shape>, x: Float, y: Float, size: Float) {
    val k = size / 64f
    canvas.save()
    canvas.translate(x, y)
    canvas.scale(k, k)
    val paint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG)
    for (s in shapes) {
        paint.alpha = (s.alpha * 255).toInt()
        paint.color = android.graphics.Color.argb((s.alpha * 255).toInt(), (s.color.red * 255).toInt(), (s.color.green * 255).toInt(), (s.color.blue * 255).toInt())
        paint.style = android.graphics.Paint.Style.FILL
        when (s) {
            is Shape.Circle -> canvas.drawCircle(s.x, s.y, s.r, paint)
            is Shape.Oval -> canvas.drawOval(s.x - s.rx, s.y - s.ry, s.x + s.rx, s.y + s.ry, paint)
            is Shape.Fill -> canvas.drawPath(androidx.core.graphics.PathParser.createPathFromPathData(s.d), paint)
            is Shape.Line -> {
                paint.style = android.graphics.Paint.Style.STROKE
                paint.strokeWidth = s.w
                paint.strokeCap = android.graphics.Paint.Cap.ROUND
                paint.strokeJoin = android.graphics.Paint.Join.ROUND
                canvas.drawPath(androidx.core.graphics.PathParser.createPathFromPathData(s.d), paint)
            }
        }
    }
    canvas.restore()
}
