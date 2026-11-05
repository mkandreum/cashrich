package win.xyoncloud.cashrich

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.opengl.GLSurfaceView
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

private val AVATARS = listOf("🐭", "🦊", "🐸", "🐼", "🦁", "🐙", "🐧", "🐷", "🐵", "🦄", "🐯", "🐻")

@Composable
fun App(vm: GameViewModel, tv: Boolean) {
    Felt {
        val state = when {
            vm.code == null -> if (tv) "connecting" else "landing"
            vm.missing -> "missing"
            vm.shown == null -> "connecting"
            tv -> if (vm.shown?.phase == "lobby") "lobby" else "game"
            vm.me == null && vm.shown?.phase == "lobby" -> "join"
            vm.shown?.phase == "lobby" -> "lobby"
            else -> "game"
        }
        AnimatedContent(
            state,
            transitionSpec = { (fadeIn(tween(350)) + scaleIn(tween(450), 0.92f)) togetherWith (fadeOut(tween(250)) + scaleOut(tween(250), 1.06f)) },
            label = "screen",
        ) { screen ->
            when (screen) {
                "landing" -> Landing(vm)
                "join" -> JoinScreen(vm)
                "lobby" -> vm.shown?.let { Lobby(vm, it, tv) }
                "game" -> vm.shown?.let { if (tv) TvGame(vm, it) else PhoneGame(vm, it) }
                "missing" -> MissingRoom(vm)
                else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Logo(48.sp) }
            }
        }
        BannerOverlay(vm.banner)
        ConfettiLayer(vm.confetti)
        ToastBar(vm.toast)
    }
}

// ------------------------------------------------------------ móvil: portada

@Composable
private fun Landing(vm: GameViewModel) {
    var creating by remember { mutableStateOf(false) }
    var code by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    Column(
        Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().imePadding().verticalScroll(rememberScrollState()).padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(16.dp))
        Logo(58.sp)
        Spacer(Modifier.height(14.dp))
        T("Escapa de la ratonera, haz que tu dinero trabaje y compra tu sueño antes que tus amigos.", color = C.Cream, size = 19.sp, align = TextAlign.Center)
        T("Online · 2 a 6 jugadores", color = C.Gold, weight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp))
        Spacer(Modifier.height(20.dp))
        if (creating) {
            JoinForm("Abre tu mesa", "Crear mesa", emptyList()) { name, avatar -> vm.createAndJoin(name, avatar) }
            T("Volver", color = C.Cream, weight = FontWeight.SemiBold, modifier = Modifier.padding(8.dp).clickableNoRipple { creating = false })
        } else {
            Panel(Modifier.widthIn(max = 480.dp).fillMaxWidth().padding(bottom = 18.dp), padding = 18.dp) {
                D("Nueva partida", size = 24.sp)
                T("Crea una mesa y pasa el enlace a quien quieras retar.", color = C.Ink.copy(alpha = 0.75f), modifier = Modifier.padding(top = 4.dp, bottom = 14.dp))
                Chunky("Crear mesa", Modifier.fillMaxWidth(), Tone.Coral, giant = true) { creating = true }
            }
            Panel(Modifier.widthIn(max = 480.dp).fillMaxWidth().padding(bottom = 6.dp), padding = 18.dp) {
                D("Tengo un código", size = 24.sp)
                Spacer(Modifier.height(8.dp))
                Field(code, "ABCD", center = true, onChange = { code = it.uppercase().take(4); error = null })
                error?.let { T(it, color = C.CoralDark, weight = FontWeight.SemiBold, modifier = Modifier.padding(top = 6.dp)) }
                Spacer(Modifier.height(12.dp))
                Chunky("Entrar", Modifier.fillMaxWidth(), Tone.Sky, giant = true, enabled = code.length == 4) {
                    scope.launch {
                        if (vm.roomExists(code)) vm.open(code) else error = "No hay ninguna mesa con el código $code."
                    }
                }
            }
        }
    }
}

