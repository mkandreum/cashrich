package win.xyoncloud.cashrich

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sin

/**
 * Música original de CashRich, sintetizada al vuelo (sin ficheros de audio).
 * Es el MISMO algoritmo que web/src/lib/music.ts: si cambias uno, cambia el otro.
 */
enum class Mood { LOBBY, GAME, FAST }

object Music {
    private const val RATE = 22050
    private const val STEPS_PER_CHORD = 8
    private val PENTA = intArrayOf(0, 2, 4, 7, 9)
    private const val BASE_VOLUME = 0.32f

    private val QUALITY = mapOf(
        "maj7" to intArrayOf(0, 4, 7, 11), "m7" to intArrayOf(0, 3, 7, 10), "dom7" to intArrayOf(0, 4, 7, 10),
        "maj" to intArrayOf(0, 4, 7), "min" to intArrayOf(0, 3, 7),
    )
    private const val C = 36; private const val D = 38; private const val E = 40
    private const val F = 41; private const val G = 43; private const val A = 45

    private class Prog(val bpm: Int, val melody: Int, val seed: Int, val chords: List<Pair<Int, String>>)
    private val PROGS = mapOf(
        Mood.LOBBY to Prog(84, 42, 3, listOf(C to "maj7", A to "m7", F to "maj7", G to "dom7", C to "maj7", E to "m7", F to "maj7", G to "dom7")),
        Mood.GAME to Prog(104, 58, 11, listOf(C to "maj7", A to "m7", D to "m7", G to "dom7", C to "maj7", E to "m7", F to "maj7", G to "dom7")),
        Mood.FAST to Prog(126, 72, 29, listOf(A to "m7", F to "maj7", C to "maj", G to "dom7", A to "m7", F to "maj7", D to "m7", E to "dom7")),
    )

    private fun hz(midi: Int) = 440.0 * 2.0.pow((midi - 69) / 12.0)

    private fun hash(x: Int): Long {
        var h = (x xor 0x9e3779b9.toInt()) * 0x85ebca6b.toInt()
        h = h xor (h ushr 13)
        h *= 0xc2b2ae35.toInt()
        h = h xor (h ushr 16)
        return h.toLong() and 0xFFFFFFFFL
    }
    private fun noise(n: Int, salt: Int) = (hash(n * 7 + salt).toDouble() / 4294967296.0) * 2 - 1

    private enum class Kind { TRI, BELL, PAD, BASS }

    /** Renderiza el bucle completo a PCM mono de 16 bits. */
    fun renderLoop(mood: Mood): ShortArray {
        val p = PROGS.getValue(mood)
        val stepSec = 60.0 / p.bpm / 2
        val stepLen = (stepSec * RATE).roundToInt()
        val total = p.chords.size * STEPS_PER_CHORD * stepLen
        val mix = DoubleArray(total)

        fun note(at: Int, midi: Int, len: Double, vol: Double, kind: Kind) {
            val f = hz(midi)
            val n = (len * RATE).roundToInt()
            val attack = if (kind == Kind.PAD) 0.18 * RATE else 0.004 * RATE
            var phase = 0.0
            for (i in 0 until n) {
                phase += f / RATE
                val c = phase - floor(phase)
                val t = i.toDouble() / n
                val s = when (kind) {
                    Kind.TRI -> 1 - 4 * abs(c - 0.5)
                    Kind.BELL -> sin(2 * PI * c) + 0.35 * sin(4 * PI * c) * (1 - t) + 0.12 * sin(6 * PI * c)
                    Kind.BASS -> sin(2 * PI * c) * 0.8 + (1 - 4 * abs(c - 0.5)) * 0.35
                    Kind.PAD -> sin(2 * PI * c)
                }
                val env = if (kind == Kind.PAD) min(1.0, i / attack) * min(1.0, (n - i) / (0.25 * RATE))
                else min(1.0, i / attack) * exp(-(if (kind == Kind.BASS) 3.2 else 4.5) * t)
                mix[(at + i) % total] += s * env * vol
            }
        }
        fun kick(at: Int, vol: Double) {
            val n = (0.2 * RATE).roundToInt()
            var phase = 0.0
            for (i in 0 until n) {
                val t = i.toDouble() / n
                phase += (45 + 90 * exp(-14 * t)) / RATE
                mix[(at + i) % total] += sin(2 * PI * phase) * exp(-6 * t) * vol
            }
        }
        fun hat(at: Int, vol: Double, len: Double, salt: Int) {
            val n = (len * RATE).roundToInt()
            for (i in 1 until n) {
                val t = i.toDouble() / n
                mix[(at + i) % total] += (noise(at + i, salt) - noise(at + i - 1, salt)) * 0.5 * exp(-7 * t) * vol
            }
        }

        var walk = 4
        p.chords.forEachIndexed { ci, (root, q) ->
            val tones = QUALITY.getValue(q)
            for (l in 0 until STEPS_PER_CHORD) {
                val g = ci * STEPS_PER_CHORD + l
                val at = g * stepLen
                if (l == 0) note(at, root, stepSec * 3.2, 0.34, Kind.BASS)
                if (l == 4 && mood != Mood.LOBBY) note(at, root + 7, stepSec * 2.6, 0.26, Kind.BASS)
                if (l == 6 && mood == Mood.FAST) note(at, root + 12, stepSec * 1.4, 0.2, Kind.BASS)

                if (mood == Mood.FAST) {
                    note(at, root + 24 + tones[l % tones.size] + (if (l >= 4) 12 else 0), stepSec * 1.1, 0.075, Kind.TRI)
                } else if (l == 0) {
                    for (t in tones) note(at, root + 24 + t, stepSec * 8.2, if (mood == Mood.LOBBY) 0.05 else 0.04, Kind.PAD)
                }

                val h = hash(g * 131 + p.seed)
                if (h % 100 < p.melody) {
                    val dir = ((h ushr 8) % 5).toInt() - 2
                    walk = max(0, min(9, walk + dir))
                    val midi = 72 + PENTA[walk % 5] + 12 * (walk / 5)
                    val long = ((h ushr 16) % 4).toInt() == 0
                    note(at, midi, stepSec * (if (long) 3.2 else 1.7), if (mood == Mood.LOBBY) 0.11 else 0.1, Kind.BELL)
                }

                if (mood != Mood.LOBBY) {
                    if (l == 0 || l == 4) kick(at, if (mood == Mood.FAST) 0.34 else 0.28)
                    if (mood == Mood.FAST && (l == 2 || l == 6)) hat(at, 0.55, 0.12, 5)
                    if (l % 2 == 1) hat(at, if (mood == Mood.FAST) 0.2 else 0.14, 0.05, 1)
                } else if (l % 2 == 1) {
                    hat(at, 0.07, 0.07, 2)
                }
            }
        }

        var peak = 0.0
        for (v in mix) peak = max(peak, abs(v))
        val k = if (peak > 0) 0.8 / peak else 1.0
        return ShortArray(total) { (mix[it] * k * Short.MAX_VALUE).toInt().toShort() }
    }

