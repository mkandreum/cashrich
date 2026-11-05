package win.xyoncloud.cashrich

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.ImageShader
import androidx.compose.ui.graphics.ShaderBrush
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.random.Random

val BodyStyle = TextStyle(fontFamily = Body, fontWeight = FontWeight.Medium, fontSize = 16.sp, lineHeight = 21.sp)

/** Texto de cuerpo */
@Composable
fun T(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = C.Ink,
    size: TextUnit = 16.sp,
    weight: FontWeight = FontWeight.Medium,
    align: TextAlign? = null,
    maxLines: Int = Int.MAX_VALUE,
) = Text(
    text, modifier, color = color, style = BodyStyle.copy(fontSize = size, fontWeight = weight, lineHeight = size * 1.28f),
    textAlign = align, maxLines = maxLines, overflow = TextOverflow.Ellipsis,
)

/** Texto de la fuente del juego */
@Composable
fun D(text: String, modifier: Modifier = Modifier, color: Color = C.Ink, size: TextUnit = 20.sp, align: TextAlign? = null, maxLines: Int = Int.MAX_VALUE) = Text(
    text, modifier, color = color,
    style = TextStyle(fontFamily = Display, fontSize = size, lineHeight = size * 1.08f, letterSpacing = 0.2.sp),
    textAlign = align, maxLines = maxLines, overflow = TextOverflow.Ellipsis,
)

/** Letras con contorno de pegatina */
@Composable
fun Sticker(text: String, color: Color, size: TextUnit, modifier: Modifier = Modifier, align: TextAlign? = null) {
    val style = TextStyle(fontFamily = Display, fontSize = size, lineHeight = size * 1.02f, textAlign = align ?: TextAlign.Unspecified)
    val stroke = size.value * 0.34f
    Box(modifier) {
        Text(text, Modifier.offset(y = (size.value * 0.07f).dp), color = C.Ink, style = style.copy(drawStyle = Stroke(width = stroke, join = StrokeJoin.Round)))
        Text(text, color = C.Ink, style = style.copy(drawStyle = Stroke(width = stroke, join = StrokeJoin.Round)))
        Text(text, color = color, style = style)
    }
}

@Composable
fun Logo(size: TextUnit, modifier: Modifier = Modifier) {
    Row(modifier, horizontalArrangement = Arrangement.spacedBy((size.value * 0.28f).dp)) {
        Sticker("CASH", C.Cream, size)
        Sticker("RICH", C.Gold, size)
    }
}

private val noise: ImageBitmap by lazy {
    val side = 160
    val pixels = IntArray(side * side) { (Random.nextInt(0, 42) shl 24) }
    android.graphics.Bitmap.createBitmap(pixels, side, side, android.graphics.Bitmap.Config.ARGB_8888).asImageBitmap()
}

/** Tapete de mesa: el fondo de toda la app */
@Composable
fun Felt(modifier: Modifier = Modifier, content: @Composable BoxScope.() -> Unit) {
    Box(
        modifier
            .fillMaxSize()
            .drawBehind {
                drawRect(C.Felt900)
                drawRect(Brush.radialGradient(listOf(C.FeltGlow.copy(alpha = 0.8f), Color.Transparent), Offset(size.width / 2, size.height * 0.3f), size.maxDimension * 0.62f))
                drawRect(ShaderBrush(ImageShader(noise, TileMode.Repeated, TileMode.Repeated)))
            },
        content = content,
    )
}

@Composable
fun Panel(modifier: Modifier = Modifier, padding: Dp = 12.dp, content: @Composable ColumnScope.() -> Unit) {
    val shape = RoundedCornerShape(20.dp)
    Column(
        modifier
            .drawBehind {
                drawRoundRect(C.Ink, Offset(0f, 6.dp.toPx()), size, CornerRadius(20.dp.toPx()))
            }
            .clip(shape)
            .background(C.Cream)
            .border(3.dp, C.Ink, shape)
            .padding(padding),
        content = content,
    )
}

