package win.xyoncloud.cashrich

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color as AColor
import android.graphics.Paint
import android.opengl.EGL14
import android.opengl.GLES30 as GL
import android.opengl.GLSurfaceView
import android.opengl.GLUtils
import android.opengl.Matrix
import androidx.core.content.res.ResourcesCompat
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.nio.ByteBuffer
import java.nio.ByteOrder
import javax.microedition.khronos.egl.EGL10
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.egl.EGLDisplay
import javax.microedition.khronos.opengles.GL10
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.random.Random

/* Tablero 3D nativo: mismos modelos (web/shared/models3d.json) y misma cámara que la web. */

@Serializable
private data class Part(
    val s: String, val p: List<Float>, val z: List<Float>, val c: String,
    val r: List<Float>? = null, val spin: Int = 0, val spinZ: Int = 0,
)

private const val CELL = 1.12f
private const val COLS = 10 // rejilla 10x8: anillo de 32 casillas y vía rápida de 16
private const val ROWS = 8
private const val LANE_COLS = COLS - 2
private const val TOP = -CELL * (ROWS - 2) / 2f
private const val LANE_BOTTOM = TOP + 2 * CELL * 0.96f + 0.04f
private const val PLAZA_BOTTOM = CELL * (ROWS - 2) / 2f
private const val PLAZA_Z = (LANE_BOTTOM + PLAZA_BOTTOM) / 2f
private const val PLAZA_D = PLAZA_BOTTOM - LANE_BOTTOM - 0.1f
private const val LANE_Y = 0.32f
private const val STRIDE = 12 // pos3 normal3 color3 win uv2

private class TileLook(val color: String, val model: String, val label: String, val ink: String)
private val TILES = mapOf(
    "cobrar" to TileLook("#FFC83D", "coins", "NÓMINA", "#1D1A33"),
    "peq" to TileLook("#2FB5F5", "house", "GANGA", "#10143A"),
    "grande" to TileLook("#FF5A4E", "tower", "GRAN PROYECTO", "#FFFFFF"),
    "mercado" to TileLook("#8B5CF6", "market", "NOTICIAS", "#FFFFFF"),
    "gusto" to TileLook("#FF6FB5", "shop", "CAPRICHO", "#1D1A33"),
    "banco" to TileLook("#7C8BD6", "bank", "BANCO", "#10143A"),
    "sueno" to TileLook("#FFF0A8", "castle", "LEGADO", "#1D1A33"),
    "salida" to TileLook("#3DDC97", "arch", "SALIDA", "#10143A"),
    "auditoria" to TileLook("#7C8BD6", "dome", "INSPECCIÓN", "#10143A"),
    "oportunidad" to TileLook("#FF5A4E", "rocket", "PROYECTO", "#FFFFFF"),
    "impuesto" to TileLook("#9AA3B5", "hacienda", "HACIENDA", "#10143A"),
    "formacion" to TileLook("#4FD1C5", "school", "FORMACIÓN", "#10143A"),
    "imprevisto" to TileLook("#FF9F43", "storm", "IMPREVISTO", "#1D1A33"),
)
private val ASSET_MODEL = mapOf(
    "VIVIENDA" to "house", "COMERCIAL" to "tower", "INDUSTRIAL" to "factory", "TURISMO" to "hotel", "TERRENO" to "land", "ENERGÍA" to "turbine", "AGRO" to "farm",
    "BOLSA" to "chart", "RENTA FIJA" to "bank", "COLECTIVO" to "chart", "PROTECCIÓN" to "bank", "VOLÁTIL" to "chart", "REGALÍAS" to "coins", "CRIPTO" to "chart",
    "RIESGO" to "rocket", "DUDOSA" to "rocket", "NEGOCIO" to "shop", "FRANQUICIA" to "shop", "SOCIEDAD" to "tower", "SERVICIO" to "shop", "DIGITAL" to "tower",
)

private fun tileLook(track: String, i: Int): TileLook {
    val kind = (if (track == "board") BOARD else VIA)[i].kind
    return when {
        track == "board" && i == 0 -> TILES.getValue("salida")
        track == "via" && kind == "banco" -> TILES.getValue("auditoria")
        track == "via" && kind == "peq" -> TILES.getValue("oportunidad")
        else -> TILES.getValue(kind)
    }
}

private class V3(val x: Float, val y: Float, val z: Float)

private fun tileSpot(track: String, i: Int): V3 {
    if (track == "board") {
        val (col, row) = BOARD_POS[i]
        return V3((col - (COLS + 1) / 2f) * CELL, 0.1f, (row - (ROWS + 1) / 2f) * CELL)
    }
    val (col, row) = VIA_POS[i]
    val width = LANE_COLS * CELL
    val cell = (width - 0.16f) / LANE_COLS
    return V3(-width / 2 + 0.08f + cell * (col - 1.5f), LANE_Y + 0.1f, TOP + 0.56f + (row - 2) * CELL * 0.96f + 0.02f)
}

private fun rgb(hex: String) = AColor.parseColor(hex).let { floatArrayOf(AColor.red(it) / 255f, AColor.green(it) / 255f, AColor.blue(it) / 255f) }
private fun easeOut(t: Float) = 1 - (1 - t).pow(3)

// ------------------------------------------------------------ geometría

private class Tri(val verts: FloatArray) // triángulos: pos3 normal3 uv2

private object Shapes {
    private fun quad(out: MutableList<Float>, a: FloatArray, b: FloatArray, c: FloatArray, d: FloatArray, n: FloatArray) {
        val uv = arrayOf(floatArrayOf(0f, 0f), floatArrayOf(1f, 0f), floatArrayOf(1f, 1f), floatArrayOf(0f, 1f))
        listOf(0 to a, 1 to b, 2 to c, 0 to a, 2 to c, 3 to d).forEach { (k, v) ->
            out.addAll(v.toList()); out.addAll(n.toList()); out.addAll(uv[k].toList())
        }
    }

    val box: Tri by lazy {
        val o = mutableListOf<Float>()
        val h = 0.5f
        fun f(ax: Float, ay: Float, az: Float, bx: Float, by: Float, bz: Float, cx: Float, cy: Float, cz: Float, dx: Float, dy: Float, dz: Float, nx: Float, ny: Float, nz: Float) =
            quad(o, floatArrayOf(ax, ay, az), floatArrayOf(bx, by, bz), floatArrayOf(cx, cy, cz), floatArrayOf(dx, dy, dz), floatArrayOf(nx, ny, nz))
        f(-h, -h, h, h, -h, h, h, h, h, -h, h, h, 0f, 0f, 1f)
        f(h, -h, -h, -h, -h, -h, -h, h, -h, h, h, -h, 0f, 0f, -1f)
        f(h, -h, h, h, -h, -h, h, h, -h, h, h, h, 1f, 0f, 0f)
        f(-h, -h, -h, -h, -h, h, -h, h, h, -h, h, -h, -1f, 0f, 0f)
        f(-h, h, h, h, h, h, h, h, -h, -h, h, -h, 0f, 1f, 0f)
        f(-h, -h, -h, h, -h, -h, h, -h, h, -h, -h, h, 0f, -1f, 0f)
        Tri(o.toFloatArray())
    }

