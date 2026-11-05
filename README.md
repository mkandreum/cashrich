# FLUJO LIBRE — juego de mesa imprimible + versión digital

Juego original de educación financiera para **2 a 6 jugadores** (90–120 min).
Cada jugador empieza con una profesión, un sueldo y una lista de gastos. Gana quien
logre que sus activos paguen su vida y compre su sueño.

> Es un juego **original**, inspirado en el género de juegos de libertad financiera.
> No es una copia ni tiene relación con *Cashflow®* ni con sus autores.

![Tablero de FLUJO LIBRE](docs/tablero.png)

<p align="center">
  <img src="docs/digital.png" alt="Tablero digital" width="68%">
  <img src="docs/movil.png" alt="Control en el móvil" width="24%">
</p>

---

## 1. Versión imprimible (PDF)

| Archivo | Qué es | Cómo imprimir |
|---|---|---|
| `FlujoLibre-01-Reglas.pdf` | Reglas completas (4 páginas) | A4, una cara |
| `FlujoLibre-02-Tablero-A3.pdf` | Tablero | **A3 horizontal**, 100 % |
| `FlujoLibre-03-Cartas.pdf` | 119 cartas (14 hojas) | A4, una cara, **100 %** |
| `FlujoLibre-04-Hoja-Estado-Financiero.pdf` | Hoja de jugador + bitácora | A4, **una por jugador** |
| `FlujoLibre-05-Dinero.pdf` | Billetes del juego | A4, **2 copias** |
| `FlujoLibre-06-Fichas-y-Dado.pdf` | 6 fichas, dado de papel y checklist | A4, una cara |
| `FlujoLibre-07-Ayuda-de-mesa.pdf` | Chuleta de turno (2 por hoja) | A4, una cara |

### Ajustes de impresión

1. Escala **100 %** o "tamaño real". Nunca "ajustar al área de impresión" en las cartas.
2. **Márgenes: ninguno / mínimo**.
3. Activa "imprimir colores de fondo" si tu impresora lo pide.
4. Papel de 180–250 g para tablero y cartas; el resto en papel normal.
5. Si no tienes A3, el tablero se puede imprimir en A4 con "ajustar a página" (queda pequeño pero se juega).

### Cómo se juega en 60 segundos

1. Reparte una **profesión** al azar y llena tu hoja: salario, gastos, efectivo.
2. En tu turno **cobras tu flujo** (salario + rentas − gastos), tiras el dado y avanzas.
3. Las casillas dan **oportunidades**: compras activos que te pagan cada mes.
4. Cuando tus **rentas cubren tus gastos**, sales de la ratonera y entras a la vía rápida.
5. Gana el primero que **compre un Sueño**.

---

## 2. Versión digital (misma Wi-Fi)

Un servidor local sirve el tablero y los móviles hacen de control. No necesita internet
ni instalar nada en los teléfonos.

### Arrancar

- Doble clic en `web/iniciar.bat` (Windows). Se abre el tablero en el navegador.
- O desde la terminal:

```
cd web
node server.js
```

Necesitas **Node.js** (gratis, nodejs.org). El servidor escucha en el puerto **3000**.

### Jugar

1. En la pantalla grande (TV o portátil) se ve el tablero y un **código QR**.
2. Cada jugador escanea el QR o escribe en su móvil la dirección que aparece
   (`http://192.168.x.x:3000/p`) y pone su nombre.
3. Cuando están todos, el anfitrión pulsa **Empezar partida**.
4. En el móvil cada uno tira el dado, decide comprar o pasar, pide préstamos y ve sus números.

Si el QR no conecta, revisa que el móvil esté en la misma Wi-Fi y prueba la dirección
alternativa que aparece bajo el código.

### Qué hace el servidor

- Reparte profesiones al azar y lleva el estado financiero de todos.
- Resuelve cartas, mercado, préstamos, inflación, auditorías y quiebras.
- Sincroniza todo en vivo (SSE), sin dependencias externas.

### Archivos

```
web/
  server.js        servidor (Node, sin dependencias)
  data.json        cartas y tablero exportados del juego de mesa
  iniciar.bat      lanzador para Windows
  public/
    host.html      tablero para la pantalla grande
    play.html      control para el móvil
    vendor/qrcode.js
  dev/             scripts de prueba (simulan partidas completas)
```

---

## 3. Volver a generar todo

Fuentes en `src/` (Python + HTML/CSS, sin dependencias):

```
cd src
python build_print.py    # genera los HTML de impresión
python render.py         # los convierte a PDF (usa Chrome)
python export_json.py    # actualiza web/data.json para la versión digital
```

Editar `game_data.py` cambia **las dos versiones** a la vez: cartas, precios, tablero y textos.

### Balance

`BIG_MULT` y `SMALL_MULT` en `game_data.py` ajustan cuánto paga cada activo.
Con los valores actuales una partida dura unas 12–18 rondas. Si quieres partidas más
largas, bájalos; más cortas, súbelos.

---

## 4. Licencia de uso

Material original creado para este proyecto. Puedes imprimirlo, jugarlo y usarlo en
talleres o clases. Si lo compartes, cita la fuente y no lo vendas.
