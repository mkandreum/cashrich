package win.xyoncloud.cashrich

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlin.math.ceil
import kotlin.math.min
import kotlin.math.roundToInt

typealias Send = (String, JsonObject?) -> Unit

private val Faded = C.Ink.copy(alpha = 0.75f)

/** Lo que puedes hacer ahora mismo. */
@Composable
fun ActionPanel(room: Snapshot, me: Player, mv: DiceMotion?, send: Send) {
    val myTurn = room.phase == "playing" && room.current?.id == me.id
    val pending = room.pending
    when {
        me.bankrupt -> Panel(Modifier.fillMaxWidth().padding(bottom = 6.dp), padding = 16.dp) {
            D("En bancarrota 💀", size = 24.sp, modifier = Modifier.fillMaxWidth(), align = TextAlign.Center)
            T("Te quedaste sin efectivo ni activos. Puedes seguir mirando la partida.", color = Faded, align = TextAlign.Center)
            if (myTurn) Chunky("Pasar turno", Modifier.fillMaxWidth().padding(top = 12.dp), Tone.Cream) { send("end", null) }
        }
        pending?.type == "auction" && pending.card != null && mv == null -> AuctionPanel(pending, pending.card, me, room, send)
        !myTurn -> Waiting(room, mv)
        mv != null -> Panel(Modifier.fillMaxWidth().padding(bottom = 6.dp), padding = 16.dp) {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Dice(mv.value, mv.rolling, 96.dp)
                D(if (mv.rolling) "¡Rodando!" else "¡Un ${mv.value}! Avanza…", size = 24.sp)
            }
        }
        pending?.type == "deal" && pending.card != null -> Deal(pending, pending.card, me, room, send)
        (pending?.type == "sell" || pending?.type == "rent") && pending.card != null -> Choices(pending, pending.card, me, send)
        pending?.type == "dream" && pending.card != null -> {
            val cost = pending.card.cost ?: 0.0
            val can = me.cash >= cost
            GameCard("dream", pending.card) {
                Spacer(Modifier.height(8.dp))
                T(if (can) "¡Si lo compras, ganas la partida!" else "Tienes ${money(me.cash)}. Te faltan ${money(cost - me.cash)}.", color = Faded)
                Row(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Chunky("Ahorrar más", Modifier.weight(1f), Tone.Cream) { send("pass", null) }
                    Chunky("¡Comprar y ganar!", Modifier.weight(1f), Tone.Mint, enabled = can) { send("dream", null) }
                }
            }
        }
        pending?.type == "bank" -> {
            val donation = Math.round(me.salary * 0.1).toDouble()
            val loan = min(me.loanRoom, 50000.0)
            GameCard("bank", Card(name = "Elige una opción", text = "Hoy el crédito está al ${room.economy.rate.roundToInt()}%. Un préstamo acelera, pero sube tus gastos. Donar el 10% de tu sueldo te da dos dados durante tres turnos.")) {
                Spacer(Modifier.height(12.dp))
                Chunky("Pedir ${money(loan)}", Modifier.fillMaxWidth(), Tone.Sky, enabled = !room.frozen && me.loanRoom >= 10000) {
                    send("loan", buildJsonObject { put("amount", loan) })
                }
                Chunky("Donar ${money(donation)}", Modifier.fillMaxWidth(), Tone.Mint, enabled = me.cash >= donation) { send("donate", null) }
                Chunky("Seguir de largo", Modifier.fillMaxWidth(), Tone.Cream) { send("pass", null) }
            }
        }
        room.skipping -> Panel(Modifier.fillMaxWidth().padding(bottom = 6.dp), padding = 16.dp) {
            D("Recesión 🥶", size = 24.sp)
            T("Pierdes este turno. Aprovecha para pagar deudas en tu cartera.", color = Faded)
            Chunky("Terminar turno", Modifier.fillMaxWidth().padding(top = 12.dp), Tone.Coral) { send("end", null) }
        }
        room.dice == 0 -> Panel(Modifier.fillMaxWidth().padding(bottom = 6.dp), padding = 16.dp) {
            D("¡Te toca!", size = 24.sp)
            T(
                room.message + (if (me.adv > 0) " Te quedan ${me.adv} tiradas con dos dados." else "") + " Puedes operar en tu cartera antes de tirar.",
                color = Faded, modifier = Modifier.padding(top = 4.dp, bottom = 12.dp),
            )
            Chunky("Tirar el dado", Modifier.fillMaxWidth(), Tone.Coral, giant = true, icon = Lucide.Dices) { send("roll", null) }
        }
        else -> Column {
            room.lastCard?.let { GameCard(it.kind, it); Spacer(Modifier.height(10.dp)) }
            Panel(Modifier.fillMaxWidth().padding(bottom = 6.dp)) {
                if (room.lastCard == null) T(room.message, weight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 8.dp))
                Chunky("Terminar turno", Modifier.fillMaxWidth(), Tone.Coral) { send("end", null) }
            }
        }
    }
}