    private fun lathe(top: Float, bottom: Float, segments: Int = 20): Tri {
        val o = mutableListOf<Float>()
        val slope = (bottom - top)
        val len = sqrt(1 + slope * slope)
        fun push(x: Float, y: Float, z: Float, nx: Float, ny: Float, nz: Float) { o += listOf(x, y, z, nx, ny, nz, 0f, 0f) }
        for (i in 0 until segments) {
            val a = i * 2 * PI.toFloat() / segments
            val b = (i + 1) * 2 * PI.toFloat() / segments
            val (ca, sa, cb, sb) = listOf(cos(a), sin(a), cos(b), sin(b))
            val ny = slope / len
            val k = 1 / len
            push(ca * bottom, -0.5f, sa * bottom, ca * k, ny, sa * k); push(ca * top, 0.5f, sa * top, ca * k, ny, sa * k); push(cb * top, 0.5f, sb * top, cb * k, ny, sb * k)
            push(ca * bottom, -0.5f, sa * bottom, ca * k, ny, sa * k); push(cb * top, 0.5f, sb * top, cb * k, ny, sb * k); push(cb * bottom, -0.5f, sb * bottom, cb * k, ny, sb * k)
            if (top > 0) { push(0f, 0.5f, 0f, 0f, 1f, 0f); push(cb * top, 0.5f, sb * top, 0f, 1f, 0f); push(ca * top, 0.5f, sa * top, 0f, 1f, 0f) }
            if (bottom > 0) { push(0f, -0.5f, 0f, 0f, -1f, 0f); push(ca * bottom, -0.5f, sa * bottom, 0f, -1f, 0f); push(cb * bottom, -0.5f, sb * bottom, 0f, -1f, 0f) }
        }
        return Tri(o.toFloatArray())
    }

    val cyl: Tri by lazy { lathe(0.5f, 0.5f) }
    val cone: Tri by lazy { lathe(0f, 0.5f) }
    val pawnBody: Tri by lazy { lathe(0.28f, 0.5f) }

    val sphere: Tri by lazy {
        val o = mutableListOf<Float>()
        val rings = 12
        val segs = 18
        fun p(r: Int, s: Int): FloatArray {
            val th = r * PI.toFloat() / rings
            val ph = s * 2 * PI.toFloat() / segs
            return floatArrayOf(sin(th) * cos(ph), cos(th), sin(th) * sin(ph))
        }
        fun push(v: FloatArray) { o += listOf(v[0] / 2, v[1] / 2, v[2] / 2, v[0], v[1], v[2], 0f, 0f) }
        for (r in 0 until rings) for (s in 0 until segs) {
            val (a, b, c, d) = listOf(p(r, s), p(r + 1, s), p(r + 1, s + 1), p(r, s + 1))
            push(a); push(c); push(b); push(a); push(d); push(c)
        }
        Tri(o.toFloatArray())
    }

    val gem: Tri by lazy {
        val o = mutableListOf<Float>()
        val tips = listOf(floatArrayOf(0f, 0.5f, 0f), floatArrayOf(0f, -0.5f, 0f))
        val ring = listOf(floatArrayOf(0.5f, 0f, 0f), floatArrayOf(0f, 0f, 0.5f), floatArrayOf(-0.5f, 0f, 0f), floatArrayOf(0f, 0f, -0.5f))
        tips.forEachIndexed { t, tip ->
            for (i in 0..3) {
                val a = ring[i]
                val b = ring[(i + 1) % 4]
                val n = floatArrayOf(a[0] + b[0], tip[1], a[2] + b[2])
                val l = sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2])
                listOf(tip, if (t == 0) b else a, if (t == 0) a else b).forEach { v -> o += listOf(v[0], v[1], v[2], n[0] / l, n[1] / l, n[2] / l, 0f, 0f) }
            }
        }
        Tri(o.toFloatArray())
    }

    val roof: Tri by lazy {
        val o = mutableListOf<Float>()
        fun push(x: Float, y: Float, z: Float, nx: Float, ny: Float, nz: Float) { o += listOf(x, y, z, nx, ny, nz, 0f, 0f) }
        val h = 0.5f
        push(-h, -h, h, 0f, 0f, 1f); push(h, -h, h, 0f, 0f, 1f); push(0f, h, h, 0f, 0f, 1f)
        push(h, -h, -h, 0f, 0f, -1f); push(-h, -h, -h, 0f, 0f, -1f); push(0f, h, -h, 0f, 0f, -1f)
        val l = sqrt(2f)
        push(h, -h, h, 1 / l, 1 / l, 0f); push(h, -h, -h, 1 / l, 1 / l, 0f); push(0f, h, -h, 1 / l, 1 / l, 0f)
        push(h, -h, h, 1 / l, 1 / l, 0f); push(0f, h, -h, 1 / l, 1 / l, 0f); push(0f, h, h, 1 / l, 1 / l, 0f)
        push(-h, -h, -h, -1 / l, 1 / l, 0f); push(-h, -h, h, -1 / l, 1 / l, 0f); push(0f, h, h, -1 / l, 1 / l, 0f)
        push(-h, -h, -h, -1 / l, 1 / l, 0f); push(0f, h, h, -1 / l, 1 / l, 0f); push(0f, h, -h, -1 / l, 1 / l, 0f)
        push(-h, -h, h, 0f, -1f, 0f); push(-h, -h, -h, 0f, -1f, 0f); push(h, -h, -h, 0f, -1f, 0f)
        push(-h, -h, h, 0f, -1f, 0f); push(h, -h, -h, 0f, -1f, 0f); push(h, -h, h, 0f, -1f, 0f)
        Tri(o.toFloatArray())
    }

    fun of(name: String): Tri = when (name) {
        "cyl" -> cyl
        "cone" -> cone
        "sphere" -> sphere
        "gem" -> gem
        "roof" -> roof
        else -> box
    }
}

private class Mesh(data: FloatArray) {
    val count = data.size / STRIDE
    private val vao = IntArray(1)
    private val vbo = IntArray(1)

    init {
        GL.glGenVertexArrays(1, vao, 0)
        GL.glGenBuffers(1, vbo, 0)
        GL.glBindVertexArray(vao[0])
        GL.glBindBuffer(GL.GL_ARRAY_BUFFER, vbo[0])
        val buffer = ByteBuffer.allocateDirect(data.size * 4).order(ByteOrder.nativeOrder()).asFloatBuffer().put(data)
        buffer.position(0)
        GL.glBufferData(GL.GL_ARRAY_BUFFER, data.size * 4, buffer, GL.GL_STATIC_DRAW)
        val bytes = STRIDE * 4
        listOf(0 to (3 to 0), 1 to (3 to 3), 2 to (3 to 6), 3 to (1 to 9), 4 to (2 to 10)).forEach { (loc, f) ->
            GL.glEnableVertexAttribArray(loc)
            GL.glVertexAttribPointer(loc, f.first, GL.GL_FLOAT, false, bytes, f.second * 4)
        }
        GL.glBindVertexArray(0)
    }

