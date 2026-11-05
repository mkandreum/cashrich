# -*- coding: utf-8 -*-
"""Genera los HTML de impresion de CashRich con la identidad visual del juego."""
import os

import build_print as old  # textos de reglas, hoja y ayuda
import iso
from game_data import GRANDES, GUSTOS, MERCADO, PEQUENAS, PROFESIONES, RATONERA_POS, SUENOS, TABLERO, VIA, VIA_POS

AQUI = os.path.dirname(os.path.abspath(__file__))
m = old.m

TOTAL_CARTAS = len(PROFESIONES) + len(PEQUENAS) + len(GRANDES) + len(MERCADO) + len(GUSTOS) + len(SUENOS)

KINDS = {
    "cobrar": ("#FFC83D", "#C98A0C", "#1D1A33", "coins", "Cobra"),
    "peq": ("#2FB5F5", "#1379B0", "#10143A", "house", "Pequeña"),
    "grande": ("#FF5A4E", "#BF2F25", "#FFFFFF", "tower", "Grande"),
    "mercado": ("#8B5CF6", "#5B30B8", "#FFFFFF", "market", "Mercado"),
    "gusto": ("#FF6FB5", "#C23A80", "#1D1A33", "shop", "Gusto"),
    "banco": ("#7C8BD6", "#4553A3", "#10143A", "bank", "Banco"),
    "sueno": ("#FFF0A8", "#C98A0C", "#1D1A33", "castle", "Sueño"),
    "salida": ("#3DDC97", "#1B9C66", "#10143A", "arch", "Salida"),
    "auditoria": ("#7C8BD6", "#4553A3", "#10143A", "dome", "Auditoría"),
    "oportunidad": ("#FF5A4E", "#BF2F25", "#FFFFFF", "rocket", "Oportunidad"),
}
TAG_MODEL = {
    "VIVIENDA": "house", "COMERCIAL": "tower", "INDUSTRIAL": "factory", "TURISMO": "hotel", "TERRENO": "land", "ENERGÍA": "turbine", "AGRO": "farm",
    "BOLSA": "chart", "RENTA FIJA": "bank", "COLECTIVO": "chart", "PROTECCIÓN": "bank", "VOLÁTIL": "chart", "REGALÍAS": "coins", "CRIPTO": "chart",
    "RIESGO": "rocket", "DUDOSA": "rocket", "NEGOCIO": "shop", "FRANQUICIA": "shop", "SOCIEDAD": "tower", "SERVICIO": "shop", "DIGITAL": "tower",
}

FONTS = r"""
@font-face{font-family:'Lilita One';src:url('fonts/lilita-one.woff2') format('woff2')}
@font-face{font-family:'Fredoka';src:url('../android/app/src/main/res/font/fredoka.ttf');font-weight:300 700}
"""

BASE = FONTS + r"""
:root{--ink:#1D1A33;--ink2:#4A4768;--cream:#FFF6DF;--cream2:#E9D8AE;--felt:#0A4A3D;--felt2:#06342C;--felt3:#137A63;
  --gold:#FFC83D;--golddark:#C98A0C;--coral:#FF5A4E;--mint:#3DDC97;--sky:#2FB5F5;--grape:#8B5CF6;--rose:#FF6FB5;
  --peq:#1379B0;--grande:#FF5A4E;--mercado:#8B5CF6;--gusto:#FF6FB5;--cobrar:#1B9C66;--banco:#4553A3;--sueno:#C98A0C;--prof:#1C2350;
  --paper:#FFF6DF;--card:#FFFDF6;--line:#1D1A33;}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;padding:0;background:#fff;color:var(--ink);font-family:'Fredoka',sans-serif;font-weight:500;font-synthesis:none}
.art{display:block;overflow:visible}
.logo{position:relative;display:inline-block;font-family:'Lilita One',sans-serif;line-height:1;white-space:nowrap}
.logo .o,.logo .s{position:absolute;left:0;color:var(--ink);-webkit-text-stroke:.17em var(--ink);-webkit-text-fill-color:var(--ink)}
.logo .o{top:0}.logo .s{top:.07em}
.logo .f{position:relative;color:var(--cream)}
.logo .f b{font-weight:400;color:var(--gold)}
"""


def logo(size, extra=""):
    text = 'CASH <b>RICH</b>'
    return (f'<span class="logo" style="font-size:{size};{extra}"><span class="s">CASH RICH</span>'
            f'<span class="o">CASH RICH</span><span class="f">{text}</span></span>')


def doc(title, css, body):
    return (f'<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>CashRich - {title}</title>'
            f'<style>{BASE}{css}</style></head><body>{iso.symbols(iso.ALL)}{body}</body></html>')