@Composable
private fun Waiting(room: Snapshot, mv: DiceMotion?) {
    val current = room.current ?: return
    PanelDark(Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Avatar(current, 44.dp)
            Column(Modifier.weight(1f)) {
                D("Juega ${current.name}", color = C.Cream, size = 18.sp, maxLines = 1)
                T(if (mv != null) "Moviendo ficha…" else room.message, color = C.Cream.copy(alpha = 0.8f), size = 14.sp)
            }
            Icon(Lucide.Hourglass, null, Modifier.size(22.dp), tint = C.Gold)
        }
    }
}

/* Puja a ciegas: gana la más alta y la prima se la lleva quien pasó de la oferta */
@Composable
private fun AuctionPanel(a: Pending, card: Card, me: Player, room: Snapshot, send: Send) {
    val down = card.down ?: 0.0
    val seller = room.players.find { it.id == a.sellerId }
    val canBid = me.id in a.eligible && me.id !in a.answered
    val options = listOf(1.0, 1.1, 1.25, 1.5).map { ceil(down * it / 100) * 100 }.distinct().filter { it <= me.cash }
    GameCard(a.deck, card) {
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Icon(Lucide.Zap, null, Modifier.size(18.dp), tint = C.CoralDark)
            D("¡Subasta a ciegas!", color = C.CoralDark, size = 18.sp)
        }
        T(
            if (seller?.id == me.id) "Has pasado: te quedas lo que paguen por encima del precio."
            else "${seller?.name} ha pasado y se llevará lo que pagues por encima del precio. Solo efectivo.",
            color = Faded, size = 14.sp,
        )
        val left = remember(card.name) { Animatable(a.endsIn.toFloat()) }
        LaunchedEffect(card.name) { left.animateTo(0f, tween(a.endsIn.toInt().coerceAtLeast(1), easing = LinearEasing)) }
        Spacer(Modifier.height(8.dp))
        Box(Modifier.fillMaxWidth().height(10.dp).clip(CircleShape).background(C.CreamDark)) {
            Box(Modifier.fillMaxHeight().fillMaxWidth((left.value / 20000f).coerceIn(0f, 1f)).background(C.Coral))
        }
        T("${ceil(left.value / 1000).toInt()} s", size = 12.sp, weight = FontWeight.SemiBold, align = TextAlign.End, modifier = Modifier.fillMaxWidth())
        if (canBid) {
            (options.map { it to money(it) } + (0.0 to "No pujo")).chunked(2).forEach { row ->
                Row(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    row.forEach { (amount, label) ->
                        Chunky(label, Modifier.weight(1f), if (amount > 0) Tone.Mint else Tone.Cream, small = true) {
                            send("bid", buildJsonObject { put("amount", amount) })
                        }
                    }
                    if (row.size == 1) Spacer(Modifier.weight(1f))
                }
            }
        } else {
            T(if (seller?.id == me.id) "Esperando las pujas…" else "Puja hecha. A ver quién gana…", weight = FontWeight.SemiBold, align = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
        }
    }
}

@Composable
private fun Deal(pending: Pending, card: Card, me: Player, room: Snapshot, send: Send) {
    val down = card.down ?: 0.0
    val flow = card.flow ?: 0.0
    val missing = (down - me.cash).coerceAtLeast(0.0)
    val loan = ceil(missing / 1000) * 1000
    val can = missing == 0.0 || (!room.frozen && loan <= me.loanRoom)
    val months = if (flow > 0) ceil(down / flow).toInt() else 0
    val gap = ((1 - (card.idx ?: 1.0)) * 100).roundToInt()
    GameCard(pending.deck, card) {
        Spacer(Modifier.height(8.dp))
        if (room.settings.mode == "aula" && (card.down ?: 0.0) > 0) Chip("Rentabilidad: ${((card.flow ?: 0.0) * 1200 / (card.down ?: 1.0)).roundToInt()} % al año sobre la entrada", C.Gold.copy(alpha = 0.4f))
        if (months > 0) Chip("Recuperas la entrada en $months ${if (months == 1) "mes" else "meses"}", C.Sky.copy(alpha = 0.25f))
        if (gap != 0) {
            Spacer(Modifier.height(4.dp))
            Chip(if (gap > 0) "Ganga: −$gap%" else "Caro: +${-gap}%", if (gap > 0) C.Mint.copy(alpha = 0.35f) else C.Coral.copy(alpha = 0.2f))
        }
        if (missing > 0) {
            Spacer(Modifier.height(10.dp))
            T(
                when {
                    can -> "Te falta efectivo: pedirás ${money(loan)} al banco (+${money(loan * room.economy.rate / 100)}/mes)."
                    room.frozen -> "Crédito congelado este turno: no te alcanza."
                    else -> "No te alcanza ni con el préstamo máximo."
                },
                Modifier.clip(RoundedCornerShape(8.dp)).background(C.Coral.copy(alpha = 0.15f)).padding(horizontal = 10.dp, vertical = 6.dp),
                color = C.CoralDark, size = 14.sp, weight = FontWeight.SemiBold,
            )
        }
        Row(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Chunky("Subastar", Modifier.weight(1f), Tone.Cream) { send("pass", null) }
            Chunky("Comprar", Modifier.weight(1f), Tone.Mint, enabled = can) { send("buy", null) }
        }
    }
}