    fun draw() {
        GL.glBindVertexArray(vao[0])
        GL.glDrawArrays(GL.GL_TRIANGLES, 0, count)
    }
}

/** Acumula piezas transformadas en un solo búfer: una llamada de dibujo para toda la ciudad. */
private class Batch {
    private val out = ArrayList<Float>(40000)

    fun add(tri: Tri, m: FloatArray, color: FloatArray, windows: Boolean = false) {
        val inv = FloatArray(16)
        val normal = FloatArray(16)
        Matrix.invertM(inv, 0, m, 0)
        Matrix.transposeM(normal, 0, inv, 0)
        val p = FloatArray(4)
        val n = FloatArray(4)
        val v = tri.verts
        var i = 0
        while (i < v.size) {
            Matrix.multiplyMV(p, 0, m, 0, floatArrayOf(v[i], v[i + 1], v[i + 2], 1f), 0)
            Matrix.multiplyMV(n, 0, normal, 0, floatArrayOf(v[i + 3], v[i + 4], v[i + 5], 0f), 0)
            val l = max(0.0001f, sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]))
            out.add(p[0]); out.add(p[1]); out.add(p[2])
            out.add(n[0] / l); out.add(n[1] / l); out.add(n[2] / l)
            out.add(color[0]); out.add(color[1]); out.add(color[2])
            out.add(if (windows && abs(n[1] / l) < 0.5f) 1f else 0f)
            out.add(v[i + 6]); out.add(v[i + 7])
            i += 8
        }
    }

    fun mesh() = Mesh(out.toFloatArray())
}

private fun whiteMesh(tri: Tri): Mesh {
    val identity = FloatArray(16).also { Matrix.setIdentityM(it, 0) }
    return Batch().apply { add(tri, identity, floatArrayOf(1f, 1f, 1f)) }.mesh()
}

private fun trs(x: Float, y: Float, z: Float, sx: Float = 1f, sy: Float = sx, sz: Float = sx, r: List<Float>? = null, parent: FloatArray? = null): FloatArray {
    val m = FloatArray(16)
    if (parent != null) parent.copyInto(m) else Matrix.setIdentityM(m, 0)
    Matrix.translateM(m, 0, x, y, z)
    if (r != null) {
        Matrix.rotateM(m, 0, r[0], 1f, 0f, 0f)
        Matrix.rotateM(m, 0, r[1], 0f, 1f, 0f)
        Matrix.rotateM(m, 0, r[2], 0f, 0f, 1f)
    }
    Matrix.scaleM(m, 0, sx, sy, sz)
    return m
}

private const val MAIN_VS = """#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNormal; layout(location=2) in vec3 aColor;
layout(location=3) in float aWin; layout(location=4) in vec2 aUv;
uniform mat4 uVP; uniform mat4 uModel; uniform mat4 uLight; uniform vec3 uTint;
out vec3 vNormal; out vec3 vColor; out float vWin; out vec2 vUv; out vec4 vShadow; out vec3 vWorld;
void main(){
  vec4 w = uModel * vec4(aPos,1.0);
  vNormal = normalize(mat3(uModel) * aNormal);
  vColor = aColor * uTint; vWin = aWin; vUv = aUv; vWorld = w.xyz;
  vShadow = uLight * w;
  gl_Position = uVP * w;
}"""

private const val MAIN_FS = """#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 vNormal; in vec3 vColor; in float vWin; in vec2 vUv; in vec4 vShadow; in vec3 vWorld;
uniform sampler2DShadow uShadowMap; uniform float uSun; uniform vec3 uSunColor; uniform float uGlow;
out vec4 frag;
float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9,78.2)))*43758.5); }
void main(){
  vec3 base = vColor;
  if(vWin > 0.5){
    vec2 g = vUv*vec2(6.0,8.0); vec2 f = fract(g);
    if(f.x>0.16 && f.x<0.84 && f.y>0.2 && f.y<0.8){ base = hash(floor(g))>0.3 ? vec3(1.0,0.91,0.66) : vec3(0.11,0.16,0.29); }
  }
  vec3 n = normalize(vNormal);
  vec3 p = vShadow.xyz/vShadow.w*0.5+0.5;
  float s = 0.0;
  float t = 1.0/1536.0;
  for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) s += texture(uShadowMap, vec3(p.xy+vec2(float(x),float(y))*t, p.z-0.0016));
  s /= 9.0;
  if(p.x<0.0||p.x>1.0||p.y<0.0||p.y>1.0) s = 1.0;
  float d = max(dot(n, normalize(vec3(-5.0,11.0,6.0))),0.0);
  float sky = 0.5+0.5*n.y;
  vec3 ambient = mix(vec3(0.26,0.36,0.32), vec3(0.58,0.55,0.50), sky);
  vec3 c = base*(ambient + uSunColor*uSun*d*s*0.25) + vec3(uGlow);
  frag = vec4(pow(min(c,vec3(1.0)),vec3(0.96)),1.0);
}"""

private const val DEPTH_VS = """#version 300 es
layout(location=0) in vec3 aPos; uniform mat4 uLight; uniform mat4 uModel;
void main(){ gl_Position = uLight * uModel * vec4(aPos,1.0); }"""
private const val DEPTH_FS = """#version 300 es
precision mediump float; out vec4 f; void main(){ f = vec4(1.0); }"""

private const val QUAD_VS = """#version 300 es
layout(location=0) in vec3 aPos; layout(location=4) in vec2 aUv;
uniform mat4 uVP; uniform mat4 uModel; out vec2 vUv;
void main(){ vUv = vec2(aUv.x, 1.0-aUv.y); gl_Position = uVP*uModel*vec4(aPos,1.0); }"""
private const val QUAD_FS = """#version 300 es
precision mediump float; in vec2 vUv; uniform sampler2D uTex; uniform vec4 uColor; out vec4 f;
void main(){ vec4 t = texture(uTex,vUv); f = t*uColor; if(f.a<0.02) discard; }"""

private const val SKY_VS = """#version 300 es
out vec2 vP; void main(){ vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); vP = p; gl_Position = vec4(p*2.0-1.0,0.999,1.0); }"""
private const val SKY_FS = """#version 300 es
precision mediump float; in vec2 vP; uniform vec3 uA; uniform vec3 uB; out vec4 f;
void main(){ float d = distance(vP, vec2(0.5,0.65))*1.5; f = vec4(mix(uA,uB,clamp(d,0.0,1.0)),1.0); }"""

