package win.xyoncloud.cashrich

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.pow
import kotlin.random.Random

/** Los mismos efectos de la web, sintetizados: sin ficheros de audio. */
object Sfx {
    private const val RATE = 22050
    private enum class Wave { TRIANGLE, SQUARE, SAW }
    private class Tone(val freq: Double, val at: Double, val length: Double, val wave: Wave, val volume: Double, val slideTo: Double? = null)

    private val scope = CoroutineScope(Dispatchers.Default)
    private var vibrator: Vibrator? = null
    private var prefs: android.content.SharedPreferences? = null
    var muted = false
        set(value) {
            field = value
            prefs?.edit()?.putBoolean("muted", value)?.apply()
        }

    fun init(context: Context) {
        @Suppress("DEPRECATION")
        vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        prefs = context.getSharedPreferences("cashrich", Context.MODE_PRIVATE)
        muted = prefs?.getBoolean("muted", false) ?: false
    }

    private fun play(tones: List<Tone>) {
        if (muted) return
        scope.launch {
            val total = tones.maxOf { it.at + it.length } + 0.05
            val mix = DoubleArray((total * RATE).toInt())
            tones.forEach { tone ->
                val start = (tone.at * RATE).toInt()
                val count = (tone.length * RATE).toInt()
                var phase = 0.0
                for (i in 0 until count) {
                    val t = i.toDouble() / count
                    val freq = tone.slideTo?.let { tone.freq * (it / tone.freq).pow(t) } ?: tone.freq
                    phase += freq / RATE
                    val cycle = phase - phase.toLong()
                    val sample = when (tone.wave) {
                        Wave.TRIANGLE -> 1 - 4 * kotlin.math.abs(cycle - 0.5)
                        Wave.SQUARE -> if (cycle < 0.5) 1.0 else -1.0
                        Wave.SAW -> 2 * cycle - 1
                    }
                    if (start + i < mix.size) mix[start + i] += sample * tone.volume * exp(-5.0 * t)
                }
            }
            val pcm = ShortArray(mix.size) { (mix[it].coerceIn(-1.0, 1.0) * Short.MAX_VALUE).toInt().toShort() }
            runCatching {
                val track = AudioTrack.Builder()
                    .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
                    .setAudioFormat(AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(RATE).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                    .setBufferSizeInBytes(max(pcm.size * 2, 2048))
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build()
                track.write(pcm, 0, pcm.size)
                track.play()
                delay((total * 1000).toLong() + 100)
                track.release()
            }
        }
    }

    private fun buzz(vararg pattern: Long) {
        val v = vibrator ?: return
        if (Build.VERSION.SDK_INT >= 26) {
            runCatching { v.vibrate(VibrationEffect.createWaveform(longArrayOf(0) + pattern, -1)) }
        }
    }

    fun tap() = play(listOf(Tone(520.0, 0.0, 0.06, Wave.SQUARE, 0.08)))
    fun roll() {
        play(List(9) { Tone(180 + Random.nextDouble() * 260, it * 0.095, 0.05, Wave.SQUARE, 0.12) })
        buzz(30, 40, 30, 40, 30)
    }
    fun hop() = play(listOf(Tone(640.0, 0.0, 0.08, Wave.TRIANGLE, 0.22, 900.0)))
    fun card() = play(listOf(Tone(320.0, 0.0, 0.09, Wave.SAW, 0.1, 720.0), Tone(880.0, 0.09, 0.1, Wave.TRIANGLE, 0.18)))
    fun coin() {
        play(listOf(Tone(988.0, 0.0, 0.08, Wave.SQUARE, 0.12), Tone(1319.0, 0.08, 0.24, Wave.SQUARE, 0.12)))
        buzz(25)
    }
    fun loss() {
        play(listOf(Tone(300.0, 0.0, 0.26, Wave.SAW, 0.18, 110.0)))
        buzz(60, 40, 60)
    }
    fun turn() {
        play(listOf(523.0, 659.0, 784.0).mapIndexed { i, f -> Tone(f, i * 0.09, 0.14, Wave.TRIANGLE, 0.25) })
        buzz(80, 60, 80)
    }
    fun fanfare() {
        play(listOf(523.0, 659.0, 784.0, 1047.0, 784.0, 1047.0, 1319.0).mapIndexed { i, f -> Tone(f, i * 0.12, 0.24, Wave.SQUARE, 0.13) })
        buzz(100, 60, 100, 60, 200)
    }
}