# ------------------------------------------------------------------- TABLERO
BOARD_CSS = r"""
@page{size:420mm 297mm;margin:0}
.board{position:relative;width:420mm;height:297mm;overflow:hidden;
  background:radial-gradient(ellipse at 50% 42%,var(--felt3),var(--felt) 58%,var(--felt2))}
.wood{position:absolute;inset:5mm;border-radius:7mm;background:linear-gradient(160deg,#7A4B2B,#4B2A15);border:.8mm solid var(--ink);box-shadow:0 2mm 0 #24140A}
.grid{position:absolute;inset:9mm;display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(6,1fr);gap:1.8mm}
.cell{position:relative;border-radius:3.2mm;border:.6mm solid var(--ink);overflow:hidden;box-shadow:0 1.2mm 0 var(--edge);
  background:linear-gradient(170deg,color-mix(in srgb,var(--tile) 80%,white),var(--tile));color:var(--tilei);margin-bottom:1.2mm}
.cell .art{position:absolute;left:4%;right:4%;top:5%;width:92%;height:60%}
.cell .lbl{position:absolute;left:0;right:0;bottom:6.2mm;text-align:center;font-family:'Lilita One';font-size:15pt;line-height:1}
.cell .sub{position:absolute;left:1mm;right:1mm;bottom:1.6mm;text-align:center;font-size:7.4pt;font-weight:600;line-height:1.05;opacity:.92}
.cell .idx{position:absolute;left:1.6mm;top:1.3mm;font-family:'Lilita One';font-size:9pt;background:var(--ink);color:#fff;border-radius:1.6mm;padding:.3mm 1.3mm}
.cell .dir{position:absolute;right:1.6mm;top:1mm;font-family:'Lilita One';font-size:13pt;color:var(--ink)}
.cell.salida{border-width:1.1mm}
.inner{grid-column:2/8;grid-row:2/6;display:grid;grid-template-rows:1fr 1fr;gap:1.8mm;min-height:0;min-width:0}
.lane{position:relative;display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(2,1fr);gap:1.4mm;padding:7mm 2mm 2mm;border-radius:4mm;
  background:linear-gradient(120deg,#10143A,#2B1D62);border:.9mm solid var(--gold);min-height:0}
.lane .ttl{position:absolute;left:3mm;top:1mm;font-family:'Lilita One';font-size:13pt;color:var(--gold);letter-spacing:.04em}
.lane .ttr{position:absolute;right:3mm;top:1.8mm;font-size:8pt;font-weight:600;color:#fff}
.lane .cell{margin-bottom:.8mm;box-shadow:0 .8mm 0 var(--edge)}
.lane .cell .lbl{font-size:10.5pt;bottom:4.6mm}
.lane .cell .sub{font-size:6pt;bottom:1mm}
.lane .cell .art{height:56%;top:3%}
.lane .cell .idx{font-size:7pt}
.plaza{position:relative;border-radius:4mm;border:.7mm solid var(--ink);background:linear-gradient(170deg,#F7E9C4,#E4D2A3);display:grid;grid-template-columns:1.15fr 1fr;min-height:0;overflow:hidden}
.brand{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2mm}
.brand .tag{font-family:'Lilita One';font-size:17pt;margin-top:5.5mm;color:var(--ink)}
.brand .q{font-size:11pt;font-weight:600;text-align:center;margin-top:1.5mm;color:var(--ink2);line-height:1.2}
.skyline{display:flex;align-items:flex-end;justify-content:center;gap:2mm;height:31mm;margin-bottom:3mm}
.skyline .art{height:100%;width:30mm}
.legend{padding:3.5mm 6mm 3mm 2mm;display:flex;flex-direction:column;justify-content:center;gap:1.7mm}
.legend h3{font-family:'Lilita One';font-weight:400;font-size:17pt;margin:0 0 1mm}
.legend .r{display:flex;gap:2.4mm;align-items:center;font-size:11pt;line-height:1.08;font-weight:500}
.legend .r i{flex:0 0 5.4mm;height:5.4mm;border-radius:1.1mm;border:.35mm solid var(--ink)}
.legend .r b{font-weight:700}
.legend .goal{margin-top:1.8mm;padding:2.2mm 3mm;border-radius:2.4mm;background:var(--ink);color:#fff;font-size:10.6pt;line-height:1.15;font-weight:600}
.legend .goal b{color:var(--gold);font-weight:700}
"""

_DIRS = {}
for i, (c, r) in enumerate(RATONERA_POS):
    nc, nr = RATONERA_POS[(i + 1) % len(RATONERA_POS)]
    _DIRS[i] = "→" if nc > c else "←" if nc < c else "↓" if nr > r else "↑"


def tile_kind(track, i, kind):
    if track == "board" and i == 0:
        return "salida"
    if track == "via" and kind == "banco":
        return "auditoria"
    if track == "via" and kind == "peq":
        return "oportunidad"
    return kind