private class Program(vs: String, fs: String) {
    val id: Int = GL.glCreateProgram()
    private val locations = HashMap<String, Int>()

    init {
        listOf(GL.GL_VERTEX_SHADER to vs, GL.GL_FRAGMENT_SHADER to fs).forEach { (type, source) ->
            val shader = GL.glCreateShader(type)
            GL.glShaderSource(shader, source)
            GL.glCompileShader(shader)
            val ok = IntArray(1)
            GL.glGetShaderiv(shader, GL.GL_COMPILE_STATUS, ok, 0)
            check(ok[0] != 0) { GL.glGetShaderInfoLog(shader) }
            GL.glAttachShader(id, shader)
        }
        GL.glLinkProgram(id)
    }

    fun use() = GL.glUseProgram(id)
    fun loc(name: String) = locations.getOrPut(name) { GL.glGetUniformLocation(id, name) }
    fun mat(name: String, m: FloatArray) = GL.glUniformMatrix4fv(loc(name), 1, false, m, 0)
}

private class PawnState(val color: FloatArray, val texture: Int) {
    var x = 0f; var y = 0f; var z = 0f
    var fx = 0f; var fy = 0f; var fz = 0f
    var tx = 0f; var ty = 0f; var tz = 0f
    var t = 1f
    var key = ""
    var squash = 1f
    var hop = 0f
}

private class CityItem(val mesh: Mesh, val plate: FloatArray, val born: Long, var x: Float = 0f, var z: Float = 0f)

data class SceneInput(val room: Snapshot, val motion: DiceMotion?)

class BoardRenderer(private val context: Context) : GLSurfaceView.Renderer {
    @Volatile var input: SceneInput? = null
    private var applied: SceneInput? = null

    private lateinit var main: Program
    private lateinit var depth: Program
    private lateinit var quad: Program
    private lateinit var sky: Program
    private lateinit var worldMesh: Mesh
    private val unit = HashMap<String, Mesh>()
    private val modelMeshes = HashMap<String, Mesh>()
    private val models: Map<String, List<Part>> by lazy {
        val text = context.assets.open("models3d.json").bufferedReader().use { it.readText() }
        val json = Json { ignoreUnknownKeys = true }
        val root = json.parseToJsonElement(text) as kotlinx.serialization.json.JsonObject
        root.filterKeys { it != "_" }.mapValues { json.decodeFromJsonElement(kotlinx.serialization.builtins.ListSerializer(Part.serializer()), it.value) }
    }
    private class Spinner(val mesh: Mesh, val pre: FloatArray, val scale: List<Float>, val r: List<Float>?, val color: FloatArray, val axisZ: Boolean)
    private val spinners = ArrayList<Spinner>()
    private class Label(val texture: Int, val model: FloatArray)
    private val labels = ArrayList<Label>()
    private val pawns = HashMap<String, PawnState>()
    private val city = LinkedHashMap<String, CityItem>()
    private val cars = ArrayList<Triple<FloatArray, FloatArray, FloatArray>>() // color, [at], [speed]
    private val clouds = ArrayList<FloatArray>()
    private lateinit var diePips: Mesh
    private lateinit var dieBody: Mesh
    private lateinit var labelQuad: Mesh

    private var fbo = 0
    private var shadowTexture = 0
    private val shadowSize = 1536
    private val lightVP = FloatArray(16)
    private val viewProj = FloatArray(16)
    private val proj = FloatArray(16)
    private val view = FloatArray(16)
    private val identity = FloatArray(16).also { Matrix.setIdentityM(it, 0) }
    private var width = 1
    private var height = 1
    private var aspect = 4f / 3f
    private var lastFrame = 0L
    private var clock = 0f

