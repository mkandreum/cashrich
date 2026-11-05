package win.xyoncloud.cashrich

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight

object C {
    val Felt950 = Color(0xFF042620)
    val Felt900 = Color(0xFF06342C)
    val Felt800 = Color(0xFF0A4A3D)
    val Felt700 = Color(0xFF0D5F4E)
    val FeltGlow = Color(0xFF137A63)
    val Cream = Color(0xFFFFF6DF)
    val CreamDark = Color(0xFFE9D8AE)
    val Ink = Color(0xFF1D1A33)
    val Gold = Color(0xFFFFC83D)
    val GoldDark = Color(0xFFC98A0C)
    val Coral = Color(0xFFFF5A4E)
    val CoralDark = Color(0xFFBF2F25)
    val Mint = Color(0xFF3DDC97)
    val MintDark = Color(0xFF1B9C66)
    val Sky = Color(0xFF2FB5F5)
    val SkyDark = Color(0xFF1379B0)
    val NavyDark = Color(0xFF10143A)
    val Grape2 = Color(0xFF2B1D62)
    val Wood = Color(0xFF6D4326)
    val WoodDark = Color(0xFF3F2412)
    val WoodEdge = Color(0xFF24140A)
    val Disabled = Color(0xFFA9A48F)
    val DisabledEdge = Color(0xFF77735F)
    val DisabledInk = Color(0xFF4A4738)
}

val Display = FontFamily(Font(R.font.lilita_one))

@OptIn(ExperimentalTextApi::class)
val Body = FontFamily(
    Font(R.font.fredoka, FontWeight.Normal, variationSettings = FontVariation.Settings(FontVariation.weight(400))),
    Font(R.font.fredoka, FontWeight.Medium, variationSettings = FontVariation.Settings(FontVariation.weight(500))),
    Font(R.font.fredoka, FontWeight.SemiBold, variationSettings = FontVariation.Settings(FontVariation.weight(600))),
)

data class Look(val tile: Color, val dark: Color, val ink: Color, val icon: ImageVector, val label: String)

private val INK2 = Color(0xFF10143A)
object Looks {
    val cobrar by lazy { Look(C.Gold, C.GoldDark, C.Ink, Lucide.Coins, "Cobra") }
    val peq by lazy { Look(C.Sky, C.SkyDark, INK2, Lucide.TrendingUp, "Pequeña") }
    val grande by lazy { Look(C.Coral, C.CoralDark, Color.White, Lucide.Rocket, "Grande") }
    val mercado by lazy { Look(Color(0xFF8B5CF6), Color(0xFF5B30B8), Color.White, Lucide.ArrowLeftRight, "Mercado") }
    val gusto by lazy { Look(Color(0xFFFF6FB5), Color(0xFFC23A80), C.Ink, Lucide.ShoppingBag, "Gusto") }
    val banco by lazy { Look(Color(0xFF7C8BD6), Color(0xFF4553A3), INK2, Lucide.Landmark, "Banco") }
    val sueno by lazy { Look(Color(0xFFFFF0A8), C.GoldDark, C.Ink, Lucide.Star, "Sueño") }
    val salida by lazy { Look(C.Mint, C.MintDark, INK2, Lucide.Flag, "Salida") }
    val auditoria by lazy { Look(Color(0xFF7C8BD6), Color(0xFF4553A3), INK2, Lucide.Scale, "Auditoría") }
    val oportunidad by lazy { Look(C.Coral, C.CoralDark, Color.White, Lucide.Rocket, "Oportunidad") }
    val impuesto by lazy { Look(Color(0xFF9AA3B5), Color(0xFF5E6779), INK2, Lucide.Receipt, "Hacienda") }
    val formacion by lazy { Look(Color(0xFF4FD1C5), Color(0xFF23958B), INK2, Lucide.GraduationCap, "Formación") }
    val imprevisto by lazy { Look(Color(0xFFFF9F43), Color(0xFFC46A12), C.Ink, Lucide.TriangleAlert, "Imprevisto") }

    fun forCell(cell: Cell, index: Int, lane: String): Look = when {
        lane == "board" && index == 0 -> salida
        lane == "via" && cell.kind == "banco" -> auditoria
        lane == "via" && cell.kind == "peq" -> oportunidad
        cell.kind == "cobrar" -> cobrar
        cell.kind == "peq" -> peq
        cell.kind == "grande" -> grande
        cell.kind == "mercado" -> mercado
        cell.kind == "gusto" -> gusto
        cell.kind == "banco" -> banco
        cell.kind == "impuesto" -> impuesto
        cell.kind == "formacion" -> formacion
        cell.kind == "imprevisto" -> imprevisto
        else -> sueno
    }

    fun forDeck(deck: String?): Pair<Look, String> = when (deck) {
        "small" -> peq to "Oportunidad pequeña"
        "big" -> grande to "Oportunidad grande"
        "gusto" -> gusto to "Gusto"
        "dream" -> sueno to "Sueño"
        "bank" -> banco to "Banco y caridad"
        else -> mercado to "Mercado"
    }

    fun tagIcon(tag: String?): ImageVector = when (tag) {
        "BOLSA" -> Lucide.ChartLine
        "RENTA FIJA" -> Lucide.ScrollText
        "COLECTIVO" -> Lucide.Coins
        "NEGOCIO", "FRANQUICIA" -> Lucide.Store
        "SERVICIO" -> Lucide.Briefcase
        "DIGITAL" -> Lucide.Wifi
        "PROTECCIÓN" -> Lucide.ShieldCheck
        "VOLÁTIL", "CRIPTO" -> Lucide.Bitcoin
        "REGALÍAS" -> Lucide.Gem
        "RIESGO" -> Lucide.Zap
        "DUDOSA" -> Lucide.HandCoins
        "VIVIENDA" -> Lucide.Home
        "COMERCIAL" -> Lucide.Building2
        "TERRENO" -> Lucide.LandPlot
        "INDUSTRIAL" -> Lucide.Factory
        "TURISMO" -> Lucide.Palmtree
        "AGRO" -> Lucide.Sprout
        "ENERGÍA" -> Lucide.Sun
        "SOCIEDAD" -> Lucide.PartyPopper
        else -> Lucide.Banknote
    }
}

fun parseColor(hex: String): Color = runCatching { Color(android.graphics.Color.parseColor(hex)) }.getOrDefault(C.Coral)