    /* ───────── Reproductor ───────── */

    private val scope = CoroutineScope(Dispatchers.Default)
    private var prefs: android.content.SharedPreferences? = null
    private var track: AudioTrack? = null
    private var playing: Mood? = null
    private var wanted: Mood? = null
    private var paused = false
    private var job: Job? = null
    private var duckJob: Job? = null
    private var generation = 0

    var enabled = true
        set(value) {
            field = value
            prefs?.edit()?.putBoolean("music", value)?.apply()
            sync()
        }

    fun init(context: Context) {
        prefs = context.getSharedPreferences("cashrich", Context.MODE_PRIVATE)
        enabled = prefs?.getBoolean("music", true) ?: true
    }

    /** null = silencio (fuera de una mesa). */
    fun play(mood: Mood?) {
        wanted = mood
        sync()
    }

    fun pause() { paused = true; sync() }
    fun resume() { paused = false; sync() }

    /** Baja un momento la música para que se oiga un efecto. */
    fun duck(ms: Long = 700) {
        val t = track ?: return
        duckJob?.cancel()
        duckJob = scope.launch {
            runCatching { t.setVolume(BASE_VOLUME * 0.35f) }
            delay(ms)
            runCatching { t.setVolume(BASE_VOLUME) }
        }
    }

    @Synchronized
    private fun sync() {
        val target = if (enabled && !paused) wanted else null
        if (target == playing) return
        val old = track
        track = null
        playing = target
        generation++
        val mine = generation
        job?.cancel()
        scope.launch {
            old?.let { fade(it) }
        }
        if (target == null) return
        job = scope.launch {
            val pcm = cache.getOrPut(target) { renderLoop(target) }
            if (mine != generation) return@launch
            runCatching {
                val t = AudioTrack.Builder()
                    .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
                    .setAudioFormat(AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(RATE).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                    .setBufferSizeInBytes(pcm.size * 2)
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build()
                t.write(pcm, 0, pcm.size)
                t.setLoopPoints(0, pcm.size, -1)
                t.setVolume(0f)
                synchronized(this@Music) {
                    if (mine != generation) { t.release(); return@launch }
                    track = t
                }
                t.play()
                for (i in 1..16) { t.setVolume(BASE_VOLUME * i / 16f); delay(100) }
            }
        }
    }

    private val cache = HashMap<Mood, ShortArray>()

    private suspend fun fade(t: AudioTrack) {
        runCatching {
            for (i in 7 downTo 0) { t.setVolume(BASE_VOLUME * i / 8f); delay(80) }
            t.stop()
            t.release()
        }
    }
}