    private var focusX = 0f; private var focusZ = 0f
    private var focusTX = 0f; private var focusTZ = 0f
    private var zoom = 1f; private var zoomT = 1f
    private var dieT = 1f
    private var dieValue = 6
    /** Segundo dado (formación): 0 si solo se tira uno */
    private var die2Value = 0
    private var dieX = 0f
    private var diePlaced = 0
    private var dieY = 0.47f
    private var sun = 2.6f; private var sunT = 2.6f
    private var sunColor = rgb("#FFF1D0")
    private var skyA = rgb("#7FD4F7")
    private var skyB = rgb("#0A4A3D")
    private var active: V3? = null

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        main = Program(MAIN_VS, MAIN_FS)
        depth = Program(DEPTH_VS, DEPTH_FS)
        quad = Program(QUAD_VS, QUAD_FS)
        sky = Program(SKY_VS, SKY_FS)
        GL.glEnable(GL.GL_DEPTH_TEST)
        GL.glEnable(GL.GL_CULL_FACE)
        listOf("box", "cyl", "cone", "sphere", "gem", "roof").forEach { unit[it] = whiteMesh(Shapes.of(it)) }
        unit["pawnBody"] = whiteMesh(Shapes.pawnBody)
        setupShadow()
        buildWorld()
        buildDie()
        val lightView = FloatArray(16)
        val lightProj = FloatArray(16)
        Matrix.setLookAtM(lightView, 0, -5f, 11f, 6f, 0f, 0f, 0f, 0f, 1f, 0f)
        Matrix.orthoM(lightProj, 0, -10.5f, 10.5f, -9f, 9f, 1f, 34f)
        Matrix.multiplyMM(lightVP, 0, lightProj, 0, lightView, 0)
        val q = FloatArray(STRIDE * 6)
        val corners = listOf(-0.5f to -0.5f, 0.5f to -0.5f, 0.5f to 0.5f, -0.5f to -0.5f, 0.5f to 0.5f, -0.5f to 0.5f)
        corners.forEachIndexed { i, (x, y) ->
            q[i * STRIDE] = x; q[i * STRIDE + 1] = y; q[i * STRIDE + 2] = 0f
            q[i * STRIDE + 10] = x + 0.5f; q[i * STRIDE + 11] = y + 0.5f
        }
        labelQuad = Mesh(q)
    }

    override fun onSurfaceChanged(gl: GL10?, w: Int, h: Int) {
        width = w
        height = h
        aspect = w.toFloat() / max(1, h)
        Matrix.perspectiveM(proj, 0, 36f, aspect, 0.1f, 100f)
    }

    private fun setupShadow() {
        val ids = IntArray(1)
        GL.glGenTextures(1, ids, 0)
        shadowTexture = ids[0]
        GL.glBindTexture(GL.GL_TEXTURE_2D, shadowTexture)
        GL.glTexImage2D(GL.GL_TEXTURE_2D, 0, GL.GL_DEPTH_COMPONENT24, shadowSize, shadowSize, 0, GL.GL_DEPTH_COMPONENT, GL.GL_UNSIGNED_INT, null)
        listOf(GL.GL_TEXTURE_MIN_FILTER, GL.GL_TEXTURE_MAG_FILTER).forEach { GL.glTexParameteri(GL.GL_TEXTURE_2D, it, GL.GL_LINEAR) }
        GL.glTexParameteri(GL.GL_TEXTURE_2D, GL.GL_TEXTURE_WRAP_S, GL.GL_CLAMP_TO_EDGE)
        GL.glTexParameteri(GL.GL_TEXTURE_2D, GL.GL_TEXTURE_WRAP_T, GL.GL_CLAMP_TO_EDGE)
        GL.glTexParameteri(GL.GL_TEXTURE_2D, GL.GL_TEXTURE_COMPARE_MODE, GL.GL_COMPARE_REF_TO_TEXTURE)
        GL.glTexParameteri(GL.GL_TEXTURE_2D, GL.GL_TEXTURE_COMPARE_FUNC, GL.GL_LEQUAL)
        GL.glGenFramebuffers(1, ids, 0)
        fbo = ids[0]
        GL.glBindFramebuffer(GL.GL_FRAMEBUFFER, fbo)
        GL.glFramebufferTexture2D(GL.GL_FRAMEBUFFER, GL.GL_DEPTH_ATTACHMENT, GL.GL_TEXTURE_2D, shadowTexture, 0)
        GL.glDrawBuffers(0, IntArray(0), 0)
        GL.glReadBuffer(GL.GL_NONE)
        GL.glBindFramebuffer(GL.GL_FRAMEBUFFER, 0)
    }

    private fun addModel(batch: Batch, name: String, parent: FloatArray, spin: Boolean) {
        models[name].orEmpty().forEach { part ->
            val color = rgb(part.c)
            val isSpin = part.spin != 0 || part.spinZ != 0
            if (spin && isSpin) {
                spinners += Spinner(unit.getValue(part.s), trs(part.p[0], part.p[1], part.p[2], parent = parent), part.z, part.r, color, part.spinZ != 0)
            } else {
                val shape = if (part.s == "win") "box" else part.s
                batch.add(Shapes.of(shape), trs(part.p[0], part.p[1], part.p[2], part.z[0], part.z[1], part.z[2], part.r, parent), color, part.s == "win")
            }
        }
    }

    private fun textTexture(text: String, ink: String): Int {
        val bitmap = Bitmap.createBitmap(256, 64, Bitmap.Config.ARGB_8888)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = AColor.parseColor(ink)
            textAlign = Paint.Align.CENTER
            typeface = ResourcesCompat.getFont(context, R.font.lilita_one)
            textSize = if (text.length > 8) 40f else 50f
        }
        Canvas(bitmap).drawText(text, 128f, 50f, paint)
        return upload(bitmap)
    }

    private fun upload(bitmap: Bitmap): Int {
        val ids = IntArray(1)
        GL.glGenTextures(1, ids, 0)
        GL.glBindTexture(GL.GL_TEXTURE_2D, ids[0])
        GLUtils.texImage2D(GL.GL_TEXTURE_2D, 0, bitmap, 0)
        GL.glGenerateMipmap(GL.GL_TEXTURE_2D)
        GL.glTexParameteri(GL.GL_TEXTURE_2D, GL.GL_TEXTURE_MIN_FILTER, GL.GL_LINEAR_MIPMAP_LINEAR)
        GL.glTexParameteri(GL.GL_TEXTURE_2D, GL.GL_TEXTURE_MAG_FILTER, GL.GL_LINEAR)
        bitmap.recycle()
        return ids[0]
    }

    private fun buildWorld() {
        val b = Batch()
        val box = Shapes.box
        b.add(box, trs(0f, -0.2f, 0f, CELL * COLS + 1.25f, 0.34f, CELL * ROWS + 1.25f), rgb("#6D4326"))
        b.add(box, trs(0f, -0.02f, 0f, CELL * COLS + 0.95f, 0.02f, CELL * ROWS + 0.95f), rgb("#39404F"))
        b.add(box, trs(0f, -0.005f, 0f, CELL * COLS + 0.02f, 0.04f, CELL * ROWS + 0.02f), rgb("#2B6B55"))

        val laneW = LANE_COLS * CELL
        val laneD = 2 * CELL * 0.96f
        b.add(box, trs(0f, LANE_Y / 2 - 0.02f, TOP + CELL + 0.02f, laneW, LANE_Y, laneD), rgb("#1C2350"))
        b.add(box, trs(0f, LANE_Y - 0.03f, TOP + CELL + 0.02f, laneW + 0.05f, 0.06f, laneD + 0.05f), rgb("#FFC83D"))
        b.add(box, trs(0f, 0.03f, PLAZA_Z + 0.02f, laneW, 0.06f, PLAZA_D), rgb("#D9C9A0"))
        b.add(Shapes.cyl, trs(0f, 0.1f, PLAZA_Z + 0.02f, 1.5f, 0.12f, 1.5f), rgb("#0D5F4E"))

        fun tile(track: String, i: Int) {
            val look = tileLook(track, i)
            val spot = tileSpot(track, i)
            val scale = if (track == "via") 0.86f else 1f
            val parent = trs(spot.x, spot.y - 0.1f, spot.z, scale)
            b.add(box, trs(0f, 0.05f, 0f, 1.06f, 0.1f, 1.06f, parent = parent), rgb(look.color))
            val modelMatrix = trs(0f, 0.1f, -0.1f, if (track == "via") 0.68f else 0.78f, parent = parent)
            addModel(b, look.model, modelMatrix, spin = true)
            val text = FloatArray(16)
            Matrix.multiplyMM(text, 0, parent, 0, trs(0f, 0.121f, 0.37f, 0.96f, 0.24f, 1f, listOf(-90f, 0f, 0f)), 0)
            labels += Label(textTexture(look.label, look.ink), text)
        }
        BOARD.indices.forEach { tile("board", it) }
        VIA.indices.forEach { tile("via", it) }

        val rnd = Random(7)
        val edgeX = CELL * COLS / 2f + 0.95f
        val edgeZ = CELL * ROWS / 2f + 0.9f
        repeat(34) { i ->
            val side = i % 4
            val along = rnd.nextFloat() * 2 - 1
            val out = 0.15f + rnd.nextFloat() * 0.8f
            val x = if (side < 2) along * edgeX else (if (side == 2) -1 else 1) * (edgeX + out)
            val z = if (side < 2) (if (side == 0) -1 else 1) * (edgeZ + out) else along * edgeZ
            addModel(b, "tree", trs(x, -0.4f, z, 1 + rnd.nextFloat() * 0.9f), spin = false)
        }
        worldMesh = b.mesh()

        listOf("#FF5A4E", "#2FB5F5", "#FFC83D", "#FFFFFF", "#3DDC97").forEachIndexed { i, c ->
            cars += Triple(rgb(c), floatArrayOf(i / 5f), floatArrayOf(0.022f + (i % 3) * 0.006f))
        }
        repeat(4) { i -> clouds += floatArrayOf(-8.5f + i * 5.6f, 1.6f + (i % 2) * 0.5f, -6.2f - (i % 2) * 0.8f) }
    }

    private fun buildDie() {
        val b = Batch()
        b.add(Shapes.box, trs(0f, 0f, 0f, 0.62f), rgb("#FFFDF6"))
        dieBody = b.mesh()
        val pips = mapOf(
            1 to listOf(1 to 1), 2 to listOf(0 to 0, 2 to 2), 3 to listOf(0 to 0, 1 to 1, 2 to 2), 4 to listOf(0 to 0, 2 to 0, 0 to 2, 2 to 2),
            5 to listOf(0 to 0, 2 to 0, 1 to 1, 0 to 2, 2 to 2), 6 to listOf(0 to 0, 2 to 0, 0 to 1, 2 to 1, 0 to 2, 2 to 2),
        )
        val faces = mapOf(1 to listOf(0f, 0f, 0f), 6 to listOf(180f, 0f, 0f), 2 to listOf(90f, 0f, 0f), 5 to listOf(-90f, 0f, 0f), 3 to listOf(0f, 0f, -90f), 4 to listOf(0f, 0f, 90f))
        val p = Batch()
        faces.forEach { (value, r) ->
            val face = trs(0f, 0f, 0f, r = r)
            pips.getValue(value).forEach { (x, y) ->
                p.add(Shapes.cyl, trs((x - 1) * 0.17f, 0.31f, (y - 1) * 0.17f, 0.12f, 0.012f, 0.12f, parent = face), rgb("#FF5A4E"))
            }
        }
        diePips = p.mesh()
    }

    // ------------------------------------------------------------ estado

    private fun emojiTexture(colorHex: String, emoji: String): Int {
        val bitmap = Bitmap.createBitmap(128, 128, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        paint.color = AColor.parseColor(colorHex)
        canvas.drawCircle(64f, 64f, 58f, paint)
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 8f
        paint.color = AColor.WHITE
        canvas.drawCircle(64f, 64f, 58f, paint)
        paint.style = Paint.Style.FILL
        val shapes = Art.avatar(emoji)
        if (shapes != null) {
            paintShapesNative(canvas, shapes, 24f, 22f, 80f)
        } else {
            paint.textSize = 66f
            paint.textAlign = Paint.Align.CENTER
            canvas.drawText(emoji, 64f, 88f, paint)
        }
        return upload(bitmap)
    }

    private fun apply(state: SceneInput) {
        val room = state.room
        val mv = state.motion
        data class Piece(val p: Player, val track: String, val at: Int)
        val alive = room.players.filter { !it.bankrupt }
        val pieces = alive.map { p ->
            val moving = mv?.playerId == p.id
            val track = if (moving) mv!!.lane else if (p.escaped) "via" else "board"
            val size = if (track == "via") VIA.size else BOARD.size
            Piece(p, track, if (moving) (mv!!.from + mv.step) % size else if (track == "via") p.vpos else p.pos)
        }
        pawns.keys.filter { id -> alive.none { it.id == id } }.forEach { pawns.remove(it) }
        pieces.forEach { piece ->
            val pawn = pawns.getOrPut(piece.p.id) {
                PawnState(rgb(piece.p.color), emojiTexture(piece.p.color, piece.p.avatar)).also {
                    val s = tileSpot(piece.track, piece.at)
                    it.x = s.x; it.y = s.y; it.z = s.z
                    it.fx = s.x; it.fy = s.y; it.fz = s.z
                    it.tx = s.x; it.ty = s.y; it.tz = s.z
                }
            }
            val group = pieces.filter { it.track == piece.track && it.at == piece.at }
            val angle = group.indexOf(piece).toFloat() / max(1, group.size) * 2 * PI.toFloat()
            val spread = if (group.size > 1) 0.24f else 0f
            val spot = tileSpot(piece.track, piece.at)
            val tx = spot.x + cos(angle) * spread
            val tz = spot.z + sin(angle) * spread
            val key = "%.2f:%.2f".format(tx, tz)
            if (key != pawn.key) {
                pawn.key = key
                pawn.fx = pawn.x; pawn.fy = pawn.y; pawn.fz = pawn.z
                pawn.tx = tx; pawn.ty = spot.y; pawn.tz = tz
                pawn.t = 0f
            }
        }
        val focusId = mv?.playerId ?: room.current?.id
        val focus = pieces.find { it.p.id == focusId }
        active = focus?.let { tileSpot(it.track, it.at) }
        val moving = mv != null && !mv.rolling
        zoomT = if (moving) 0.74f else if (mv?.rolling == true) 0.86f else 1f
        when {
            moving && focus != null -> tileSpot(focus.track, focus.at).let { focusTX = it.x * 0.7f; focusTZ = it.z * 0.7f }
            mv?.rolling == true -> { focusTX = 0f; focusTZ = PLAZA_Z * 0.8f }
            else -> { focusTX = 0f; focusTZ = 0f }
        }
        die2Value = mv?.other ?: room.dice2
        if (mv?.rolling == true && dieT >= 1f && diePlaced != -mv.value) {
            diePlaced = -mv.value
            dieValue = mv.value
            dieT = 0f
        } else if (mv == null && room.dice != 0 && diePlaced != room.dice) {
            diePlaced = room.dice
            dieValue = room.dice
        } else if (mv == null && room.dice == 0) {
            diePlaced = 0
        }
        val phase = room.economy.phase
        sunT = when (phase) { "recesion" -> 1.5f; "boom" -> 3.2f; "recuperacion" -> 2.3f; else -> 2.6f }
        sunColor = rgb(if (phase == "recesion") "#BFD0E8" else "#FFF1D0")
        skyA = rgb(when (phase) { "recesion" -> "#8A93A8"; "boom" -> "#FFE9A8"; else -> "#7FD4F7" })
        skyB = rgb(if (phase == "recesion") "#042620" else "#0A4A3D")
        syncCity(room)
    }

    private fun syncCity(room: Snapshot) {
        val all = room.players.flatMap { p -> p.assets.map { it to p.color } }
        val wanted = all.map { it.first.id }.toSet()
        city.keys.filter { it !in wanted }.forEach { city.remove(it) }
        val cols = 16
        val rows = 7
        val stepX = (LANE_COLS * CELL - 0.2f) / cols
        val stepZ = (PLAZA_D - 0.2f) / rows
        val slots = buildList {
            for (r in rows - 1 downTo 0) for (c in 0 until cols) if (!(c in 6..9 && r in 2..4)) add(c to r)
        }
        all.takeLast(slots.size).forEachIndexed { i, (asset, color) ->
            val (c, r) = slots[i]
            val item = city.getOrPut(asset.id) {
                val name = ASSET_MODEL[asset.tag] ?: "shop"
                val mesh = modelMeshes.getOrPut(name) { Batch().also { addModel(it, name, identity, spin = false) }.mesh() }
                CityItem(mesh, rgb(color), System.nanoTime())
            }
            item.x = -LANE_COLS * CELL / 2f + 0.1f + stepX * (c + 0.5f)
            item.z = LANE_BOTTOM + 0.16f + stepZ * (r + 0.5f)
        }
    }

    // ------------------------------------------------------------ fotograma

    private fun drawUnit(p: Program, shape: String, m: FloatArray, color: FloatArray, glow: Float = 0f) {
        p.mat("uModel", m)
        if (p === main) {
            GL.glUniform3f(p.loc("uTint"), color[0], color[1], color[2])
            GL.glUniform1f(p.loc("uGlow"), glow)
        }
        unit.getValue(shape).draw()
    }

    private fun drawObjects(p: Program, now: Float) {
        val white = floatArrayOf(1f, 1f, 1f)
        fun mesh(m: Mesh, matrix: FloatArray, tint: FloatArray = white) {
            p.mat("uModel", matrix)
            if (p === main) {
                GL.glUniform3f(p.loc("uTint"), tint[0], tint[1], tint[2])
                GL.glUniform1f(p.loc("uGlow"), 0f)
            }
            m.draw()
        }
        mesh(worldMesh, identity)

        spinners.forEach { s ->
            val m = s.pre.copyOf()
            if (s.axisZ) Matrix.rotateM(m, 0, now * 126f, 0f, 0f, 1f) else Matrix.rotateM(m, 0, now * 75f, 0f, 1f, 0f)
            s.r?.let {
                Matrix.rotateM(m, 0, it[0], 1f, 0f, 0f)
                Matrix.rotateM(m, 0, it[1], 0f, 1f, 0f)
                Matrix.rotateM(m, 0, it[2], 0f, 0f, 1f)
            }
            Matrix.scaleM(m, 0, s.scale[0], s.scale[1], s.scale[2])
            mesh(s.mesh, m, s.color)
        }

        val nowNano = System.nanoTime()
        city.values.forEach { item ->
            val t = min(1f, (nowNano - item.born) / 700_000_000f)
            val grow = max(0.001f, easeOut(t) * (1 + sin(t * PI.toFloat()) * 0.35f))
            drawUnit(p, "box", trs(item.x, 0.075f, item.z, 0.5f, 0.03f, 0.46f), item.plate)
            mesh(item.mesh, trs(item.x, 0.09f, item.z, 0.42f, 0.42f * grow, 0.42f))
        }

        val path = perimeter()
        cars.forEach { (color, at, _) ->
            val (x, z, angle) = path(at[0])
            val base = trs(x, -0.01f, z, r = listOf(0f, angle, 0f))
            drawUnit(p, "box", trs(0f, 0.06f, 0f, 0.3f, 0.08f, 0.15f, parent = base), color)
            drawUnit(p, "box", trs(-0.02f, 0.13f, 0f, 0.15f, 0.065f, 0.125f, parent = base), rgb("#26304A"))
        }

        pawns.values.forEach { pawn ->
            val h = pawn.hop
            val base = trs(pawn.x, pawn.y + h, pawn.z, 2 - pawn.squash, pawn.squash, 2 - pawn.squash)
            drawUnit(p, "cyl", trs(0f, 0.05f, 0f, 0.5f, 0.1f, 0.5f, parent = base), pawn.color)
            drawUnit(p, "pawnBody", trs(0f, 0.27f, 0f, 0.36f, 0.34f, 0.36f, parent = base), pawn.color)
            drawUnit(p, "sphere", trs(0f, 0.52f, 0f, 0.3f, parent = base), pawn.color)
        }

        fun drawDie(x: Float, y: Float, value: Int, tumble: Float, spin: Float) {
            val die = trs(x, y, PLAZA_Z + 0.02f)
            Matrix.rotateM(die, 0, tumble * 917f * spin, 1f, 0f, 0f)
            Matrix.rotateM(die, 0, tumble * 516f, 0f, 1f, 0f)
            Matrix.rotateM(die, 0, tumble * 688f * spin, 0f, 0f, 1f)
            Matrix.rotateM(die, 0, 28f, 0f, 1f, 0f)
            when (value) {
                6 -> Matrix.rotateM(die, 0, 180f, 1f, 0f, 0f)
                2 -> Matrix.rotateM(die, 0, -90f, 1f, 0f, 0f)
                5 -> Matrix.rotateM(die, 0, 90f, 1f, 0f, 0f)
                3 -> Matrix.rotateM(die, 0, 90f, 0f, 0f, 1f)
                4 -> Matrix.rotateM(die, 0, -90f, 0f, 0f, 1f)
            }
            mesh(dieBody, die)
            mesh(diePips, die)
        }
        // Dado(s): la cara elegida arriba; mientras rueda, voltea en el aire
        val tumble = 1 - easeOut(dieT)
        drawDie(dieX, dieY, dieValue, tumble, 1f)
        if (die2Value > 0) drawDie(-dieX, 0.47f + (dieY - 0.47f) * 0.85f, die2Value, tumble, -0.8f)
    }

    private fun perimeter(): (Float) -> Triple<Float, Float, Float> {
        val w = CELL * COLS + 0.72f
        val d = CELL * ROWS + 0.72f
        val total = 2 * (w + d)
        return { at ->
            var run = at * total
            when {
                run < w -> Triple(-w / 2 + run, -d / 2, 0f)
                run - w < d -> { run -= w; Triple(w / 2, -d / 2 + run, -90f) }
                run - w - d < w -> { run -= w + d; Triple(w / 2 - run, d / 2, 180f) }
                else -> { run -= w + d + w; Triple(-w / 2, d / 2 - run, 90f) }
            }
        }
    }

    private fun tick(dt: Float) {
        clock += dt
        cars.forEach { (_, at, speed) -> at[0] = (at[0] + speed[0] * dt) % 1f }
        clouds.forEach { c ->
            c[0] += dt * 0.12f
            if (c[0] > 9f) c[0] = -9f
        }
        pawns.values.forEach { pawn ->
            if (pawn.t < 1f) {
                val dx = pawn.tx - pawn.fx
                val dz = pawn.tz - pawn.fz
                val dy = pawn.ty - pawn.fy
                val distance = sqrt(dx * dx + dy * dy + dz * dz)
                pawn.t = min(1f, pawn.t + dt / (if (distance > 2) 0.7f else 0.26f))
                val e = easeOut(pawn.t)
                pawn.x = pawn.fx + dx * e
                pawn.y = pawn.fy + dy * e
                pawn.z = pawn.fz + dz * e
                pawn.hop = sin(pawn.t * PI.toFloat()) * min(1.6f, 0.55f + distance * 0.2f)
                pawn.squash = if (pawn.t > 0.85f) 1 - sin((pawn.t - 0.85f) / 0.15f * PI.toFloat()) * 0.16f else 1f
            } else {
                pawn.hop = 0f
                pawn.squash = 1f
            }
        }
        if (dieT < 1f) {
            dieT = min(1f, dieT + dt)
            dieY = 0.47f + abs(sin(dieT * PI.toFloat() * 3)) * (1 - dieT) * 2.1f
        } else {
            dieY += (0.47f - dieY) * min(1f, dt * 10)
        }
        run {
            val target = if (die2Value > 0) -0.42f else 0f
            dieX += (target - dieX) * min(1f, dt * 6)
        }
        sun += (sunT - sun) * min(1f, dt)
        zoom += (zoomT - zoom) * min(1f, dt * 2.4f)
        focusX += (focusTX - focusX) * min(1f, dt * 2.6f)
        focusZ += (focusTZ - focusZ) * min(1f, dt * 2.6f)
    }

    override fun onDrawFrame(gl: GL10?) {
        val now = System.nanoTime()
        val dt = if (lastFrame == 0L) 0.016f else min(0.05f, (now - lastFrame) / 1e9f)
        lastFrame = now
        input?.let { if (it !== applied) { applied = it; apply(it) } }
        tick(dt)

        // Sombra
        GL.glBindFramebuffer(GL.GL_FRAMEBUFFER, fbo)
        GL.glViewport(0, 0, shadowSize, shadowSize)
        GL.glClear(GL.GL_DEPTH_BUFFER_BIT)
        GL.glDisable(GL.GL_CULL_FACE)
        depth.use()
        depth.mat("uLight", lightVP)
        drawObjects(depth, clock)
        GL.glBindFramebuffer(GL.GL_FRAMEBUFFER, 0)

        // Cámara: igual que la web
        val swayX = sin(clock * 0.22f) * 0.75f
        val swayZ = cos(clock * 0.17f) * 0.3f
        val d = zoom * max(1f, 1.34f / aspect)
        Matrix.setLookAtM(view, 0, focusX + swayX, 15.2f * d, focusZ + 11.2f * d + swayZ, focusX, 0f, focusZ + 0.32f, 0f, 1f, 0f)
        Matrix.multiplyMM(viewProj, 0, proj, 0, view, 0)

        GL.glViewport(0, 0, width, height)
        GL.glClearColor(skyB[0], skyB[1], skyB[2], 1f)
        GL.glClear(GL.GL_COLOR_BUFFER_BIT or GL.GL_DEPTH_BUFFER_BIT)

        GL.glDepthMask(false)
        sky.use()
        GL.glUniform3f(sky.loc("uA"), skyA[0], skyA[1], skyA[2])
        GL.glUniform3f(sky.loc("uB"), skyB[0], skyB[1], skyB[2])
        GL.glBindVertexArray(0)
        GL.glDrawArrays(GL.GL_TRIANGLES, 0, 3)
        GL.glDepthMask(true)

        main.use()
        main.mat("uVP", viewProj)
        main.mat("uLight", lightVP)
        GL.glUniform1f(main.loc("uSun"), sun)
        GL.glUniform3f(main.loc("uSunColor"), sunColor[0], sunColor[1], sunColor[2])
        GL.glActiveTexture(GL.GL_TEXTURE1)
        GL.glBindTexture(GL.GL_TEXTURE_2D, shadowTexture)
        GL.glUniform1i(main.loc("uShadowMap"), 1)
        drawObjects(main, clock)
        clouds.forEach { c ->
            val white = floatArrayOf(1f, 1f, 1f)
            listOf(-0.6f, -0.2f, 0.2f, 0.6f).forEachIndexed { i, off ->
                drawUnit(main, "sphere", trs(c[0] + off, c[1] + (i % 2) * 0.1f, c[2], 0.9f, 0.42f, 0.6f), white)
            }
        }
        active?.let { spot ->
            GL.glEnable(GL.GL_BLEND)
            GL.glBlendFunc(GL.GL_ONE, GL.GL_ONE)
            drawUnit(main, "box", trs(spot.x, spot.y + 0.012f, spot.z, 1.08f, 0.02f, 1.08f), floatArrayOf(0f, 0f, 0f), 0.2f + sin(clock * 5) * 0.08f)
            GL.glDisable(GL.GL_BLEND)
        }

        // Rótulos y avatares
        GL.glEnable(GL.GL_BLEND)
        GL.glBlendFunc(GL.GL_SRC_ALPHA, GL.GL_ONE_MINUS_SRC_ALPHA)
        quad.use()
        quad.mat("uVP", viewProj)
        GL.glActiveTexture(GL.GL_TEXTURE0)
        GL.glUniform1i(quad.loc("uTex"), 0)
        GL.glUniform4f(quad.loc("uColor"), 1f, 1f, 1f, 1f)
        GL.glDisable(GL.GL_CULL_FACE)
        labels.forEach {
            GL.glBindTexture(GL.GL_TEXTURE_2D, it.texture)
            quad.mat("uModel", it.model)
            labelQuad.draw()
        }
        GL.glDisable(GL.GL_DEPTH_TEST)
        pawns.values.forEach { pawn ->
            val m = FloatArray(16)
            Matrix.setIdentityM(m, 0)
            Matrix.translateM(m, 0, pawn.x, pawn.y + pawn.hop + 0.98f, pawn.z)
            // Mira siempre a la cámara: copia la rotación inversa de la vista
            for (row in 0..2) for (col in 0..2) m[col * 4 + row] = view[row * 4 + col]
            Matrix.scaleM(m, 0, 0.5f, 0.5f, 0.5f)
            GL.glBindTexture(GL.GL_TEXTURE_2D, pawn.texture)
            quad.mat("uModel", m)
            labelQuad.draw()
        }
        GL.glEnable(GL.GL_DEPTH_TEST)
        GL.glDisable(GL.GL_BLEND)
        GL.glEnable(GL.GL_CULL_FACE)
    }
}

/** Antialiasing 4x cuando el dispositivo lo admite. */
class MsaaChooser : GLSurfaceView.EGLConfigChooser {
    private fun find(egl: EGL10, display: EGLDisplay, samples: Int): EGLConfig? {
        val spec = intArrayOf(
            EGL10.EGL_RED_SIZE, 8, EGL10.EGL_GREEN_SIZE, 8, EGL10.EGL_BLUE_SIZE, 8, EGL10.EGL_DEPTH_SIZE, 16,
            EGL10.EGL_RENDERABLE_TYPE, EGL14.EGL_OPENGL_ES2_BIT or 0x40,
            EGL10.EGL_SAMPLE_BUFFERS, if (samples > 0) 1 else 0, EGL10.EGL_SAMPLES, samples, EGL10.EGL_NONE,
        )
        val out = arrayOfNulls<EGLConfig>(1)
        val count = IntArray(1)
        egl.eglChooseConfig(display, spec, out, 1, count)
        return if (count[0] > 0) out[0] else null
    }

    override fun chooseConfig(egl: EGL10, display: EGLDisplay): EGLConfig =
        find(egl, display, 4) ?: find(egl, display, 0) ?: error("Sin configuración OpenGL ES 3")
}