@Composable
private fun Choices(pending: Pending, card: Card, me: Player, send: Send) {
    val selling = pending.type == "sell"
    GameCard("market", card) {
        Spacer(Modifier.height(12.dp))
        me.assets.filter { it.id in pending.options }.forEach { a ->
            Row(
                Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp)).background(C.CreamDark.copy(alpha = 0.6f)).padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Column(Modifier.weight(1f)) {
                    T(a.name, weight = FontWeight.SemiBold, maxLines = 1)
                    T(
                        if (selling) "Cobras ${money((a.cost * pending.mult - a.mortgage).coerceAtLeast(0.0))} tras la hipoteca; dejas de ganar ${money(a.flow)}/mes"
                        else "Renta ${money(a.flow)} → ${money(a.flow * (1 + pending.pct / 100))}",
                        color = C.Ink.copy(alpha = 0.7f), size = 14.sp,
                    )
                }
                Chunky(if (selling) "Vender" else "Subir", tone = Tone.Mint, small = true) {
                    send("choose", buildJsonObject { put("assetId", a.id) })
                }
            }
        }
        Chunky("Conservar todo", Modifier.fillMaxWidth(), Tone.Cream) { send("pass", null) }
    }
}

@Composable
fun PhaseChip(room: Snapshot) {
    val (face, ink) = when (room.economy.phase) {
        "boom" -> C.Gold to C.Ink
        "recesion" -> C.Coral to androidx.compose.ui.graphics.Color.White
        "recuperacion" -> C.Sky to C.Ink
        else -> C.Mint to C.Ink
    }
    Box(Modifier.clip(CircleShape).background(face).padding(horizontal = 10.dp, vertical = 2.dp)) {
        D("${room.economy.label} · crédito al ${room.economy.rate.roundToInt()}%", color = ink, size = 13.sp, maxLines = 1)
    }
}

/* Dónde está el ciclo y qué sector está barato */
@Composable
fun EconomyPanel(room: Snapshot, compact: Boolean = false) {
    PanelDark(Modifier.fillMaxWidth(), padding = if (compact) 8.dp else 12.dp) {
        PhaseChip(room)
        if (!compact) T(room.economy.hint, color = C.Cream.copy(alpha = 0.9f), size = 14.sp, modifier = Modifier.padding(top = 6.dp))
        Spacer(Modifier.height(if (compact) 2.dp else 6.dp))
        listOf("property" to "Inmuebles", "stock" to "Bolsa", "business" to "Negocios").forEach { (key, name) ->
            val pct = (((room.economy.idx[key] ?: 1.0) - 1) * 100).roundToInt()
            val history = room.economy.hist[key].orEmpty()
            val rising = history.size < 2 || history.last() >= history[history.size - 2]
            val color = if (rising) C.Mint else C.Coral
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.height(if (compact) 20.dp else 26.dp)) {
                T(name, color = C.Cream, size = 13.sp, weight = FontWeight.SemiBold, modifier = Modifier.width(72.dp), maxLines = 1)
                Canvas(Modifier.weight(1f).fillMaxHeight().padding(vertical = 3.dp)) {
                    val series = if (history.size > 1) history else listOf(1.0, 1.0)
                    val low = series.min()
                    val span = (series.max() - low).coerceAtLeast(0.05)
                    val path = androidx.compose.ui.graphics.Path()
                    series.forEachIndexed { i, v ->
                        val point = Offset(i.toFloat() / (series.size - 1) * size.width, size.height * (1 - ((v - low) / span).toFloat()))
                        if (i == 0) path.moveTo(point.x, point.y) else path.lineTo(point.x, point.y)
                    }
                    drawPath(path, color, style = Stroke(width = 2.dp.toPx()))
                }
                T((if (pct > 0) "+" else "") + "$pct%", color = if (pct >= 0) C.Mint else C.Coral, size = 13.sp, weight = FontWeight.SemiBold, align = TextAlign.End, modifier = Modifier.width(48.dp), maxLines = 1)
            }
        }
    }
}