@Composable
fun PanelDark(modifier: Modifier = Modifier, padding: Dp = 12.dp, highlight: Boolean = false, content: @Composable ColumnScope.() -> Unit) {
    val shape = RoundedCornerShape(18.dp)
    Column(
        modifier
            .clip(shape)
            .background(C.Felt950.copy(alpha = 0.75f))
            .border(2.dp, if (highlight) C.Gold else Color.White.copy(alpha = 0.14f), shape)
            .padding(padding),
        content = content,
    )
}

enum class Tone(val face: Color, val edge: Color, val label: Color) {
    Gold(C.Gold, C.GoldDark, C.Ink),
    Coral(C.Coral, C.CoralDark, Color.White),
    Mint(C.Mint, C.MintDark, C.Ink),
    Sky(C.Sky, C.SkyDark, C.Ink),
    Cream(C.Cream, C.CreamDark, C.Ink),
}

/** Botón gordo con recorrido al pulsar */
@Composable
fun Chunky(
    text: String,
    modifier: Modifier = Modifier,
    tone: Tone = Tone.Gold,
    enabled: Boolean = true,
    giant: Boolean = false,
    small: Boolean = false,
    icon: ImageVector? = null,
    onClick: () -> Unit,
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val travel = if (small) 3.dp else 6.dp
    val press by animateDpAsState(if (pressed && enabled) travel else 0.dp, tween(90), label = "press")
    val radius = if (small) 12.dp else 16.dp
    val shape = RoundedCornerShape(radius)
    val face = if (enabled) tone.face else C.Disabled
    val edge = if (enabled) tone.edge else C.DisabledEdge
    val label = if (enabled) tone.label else C.DisabledInk
    val border = if (small) 2.dp else 3.dp
    val minHeight = if (giant) 68.dp else if (small) 38.dp else 50.dp
    Box(
        modifier
            .padding(bottom = travel + border)
            .clickable(interaction, null, enabled = enabled) { Sfx.tap(); onClick() }
            .offset(y = press)
            .drawBehind {
                val shift = (travel - press).toPx()
                val r = CornerRadius(radius.toPx())
                drawRoundRect(C.Ink, Offset(0f, shift + border.toPx() * 0.5f), Size(size.width, size.height), r)
                drawRoundRect(edge, Offset(border.toPx(), shift - border.toPx() * 0.5f), Size(size.width - border.toPx() * 2, size.height - border.toPx()), r)
            }
            .clip(shape)
            .background(face)
            .border(border, C.Ink, shape)
            .heightIn(min = minHeight)
            .padding(horizontal = if (small) 10.dp else 16.dp, vertical = if (small) 5.dp else 9.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (icon != null) Icon(icon, null, Modifier.size(if (giant) 30.dp else 20.dp), tint = label)
            D(text, color = label, size = if (giant) 25.sp else if (small) 15.sp else 18.sp, align = TextAlign.Center)
        }
    }
}

class Floater(val id: Long, val delta: Double)

/** Cifra que corre hasta su valor y suelta un +/- flotante al cambiar */
@Composable
fun MoneyText(value: Double, color: Color = C.Ink, size: TextUnit = 20.sp) {
    val floats = remember { mutableStateListOf<Floater>() }
    val shown = remember { Animatable(value.toFloat()) }
    LaunchedEffect(value) {
        val delta = value - shown.value
        if (kotlin.math.abs(delta) >= 1) floats.add(Floater(System.nanoTime(), delta))
        shown.animateTo(value.toFloat(), tween(700))
    }
    Box {
        D(money(shown.value.toDouble()), color = color, size = size, maxLines = 1)
        floats.forEach { f ->
            androidx.compose.runtime.key(f.id) {
                val rise = remember { Animatable(0f) }
                LaunchedEffect(Unit) {
                    rise.animateTo(1f, tween(1100))
                    floats.remove(f)
                }
                Box(
                    Modifier.graphicsLayer {
                        translationY = -rise.value * 42.dp.toPx()
                        translationX = 30.dp.toPx()
                        alpha = if (rise.value < 0.75f) 1f else (1 - rise.value) * 4
                    },
                ) {
                    Sticker((if (f.delta > 0) "+" else "−") + money(kotlin.math.abs(f.delta)), if (f.delta > 0) C.Mint else C.Coral, 16.sp)
                }
            }
        }
    }
}