def tile(track, i, name, kind, sub, col, row):
    tile_id = tile_kind(track, i, kind)
    color, edge, ink, model, label = KINDS[tile_id]
    style = f"grid-column:{col};grid-row:{row};--tile:{color};--edge:{edge};--tilei:{ink}"
    arrow = f'<span class="dir">{_DIRS[i]}</span>' if track == "board" else ""
    return (f'<div class="cell {tile_id}" style="{style}"><span class="idx">{i + 1 if track == "via" else i}</span>{arrow}'
            f'{iso.use(model)}<div class="lbl">{label}</div><div class="sub">{sub}</div></div>')


def build_board():
    cells = "".join(tile("board", i, n, k, s, RATONERA_POS[i][0], RATONERA_POS[i][1]) for i, (n, k, s) in enumerate(TABLERO))
    via = "".join(tile("via", i, n, k, s, VIA_POS[i][0] - 1, VIA_POS[i][1] - 1) for i, (n, k, s) in enumerate(VIA))
    legend = "".join(f'<div class="r"><i style="background:{KINDS[k][0]}"></i><span><b>{a}.</b> {b}</span></div>' for k, a, b in [
        ("cobrar", "Cobra", "un mes extra de flujo"),
        ("peq", "Pequeña", "acciones, fondos y negocios de bolsillo"),
        ("grande", "Grande", "propiedades y negocios que pagan cada mes"),
        ("mercado", "Mercado", "vende, ajusta rentas o aguanta la economía"),
        ("gusto", "Gusto", "el gasto que decide tu futuro"),
        ("banco", "Banco", "préstamos y caridad"),
    ])
    skyline = "".join(iso.use(x) for x in ["house", "tower", "castle", "bank"])
    body = f"""<div class="board"><div class="wood"></div><div class="grid">{cells}
  <div class="inner">
    <div class="lane"><span class="ttl">VÍA RÁPIDA</span><span class="ttr">Entras al salir de la ratonera · avanza en serpiente del 1 al 12</span>{via}</div>
    <div class="plaza">
      <div class="brand"><div class="skyline">{skyline}</div>{logo('56pt')}
        <div class="tag">El juego de la libertad financiera</div>
        <div class="q">«No trabajes por dinero. Haz que tu dinero trabaje por ti.»</div></div>
      <div class="legend"><h3>Cómo se lee el tablero</h3>{legend}
        <div class="goal"><b>Salir de la ratonera:</b> rentas ≥ gastos. <b>Ganar:</b> compra un Sueño en la vía rápida.</div></div>
    </div>
  </div>
</div></div>"""
    return doc("Tablero", BOARD_CSS, body)


# -------------------------------------------------------------------- CARTAS
CARDS_CSS = r"""
@page{size:A4;margin:0}
.sheet{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;background:#fff}
.layout{position:absolute;left:9mm;top:12.5mm;display:grid;grid-template-columns:repeat(3,64mm);grid-template-rows:repeat(3,90.6mm);column-gap:0;row-gap:0}
.slot{display:flex;align-items:center;justify-content:center}
.card{position:relative;width:63mm;height:88mm;border-radius:3mm;border:.55mm solid var(--ink);background:var(--card);overflow:hidden;display:flex;flex-direction:column}
.card .band{flex:0 0 auto;height:7mm;display:flex;align-items:center;justify-content:space-between;padding:0 2.6mm;background:var(--c);color:var(--ci);font-family:'Lilita One';font-size:9pt;border-bottom:.5mm solid var(--ink)}
.card .band small{font-family:'Fredoka';font-weight:700;font-size:5.8pt;letter-spacing:.06em}
.card .stage{flex:0 0 auto;height:23mm;position:relative;background:radial-gradient(ellipse at 50% 85%,var(--st1),var(--st2));border-bottom:.3mm solid rgba(29,26,51,.25)}
.card .stage .art{position:absolute;left:0;right:0;top:1.5mm;bottom:1mm;width:100%;height:20.5mm}
.card .t{flex:0 0 auto;font-family:'Lilita One';font-size:10.6pt;line-height:1.06;padding:1.7mm 2.8mm 0}
.card .hero{flex:0 0 auto;font-family:'Lilita One';font-size:19pt;line-height:1;padding:1mm 2.8mm .4mm;color:var(--ch)}
.card .hl{font-size:5.6pt;font-weight:700;letter-spacing:.08em;color:var(--ink2);padding:1mm 2.8mm 0;text-transform:uppercase}
.card .rows{padding:.8mm 2.8mm 0}
.card .row{display:flex;justify-content:space-between;align-items:baseline;gap:1mm;border-top:.2mm solid rgba(29,26,51,.2);padding:.85mm 0;font-size:7.4pt;color:var(--ink2);font-weight:500}
.card .row b{font-family:'Lilita One';font-weight:400;font-size:9.4pt;color:var(--ink);white-space:nowrap}
.card .note{margin-top:auto;padding:0 2.8mm 1.8mm;font-size:6.9pt;line-height:1.18;color:var(--ink2);font-weight:500}
.card .prose{flex:1;padding:2mm 3mm;font-size:9.6pt;line-height:1.24;font-weight:500;display:flex;align-items:center}
.card .huge{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Lilita One';font-size:27pt;line-height:1;color:var(--ch)}
.card .huge small{font-family:'Fredoka';font-weight:700;font-size:6.6pt;letter-spacing:.1em;margin-top:1.2mm;color:var(--ink2)}
.card .letter{position:absolute;right:2mm;top:9mm;width:9mm;height:9mm;border-radius:50%;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Lilita One';font-size:13pt}
.back{background:radial-gradient(ellipse at 50% 42%,color-mix(in srgb,var(--c) 70%,white),var(--c) 70%);display:flex;flex-direction:column;align-items:center;justify-content:center}
.back .ring{position:absolute;inset:2.4mm;border-radius:2mm;border:.5mm solid var(--ink);opacity:.8}
.back .art{width:44mm;height:38mm;margin-bottom:3mm}
.back .deck{font-family:'Lilita One';font-size:14pt;color:var(--ci);text-align:center;line-height:1.04;padding:0 4mm;margin-top:3mm}
.crop{position:absolute;background:#6E6E6E}
.crop.v{width:.15mm;height:5mm}
.crop.h{width:5mm;height:.15mm}
.hint{position:absolute;left:0;right:0;bottom:2.2mm;text-align:center;font-size:6.6pt;color:#777;font-weight:500}
"""