@Composable
private fun Field(value: String, placeholder: String, center: Boolean = false, onChange: (String) -> Unit) {
    val style = if (center) TextStyle(fontFamily = Display, fontSize = 34.sp, textAlign = TextAlign.Center, letterSpacing = 8.sp, color = C.Ink)
    else TextStyle(fontFamily = Body, fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = C.Ink)
    BasicTextField(
        value, onChange, singleLine = true, textStyle = style,
        keyboardOptions = KeyboardOptions(capitalization = if (center) KeyboardCapitalization.Characters else KeyboardCapitalization.Words),
        decorationBox = { inner ->
            Box(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Color.White).border(3.dp, C.Ink, RoundedCornerShape(12.dp)).padding(horizontal = 12.dp, vertical = 10.dp),
                contentAlignment = if (center) Alignment.Center else Alignment.CenterStart,
            ) {
                if (value.isEmpty()) Text(placeholder, style = style.copy(color = C.Ink.copy(alpha = 0.3f)))
                inner()
            }
        },
    )
}

@Composable
private fun JoinForm(title: String, cta: String, taken: List<String>, submit: suspend (String, String) -> Unit) {
    var name by remember { mutableStateOf("") }
    var picked by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val avatar = if (picked.isNotEmpty() && picked !in taken) picked else AVATARS.first { it !in taken }
    Panel(Modifier.widthIn(max = 480.dp).fillMaxWidth().padding(bottom = 6.dp), padding = 18.dp) {
        D(title, size = 24.sp)
        T("Tu nombre", weight = FontWeight.SemiBold, modifier = Modifier.padding(top = 10.dp, bottom = 4.dp))
        Field(name, "Escribe tu nombre") { name = it.take(14) }
        T("Elige tu ficha", weight = FontWeight.SemiBold, modifier = Modifier.padding(top = 10.dp, bottom = 6.dp))
        AVATARS.chunked(6).forEach { row ->
            Row(Modifier.fillMaxWidth().padding(bottom = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                row.forEach { a ->
                    val selected = a == avatar
                    val isTaken = a in taken
                    Box(
                        Modifier.weight(1f).aspectRatio(1f).clip(CircleShape)
                            .background(if (selected) C.Gold else C.CreamDark.copy(alpha = 0.7f))
                            .border(3.dp, if (selected) C.Ink else Color.Transparent, CircleShape)
                            .graphicsLayer { alpha = if (isTaken) 0.25f else 1f }
                            .clickableNoRipple { if (!isTaken) { Sfx.tap(); picked = a } },
                        contentAlignment = Alignment.Center,
                    ) { Glyph(a, 34.dp) }
                }
            }
        }
        error?.let { T(it, color = C.CoralDark, weight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp)) }
        Spacer(Modifier.height(10.dp))
        Chunky(if (busy) "Entrando…" else cta, Modifier.fillMaxWidth(), Tone.Coral, giant = true, enabled = name.isNotBlank() && !busy) {
            busy = true
            error = null
            scope.launch {
                try {
                    submit(name.trim(), avatar)
                } catch (e: IllegalStateException) {
                    error = e.message
                    busy = false
                }
            }
        }
    }
}

@Composable
private fun JoinScreen(vm: GameViewModel) {
    val room = vm.shown ?: return
    BackHandler { vm.leave() }
    Column(
        Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().imePadding().verticalScroll(rememberScrollState()).padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Logo(48.sp)
        JoinForm("Entrar a la mesa ${room.code}", "¡Sentarme!", room.players.map { it.avatar }) { name, avatar -> vm.join(name, avatar) }
    }
}

@Composable
private fun MissingRoom(vm: GameViewModel) {
    Box(Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
        Panel(Modifier.widthIn(max = 380.dp), padding = 22.dp) {
            Text("🕳️", fontSize = 46.sp)
            D("Esta mesa ya no existe", size = 28.sp)
            T("Las mesas se cierran tras 24 horas sin actividad.", color = C.Ink.copy(alpha = 0.75f), modifier = Modifier.padding(top = 4.dp, bottom = 14.dp))
            Chunky("Crear otra", Modifier.fillMaxWidth(), Tone.Coral) { vm.leave() }
        }
    }
}

// ------------------------------------------------------------ sala de espera

private fun qrBitmap(text: String): Bitmap {
    val matrix = QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, 512, 512)
    val pixels = IntArray(512 * 512) { i -> if (matrix.get(i % 512, i / 512)) 0xFF1D1A33.toInt() else 0xFFFFF6DF.toInt() }
    return Bitmap.createBitmap(pixels, 512, 512, Bitmap.Config.ARGB_8888)
}

