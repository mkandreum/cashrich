package win.xyoncloud.cashrich

import android.app.Application
import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.sse.EventSource
import okhttp3.sse.EventSourceListener
import okhttp3.sse.EventSources
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume

private const val ROLL_MS = 1050L
private const val HOP_MS = 300L

data class Banner(val key: Long, val emoji: String, val title: String, val text: String? = null)

class GameViewModel(app: Application) : AndroidViewModel(app) {
    private val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }
    private val client = OkHttpClient.Builder().readTimeout(0, TimeUnit.MILLISECONDS).build()
    private val prefs = app.getSharedPreferences("cashrich", Context.MODE_PRIVATE)
    private val base = BuildConfig.BASE_URL

    var code by mutableStateOf<String?>(null); private set
    var shown by mutableStateOf<Snapshot?>(null); private set
    var motion by mutableStateOf<DiceMotion?>(null); private set
    var online by mutableStateOf(true); private set
    var missing by mutableStateOf(false); private set
    var session by mutableStateOf<Session?>(null); private set
    var banner by mutableStateOf<Banner?>(null); private set
    var toast by mutableStateOf<String?>(null); private set
    var confetti by mutableIntStateOf(0); private set

    private var tvMode = false
    private var latest: Snapshot? = null
    private var staging = false
    private var streamJob: Job? = null
    private var stageJob: Job? = null
    private var bannerJob: Job? = null
    private var toastJob: Job? = null

    val me: Player? get() = shown?.players?.find { it.id == session?.playerId }
    val inviteLink: String get() = "$base/m/$code"

    /** La TV solo es pantalla: abre su propia mesa sin que nadie toque nada. */
    fun startAsTv() {
        tvMode = true
        viewModelScope.launch {
            while (code == null || missing) {
                val created = runCatching { createRoomCall(tv = true) }.getOrNull()
                if (created != null) open(created) else {
                    online = false
                    delay(3000)
                }
            }
        }
    }

    fun open(newCode: String) {
        val clean = newCode.uppercase()
        code = clean
        missing = false
        shown = null
        latest = null
        motion = null
        staging = false
        stageJob?.cancel()
        session = if (tvMode) null else loadSession(clean)
        streamJob?.cancel()
        streamJob = viewModelScope.launch { streamLoop(clean) }
    }

    fun leave() {
        Music.play(null)
        streamJob?.cancel()
        stageJob?.cancel()
        code = null
        shown = null
        latest = null
        motion = null
        session = null
    }

    suspend fun roomExists(target: String): Boolean = withContext(Dispatchers.IO) {
        runCatching {
            client.newCall(Request.Builder().url("$base/api/rooms/${target.uppercase()}").build()).execute().use { it.isSuccessful }
        }.getOrDefault(false)
    }

    suspend fun createAndJoin(name: String, avatar: String) {
        val newCode = createRoomCall(tv = false)
        saveSession(newCode, joinCall(newCode, name, avatar))
        open(newCode)
    }

    suspend fun join(name: String, avatar: String) {
        val target = code ?: return
        val seat = joinCall(target, name, avatar)
        saveSession(target, seat)
        session = seat
    }

    fun send(type: String, payload: JsonObject? = null) {
        if (tvMode) return
        val target = code ?: return
        val seat = session ?: return
        viewModelScope.launch {
            try {
                post(
                    "/api/rooms/$target/action",
                    buildJsonObject {
                        put("playerId", seat.playerId)
                        put("token", seat.token)
                        put("type", type)
                        if (payload != null) put("payload", payload)
                    },
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                showToast(e.message ?: "Algo salió mal")
            }
        }
    }

    private var lastBack = 0L

    /** Atrás en la TV: la primera vez avisa, la segunda cierra esta mesa y abre una nueva con otro QR. */
    fun tvBack() {
        val now = System.currentTimeMillis()
        if (now - lastBack < 2500) {
            lastBack = 0
            leave()
            startAsTv()
        } else {
            lastBack = now
            showToast("Pulsa Atrás otra vez para cerrar la mesa")
        }
    }

    private fun showToast(text: String) {
        toast = text
        toastJob?.cancel()
        toastJob = viewModelScope.launch {
            delay(2600)
            toast = null
        }
    }

    private suspend fun createRoomCall(tv: Boolean): String {
        val body = post("/api/rooms", buildJsonObject { put("tv", tv) })
        return body.getValue("code").jsonPrimitive.content
    }

    private suspend fun joinCall(target: String, name: String, avatar: String): Session {
        val body = post("/api/rooms/$target/join", buildJsonObject { put("name", name); put("avatar", avatar) })
        return Session(body.getValue("playerId").jsonPrimitive.content, body.getValue("token").jsonPrimitive.content)
    }

    private suspend fun post(path: String, body: JsonObject): JsonObject = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(base + path)
            .post(body.toString().toRequestBody("application/json".toMediaType()))
            .build()
        val response = try {
            client.newCall(request).execute()
        } catch (e: java.io.IOException) {
            throw IllegalStateException("Sin conexión con el servidor")
        }
        response.use {
            val data = runCatching { json.parseToJsonElement(it.body?.string().orEmpty()).jsonObject }.getOrDefault(JsonObject(emptyMap()))
            if (!it.isSuccessful) throw IllegalStateException((data["error"] as? JsonPrimitive)?.content ?: "Algo salió mal")
            data
        }
    }

    private fun loadSession(target: String): Session? {
        val raw = prefs.getString("s:$target", null) ?: return null
        val parts = raw.split('|')
        return if (parts.size == 2) Session(parts[0], parts[1]) else null
    }

    private fun saveSession(target: String, seat: Session) {
        prefs.edit().putString("s:$target", "${seat.playerId}|${seat.token}").apply()
    }

    // ------------------------------------------------------------ tiempo real

    private suspend fun streamLoop(target: String) {
        while (true) {
            val notFound = streamOnce(target)
            online = false
            if (notFound) {
                missing = true
                if (tvMode) {
                    code = null
                    startAsTv()
                }
                return
            }
            delay(2000)
        }
    }

    /** Devuelve true si el servidor confirma que la mesa ya no existe. */
    private suspend fun streamOnce(target: String): Boolean = suspendCancellableCoroutine { cont ->
        val request = Request.Builder().url("$base/api/rooms/$target/events").build()
        val source = EventSources.createFactory(client).newEventSource(request, object : EventSourceListener() {
            override fun onEvent(eventSource: EventSource, id: String?, type: String?, data: String) {
                val snapshot = runCatching { json.decodeFromString<Snapshot>(data) }.getOrNull() ?: return
                viewModelScope.launch {
                    online = true
                    receive(snapshot)
                }
            }

            override fun onClosed(eventSource: EventSource) {
                if (cont.isActive) cont.resume(false)
            }

            override fun onFailure(eventSource: EventSource, t: Throwable?, response: Response?) {
                if (cont.isActive) cont.resume(response?.code == 404)
            }
        })
        cont.invokeOnCancellation { source.cancel() }
    }

    /**
     * El servidor resuelve la tirada al instante. Se retiene lo que se muestra hasta que
     * el dado cae y la ficha llega, para no destripar la carta ni el dinero.
     */
    private fun receive(next: Snapshot) {
        latest = next
        if (staging) return
        val prev = shown
        val isRoll = prev != null && next.dice > 0 && prev.dice == 0 && prev.phase == "playing" && prev.turn == next.turn
        if (!isRoll) {
            show(next)
            return
        }
        val mover = prev!!.players[prev.turn]
        val lane = if (mover.escaped) "via" else "board"
        val from = if (mover.escaped) mover.vpos else mover.pos
        staging = true
        Sfx.roll()
        Music.duck(1000)
        motion = DiceMotion(mover.id, lane, from, 0, next.dice, rolling = true)
        stageJob = viewModelScope.launch {
            delay(ROLL_MS)
            for (step in 0..next.dice) {
                motion = DiceMotion(mover.id, lane, from, step, next.dice, rolling = false)
                if (step > 0) Sfx.hop()
                delay(HOP_MS)
            }
            staging = false
            motion = null
            latest?.let { show(it) }
        }
    }

    private fun show(next: Snapshot) {
        val before = shown
        shown = next
        Music.play(
            when {
                next.phase == "lobby" -> Mood.LOBBY
                next.players.any { it.escaped && !it.bankrupt } -> Mood.FAST
                else -> Mood.GAME
            },
        )
        if (before != null && before.code == next.code) celebrate(before, next)
    }

    private fun celebrate(before: Snapshot, room: Snapshot) {
        val meId = session?.playerId
        val cardName = room.lastCard?.name
        if (cardName != null && cardName != before.lastCard?.name) Sfx.card(); Music.duck(900)

        val mine = room.players.find { it.id == meId }
        val mineBefore = before.players.find { it.id == meId }
        if (mine != null && mineBefore != null && mine.cash != mineBefore.cash) {
            if (mine.cash > mineBefore.cash) Sfx.coin() else Sfx.loss()
        }

        room.players.forEach { p ->
            val was = before.players.find { it.id == p.id } ?: return@forEach
            if (p.escaped && !was.escaped) {
                Sfx.fanfare(); Music.duck(1800)
                confetti++
                popBanner("unlock", "¡${p.name} escapó!", "Sus rentas ya pagan su vida. Rumbo a la vía rápida.")
            }
            if (p.bankrupt && !was.bankrupt) {
                Sfx.loss()
                popBanner("skull", "${p.name} quebró", "Queda fuera de la partida.")
            }
        }

        val turnMoved = before.turn != room.turn || (before.phase != "playing" && room.phase == "playing")
        if (turnMoved && room.phase == "playing") {
            val current = room.current
            if (current != null && current.id == meId) {
                Sfx.turn(); Music.duck(800)
                popBanner(current.avatar, "¡Te toca!")
            } else if (tvMode && current != null) {
                Sfx.turn(); Music.duck(800)
                popBanner(current.avatar, "Turno de ${current.name}")
            }
        }
        if (before.phase != "over" && room.phase == "over") {
            Sfx.fanfare(); Music.duck(1800)
            viewModelScope.launch {
                repeat(3) {
                    confetti++
                    delay(550)
                }
            }
        }
    }

    private fun popBanner(emoji: String, title: String, text: String? = null) {
        banner = Banner(System.nanoTime(), emoji, title, text)
        bannerJob?.cancel()
        bannerJob = viewModelScope.launch {
            delay(if (text != null) 2600 else 1200)
            banner = null
        }
    }
}