@Composable
fun Wallet(room: Snapshot, me: Player, send: Send) {
    val myTurn = room.phase == "playing" && room.current?.id == me.id
    val canOperate = myTurn && room.pending == null
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        EconomyPanel(room)
        Panel(Modifier.fillMaxWidth().padding(bottom = 6.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                D("Mis activos", size = 18.sp)
                T("Patrimonio ${money(me.netWorth)}", color = C.Ink.copy(alpha = 0.7f), size = 14.sp, weight = FontWeight.SemiBold)
            }
            me.synergies.forEach { Chip("★ $it", C.Gold) }
            if (me.assets.isEmpty()) T("Aún no tienes nada que te pague. Esa es la misión: compra activos en las casillas de Ganga y Gran proyecto.", color = C.Ink.copy(alpha = 0.7f), size = 14.sp)
            me.assets.forEach { a ->
                Column(Modifier.fillMaxWidth().padding(top = 6.dp).clip(RoundedCornerShape(12.dp)).background(C.CreamDark.copy(alpha = 0.6f)).padding(horizontal = 10.dp, vertical = 6.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Looks.tagIcon(a.tag), null, Modifier.size(20.dp), tint = C.Ink)
                        Column(Modifier.weight(1f)) {
                            T((if (a.upgraded) "⭐ " else "") + a.name, size = 15.sp, weight = FontWeight.SemiBold, maxLines = 1)
                            T("Vale ${money(a.value)} · hipoteca ${money(a.mortgage)}", color = C.Ink.copy(alpha = 0.65f), size = 12.sp, maxLines = 1)
                        }
                        D("+${money(a.flow)}", color = C.MintDark, size = 16.sp, maxLines = 1)
                    }
                    if (canOperate) {
                        Row(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Chunky(
                                if (a.equity >= 0) "Vender +${money(a.equity)}" else "Vender −${money(-a.equity)}",
                                Modifier.weight(1f), if (a.equity >= 0) Tone.Cream else Tone.Coral, small = true, enabled = me.cash + a.equity >= 0,
                            ) { send("sell", buildJsonObject { put("assetId", a.id) }) }
                            Chunky(
                                if (a.upgraded) "Mejorado" else "Mejorar ${money(a.upgradeCost)}",
                                Modifier.weight(1f), Tone.Mint, small = true, enabled = !a.upgraded && me.cash >= a.upgradeCost,
                            ) { send("upgrade", buildJsonObject { put("assetId", a.id) }) }
                        }
                    }
                }
            }
        }
        Trades(room, me, send)
        Panel(Modifier.fillMaxWidth().padding(bottom = 6.dp)) {
            D("Banco", size = 18.sp)
            val notes = (if (!myTurn) " Solo puedes operar en tu turno." else "") + (if (room.frozen) " Crédito congelado este turno." else "")
            T("Ahora el banco presta al ${room.economy.rate.roundToInt()}% mensual, fijo para esa deuda. Te queda crédito por ${money(me.loanRoom)}.$notes", color = C.Ink.copy(alpha = 0.7f), size = 14.sp)
            Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(10000, 50000, 100000).forEach { amount ->
                    Chunky("+${amount / 1000}k", Modifier.weight(1f), Tone.Sky, small = true, enabled = myTurn && !room.frozen && me.loanRoom >= amount) {
                        send("loan", buildJsonObject { put("amount", amount) })
                    }
                }
            }
            me.debts.forEach { d ->
                Row(
                    Modifier.fillMaxWidth().padding(top = 6.dp).clip(RoundedCornerShape(12.dp)).background(C.Coral.copy(alpha = 0.15f)).padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Column(Modifier.weight(1f)) {
                        T("Deuda de ${money(d.balance)}" + (d.creditor?.let { " con $it" } ?: ""), weight = FontWeight.SemiBold)
                        T("Al ${d.rate.roundToInt()}%: pagas ${money(d.payment)}/mes", color = C.Ink.copy(alpha = 0.65f), size = 12.sp)
                    }
                    Chunky("Liquidar", tone = Tone.Mint, small = true, enabled = myTurn && me.cash >= d.balance) {
                        send("repay", buildJsonObject { put("debtId", d.id) })
                    }
                }
            }
        }
        if (me.note.isNotEmpty()) T("${me.profession}: ${me.note}", color = C.Cream.copy(alpha = 0.8f), size = 14.sp, modifier = Modifier.padding(horizontal = 4.dp))
    }
}