@Composable
private fun LobbyPlayers(vm: GameViewModel, room: Snapshot, isAdmin: Boolean, columns: Int) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        room.players.chunked(columns).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { p ->
                    key(p.id) {
                        val pop = remember { Animatable(0f) }
                        LaunchedEffect(Unit) { pop.animateTo(1f, spring(dampingRatio = 0.45f, stiffness = 380f)) }
                        Column(
                            Modifier.weight(1f).graphicsLayer { scaleX = pop.value; scaleY = pop.value; rotationZ = (1 - pop.value) * -25f }
                                .clip(RoundedCornerShape(16.dp)).background(Color.White.copy(alpha = 0.1f)).padding(8.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Avatar(p, 54.dp)
                            T(p.name + if (p.id == vm.session?.playerId) " (tú)" else "", color = C.Cream, weight = FontWeight.SemiBold, maxLines = 1, modifier = Modifier.padding(top = 3.dp))
                            if (p.id == room.adminId) T("Admin", color = C.Gold, size = 12.sp, weight = FontWeight.SemiBold)
                            if (isAdmin && p.id != vm.session?.playerId) {
                                T("Sacar", color = C.Coral, size = 13.sp, weight = FontWeight.SemiBold, modifier = Modifier.clickableNoRipple {
                                    vm.send("kick", buildJsonObject { put("playerId", p.id) })
                                })
                            }
                        }
                    }
                }
                repeat(columns - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun Lobby(vm: GameViewModel, room: Snapshot, tv: Boolean) {
    val context = LocalContext.current
    val qr = remember(vm.inviteLink) { qrBitmap(vm.inviteLink).asImageBitmap() }
    if (tv) {
        // Con jugadores en la mesa, Atrás pide confirmación y abre otra mesa; con la mesa vacía sale de la app
        BackHandler(enabled = room.players.isNotEmpty()) { vm.tvBack() }
        // En la TV todo cabe a la vista: nada de scroll ni de botones
        Column(Modifier.fillMaxSize().padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Logo(44.sp)
            Spacer(Modifier.height(10.dp))
            Row(Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Panel(Modifier.weight(5f).fillMaxHeight().padding(bottom = 6.dp), padding = 14.dp) {
                    Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.SpaceEvenly) {
                        D(room.code, size = 44.sp)
                        Image(qr, "QR para unirse a la mesa", Modifier.weight(1f).aspectRatio(1f).padding(vertical = 6.dp).clip(RoundedCornerShape(10.dp)))
                        D("Escanea para jugar", size = 22.sp)
                    }
                }
                Column(Modifier.weight(6f).fillMaxHeight(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    PanelDark(Modifier.fillMaxWidth().weight(1f)) {
                        D("En la mesa (${room.players.size}/6)", color = C.Cream, size = 22.sp)
                        Spacer(Modifier.height(8.dp))
                        LobbyPlayers(vm, room, false, 3)
                    }
                    PanelDark(Modifier.fillMaxWidth()) {
                        val admin = room.players.find { it.id == room.adminId }
                        T(
                            if (admin != null) "Esperando a que ${admin.name} empiece desde su móvil…" else "Quien entre primero será el admin y empezará la partida.",
                            color = C.Cream, size = 18.sp, weight = FontWeight.SemiBold, align = TextAlign.Center, modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }
        }
        return
    }
    val isAdmin = vm.session?.playerId == room.adminId
    BackHandler { vm.leave() }
    Column(
        Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().verticalScroll(rememberScrollState()).padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Logo(40.sp)
        Panel(Modifier.fillMaxWidth().padding(bottom = 6.dp), padding = 16.dp) {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                T("Código de la mesa", color = C.Ink.copy(alpha = 0.7f), weight = FontWeight.SemiBold)
                D(room.code, size = 52.sp)
                Image(qr, "QR para unirse a la mesa", Modifier.padding(top = 8.dp, bottom = 12.dp).size(170.dp).clip(RoundedCornerShape(10.dp)))
                Chunky("Invitar", Modifier.fillMaxWidth(), Tone.Mint, icon = Lucide.Share2) {
                    val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, "Únete a mi partida de CashRich con el código ${room.code}: ${vm.inviteLink}")
                    context.startActivity(Intent.createChooser(send, "Invitar"))
                }
                Chunky("Copiar enlace", Modifier.fillMaxWidth(), Tone.Cream, icon = Lucide.Copy) {
                    (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("CashRich", vm.inviteLink))
                }
            }
        }
        PanelDark(Modifier.fillMaxWidth()) {
            D("En la mesa (${room.players.size}/6)", color = C.Cream, size = 22.sp)
            Spacer(Modifier.height(10.dp))
            LobbyPlayers(vm, room, isAdmin, 3)
        }
        GameOptions(vm, room, isAdmin)
        if (isAdmin) {
            val needed = 2 - room.players.size
            Chunky(if (needed > 0) "Falta $needed jugador" else "¡Empezar partida!", Modifier.fillMaxWidth(), Tone.Coral, giant = true, enabled = needed <= 0) { vm.send("start") }
        } else {
            PanelDark(Modifier.fillMaxWidth()) { T("Esperando a que el admin empiece…", color = C.Cream, size = 18.sp, weight = FontWeight.SemiBold, align = TextAlign.Center, modifier = Modifier.fillMaxWidth()) }
        }
    }
}

@Composable
private fun GameOptions(vm: GameViewModel, room: Snapshot, isAdmin: Boolean) {
    val levels = listOf(
        Triple("facil", "Fácil", "Más efectivo inicial, crédito barato y mercados tranquilos."),
        Triple("normal", "Normal", "La partida equilibrada: sales cuando tus rentas cubren tus gastos."),
        Triple("dificil", "Difícil", "Menos efectivo, crédito caro, mercados violentos; necesitas rentas del 125% de tus gastos y los sueños cuestan un 50% más."),
    )
    val durations = listOf(0 to "Sin límite", 12 to "12", 20 to "20", 30 to "30")
    @Composable
    fun Pick(label: String, active: Boolean, modifier: Modifier, onPick: () -> Unit) {
        Box(
            modifier.clip(RoundedCornerShape(12.dp)).background(if (active) C.Gold else Color.White.copy(alpha = 0.1f))
                .border(2.dp, if (active) C.Gold else Color.White.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
                .clickableNoRipple { if (isAdmin) onPick() }.padding(vertical = 8.dp),
            contentAlignment = Alignment.Center,
        ) { D(label, color = if (active) C.Ink else C.Cream, size = 14.sp, maxLines = 1) }
    }
    PanelDark(Modifier.fillMaxWidth()) {
        D("Opciones de la partida", color = C.Cream, size = 20.sp)
        Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            levels.forEach { (id, name, _) ->
                Pick(name, room.settings.difficulty == id, Modifier.weight(1f)) { vm.send("settings", buildJsonObject { put("difficulty", id) }) }
            }
        }
        T(levels.first { it.first == room.settings.difficulty }.third, color = C.Cream.copy(alpha = 0.85f), size = 14.sp, modifier = Modifier.padding(top = 6.dp))
        Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            durations.forEach { (value, name) ->
                Pick(name, room.settings.rounds == value, Modifier.weight(1f)) { vm.send("settings", buildJsonObject { put("rounds", value) }) }
            }
        }
        T(
            if (room.settings.rounds > 0) "Al acabar las rondas gana el mayor patrimonio, si nadie ha comprado antes su sueño." else "Gana quien compre primero su sueño.",
            color = C.Cream.copy(alpha = 0.85f), size = 14.sp, modifier = Modifier.padding(top = 6.dp),
        )
    }
}

// ------------------------------------------------------------ tablero 3D

@Composable
fun Board3D(room: Snapshot, mv: DiceMotion?, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val owner = LocalLifecycleOwner.current
    val renderer = remember { BoardRenderer(context.applicationContext) }
    val view = remember {
        GLSurfaceView(context).apply {
            setEGLContextClientVersion(3)
            setEGLConfigChooser(MsaaChooser())
            preserveEGLContextOnPause = true
            setRenderer(renderer)
        }
    }
    DisposableEffect(owner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_PAUSE) view.onPause()
            if (event == Lifecycle.Event.ON_RESUME) view.onResume()
        }
        owner.lifecycle.addObserver(observer)
        onDispose { owner.lifecycle.removeObserver(observer) }
    }
    renderer.input = remember(room, mv) { SceneInput(room, mv) }
    AndroidView({ view }, modifier)
}