DECKS = {
    "prof": ("#1C2350", "#FFFFFF", "#1C2350", "bank", "Profesión"),
    "peq": ("#2FB5F5", "#10143A", "#1379B0", "house", "Oportunidad pequeña"),
    "grande": ("#FF5A4E", "#FFFFFF", "#BF2F25", "tower", "Oportunidad grande"),
    "mercado": ("#8B5CF6", "#FFFFFF", "#5B30B8", "market", "Mercado"),
    "gusto": ("#FF6FB5", "#1D1A33", "#C23A80", "shop", "Gusto"),
    "sueno": ("#FFC83D", "#1D1A33", "#C98A0C", "castle", "Sueño"),
}


STAGES = {
    "prof": ("#FFE9A8", "#FFF8E4"), "peq": ("#A9E1FB", "#E8F7FF"), "grande": ("#FFC2BC", "#FFEDEA"),
    "mercado": ("#D8C8FF", "#F3EEFF"), "gusto": ("#FFC6E2", "#FFF0F7"), "sueno": ("#FFE9A8", "#FFFBEA"),
}
PROF_MODEL = {
    "Maestro/a": "bank", "Enfermero/a": "dome", "Contador/a": "chart", "Diseñador/a gráfico": "shop", "Vendedor/a": "market", "Chef": "shop",
    "Policía": "dome", "Ingeniero/a de software": "rocket", "Abogado/a": "tower", "Médico/a": "hotel", "Piloto/a": "rocket", "Dueño/a de negocio": "factory",
}


def card_vars(deck):
    c, ci, ch, _, _ = DECKS[deck]
    st1, st2 = STAGES[deck]
    return f"--c:{c};--ci:{ci};--ch:{ch};--st1:{st1};--st2:{st2}"


def card_front(deck, inner, model, side=""):
    c = DECKS[deck]
    return (f'<div class="card" style="{card_vars(deck)}"><div class="band"><span>{c[4]}</span><small>{side}</small></div>'
            f'<div class="stage">{iso.use(model)}</div>{inner}</div>')


def rows(pairs):
    return '<div class="rows">' + "".join(f'<div class="row"><span>{k}</span><b>{v}</b></div>' for k, v in pairs) + "</div>"


def deal(deck, name, tag, cost, down, flow, note):
    pairs = [("Costo total", m(cost))]
    if deck == "grande":
        pairs.append(("Deuda con el banco", m(cost - down)))
    pairs.append(("Flujo mensual", "+" + m(flow) if flow else "sin flujo"))
    if flow:
        pairs.append(("Recuperas el inicial", f"en {round(down / flow)} meses"))
    inner = (f'<div class="t">{name}</div><div class="hl">Pago inicial</div><div class="hero">{m(down)}</div>'
             f'{rows(pairs)}<div class="note">{note}</div>')
    return card_front(deck, inner, TAG_MODEL.get(tag, "shop"), tag)


