package win.xyoncloud.cashrich

import android.content.Intent
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : ComponentActivity() {
    private val vm: GameViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val bars = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
        enableEdgeToEdge(bars, bars)
        Sfx.init(this)
        Music.init(this)
        Art.init(this)
        // Ni la TV ni el móvil deben apagarse a mitad de partida
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val tv = BuildConfig.IS_TV
        if (tv) {
            // La TV es pantalla completa pura
            WindowCompat.getInsetsController(window, window.decorView).apply {
                systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                hide(WindowInsetsCompat.Type.systemBars())
            }
        }
        if (savedInstanceState == null) {
            if (tv) vm.startAsTv() else openLink(intent)
        }
        setContent { App(vm, tv) }
    }

    override fun onPause() {
        super.onPause()
        Music.pause()
    }

    override fun onResume() {
        super.onResume()
        Music.resume()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (!BuildConfig.IS_TV) openLink(intent)
    }

    /** Enlaces de invitación: https://cashrich.xyoncloud.win/m/ABCD */
    private fun openLink(intent: Intent?) {
        val path = intent?.data?.pathSegments ?: return
        if (path.size >= 2 && path[0] == "m" && path[1].length == 4) vm.open(path[1])
    }
}