private fun narration(room: Snapshot, mv: DiceMotion?) = if (mv != null) (if (mv.rolling) "Rodando el dado…" else "¡Saca un ${mv.value}!") else room.message

// ------------------------------------------------------------ TV: solo pantalla, sin scroll ni botones

@Composable
private fun TvGame(vm: GameViewModel, room: Snapshot) {
    val mv = vm.motion
    BackHandler { vm.tvBack() }
    Box(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxSize().padding(10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.weight(1f).fillMaxHeight().clip(RoundedCornerShape(18.dp))) {
                Board3D(room, mv, Modifier.fillMaxSize())
                PanelDark(Modifier.align(Alignment.TopStart).padding(10.dp).widthIn(max = 420.dp), padding = 9.dp) {
                    val current = room.current
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        if (room.phase != "over" && current != null) Glyph(current.avatar, 26.dp)
                        D(if (room.phase == "over") "Fin de la partida" else "Turno de ${current?.name}", color = C.Gold, size = 21.sp, maxLines = 1)
                    }
                    T(narration(room, mv), color = C.Cream, size = 15.sp, weight = FontWeight.SemiBold, maxLines = 2)
                }
                val card = if (mv == null) room.lastCard else null
                if (card != null) Box(Modifier.align(Alignment.TopEnd).padding(10.dp).width(210.dp)) { GameCard(card.kind, card, compact = true) }
                if (room.pending?.type == "auction") {
                    Box(Modifier.align(Alignment.BottomCenter).padding(12.dp).clip(RoundedCornerShape(14.dp)).background(C.Coral).border(3.dp, C.Ink, RoundedCornerShape(14.dp)).padding(horizontal = 18.dp, vertical = 8.dp)) {
                        D("¡Subasta! Pujad desde el móvil", color = Color.White, size = 22.sp)
                    }
                }
            }
            Column(Modifier.width(250.dp).fillMaxHeight(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Logo(20.sp)
                    Box(Modifier.clip(RoundedCornerShape(8.dp)).background(Color.Black.copy(alpha = 0.25f)).padding(horizontal = 8.dp, vertical = 2.dp)) { D(room.code, color = C.Cream, size = 15.sp) }
                }
                PlayersList(room, null, compact = true)
                EconomyPanel(room, compact = true)
                PanelDark(Modifier.fillMaxWidth().weight(1f), padding = 8.dp) { LogList(room, limit = 6) }
            }
        }
        if (room.phase == "over" && mv == null) Victory(vm, room, tv = true)
    }
}

