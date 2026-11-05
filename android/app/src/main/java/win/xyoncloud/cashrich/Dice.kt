package win.xyoncloud.cashrich

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.unit.Dp
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

private class V(val x: Float, val y: Float, val z: Float) {
    operator fun plus(o: V) = V(x + o.x, y + o.y, z + o.z)
    operator fun times(k: Float) = V(x * k, y * k, z * k)
}

private class Face(val value: Int, val n: V, val u: V, val v: V, val rx: Float, val ry: Float)

private val FACES = listOf(
    Face(1, V(0f, 0f, 1f), V(1f, 0f, 0f), V(0f, 1f, 0f), 0f, 0f),
    Face(6, V(0f, 0f, -1f), V(-1f, 0f, 0f), V(0f, 1f, 0f), 0f, 180f),
    Face(3, V(1f, 0f, 0f), V(0f, 0f, -1f), V(0f, 1f, 0f), 0f, -90f),
    Face(4, V(-1f, 0f, 0f), V(0f, 0f, 1f), V(0f, 1f, 0f), 0f, 90f),
    Face(2, V(0f, -1f, 0f), V(1f, 0f, 0f), V(0f, 0f, 1f), -90f, 0f),
    Face(5, V(0f, 1f, 0f), V(1f, 0f, 0f), V(0f, 0f, -1f), 90f, 0f),
)
private val PIPS = mapOf(
    1 to listOf(4), 2 to listOf(0, 8), 3 to listOf(0, 4, 8), 4 to listOf(0, 2, 6, 8),
    5 to listOf(0, 2, 4, 6, 8), 6 to listOf(0, 2, 3, 5, 6, 8),
)

/** Cubo 3D de verdad: proyecta sus caras con perspectiva en cada fotograma. */
@Composable
fun Dice(value: Int, rolling: Boolean, size: Dp, modifier: Modifier = Modifier, idle: Boolean = false) {
    val spins = remember { mutableIntStateOf(0) }
    val rx = remember { Animatable(-18f) }
    val ry = remember { Animatable(22f) }
    val bump = remember { Animatable(1f) }
    val face = FACES.find { it.value == value } ?: FACES[0]

    LaunchedEffect(rolling, value) {
        val targetX = face.rx - 18f
        val targetY = face.ry + 22f
        if (rolling) {
            spins.intValue += 3
            val turns = spins.intValue * 360f
            val motion = tween<Float>(1000, easing = FastOutSlowInEasing)
            coroutineScope {
                launch {
                    bump.animateTo(1.35f, tween(350))
                    bump.animateTo(1f, tween(650))
                }
                launch { ry.animateTo(targetY + turns, motion) }
                rx.animateTo(targetX + turns, motion)
            }
        } else if (rx.value == -18f && ry.value == 22f) {
            rx.snapTo(targetX)
            ry.snapTo(targetY)
        }
    }

    val bob = rememberInfiniteTransition(label = "bob").animateFloat(
        0f, 1f, infiniteRepeatable(tween(1200, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "bobValue",
    )

    Canvas(
        modifier.size(size).graphicsLayer {
            scaleX = bump.value
            scaleY = bump.value
            if (idle) {
                translationY = -bob.value * this.size.height * 0.07f
                rotationZ = bob.value * 3f
            }
        },
    ) {
        val s = this.size.minDimension
        val half = s * 0.33f
        val a = (rx.value * PI / 180).toFloat()
        val b = (ry.value * PI / 180).toFloat()
        val distance = s * 3.2f
        val cx = this.size.width / 2
        val cy = this.size.height / 2

        fun rotate(p: V): V {
            val x1 = p.x * cos(b) + p.z * sin(b)
            val z1 = -p.x * sin(b) + p.z * cos(b)
            return V(x1, p.y * cos(a) - z1 * sin(a), p.y * sin(a) + z1 * cos(a))
        }
        fun project(p: V): Offset {
            val r = rotate(p)
            val k = distance / (distance - r.z)
            return Offset(cx + r.x * k, cy + r.y * k)
        }
        fun shape(center: V, f: Face, points: List<Pair<Float, Float>>): Path = Path().apply {
            points.forEachIndexed { i, (pu, pv) ->
                val o = project(center + f.u * pu + f.v * pv)
                if (i == 0) moveTo(o.x, o.y) else lineTo(o.x, o.y)
            }
            close()
        }

        val corner = half * 0.34f
        val rounded = buildList {
            val inner = half - corner
            listOf(Triple(inner, inner, 0.0), Triple(-inner, inner, PI / 2), Triple(-inner, -inner, PI), Triple(inner, -inner, 3 * PI / 2)).forEach { (ox, oy, start) ->
                for (i in 0..6) {
                    val t = start + i * (PI / 2) / 6
                    add((ox + corner * cos(t).toFloat()) to (oy + corner * sin(t).toFloat()))
                }
            }
        }
        val pipRadius = half * 0.19f
        val circle = List(16) { i -> val t = i * 2 * PI / 16; (pipRadius * cos(t).toFloat()) to (pipRadius * sin(t).toFloat()) }

        FACES.map { it to rotate(it.n).z }.filter { it.second > 0f }.sortedBy { it.second }.forEach { (f, facing) ->
            val center = f.n * half
            val path = shape(center, f, rounded)
            drawPath(path, lerp(Color(0xFFC9B684), Color(0xFFFFFDF6), 0.25f + facing * 0.75f))
            drawPath(path, C.Ink, style = Stroke(width = s * 0.03f))
            PIPS.getValue(f.value).forEach { slot ->
                val ox = ((slot % 3) - 1) * half * 0.58f
                val oy = ((slot / 3) - 1) * half * 0.58f
                drawPath(shape(center + f.u * ox + f.v * oy, f, circle), C.Coral)
            }
        }
    }
}