@Composable
fun FreedomBar(player: Player) {
    Row(Modifier.fillMaxWidth().padding(bottom = 4.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            Icon(if (player.escaped) Lucide.Unlock else Lucide.Lock, null, Modifier.size(15.dp), tint = C.Ink)
            T("Rentas ${money(player.passive)}", size = 14.sp, weight = FontWeight.SemiBold)
        }
        T("Meta ${money(player.goal)}", size = 14.sp, weight = FontWeight.SemiBold)
    }
    val fill by animateFloatAsState(player.freedom.coerceAtLeast(0.03f), spring(stiffness = 90f, dampingRatio = 0.6f), label = "freedom")
    Canvas(
        Modifier.fillMaxWidth().height(17.dp).clip(CircleShape).background(Color(0xFFD7C79D)).border(2.5.dp, C.Ink, CircleShape),
    ) {
        val w = size.width * fill
        drawRect(C.Mint, size = Size(w, size.height))
        val stripe = 12.dp.toPx()
        var x = -size.height
        val stripeColor = Color(0xFF62E8AE)
        while (x < w) {
            val path = androidx.compose.ui.graphics.Path().apply {
                moveTo(x, size.height)
                lineTo(x + stripe, size.height)
                lineTo(x + stripe + size.height * 0.5f, 0f)
                lineTo(x + size.height * 0.5f, 0f)
                close()
            }
            drawPath(path, stripeColor)
            x += stripe * 2
        }
        drawRect(C.Felt950.copy(alpha = 0f), Offset(w, 0f), Size(size.width - w, size.height))
        drawRect(Color(0xFFD7C79D), Offset(w, 0f), Size(size.width - w, size.height))
        drawRect(C.Ink, Offset(w - 1.dp.toPx(), 0f), Size(2.5.dp.toPx(), size.height))
    }
}

@Composable
fun Avatar(player: Player, size: Dp, ring: Color = Color.White) {
    Box(
        Modifier.size(size).clip(CircleShape).background(parseColor(player.color)).border(2.5.dp, ring, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Text(player.avatar, fontSize = (size.value * 0.52f).sp)
    }
}

@Composable
fun PlayerHud(player: Player, room: Snapshot) {
    Panel(Modifier.fillMaxWidth().padding(bottom = 6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Avatar(player, 40.dp, C.Ink)
            Column(Modifier.weight(1f)) {
                D(player.name, size = 20.sp, maxLines = 1)
                T(player.profession.ifEmpty { "En la sala de espera" }, color = C.Ink.copy(alpha = 0.7f), size = 14.sp, maxLines = 1)
            }
            Box(Modifier.clip(CircleShape).background(C.Gold).border(2.dp, C.Ink, CircleShape).padding(horizontal = 10.dp, vertical = 2.dp)) {
                D("Ronda ${room.round}", size = 14.sp)
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            MoneyBox("EFECTIVO", player.cash, C.Ink, Modifier.weight(1f))
            MoneyBox("FLUJO / MES", player.flow, if (player.flow < 0) C.CoralDark else C.MintDark, Modifier.weight(1f))
        }
        Spacer(Modifier.height(8.dp))
        FreedomBar(player)
    }
}

@Composable
private fun MoneyBox(label: String, value: Double, color: Color, modifier: Modifier) {
    Column(modifier.clip(RoundedCornerShape(12.dp)).background(C.CreamDark.copy(alpha = 0.7f)).padding(horizontal = 12.dp, vertical = 4.dp)) {
        T(label, color = C.Ink.copy(alpha = 0.65f), size = 12.sp, weight = FontWeight.SemiBold)
        MoneyText(value, color, 20.sp)
    }
}

@Composable
fun PlayersList(room: Snapshot, meId: String?, compact: Boolean = false) {
    Column(verticalArrangement = Arrangement.spacedBy(if (compact) 4.dp else 8.dp)) {
        room.players.forEachIndexed { i, p ->
            val active = i == room.turn && room.phase == "playing"
            val nudge by animateDpAsState(if (active) 5.dp else 0.dp, spring(), label = "nudge")
            PanelDark(
                Modifier.fillMaxWidth().offset(x = nudge).graphicsLayer { alpha = if (p.bankrupt) 0.5f else 1f },
                padding = if (compact) 4.dp else 8.dp, highlight = active,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                    Avatar(p, if (compact) 28.dp else 36.dp)
                    Column(Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                            T(p.name + if (p.id == meId) " (tú)" else "", color = C.Cream, weight = FontWeight.SemiBold, maxLines = 1, modifier = Modifier.weight(1f, fill = false))
                            if (p.bankrupt) Icon(Lucide.Skull, "En bancarrota", Modifier.size(16.dp), tint = C.Coral)
                            else if (p.escaped) Icon(Lucide.Rocket, "En la vía rápida", Modifier.size(16.dp), tint = C.Gold)
                        }
                        Spacer(Modifier.height(4.dp))
                        val fill by animateFloatAsState(p.freedom, label = "fill")
                        Box(Modifier.fillMaxWidth().height(8.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.15f))) {
                            Box(Modifier.fillMaxHeight().fillMaxWidth(fill).clip(CircleShape).background(C.Mint))
                        }
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        MoneyText(p.cash, C.Cream, 16.sp)
                        if (!compact) T("Patrimonio ${money(p.netWorth)}", color = C.Cream.copy(alpha = 0.65f), size = 12.sp, maxLines = 1)
                    }
                }
            }
        }
    }
}

