package win.xyoncloud.cashrich

import android.content.Intent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlin.math.abs
import kotlin.math.roundToInt

private fun describe(o: Offer, mine: Boolean): String {
    val amount = money(o.amount)
    return when (o.kind) {
        "sell" -> if (mine) "Le vendes ${o.assetName} por $amount" else "Te vende ${o.assetName} por $amount"
        "buy" -> if (mine) "Le compras ${o.assetName} por $amount" else "Te compra ${o.assetName} por $amount"
        "lend" -> if (mine) "Le prestas $amount al ${o.rate} %" else "Te presta $amount al ${o.rate} % mensual"
        else -> if (mine) "Le pides $amount al ${o.rate} %" else "Te pide $amount y te paga un ${o.rate} % mensual"
    }
}

@Composable
private fun Choice(label: String, active: Boolean, modifier: Modifier = Modifier, onPick: () -> Unit) {
    Box(
        modifier.clip(RoundedCornerShape(10.dp)).background(if (active) C.Gold else Color.White)
            .border(2.dp, C.Ink, RoundedCornerShape(10.dp)).clickableNoRipple(onPick).padding(horizontal = 8.dp, vertical = 7.dp),
        contentAlignment = Alignment.Center,
    ) { T(label, size = 13.sp, weight = FontWeight.SemiBold, maxLines = 2) }
}

@Composable
private fun NumberField(value: String, placeholder: String, modifier: Modifier = Modifier, onChange: (String) -> Unit) {
    val style = TextStyle(fontFamily = Body, fontWeight = FontWeight.SemiBold, fontSize = 17.sp, color = C.Ink)
    BasicTextField(
        value, { onChange(it.filter(Char::isDigit).take(8)) }, modifier, singleLine = true, textStyle = style,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        decorationBox = { inner ->
            Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(Color.White).border(2.dp, C.Ink, RoundedCornerShape(10.dp)).padding(horizontal = 10.dp, vertical = 8.dp)) {
                if (value.isEmpty()) Text(placeholder, style = style.copy(color = C.Ink.copy(alpha = 0.3f)))
                inner()
            }
        },
    )
}

/** Tratos entre jugadores: se proponen y se aceptan en cualquier momento, también fuera de tu turno. */
@Composable
fun Trades(room: Snapshot, me: Player, send: Send) {
    val rivals = room.players.filter { it.id != me.id && !it.bankrupt }
    if (room.phase != "playing" || me.bankrupt || rivals.isEmpty()) return
    var toId by remember { mutableStateOf("") }
    var kind by remember { mutableStateOf("sell") }
    var assetId by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var rate by remember { mutableStateOf("8") }
    val to = rivals.find { it.id == toId } ?: rivals.first()
    val needsAsset = kind == "sell" || kind == "buy"
    val assets = when (kind) { "sell" -> me.assets; "buy" -> to.assets; else -> emptyList() }
    val chosen = assets.find { it.id == assetId } ?: assets.firstOrNull()
    val value = amount.toIntOrNull() ?: 0
    val who = { id: String -> room.players.find { it.id == id } }

    Panel(Modifier.fillMaxWidth().padding(bottom = 6.dp)) {
        D("Tratos", size = 18.sp)
        room.offers.filter { it.toId == me.id }.forEach { o ->
            Row(
                Modifier.fillMaxWidth().padding(top = 6.dp).clip(RoundedCornerShape(12.dp)).background(C.Gold.copy(alpha = 0.4f)).padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                who(o.fromId)?.let { Glyph(it.avatar, 24.dp) }
                T("${who(o.fromId)?.name}: ${describe(o, false)}", size = 14.sp, weight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                Chunky("Sí", tone = Tone.Mint, small = true) { send("acceptOffer", buildJsonObject { put("offerId", o.id) }) }
                Chunky("No", tone = Tone.Cream, small = true) { send("dropOffer", buildJsonObject { put("offerId", o.id) }) }
            }
        }
        room.offers.filter { it.fromId == me.id }.forEach { o ->
            Row(
                Modifier.fillMaxWidth().padding(top = 6.dp).clip(RoundedCornerShape(12.dp)).background(C.CreamDark.copy(alpha = 0.6f)).padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                T("A ${who(o.toId)?.name}: ${describe(o, true)} (esperando)", size = 13.sp, modifier = Modifier.weight(1f))
                Chunky("Retirar", tone = Tone.Cream, small = true) { send("dropOffer", buildJsonObject { put("offerId", o.id) }) }
            }
        }
        Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            listOf("sell" to "Vender", "buy" to "Comprar", "lend" to "Prestar", "borrow" to "Pedir").forEach { (id, label) ->
                Choice(label, id == kind, Modifier.weight(1f)) { kind = id }
            }
        }
        T("Con", size = 13.sp, weight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp, bottom = 3.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            rivals.forEach { p -> Choice(p.name, p.id == to.id, Modifier.weight(1f)) { toId = p.id } }
        }
        if (needsAsset) {
            T("Activo", size = 13.sp, weight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp, bottom = 3.dp))
            if (assets.isEmpty()) T(if (kind == "sell") "No tienes activos que vender." else "${to.name} no tiene activos.", color = C.Ink.copy(alpha = 0.7f), size = 13.sp)
            assets.forEach { a ->
                Choice("${a.name} (+${money(a.flow)}/mes, hipoteca ${money(a.mortgage)})", a.id == chosen?.id, Modifier.fillMaxWidth().padding(bottom = 3.dp)) { assetId = a.id }
            }
        }
        Row(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Column(Modifier.weight(1f)) {
                T(if (needsAsset) "Precio" else "Cantidad", size = 13.sp, weight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 3.dp))
                NumberField(amount, "10000") { amount = it }
            }
            if (!needsAsset) Column(Modifier.weight(1f)) {
                T("% mensual", size = 13.sp, weight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 3.dp))
                NumberField(rate, "8") { rate = it }
            }
        }
        if (needsAsset) T("La hipoteca va con el activo: quien compra paga el precio y se queda la deuda.", color = C.Ink.copy(alpha = 0.65f), size = 12.sp, modifier = Modifier.padding(top = 4.dp))
        Chunky("Proponer trato", Modifier.fillMaxWidth().padding(top = 8.dp), Tone.Sky, small = true, enabled = value >= 100 && (!needsAsset || chosen != null)) {
            send("offer", buildJsonObject {
                put("kind", kind)
                put("toId", to.id)
                put("amount", value)
                if (needsAsset) put("assetId", chosen!!.id) else put("rate", rate.toIntOrNull() ?: 0)
            })
            amount = ""
        }
    }
}