def all_cards():
    out = []
    for name, letter, salary, spend, cash, note in PROFESIONES:
        inner = (f'<div class="letter">{letter}</div><div class="t">{name}</div><div class="hl">Salario / mes</div><div class="hero">{m(salary)}</div>'
                 + rows([("Gastos / mes", m(spend)), ("Flujo libre / mes", m(salary - spend)), ("Efectivo inicial", m(cash))])
                 + f'<div class="note">{note}</div>')
        out.append(("prof", card_front("prof", inner, PROF_MODEL.get(name, "coins"))))
    for name, tag, cost, down, flow, note in PEQUENAS:
        out.append(("peq", deal("peq", name, tag, cost, down, flow, note)))
    for name, tag, cost, down, flow, note in GRANDES:
        out.append(("grande", deal("grande", name, tag, cost, down, flow, note)))
    for name, text in MERCADO:
        out.append(("mercado", card_front("mercado", f'<div class="t">{name}</div><div class="prose">{text}</div>', "market")))
    for name, amount, note in GUSTOS:
        word, value = ("PAGA AHORA", amount) if amount >= 0 else ("COBRA AHORA", -amount)
        style = "" if amount >= 0 else ' style="color:#1B9C66"'
        out.append(("gusto", card_front("gusto", f'<div class="t">{name}</div><div class="huge"{style}>{m(value)}<small>{word}</small></div><div class="note">{note}</div>', "shop")))
    for name, cost in SUENOS:
        out.append(("sueno", card_front("sueno", f'<div class="t">{name}</div><div class="huge">{m(cost)}<small>PRECIO</small></div><div class="note">Si caes en una casilla Sueño y tienes el dinero, lo compras y GANAS la partida.</div>', "castle")))
    return out


def card_back(deck):
    c = DECKS[deck]
    return (f'<div class="card back" style="{card_vars(deck)}"><span class="ring"></span>{iso.use(c[3])}'
            f'{logo("19pt")}<div class="deck">{c[4]}</div></div>')


def crops():
    marks = []
    left, top = 9.0, 12.5
    for col in range(3):
        for edge in (0.5, 63.5):
            x = left + col * 64 + edge
            marks += [f'<i class="crop v" style="left:{x:.2f}mm;top:5.5mm"></i>', f'<i class="crop v" style="left:{x:.2f}mm;bottom:5.2mm"></i>']
    for row in range(3):
        for edge in (1.3, 89.3):
            y = top + row * 90.6 + edge
            marks += [f'<i class="crop h" style="left:2.5mm;top:{y:.2f}mm"></i>', f'<i class="crop h" style="right:2.5mm;top:{y:.2f}mm"></i>']
    return "".join(marks)


def build_cards():
    cards = all_cards()
    sheets = []
    for i in range(0, len(cards), 9):
        chunk = cards[i:i + 9]
        slots = [c[1] for c in chunk] + ["" for _ in range(9 - len(chunk))]
        front = "".join(f'<div class="slot">{s}</div>' for s in slots)
        # El reverso va en espejo por columnas para coincidir al imprimir a doble cara (borde largo)
        decks = [c[0] for c in chunk] + [None] * (9 - len(chunk))
        mirrored = [decks[r * 3 + c] for r in range(3) for c in (2, 1, 0)]
        back = "".join(f'<div class="slot">{card_back(d) if d else ""}</div>' for d in mirrored)
        sheets.append(f'<div class="sheet"><div class="layout">{front}</div>{crops()}<div class="hint">CashRich · cartas · hoja {i // 9 + 1} · imprime a doble cara por el borde largo, al 100 %</div></div>')
        sheets.append(f'<div class="sheet"><div class="layout">{back}</div></div>')
    return doc("Cartas", CARDS_CSS, "".join(sheets))


# -------------------------------------------------------------------- DINERO
MONEY_CSS = r"""
@page{size:A4;margin:0}
.sheet{position:relative;width:210mm;height:297mm;padding:9mm 10mm;overflow:hidden;background:#fff}
.head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3.5mm}
.head h1{font-family:'Lilita One';font-weight:400;font-size:19pt;margin:0}
.head span{font-size:8pt;color:var(--ink2);font-weight:600}
.bills{display:grid;grid-template-columns:1fr 1fr;gap:2.6mm}
.bill{position:relative;height:45.5mm;border:.6mm solid var(--ink);border-radius:2.4mm;overflow:hidden;background:var(--b);color:var(--bi)}
.bill .guil{position:absolute;inset:1.7mm;border-radius:1.4mm;border:.35mm solid var(--bi);opacity:.55}
.bill .brand{position:absolute;left:4mm;top:3.4mm;font-family:'Lilita One';font-size:11pt}
.bill .small{position:absolute;right:4mm;top:3.6mm;font-family:'Lilita One';font-size:11pt}
.bill .value{position:absolute;left:4mm;bottom:8mm;font-family:'Lilita One';font-size:32pt;line-height:1}
.bill .word{position:absolute;left:4mm;bottom:3.8mm;font-size:6.6pt;font-weight:700;letter-spacing:.04em}
.bill .art{position:absolute;right:2.5mm;bottom:2.6mm;width:37mm;height:32mm}
.note{margin-top:4mm;font-size:9pt;line-height:1.3;color:var(--ink2);font-weight:500}
.note b{color:var(--ink);font-weight:700}
"""