@Composable
fun LogList(room: Snapshot, limit: Int = 25) {
    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
        room.log.take(limit).forEach { entry ->
            val who = room.players.find { it.id == entry.who }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                if (who != null) Text(who.avatar, fontSize = 13.sp)
                T(entry.text, color = C.Cream.copy(alpha = 0.9f), size = 14.sp)
            }
        }
        if (room.log.isEmpty()) T("Aquí aparecerá lo que pase en la mesa.", color = C.Cream.copy(alpha = 0.7f), size = 14.sp)
    }
}

@Composable
fun BoxScope.ToastBar(text: String?) {
    AnimatedVisibility(
        text != null, Modifier.align(Alignment.BottomCenter).padding(16.dp),
        enter = slideInVertically { it } + fadeIn(), exit = slideOutVertically { it } + fadeOut(),
    ) {
        Box(Modifier.width(340.dp).clip(RoundedCornerShape(12.dp)).background(C.Coral).border(3.dp, C.Ink, RoundedCornerShape(12.dp)).padding(horizontal = 16.dp, vertical = 10.dp)) {
            T(text.orEmpty(), color = Color.White, weight = FontWeight.SemiBold, align = TextAlign.Center, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
fun BannerOverlay(banner: Banner?) {
    AnimatedVisibility(banner != null, enter = fadeIn(), exit = fadeOut()) {
        Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.35f)).padding(16.dp), contentAlignment = Alignment.Center) {
            if (banner != null) {
                androidx.compose.runtime.key(banner.key) {
                    val pop = remember { Animatable(0.3f) }
                    LaunchedEffect(Unit) { pop.animateTo(1f, spring(dampingRatio = 0.42f, stiffness = 300f)) }
                    Column(
                        Modifier.graphicsLayer { scaleX = pop.value; scaleY = pop.value; rotationZ = (1 - pop.value) * -10f },
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(banner.emoji, fontSize = 72.sp)
                        Spacer(Modifier.height(8.dp))
                        Sticker(banner.title, C.Gold, 46.sp, align = TextAlign.Center)
                        if (banner.text != null) {
                            Spacer(Modifier.height(10.dp))
                            T(banner.text, color = Color.White, size = 20.sp, weight = FontWeight.SemiBold, align = TextAlign.Center)
                        }
                    }
                }
            }
        }
    }
}


fun Modifier.clickableNoRipple(onClick: () -> Unit): Modifier = clickable(MutableInteractionSource(), null, onClick = onClick)
