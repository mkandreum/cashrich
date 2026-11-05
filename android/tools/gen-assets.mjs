// Genera lo que la app comparte con la web: tablero, iconos Lucide y logotipos vectoriales.
// Uso: node android/tools/gen-assets.mjs <node_modules con lucide-react y opentype.js>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const android = path.resolve(here, '..');
const modules = path.resolve(process.argv[2]);
const pkg = path.join(android, 'app/src/main/java/win/xyoncloud/cashrich');
const res = path.join(android, 'app/src/main/res');
const data = JSON.parse(fs.readFileSync(path.resolve(android, '../web/data.json'), 'utf8'));

// ---------- Tablero
const cells = (list) => list.map((c) => `Cell("${c.name}", "${c.kind}")`).join(', ');
const spots = (list) => list.map(([c, r]) => `${c} to ${r}`).join(', ');
fs.writeFileSync(path.join(pkg, 'BoardData.kt'), `// Generado por tools/gen-assets.mjs desde web/data.json. No editar a mano.
package win.xyoncloud.cashrich

data class Cell(val name: String, val kind: String)

val BOARD = listOf(${cells(data.board)})
val VIA = listOf(${cells(data.via)})
val BOARD_POS = listOf(${spots(data.ratoneraPos)})
val VIA_POS = listOf(${spots(data.viaPos)})
`);

// ---------- Iconos: los mismos trazos que usa la web
const ICONS = {
  ArrowLeftRight: 'arrow-left-right', Banknote: 'banknote', Bitcoin: 'bitcoin', BookOpen: 'book-open', Briefcase: 'briefcase',
  Building2: 'building-complex', ChartLine: 'chart-line', Check: 'check', Coins: 'coins', Copy: 'copy', Dices: 'dices', Factory: 'factory',
  FastForward: 'fast-forward', Flag: 'flag', Gem: 'gem', HandCoins: 'hand-coins', Hourglass: 'hourglass', Home: 'house', Landmark: 'landmark',
  LandPlot: 'land-plot', Lock: 'lock', Palmtree: 'tree-palm', PartyPopper: 'party-popper', Rocket: 'rocket', Scale: 'scale', ScrollText: 'scroll-text',
  Share2: 'share-2', ShieldCheck: 'shield-check', ShoppingBag: 'shopping-bag', Skull: 'skull', Sprout: 'sprout', Star: 'star', Store: 'store', Sun: 'sun',
  TrendingUp: 'trending-up', Tv: 'tv', Unlock: 'lock-open', Users: 'users', Volume2: 'volume-2', VolumeX: 'volume-x', WalletCards: 'wallet-cards',
  Wifi: 'wifi', WifiOff: 'wifi-off', X: 'x', Zap: 'zap',
};
const toPath = ([tag, a]) => {
  const n = (k, d = 0) => Number(a[k] ?? d);
  if (tag === 'path') return a.d;
  if (tag === 'circle') return `M${n('cx') - n('r')} ${n('cy')}a${n('r')} ${n('r')} 0 1 0 ${2 * n('r')} 0a${n('r')} ${n('r')} 0 1 0 ${-2 * n('r')} 0`;
  if (tag === 'ellipse') return `M${n('cx') - n('rx')} ${n('cy')}a${n('rx')} ${n('ry')} 0 1 0 ${2 * n('rx')} 0a${n('rx')} ${n('ry')} 0 1 0 ${-2 * n('rx')} 0`;
  if (tag === 'line') return `M${n('x1')} ${n('y1')}L${n('x2')} ${n('y2')}`;
  if (tag === 'polyline' || tag === 'polygon') return `M${a.points}${tag === 'polygon' ? 'z' : ''}`;
  if (tag === 'rect') {
    const [x, y, w, h, r] = [n('x'), n('y'), n('width'), n('height'), n('rx')];
    return `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;
  }
  throw new Error(`Forma desconocida: ${tag}`);
};
const lines = Object.entries(ICONS).map(([name, file]) => {
  const source = fs.readFileSync(path.join(modules, `lucide-react/dist/esm/icons/${file}.mjs`), 'utf8');
  const nodes = new Function(`return ${source.match(/const __iconData = (\{[\s\S]*?\n\});/)[1]}`)().node;
  const paths = nodes.map(toPath).map((d) => `"${d}"`).join(', ');
  return `    val ${name} by lazy { lucide("${name}", ${paths}) }`;
});
fs.writeFileSync(path.join(pkg, 'LucideIcons.kt'), `// Generado por tools/gen-assets.mjs desde lucide-react. No editar a mano.
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
${lines.join('\n')}
}
`);

// ---------- Logotipos a partir de la propia fuente del juego
const require = createRequire(path.join(modules, 'x.js'));
const opentype = require('opentype.js');
const fontFile = fs.readFileSync(path.join(res, 'font/lilita_one.ttf'));
const font = opentype.parse(fontFile.buffer.slice(fontFile.byteOffset, fontFile.byteOffset + fontFile.byteLength));
const word = (text, x, y, size) => font.getPath(text, x, y, size).toPathData(2);
const INK = '#FF1D1A33';

const banner = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generado por tools/gen-assets.mjs -->
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="320dp" android:height="180dp" android:viewportWidth="320" android:viewportHeight="180">
  <path android:fillColor="#FF0A4A3D" android:pathData="M0 0h320v180H0z"/>
  <path android:fillColor="#FFFFC83D" android:strokeColor="${INK}" android:strokeWidth="5" android:pathData="M272 46a22 22 0 1 0 0.01 0z"/>
  <path android:fillColor="#FFFFF6DF" android:strokeColor="${INK}" android:strokeWidth="6" android:pathData="${word('CASH', 22, 86, 66)}"/>
  <path android:fillColor="#FFFFC83D" android:strokeColor="${INK}" android:strokeWidth="6" android:pathData="${word('RICH', 22, 150, 66)}"/>
</vector>
`;
fs.mkdirSync(path.join(res, 'drawable'), { recursive: true });
fs.writeFileSync(path.join(res, 'drawable/tv_banner.xml'), banner);

const glyph = font.getPath('$', 0, 0, 52);
const box = glyph.getBoundingBox();
const dollar = font.getPath('$', 54 - (box.x1 + box.x2) / 2, 54 - (box.y1 + box.y2) / 2, 52).toPathData(2);
fs.writeFileSync(path.join(res, 'drawable/ic_launcher_foreground.xml'), `<?xml version="1.0" encoding="utf-8"?>
<!-- Generado por tools/gen-assets.mjs -->
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
  <path android:fillColor="#FFC98A0C" android:strokeColor="${INK}" android:strokeWidth="3" android:pathData="M54 26a27 27 0 1 0 0.01 0z" android:translateY="3"/>
  <path android:fillColor="#FFFFC83D" android:strokeColor="${INK}" android:strokeWidth="3" android:pathData="M54 25a27 27 0 1 0 0.01 0z"/>
  <path android:fillColor="${INK}" android:pathData="${dollar}"/>
</vector>
`);
console.log('ok:', Object.keys(ICONS).length, 'iconos');