// ------------------------------------------------------------ móvil: partida

@Composable
private fun PhoneGame(vm: GameViewModel, room: Snapshot) {
    val me = vm.me
    val mv = vm.motion
    var tab by remember { mutableStateOf("play") }
    var showBoard by remember(room.tv) { mutableStateOf(!room.tv) }
    val send: Send = { type, payload -> vm.send(type, payload) }
    val scroll = rememberScrollState()
    val myTurn = me != null && room.phase == "playing" && room.current?.id == me.id
    LaunchedEffect(myTurn) { if (myTurn) tab = "play" }
    val decision = if (myTurn && mv == null && (room.pending != null || room.lastCard != null)) "${room.pending?.type}:${room.lastCard?.name}" else ""
    LaunchedEffect(decision) { if (decision.isNotEmpty() && !room.tv) scroll.animateScrollTo(scroll.maxValue) }
    BackHandler { vm.leave() }

    Box(Modifier.fillMaxSize()) {
        BoxWithConstraints(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding()) {
            val wide = maxWidth >= 840.dp
            if (wide) {
                Row(Modifier.fillMaxSize().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    BoardBox(room, mv, Modifier.weight(1f).fillMaxHeight())
                    Column(Modifier.width(380.dp).fillMaxHeight().verticalScroll(scroll), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        TopBar(vm, room, null)
                        if (me != null) {
                            PlayerHud(me, room)
                            ActionPanel(room, me, mv, send)
                            Wallet(room, me, send)
                        }
                        PlayersList(room, me?.id)
                        PanelDark(Modifier.fillMaxWidth()) { LogList(room) }
                    }
                }
            } else {
                Column(Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 6.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    TopBar(vm, room, if (room.tv && me != null) ({ showBoard = !showBoard }) else null)
                    Column(Modifier.weight(1f).verticalScroll(scroll), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (me != null) PlayerHud(me, room)
                        if (me == null) T("Estás de espectador: la partida ya empezó.", color = C.Cream, weight = FontWeight.SemiBold)
                        if ((tab == "play" && showBoard) || me == null) BoardBox(room, mv, Modifier.fillMaxWidth().aspectRatio(4f / 3f))
                        if (me != null && tab == "play") ActionPanel(room, me, mv, send)
                        if (me != null && tab == "wallet") Wallet(room, me, send)
                        if (tab == "table" || me == null) {
                            PlayersList(room, me?.id)
                            EconomyPanel(room)
                            PanelDark(Modifier.fillMaxWidth()) { LogList(room) }
                        }
                    }
                    if (me != null) {
                        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(C.Felt950).border(2.dp, Color.White.copy(alpha = 0.15f), RoundedCornerShape(16.dp)).padding(4.dp)) {
                            listOf(Triple("play", "Jugar", Lucide.Dices), Triple("wallet", "Cartera", Lucide.WalletCards), Triple("table", "Mesa", Lucide.Users)).forEach { (id, label, icon) ->
                                val active = tab == id
                                Row(
                                    Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(if (active) C.Cream else Color.Transparent).clickableNoRipple { tab = id }.padding(vertical = 8.dp),
                                    horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Icon(icon, null, Modifier.size(18.dp), tint = if (active) C.Ink else C.Cream)
                                    Spacer(Modifier.width(6.dp))
                                    D(label, color = if (active) C.Ink else C.Cream, size = 15.sp, maxLines = 1)
                                }
                            }
                        }
                    }
                }
            }
        }
        if (room.phase == "over" && mv == null) Victory(vm, room, tv = false)
    }
}