private val QUESTIONS = listOf(
    "¿Qué compra te dio más dinero al mes y por qué?",
    "¿Cuándo te compensó endeudarte y cuándo no?",
    "¿Qué harías distinto si la economía entrase antes en recesión?",
    "¿Qué gasto de la vida real se parece a tus caprichos del juego?",
)

private fun signed(n: Double) = (if (n >= 0) "+" else "−") + money(abs(n))

/** Informe final de cada jugador; en modo aula añade la ficha de reflexión. */
@Composable
fun ReportPanel(room: Snapshot, entry: ReportEntry) {
    val context = LocalContext.current
    Panel(Modifier.fillMaxWidth().padding(bottom = 6.dp)) {
        D("Tu informe, ${entry.name}", size = 18.sp)
        if (entry.series.size > 1) Canvas(Modifier.fillMaxWidth().height(52.dp).padding(vertical = 4.dp)) {
            val low = minOf(entry.series.min(), 0.0)
            val span = (entry.series.max() - low).coerceAtLeast(1.0)
            val path = Path()
            entry.series.forEachIndexed { i, v ->
                val p = Offset(size.width * i / (entry.series.size - 1), size.height * (1 - ((v - low) / span).toFloat()))
                if (i == 0) path.moveTo(p.x, p.y) else path.lineTo(p.x, p.y)
            }
            drawPath(path, C.MintDark, style = Stroke(width = 2.dp.toPx()))
        }
        entry.best?.let { T("Mejor operación: ${it.name} (${signed(it.gain)})", size = 14.sp) }
        entry.worst?.let { T("Peor operación: ${it.name} (${signed(it.gain)})", size = 14.sp) }
        val t = entry.totals
        T("Rentas cobradas: ${money(t.rent)}", size = 14.sp)
        T("Intereses: ${money(t.interest)}", size = 14.sp)
        T("Caprichos e imprevistos: ${money(t.gustos + t.bills)}", size = 14.sp)
        T("Impuestos: ${money(t.taxes)}", size = 14.sp)
        T(entry.lesson, weight = FontWeight.SemiBold, modifier = Modifier.padding(top = 6.dp))
        if (room.settings.mode == "aula") {
            D("Para pensar", size = 16.sp, modifier = Modifier.padding(top = 8.dp))
            QUESTIONS.forEachIndexed { i, q -> T("${i + 1}. $q", size = 14.sp) }
        }
        Spacer(Modifier.height(8.dp))
        Chunky("Compartir", Modifier.fillMaxWidth(), Tone.Mint, small = true, icon = Lucide.Share2) {
            val text = "CashRich: ${entry.name} ha terminado con ${money(entry.series.lastOrNull() ?: 0.0)}. ${entry.lesson}"
            context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text), "Compartir"))
        }
    }
}

@Composable
fun LeaderboardPanel(room: Snapshot) {
    val week = room.week ?: return
    Panel(Modifier.fillMaxWidth().padding(bottom = 6.dp)) {
        D("Reto de la semana $week", size = 18.sp)
        if (room.leaderboard.isEmpty()) T("Aún no hay marcas. ¡Pon la primera!", color = C.Ink.copy(alpha = 0.7f), size = 14.sp)
        room.leaderboard.forEachIndexed { i, e ->
            Row(Modifier.padding(vertical = 1.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                D("${i + 1}", size = 14.sp, modifier = Modifier.width(18.dp))
                T(e.name, size = 14.sp, weight = FontWeight.SemiBold, maxLines = 1, modifier = Modifier.weight(1f))
                D("+${e.score} meses", color = C.MintDark, size = 14.sp, maxLines = 1)
            }
        }
        T("Mismas cartas, economía y dados para todas las mesas. Puntúa lo ganado, medido en meses de tu sueldo.", color = C.Ink.copy(alpha = 0.65f), size = 12.sp, modifier = Modifier.padding(top = 4.dp))
    }
}
