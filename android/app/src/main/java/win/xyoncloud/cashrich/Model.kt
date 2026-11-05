package win.xyoncloud.cashrich

import kotlinx.serialization.Serializable
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToLong

@Serializable
data class Card(
    val name: String = "",
    val tag: String? = null,
    val cost: Double? = null,
    val down: Double? = null,
    val flow: Double? = null,
    val note: String? = null,
    val text: String? = null,
    val amount: Double? = null,
    val fixed: Double? = null,
    val kind: String? = null,
    val idx: Double? = null,
)

@Serializable
data class Pending(
    val type: String,
    val card: Card? = null,
    val deck: String? = null,
    val mult: Double = 1.0,
    val pct: Double = 0.0,
    val options: List<String> = emptyList(),
    val optional: Boolean = false,
    val sellerId: String? = null,
    val eligible: List<String> = emptyList(),
    val answered: List<String> = emptyList(),
    val endsIn: Long = 0,
)

@Serializable
data class Asset(
    val id: String, val name: String, val tag: String = "", val cost: Double = 0.0, val down: Double = 0.0, val flow: Double = 0.0,
    val mortgage: Double = 0.0, val value: Double = 0.0, val equity: Double = 0.0, val upgradeCost: Double = 0.0, val upgraded: Boolean = false,
)

@Serializable
data class Debt(val id: String, val balance: Double, val payment: Double, val rate: Double = 0.0, val creditor: String? = null)

@Serializable
data class Settings(val difficulty: String = "normal", val rounds: Int = 0, val mode: String = "clasico")

@Serializable
data class Offer(
    val id: String, val kind: String, val fromId: String, val toId: String, val assetId: String? = null, val assetName: String? = null,
    val amount: Double = 0.0, val rate: Int? = null,
)

@Serializable
data class ReportDeal(val name: String, val gain: Double = 0.0)

@Serializable
data class ReportTotals(val rent: Double = 0.0, val taxes: Double = 0.0, val gustos: Double = 0.0, val bills: Double = 0.0, val interest: Double = 0.0)

@Serializable
data class ReportEntry(
    val id: String, val name: String, val series: List<Double> = emptyList(), val best: ReportDeal? = null, val worst: ReportDeal? = null,
    val totals: ReportTotals = ReportTotals(), val lesson: String = "",
)

@Serializable
data class ScoreEntry(val name: String, val avatar: String = "", val score: Double = 0.0)

@Serializable
data class Economy(
    val phase: String = "expansion", val label: String = "", val hint: String = "", val rate: Double = 10.0,
    val idx: Map<String, Double> = emptyMap(), val hist: Map<String, List<Double>> = emptyMap(),
)

@Serializable
data class Player(
    val id: String,
    val name: String,
    val avatar: String,
    val color: String,
    val profession: String = "",
    val note: String = "",
    val salary: Double = 0.0,
    val expenses: Double = 0.0,
    val cash: Double = 0.0,
    val passive: Double = 0.0,
    val assets: List<Asset> = emptyList(),
    val debts: List<Debt> = emptyList(),
    val escaped: Boolean = false,
    val bankrupt: Boolean = false,
    val pos: Int = 0,
    val vpos: Int = 0,
    val adv: Int = 0,
    val flow: Double = 0.0,
    val loanRoom: Double = 0.0,
    val netWorth: Double = 0.0,
    val progress: Double = 0.0,
    val synergies: List<String> = emptyList(),
    val freedom: Float = 0f,
    val goal: Double = 0.0,
)

@Serializable
data class LogEntry(val id: Int, val text: String, val who: String? = null)

@Serializable
data class Snapshot(
    val code: String,
    val tv: Boolean = false,
    val phase: String,
    val turn: Int = 0,
    val round: Int = 1,
    val dice: Int = 0,
    val frozen: Boolean = false,
    val skipping: Boolean = false,
    val adminId: String? = null,
    val settings: Settings = Settings(),
    val economy: Economy = Economy(),
    val pending: Pending? = null,
    val lastCard: Card? = null,
    val message: String = "",
    val winner: String? = null,
    val log: List<LogEntry> = emptyList(),
    val offers: List<Offer> = emptyList(),
    val report: List<ReportEntry>? = null,
    val week: String? = null,
    val leaderboard: List<ScoreEntry> = emptyList(),
    val players: List<Player> = emptyList(),
) {
    val current: Player? get() = players.getOrNull(turn)
}

data class Session(val playerId: String, val token: String)

/** Tirada en curso: el dado rueda y luego la ficha avanza casilla a casilla. */
data class DiceMotion(val playerId: String, val lane: String, val from: Int, val step: Int, val value: Int, val rolling: Boolean)

private val moneyFormat = DecimalFormat("#,##0", DecimalFormatSymbols(Locale.ROOT).apply { groupingSeparator = '.' })
fun money(value: Double): String {
    val rounded = value.roundToLong()
    return (if (rounded < 0) "-$" else "$") + moneyFormat.format(abs(rounded))
}
