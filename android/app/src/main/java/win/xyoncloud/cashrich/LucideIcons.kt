// Generado por tools/gen-assets.mjs desde lucide-react. No editar a mano.
package win.xyoncloud.cashrich

import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.dp

private fun lucide(name: String, vararg paths: String): ImageVector {
    val builder = ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f)
    paths.forEach {
        builder.addPath(
            pathData = addPathNodes(it),
            stroke = SolidColor(Color.Black),
            strokeLineWidth = 2.4f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        )
    }
    return builder.build()
}

object Lucide {
    val ArrowLeftRight by lazy { lucide("ArrowLeftRight", "M8 3 4 7l4 4", "M4 7h16", "m16 21 4-4-4-4", "M20 17H4") }
    val Banknote by lazy { lucide("Banknote", "M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2v-8a2 2 0 0 1 2 -2z", "M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0", "M6 12h.01M18 12h.01") }
    val Bitcoin by lazy { lucide("Bitcoin", "M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727") }
    val BookOpen by lazy { lucide("BookOpen", "M12 5v16", "M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z") }
    val Briefcase by lazy { lucide("Briefcase", "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16", "M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2z") }
    val Building2 by lazy { lucide("Building2", "M10 12h4", "M10 8h4", "M14 21v-3a2 2 0 0 0-4 0v3", "M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2", "M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16") }
    val ChartLine by lazy { lucide("ChartLine", "M3 3v16a2 2 0 0 0 2 2h16", "m19 9-5 5-4-4-3 3") }
    val Check by lazy { lucide("Check", "M20 6 9 17l-5-5") }
    val Coins by lazy { lucide("Coins", "M13.744 17.736a6 6 0 1 1-7.48-7.48", "M15 6h1v4", "m6.134 14.768.866-.5 2 3.464", "M10 8a6 6 0 1 0 12 0a6 6 0 1 0 -12 0") }
    val Copy by lazy { lucide("Copy", "M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2z", "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2") }
    val Dices by lazy { lucide("Dices", "M4 10h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-8a2 2 0 0 1 2 -2z", "m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6", "M6 18h.01", "M10 14h.01", "M15 6h.01", "M18 9h.01") }
    val Factory by lazy { lucide("Factory", "M12 16h.01", "M16 16h.01", "M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a.5.5 0 0 0-.769-.422l-4.462 2.844A.5.5 0 0 1 15 10.5v-2a.5.5 0 0 0-.769-.422L9.77 10.922A.5.5 0 0 1 9 10.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z", "M8 16h.01") }
    val FastForward by lazy { lucide("FastForward", "M12 6a2 2 0 0 1 3.414-1.414l6 6a2 2 0 0 1 0 2.828l-6 6A2 2 0 0 1 12 18z", "M2 6a2 2 0 0 1 3.414-1.414l6 6a2 2 0 0 1 0 2.828l-6 6A2 2 0 0 1 2 18z") }
    val Flag by lazy { lucide("Flag", "M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528") }
    val Gem by lazy { lucide("Gem", "M10.5 3 8 9l4 13 4-13-2.5-6", "M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z", "M2 9h20") }
    val HandCoins by lazy { lucide("HandCoins", "M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17", "m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9", "m2 16 6 6", "M13.1 9a2.9 2.9 0 1 0 5.8 0a2.9 2.9 0 1 0 -5.8 0", "M3 5a3 3 0 1 0 6 0a3 3 0 1 0 -6 0") }
    val Hourglass by lazy { lucide("Hourglass", "M5 22h14", "M5 2h14", "M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22", "M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2") }
    val Home by lazy { lucide("Home", "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8", "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z") }
    val Landmark by lazy { lucide("Landmark", "M10 18v-7", "M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z", "M14 18v-7", "M18 18v-7", "M3 22h18", "M6 18v-7") }
    val LandPlot by lazy { lucide("LandPlot", "m12 8 6-3-6-3v10", "m8 11.99-5.5 3.14a1 1 0 0 0 0 1.74l8.5 4.86a2 2 0 0 0 2 0l8.5-4.86a1 1 0 0 0 0-1.74L16 12", "m6.49 12.85 11.02 6.3", "M17.51 12.85 6.5 19.15") }
    val Lock by lazy { lucide("Lock", "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-7a2 2 0 0 1 2 -2z", "M7 11V7a5 5 0 0 1 10 0v4") }
    val Receipt by lazy { lucide("Receipt", "M12 17V7", "M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8", "M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z") }
    val GraduationCap by lazy { lucide("GraduationCap", "M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z", "M22 10v6", "M6 12.5V16a6 3 0 0 0 12 0v-3.5") }
    val TriangleAlert by lazy { lucide("TriangleAlert", "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3", "M12 9v4", "M12 17h.01") }
    val Music by lazy { lucide("Music", "M21 16V3a1 1 0 0 0-1.28-.96l-10 2.917a1 1 0 0 0-.72.96V19", "M15 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0", "M3 19a3 3 0 1 0 6 0a3 3 0 1 0 -6 0") }
    val Music2 by lazy { lucide("Music2", "m19 6-5.2-3.9a.5.5 0 0 0-.8.4V18", "M5 18a4 4 0 1 0 8 0a4 4 0 1 0 -8 0") }
    val Palmtree by lazy { lucide("Palmtree", "M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4", "M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3", "M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35", "M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-5.5-.5-12-1-14") }
    val PartyPopper by lazy { lucide("PartyPopper", "M5.8 11.3 2 22l10.7-3.79", "M4 3h.01", "M22 8h.01", "M15 2h.01", "M22 20h.01", "m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10", "m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17", "m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7", "M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z") }
    val Rocket by lazy { lucide("Rocket", "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5", "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09", "M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z", "M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05") }
    val Scale by lazy { lucide("Scale", "M12 3v18", "m19 8 3 8a5 5 0 0 1-6 0zV7", "M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1", "m5 8 3 8a5 5 0 0 1-6 0zV7", "M7 21h10") }
    val ScrollText by lazy { lucide("ScrollText", "M15 12h-5", "M15 8h-5", "M19 17V5a2 2 0 0 0-2-2H4", "M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3") }
    val Share2 by lazy { lucide("Share2", "M15 5a3 3 0 1 0 6 0a3 3 0 1 0 -6 0", "M3 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0", "M15 19a3 3 0 1 0 6 0a3 3 0 1 0 -6 0", "M8.59 13.51L15.42 17.49", "M15.41 6.51L8.59 10.49") }
    val ShieldCheck by lazy { lucide("ShieldCheck", "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z", "m9 12 2 2 4-4") }
    val ShoppingBag by lazy { lucide("ShoppingBag", "M16 10a4 4 0 0 1-8 0", "M3.103 6.034h17.794", "M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z") }
    val Skull by lazy { lucide("Skull", "m12.5 17-.5-1-.5 1h1z", "M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z", "M14 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0", "M8 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0") }
    val Sprout by lazy { lucide("Sprout", "M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3", "M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4", "M5 21h14") }
    val Star by lazy { lucide("Star", "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z") }
    val Store by lazy { lucide("Store", "M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5", "M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244", "M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05") }
    val Sun by lazy { lucide("Sun", "M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", "M12 2v2", "M12 20v2", "m4.93 4.93 1.41 1.41", "m17.66 17.66 1.41 1.41", "M2 12h2", "M20 12h2", "m6.34 17.66-1.41 1.41", "m19.07 4.93-1.41 1.41") }
    val TrendingUp by lazy { lucide("TrendingUp", "M16 7h6v6", "m22 7-8.5 8.5-5-5L2 17") }
    val Tv by lazy { lucide("Tv", "m17 2-5 5-5-5", "M4 7h16a2 2 0 0 1 2 2v11a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2z") }
    val Unlock by lazy { lucide("Unlock", "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-7a2 2 0 0 1 2 -2z", "M7 11V7a5 5 0 0 1 9.9-1") }
    val Users by lazy { lucide("Users", "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M16 3.128a4 4 0 0 1 0 7.744", "M22 21v-2a4 4 0 0 0-3-3.87", "M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0") }
    val Volume2 by lazy { lucide("Volume2", "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z", "M16 9a5 5 0 0 1 0 6", "M19.364 18.364a9 9 0 0 0 0-12.728") }
    val VolumeX by lazy { lucide("VolumeX", "M11 4.702a.7.7 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.7.7 0 0 0 11 19.298z", "m16.5 14.5 5-5", "m16.5 9.5 5 5") }
    val WalletCards by lazy { lucide("WalletCards", "M3 11h3.75a2 2 0 0 1 1.6.8l.45.6a4 4 0 0 0 6.4 0l.45-.6a2 2 0 0 1 1.6-.8H21", "M3 7h18", "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2z") }
    val Wifi by lazy { lucide("Wifi", "M12 20h.01", "M2 8.82a15 15 0 0 1 20 0", "M5 12.859a10 10 0 0 1 14 0", "M8.5 16.429a5 5 0 0 1 7 0") }
    val WifiOff by lazy { lucide("WifiOff", "M12 20h.01", "M8.5 16.429a5 5 0 0 1 7 0", "M5 12.859a10 10 0 0 1 5.17-2.69", "M19 12.859a10 10 0 0 0-2.007-1.523", "M2 8.82a15 15 0 0 1 4.177-2.643", "M22 8.82a15 15 0 0 0-11.288-3.764", "m2 2 20 20") }
    val X by lazy { lucide("X", "M18 6 6 18", "m6 6 12 12") }
    val Zap by lazy { lucide("Zap", "M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z") }
}
