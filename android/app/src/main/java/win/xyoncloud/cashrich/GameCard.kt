package win.xyoncloud.cashrich

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.abs

/** Carta con giro 3D de entrada. `deck` decide el color y el icono. */
@Composable
fun GameCard(deck: String?, card: Card, modifier: Modifier = Modifier, compact: Boolean = false, content: @Composable ColumnScope.() -> Unit = {}) {
    val (look, title) = Looks.forDeck(deck)
    val icon = if (deck == "small" || deck == "big") Looks.tagIcon(card.tag) else look.icon
    val headline = when (deck) {
        "dream" -> card.cost
        "gusto" -> card.amount?.let { abs(it) }
        else -> card.down
    }
    key(deck, card.name) {
        val flip = remember { Animatable(1f) }
        LaunchedEffect(Unit) { flip.animateTo(0f, spring(dampingRatio = 0.55f, stiffness = 210f)) }
        Panel(
            modifier
                .fillMaxWidth()
                .padding(bottom = 6.dp)
                .graphicsLayer {
                    cameraDistance = 12f * density
                    rotationY = flip.value * 100f
                    translationY = flip.value * 26.dp.toPx()
                    scaleX = 1f - flip.value * 0.14f
                    scaleY = 1f - flip.value * 0.14f
                    alpha = (1f - flip.value).coerceIn(0f, 1f)
                },
            padding = 0.dp,
        ) {
            Row(
                Modifier.fillMaxWidth().background(look.tile).padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(icon, null, Modifier.size(if (compact) 16.dp else 20.dp), tint = look.ink)
                D(card.tag ?: title, color = look.ink, size = if (compact) 14.sp else 16.sp, maxLines = 1)
            }
            Box(Modifier.fillMaxWidth().height(3.dp).background(C.Ink))
            Column(Modifier.padding(if (compact) 10.dp else 14.dp)) {
                D(card.name, size = if (compact) 16.sp else 24.sp, maxLines = if (compact) 2 else 4)
                if (headline != null) {
                    Spacer(Modifier.height(4.dp))
                    D(money(headline), color = look.dark, size = if (compact) 20.sp else 34.sp)
                }
                if (!compact && card.flow != null) {
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Chip("+${money(card.flow)}/mes", C.Mint.copy(alpha = 0.35f))
                        if (card.cost != null) Chip("Valor ${money(card.cost)}", C.CreamDark)
                    }
                }
                if (compact && card.flow != null) T("+${money(card.flow)}/mes", color = C.MintDark, size = 14.sp, weight = FontWeight.SemiBold)
                val body = card.text ?: card.note
                if (!compact && body != null) {
                    Spacer(Modifier.height(8.dp))
                    T(body, color = C.Ink.copy(alpha = 0.75f), size = 15.sp)
                }
                content()
            }
        }
    }
}

@Composable
fun Chip(text: String, color: Color) {
    Box(Modifier.background(color, CircleShape).padding(horizontal = 10.dp, vertical = 2.dp)) {
        T(text, size = 14.sp, weight = FontWeight.SemiBold, maxLines = 1)
    }
}