def build_money():
    denoms = [(1000, "mil", "#CFF5E1", "#10143A", "coins"), (5000, "cinco mil", "#CDEBFF", "#10143A", "house"),
              (10000, "diez mil", "#FFD7EC", "#1D1A33", "shop"), (50000, "cincuenta mil", "#E3D6FF", "#1D1A33", "tower"),
              (100000, "cien mil", "#FFE9A8", "#1D1A33", "castle")]
    bills = ""
    for value, word, bg, ink, model in denoms:
        for _ in range(2):
            bills += (f'<div class="bill" style="--b:{bg};--bi:{ink}"><span class="guil"></span><span class="brand">CashRich</span>'
                      f'{iso.use(model)}<div class="value">${m(value)}</div><div class="word">{word} · sin valor real</div></div>')
    body = f"""<div class="sheet"><div class="head"><h1>Dinero del juego</h1><span>Imprime 2 copias · corta por el borde</span></div>
<div class="bills">{bills}</div>
<div class="note"><b>Cómo usarlo:</b> cada jugador empieza con su efectivo inicial en billetes. Todo lo que entra o sale se paga con billetes: si te falta, es porque te falta. Quien haga de banco maneja el cambio.</div></div>"""
    return doc("Dinero", MONEY_CSS, body)


# -------------------------------------------------------------- FICHAS Y DADO
PIECES_CSS = r"""
@page{size:A4;margin:0}
.sheet{position:relative;width:210mm;height:297mm;padding:11mm 12mm;overflow:hidden;background:#fff;display:flex;flex-direction:column}
h1{font-family:'Lilita One';font-weight:400;font-size:19pt;margin:0}
.sub{font-size:8.6pt;font-weight:600;color:var(--ink2);margin:.6mm 0 4mm}
.tokens{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm 4mm}
.pair{display:flex;align-items:flex-end;justify-content:center;gap:2mm}
.tok{width:27mm;height:27mm;border-radius:50%;background:var(--t);border:.7mm solid var(--ink);display:flex;align-items:center;justify-content:center;font-family:'Lilita One';font-size:34pt;color:var(--ink);position:relative}
.tok:after{content:'';position:absolute;inset:1.6mm;border-radius:50%;border:.4mm solid rgba(29,26,51,.55)}
.stand{width:22mm;height:35mm;position:relative;border:.35mm dashed #777;border-radius:1mm;background:var(--t);display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:6mm;font-family:'Lilita One';font-size:22pt}
.stand:after{content:'pliega';position:absolute;bottom:.7mm;left:0;right:0;text-align:center;font:600 5.6pt 'Fredoka';color:var(--ink);border-top:.3mm dashed var(--ink);padding-top:.6mm}
.row2{display:flex;gap:7mm;margin-top:6mm}
.howto{flex:1}
h2{font-family:'Lilita One';font-weight:400;font-size:14pt;margin:0 0 1.6mm}
.howto p{font-size:9.2pt;line-height:1.28;margin:0 0 1.5mm;color:#2F2C4A;font-weight:500}
.howto b{font-weight:700;color:var(--ink)}
.check{margin-top:auto;border:.6mm solid var(--ink);border-radius:3mm;background:var(--cream);padding:3.5mm 5mm}
.cl{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5mm 6mm}
.it{display:flex;gap:2mm;align-items:center;font-size:9pt;font-weight:500}
.bx{width:4mm;height:4mm;border:.4mm solid var(--ink);border-radius:.8mm;flex:0 0 auto}
"""

PIPS = {1: [(1, 1)], 2: [(0, 0), (2, 2)], 3: [(0, 0), (1, 1), (2, 2)], 4: [(0, 0), (2, 0), (0, 2), (2, 2)],
        5: [(0, 0), (2, 0), (1, 1), (0, 2), (2, 2)], 6: [(0, 0), (2, 0), (0, 1), (2, 1), (0, 2), (2, 2)]}