@Composable
private fun BoardBox(room: Snapshot, mv: DiceMotion?, modifier: Modifier) {
    Box(modifier.clip(RoundedCornerShape(18.dp))) {
        Board3D(room, mv, Modifier.fillMaxSize())
        Box(Modifier.align(Alignment.TopStart).padding(6.dp)) { PhaseChip(room) }
    }
}

@Composable
private fun TopBar(vm: GameViewModel, room: Snapshot, toggleBoard: (() -> Unit)?) {
    var muted by remember { mutableStateOf(Sfx.muted) }
    var song by remember { mutableStateOf(Music.enabled) }
    val isAdmin = vm.session?.playerId == room.adminId
    val canSkip = isAdmin && room.phase == "playing" && room.current?.id != vm.session?.playerId
    @Composable
    fun Button(icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
        Box(Modifier.size(36.dp).clip(RoundedCornerShape(8.dp)).background(Color.Black.copy(alpha = 0.25f)).clickableNoRipple(onClick), contentAlignment = Alignment.Center) {
            Icon(icon, null, Modifier.size(18.dp), tint = C.Cream)
        }
    }
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Logo(20.sp)
        Spacer(Modifier.weight(1f))
        if (!vm.online) Icon(Lucide.WifiOff, "Reconectando", Modifier.size(18.dp), tint = C.Coral)
        Box(Modifier.clip(RoundedCornerShape(8.dp)).background(Color.Black.copy(alpha = 0.25f)).padding(horizontal = 8.dp, vertical = 4.dp)) { D(room.code, color = C.Cream, size = 16.sp) }
        if (canSkip) Button(Lucide.FastForward) { vm.send("skipTurn") }
        if (toggleBoard != null) Button(Lucide.Tv, toggleBoard)
        Button(if (song) Lucide.Music2 else Lucide.Music) { Music.enabled = !song; song = !song }
        Button(if (muted) Lucide.VolumeX else Lucide.Volume2) { Sfx.muted = !muted; muted = !muted }
    }
}

@Composable
private fun Victory(vm: GameViewModel, room: Snapshot, tv: Boolean) {
    val winner = room.players.find { it.id == room.winner }
    val ranking = room.players.sortedWith(compareByDescending<Player> { it.id == room.winner }.thenByDescending { it.netWorth })
    val pop = remember { Animatable(0.6f) }
    LaunchedEffect(Unit) { pop.animateTo(1f, spring(dampingRatio = 0.45f, stiffness = 200f)) }
    Box(Modifier.fillMaxSize().background(C.Felt950.copy(alpha = 0.85f)).padding(16.dp), contentAlignment = Alignment.Center) {
        Column(Modifier.widthIn(max = 460.dp).graphicsLayer { scaleX = pop.value; scaleY = pop.value }, horizontalAlignment = Alignment.CenterHorizontally) {
            Glyph(winner?.avatar ?: "trophy", 88.dp)
            Sticker("¡${winner?.name ?: "Nadie"} gana!", C.Gold, 42.sp, align = TextAlign.Center)
            T(room.message, color = C.Cream, size = 16.sp, weight = FontWeight.SemiBold, align = TextAlign.Center, modifier = Modifier.padding(vertical = 8.dp))
            Panel(Modifier.fillMaxWidth().padding(bottom = 6.dp)) {
                ranking.forEachIndexed { i, p ->
                    Row(Modifier.padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        D("${i + 1}", size = 16.sp, modifier = Modifier.width(18.dp))
                        Glyph(p.avatar, 26.dp)
                        T(p.name, weight = FontWeight.SemiBold, maxLines = 1, modifier = Modifier.weight(1f))
                        D(money(p.netWorth), color = C.MintDark, size = 16.sp, maxLines = 1)
                    }
                }
            }
            when {
                tv -> T("El admin puede empezar otra partida desde su móvil. Atrás dos veces abre una mesa nueva.", color = C.Cream.copy(alpha = 0.85f), weight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp))
                vm.session?.playerId == room.adminId -> Chunky("Otra partida", Modifier.fillMaxWidth().padding(top = 10.dp), Tone.Coral, giant = true) { vm.send("reset") }
                else -> T("El admin puede empezar otra partida.", color = C.Cream.copy(alpha = 0.85f), weight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp))
            }
            if (!tv) T("Salir", color = C.Cream, weight = FontWeight.SemiBold, modifier = Modifier.padding(8.dp).clickableNoRipple { vm.leave() })
        }
    }
}

// ------------------------------------------------------------ confeti

private class Bit(var x: Float, var y: Float, var vx: Float, var vy: Float, var spin: Float, val color: Color)

@Composable
private fun ConfettiLayer(trigger: Int) {
    val bits = remember { mutableStateListOf<Bit>() }
    var frame by remember { mutableStateOf(0L) }
    val colors = listOf(C.Gold, C.Mint, C.Coral, C.Sky, C.Cream)
    LaunchedEffect(trigger) {
        if (trigger == 0) return@LaunchedEffect
        repeat(140) {
            val angle = Random.nextFloat() * 3.14f
            val speed = 0.6f + Random.nextFloat() * 1.1f
            bits += Bit(0.5f, 0.6f, cos(angle) * speed * 0.7f, -sin(angle) * speed, Random.nextFloat() * 6f, colors.random())
        }
        var last = 0L
        while (bits.isNotEmpty()) {
            withFrameNanos { now ->
                val dt = if (last == 0L) 0.016f else ((now - last) / 1e9f).coerceAtMost(0.05f)
                last = now
                bits.forEach { b ->
                    b.x += b.vx * dt
                    b.y += b.vy * dt
                    b.vy += 1.5f * dt
                    b.spin += dt * 8f
                }
                bits.removeAll { it.y > 1.1f }
                frame = now
            }
        }
    }
    if (bits.isNotEmpty()) {
        Canvas(Modifier.fillMaxSize()) {
            frame.hashCode()
            bits.forEach { b ->
                val w = 9.dp.toPx() * (0.3f + kotlin.math.abs(sin(b.spin)))
                drawRect(b.color, Offset(b.x * size.width, b.y * size.height), Size(w, 6.dp.toPx()))
            }
        }
    }
}