def die_net():
    """Plantilla real: caras opuestas suman 7 y lleva pestanas para pegar."""
    size = 20
    layout = {1: (1, 0), 3: (0, 1), 2: (1, 1), 4: (2, 1), 5: (3, 1), 6: (1, 2)}
    # (cara, lado) con pestana
    tabs = [(1, "l"), (1, "r"), (3, "t"), (3, "b"), (4, "t"), (4, "b"), (5, "r")]
    parts = []
    for face, side in tabs:
        col, row = layout[face]
        x, y = col * size, row * size
        t, c = 5, 3
        shape = {
            "l": [(x, y), (x - t, y + c), (x - t, y + size - c), (x, y + size)],
            "r": [(x + size, y), (x + size + t, y + c), (x + size + t, y + size - c), (x + size, y + size)],
            "t": [(x, y), (x + c, y - t), (x + size - c, y - t), (x + size, y)],
            "b": [(x, y + size), (x + c, y + size + t), (x + size - c, y + size + t), (x + size, y + size)],
        }[side]
        parts.append('<polygon points="%s" fill="#E9D8AE" stroke="#1D1A33" stroke-width=".25" stroke-dasharray="1 .7"/>' % " ".join(f"{a},{b}" for a, b in shape))
    for face, (col, row) in layout.items():
        x, y = col * size, row * size
        parts.append(f'<rect x="{x}" y="{y}" width="{size}" height="{size}" fill="#FFFDF6" stroke="#1D1A33" stroke-width=".35"/>')
        for px, py in PIPS[face]:
            parts.append(f'<circle cx="{x + 4.2 + px * 5.8}" cy="{y + 4.2 + py * 5.8}" r="2" fill="#FF5A4E"/>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 92 72" style="width:112mm;height:88mm;display:block">{"".join(parts)}</svg>'


def build_pieces():
    colors = ["#FF5A4E", "#2FB5F5", "#FFC83D", "#C77DFF", "#3DDC97", "#FF8FC7"]
    toks = "".join(f'<div class="pair" style="--t:{c}"><div class="tok">{L}</div><div class="stand">{L}</div></div>' for L, c in zip("ABCDEF", colors))
    items = ["Tablero A3", f"{TOTAL_CARTAS} cartas", "6 hojas de jugador", "Reglas", "Dinero (2 copias)", "6 fichas", "1 dado", "Ayuda de mesa"]
    checks = "".join(f'<div class="it"><span class="bx"></span>{t}</div>' for t in items)
    body = f"""<div class="sheet"><h1>Fichas de jugador</h1><div class="sub">Recorta y pega sobre cartón. Usa la ficha redonda o la de pie, plegada por la base.</div>
<div class="tokens">{toks}</div>
<div class="row2"><div><h2>Dado de papel</h2>{die_net()}<div class="sub" style="margin:1mm 0 0;font-size:7.8pt;max-width:112mm">Recorta el contorno, dobla por las aristas y pega las pestañas. Caras opuestas suman 7. También sirve cualquier dado de casa.</div></div>
<div class="howto"><h2>Antes de empezar</h2>
<p><b>1.</b> Cada jugador toma una ficha, una carta de Profesión y una hoja de estado financiero.</p>
<p><b>2.</b> Anota salario, gastos y efectivo inicial. Calcula tu flujo libre.</p>
<p><b>3.</b> Baraja por separado Pequeña, Grande, Mercado y Gusto. Deja aparte los Sueños.</p>
<p><b>4.</b> Todos empiezan en SALIDA.</p>
<p><b>5.</b> Sal de la ratonera cuando tus rentas cubran tus gastos. Gana el primero que compre un Sueño.</p></div></div>
<div class="check"><h2>¿Está todo impreso?</h2><div class="cl">{checks}</div></div></div>"""
    return doc("Fichas y dado", PIECES_CSS, body)


# ---------------------------------------------------- REGLAS, HOJA Y AYUDA
# Conservan su texto; aqui cambian marca, tipografia y color.
OVERRIDE = r"""
h1,h2,h3,h4{font-weight:400}
h2{color:var(--ink)!important;border-color:var(--gold)!important}
h3{color:#BF2F25!important}
.panel h3{color:var(--gold)!important}
b{font-weight:600}
.note,.box{border-radius:2.4mm}
.foot{padding-right:11mm}
.head .t,.ht{letter-spacing:.01em}
.hhead{align-items:center!important}
.hhead .art{width:17mm;height:15mm}
.harts{display:flex;gap:1mm}
.money td b{font-family:'Lilita One',sans-serif;font-weight:400;font-size:10.5pt}
.hcard .money tr:nth-child(1) td:first-child{border-left:2mm solid #FFC83D;padding-left:2mm}
.hcard .money tr:nth-child(2) td:first-child{border-left:2mm solid #2FB5F5;padding-left:2mm}
.hcard .money tr:nth-child(3) td:first-child{border-left:2mm solid #FF5A4E;padding-left:2mm}
.hcard .money tr:nth-child(4) td:first-child{border-left:2mm solid #8B5CF6;padding-left:2mm}
.hcard .money tr:nth-child(5) td:first-child{border-left:2mm solid #FF6FB5;padding-left:2mm}
.hcard .money tr:nth-child(6) td:first-child{border-left:2mm solid #7C8BD6;padding-left:2mm}
.hnote{background:#FFF6DF!important;border-left-color:#FFC83D!important;border-radius:0 2mm 2mm 0}
"""

ADVANCED = """
  <h2>Modo avanzado</h2>
  <p>Son las reglas de la versión digital de CashRich que se pueden jugar en la mesa. Añade las que quieras: cuantas más uses, más estrategia y más interacción.</p>
  <h3>Subastas</h3>
  <p>Si pasas de una Oportunidad, no vuelve al mazo: se subasta entre los demás, solo con efectivo. Cada rival dice una puja a partir del pago inicial, empezando por tu izquierda. El ganador paga la puja al banco y recibe el activo; <b>tú cobras lo que pague por encima del pago inicial</b>. A veces pasar es el mejor negocio.</p>
  <h3>Hipotecas reales</h3>
  <p>Al vender un activo restas su deuda (costo total − pago inicial) del precio de venta. Comprar con poco dinero multiplica la ganancia, pero una mala carta de Mercado puede dejarte con menos de lo que pusiste.</p>
  <h3>Mejoras</h3>
  <p>En tu turno puedes mejorar un activo una sola vez: pagas el 25% de su costo total y su flujo sube un 35%. Marca la fila con una estrella en tu hoja.</p>
  <h3>Bonos de cartera</h3>
  <p><b>Especialista:</b> con tres activos de un mismo sector (inmuebles, bolsa o negocios), sus rentas suben un 20%. <b>Diversificado:</b> con al menos uno de cada sector, todas tus rentas suben un 10%. Elige camino.</p>
  <h3>Ciclo económico</h3>
  <p>Cada vez que alguien cae en SALIDA, tira un dado. Con <b>1–2, recesión:</b> hasta la próxima tirada los préstamos cuestan 1.500 por cada 10.000 y las ofertas se pagan un 25% más baratas. Con <b>3–4, normal</b>. Con <b>5–6, burbuja:</b> las ofertas cuestan un 25% más, pero al vender cobras un 25% más. Comprar en la crisis y vender en la burbuja es el juego.</p>
  <h3>Partida con tiempo</h3>
  <p>Acordad un número de rondas (12, 20 o 30). Al terminar, si nadie compró un Sueño, gana el mayor patrimonio: efectivo + valor de los activos − deudas.</p>
  <div class="note" style="margin-top:4mm"><b>¿Lo quieres en pantalla?</b> Juega online en cashrich.xyoncloud.win, con el tablero 3D en la TV y cada jugador en su móvil.</div>
"""


def rebrand(html, title):
    html = (html.replace("FLUJO<br><em>LIBRE</em>", "CASH<br><em>RICH</em>")
            .replace("FLUJO<br>LIBRE", "CASH<br>RICH")
            .replace("FLUJO LIBRE", "CashRich").replace("Flujo Libre", "CashRich")
            .replace("119 cartas", f"{TOTAL_CARTAS} cartas")
            .replace("Georgia,'Times New Roman',serif", "'Lilita One',sans-serif")
            .replace("Georgia,serif", "'Lilita One',sans-serif")
            .replace("'Segoe UI','Helvetica Neue',Arial,sans-serif", "'Fredoka',sans-serif")
            .replace("'Segoe UI',system-ui,sans-serif", "'Fredoka',sans-serif")
            .replace("'Segoe UI',sans-serif", "'Fredoka',sans-serif"))
    style = f"<style>{BASE}{OVERRIDE}</style>"
    i = html.rfind("</style>") + len("</style>")
    return html[:i] + style + html[i:]


def build_rules():
    html = rebrand(old.build_rules(), "Reglas")
    # Portada con los edificios del juego y pagina nueva de modo avanzado
    skyline = "".join(iso.use(x, "art cover-art") for x in ["house", "market", "tower", "bank", "castle"])
    html = html.replace('<div class="eyebrow">', f'<div class="cover-sky">{skyline}</div><div class="eyebrow">', 1)
    extra = ('<style>.cover-sky{display:flex;align-items:flex-end;justify-content:center;gap:2mm;height:42mm;margin-bottom:3mm}'
             '.cover-art{height:100%;width:33mm}.bigtitle{font-weight:400!important}.bigtitle em{font-style:normal;color:#C98A0C!important}</style>')
    html = html.replace("</head>", extra + "</head>", 1)
    page = (f'<div class="sheet ">{ADVANCED}<div class="foot"><span>CashRich · Reglas</span><span>Edición imprimible</span></div><div class="pgnum">05</div></div>')
    return html.replace("</body>", iso.symbols(iso.ALL) + page + "</body>", 1)


def build_sheet():
    return rebrand(old.build_sheet(), "Estado financiero")


def build_help():
    html = rebrand(old.build_help(), "Ayuda de mesa")
    arts = '<div class="harts">' + "".join(iso.use(x) for x in ["coins", "house", "tower", "market", "shop", "bank"]) + "</div>"
    html = html.replace('<div class="hn">2–6 jugadores</div>', arts)
    return html.replace("</body>", iso.symbols(iso.ALL) + "</body>", 1)


def main():
    files = {"reglas": build_rules(), "tablero": build_board(), "cartas": build_cards(), "hoja-jugador": build_sheet(),
             "dinero": build_money(), "fichas": build_pieces(), "ayuda": build_help()}
    for name, html in files.items():
        with open(os.path.join(AQUI, name + ".html"), "w", encoding="utf-8") as f:
            f.write(html)
    print("cartas:", TOTAL_CARTAS, "| html:", ", ".join(files))


if __name__ == "__main__":
    main()
