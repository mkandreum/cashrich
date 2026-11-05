# -*- coding: utf-8 -*-
"""Genera los HTML de impresion de FLUJO LIBRE."""
import os
import sys
from game_data import *

AQUI = os.path.dirname(os.path.abspath(__file__))
SRC = AQUI
OUT = os.path.join(os.path.dirname(AQUI), "out")


def m(n):
    return f"{int(n):,}".replace(",", ".")


# ------------------------------------------------------------------ CSS BASE
BASE = r"""
:root{
  --paper:#F4EBD9; --card:#FFFDF6; --ink:#17252E; --ink2:#43555F;
  --peq:#2E6E6B; --grande:#C2452D; --mercado:#D99A1F; --gusto:#7A4E6E;
  --cobrar:#3F7A4A; --banco:#44586B; --sueno:#8C5A1E; --prof:#2B3A55;
  --line:#17252E;
}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
html,body{margin:0;padding:0;background:#fff;color:var(--ink);
  font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;}
.page{position:relative;overflow:hidden;background:#fff;}
.serif{font-family:Georgia,'Times New Roman',serif;}
.num{font-variant-numeric:tabular-nums;}
"""

# ------------------------------------------------------------------- TABLERO
BOARD_CSS = r"""
@page{size:420mm 297mm;margin:0}
.board{width:420mm;height:297mm;padding:7mm;background:#E7D9BE;}
.board .frame{position:absolute;inset:4mm;border:1mm solid var(--ink);border-radius:3mm;}
.board .frame2{position:absolute;inset:6.2mm;border:0.25mm solid var(--ink);border-radius:2mm;opacity:.45;}
.grid{position:absolute;inset:9mm;display:grid;grid-template-columns:repeat(8,1fr);
  grid-template-rows:repeat(6,1fr);gap:1.6mm;}

.cell{background:#FBF6EA;border:0.4mm solid var(--ink);border-radius:2mm;
  display:flex;flex-direction:column;overflow:hidden;position:relative;}
.cell .band{height:5.8mm;display:flex;align-items:center;justify-content:center;
  color:#fff;font-size:6.4pt;font-weight:700;letter-spacing:.16em;background:#888;flex:0 0 auto;}
.cell .idx{position:absolute;right:1.5mm;top:6.9mm;font-size:5.8pt;color:#8FA0A7;letter-spacing:.08em;}
.cell .glyph{font-size:20pt;line-height:1;text-align:center;margin-top:3.4mm;color:var(--ink);}
.cell .lbl{text-align:center;font-family:Georgia,serif;font-size:9.8pt;font-weight:700;
  padding:1.4mm 1.5mm 0;line-height:1.1;letter-spacing:-.01em;}
.cell .sub{text-align:center;font-size:6pt;color:var(--ink2);padding:1.3mm 1mm 1.4mm;margin-top:auto;
  border-top:0.2mm solid rgba(23,37,46,.14);letter-spacing:.03em;}
.cell.peq{background:#EDF3F0}.cell.grande{background:#FBEEE9}.cell.mercado{background:#FCF3DA}
.cell.gusto{background:#F4ECF2}.cell.cobrar{background:#EAF2EB}.cell.banco{background:#EBEFF3}
.cell.peq .band{background:var(--peq)} .cell.peq .glyph{color:var(--peq)}
.cell.grande .band{background:var(--grande)} .cell.grande .glyph{color:var(--grande)}
.cell.mercado .band{background:var(--mercado)} .cell.mercado .glyph{color:#B57C0C}
.cell.gusto .band{background:var(--gusto)} .cell.gusto .glyph{color:var(--gusto)}
.cell.cobrar .band{background:var(--cobrar)} .cell.cobrar .glyph{color:var(--cobrar)}
.cell.banco .band{background:var(--banco)} .cell.banco .glyph{color:var(--banco)}
.cell.start{background:#FBEFC6;border-width:0.9mm;}
.cell.start .glyph{font-size:24pt}
.cell .arrow{position:absolute;font-size:9pt;color:#A9B6BC;}
.cell.start .arrow{color:var(--grande);font-size:11pt}

/* ---------------- via rapida ---------------- */
.interior{grid-column:2/8;grid-row:2/6;display:flex;flex-direction:column;gap:2.2mm;
  min-width:0;padding-top:2mm;}
.via-head{display:flex;align-items:baseline;justify-content:space-between;gap:3mm;
  border-bottom:.6mm solid var(--ink);padding-bottom:1.2mm;flex:0 0 auto;line-height:1;}
.via-head .l{font-family:Georgia,serif;font-size:11pt;font-weight:700;letter-spacing:.18em;}
.via-head .r{font-size:6.6pt;color:var(--ink2);letter-spacing:.04em;}
.via-grid{display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(2,1fr);
  gap:1.6mm;height:72mm;flex:0 0 auto;}
.via{background:#FBF6EA;border:.4mm solid var(--ink);border-radius:1.6mm;overflow:hidden;
  display:flex;flex-direction:column;position:relative;}
.via .band{height:4.4mm;font-size:5.4pt;color:#fff;display:flex;align-items:center;
  justify-content:center;letter-spacing:.14em;font-weight:700;background:#888;flex:0 0 auto;}
.via .n{position:absolute;top:5mm;right:1.4mm;font-size:5.4pt;color:#8FA0A7;}
.via .glyph{font-size:14pt;text-align:center;margin-top:3.4mm;line-height:1;}
.via .lbl{font-family:Georgia,serif;font-size:7.4pt;font-weight:700;text-align:center;margin-top:.6mm;}
.via .sub{font-size:5.4pt;text-align:center;color:var(--ink2);margin-top:auto;padding-bottom:1.4mm;}
.via .dir{position:absolute;right:1.1mm;bottom:1mm;font-size:8pt;color:#A9B6BC;}
.via .dir.l{right:auto;left:1.1mm;}
.via.cobrar .glyph{color:var(--cobrar)}
.via.peq .glyph{color:var(--peq)}
.via.mercado .glyph{color:#B57C0C}
.via.sueno .glyph{color:var(--sueno)}
.via.banco .glyph{color:var(--banco)}
.via.cobrar{background:#EAF2EB}.via.peq{background:#EDF3F0}.via.mercado{background:#FCF3DA}
.via.sueno{background:#F8EEE0}.via.banco{background:#EBEFF3}
.via.cobrar .band{background:var(--cobrar)}
.via.peq .band{background:var(--peq)}
.via.mercado .band{background:var(--mercado)}
.via.sueno .band{background:var(--sueno)}
.via.banco .band{background:var(--banco)}

/* ---------------- centro ---------------- */
.core{flex:1;display:flex;gap:2.2mm;min-height:0;}
.logo-block{flex:1.6;display:flex;flex-direction:column;justify-content:center;align-items:center;
  background:#FBF6EA;border:.4mm solid var(--ink);border-radius:2.4mm;padding:4mm;text-align:center;}
.logo{font-family:Georgia,serif;font-weight:700;font-size:42pt;letter-spacing:.01em;line-height:.95;}
.logo .fl{color:var(--ink)}
.logo .lb{color:var(--grande)}
.logo-rule{width:55%;height:.45mm;background:var(--ink);margin:3.2mm 0;}
.logo-sub{font-size:7.2pt;letter-spacing:.32em;margin-bottom:3mm;color:var(--ink2);text-transform:uppercase;}
.tagline{font-family:Georgia,serif;font-style:italic;font-size:9.4pt;color:var(--ink2);line-height:1.45;}
.logo-foot{font-size:6pt;letter-spacing:.2em;color:#8FA0A7;margin-top:4mm;text-transform:uppercase;}
.legend{flex:1;display:flex;flex-direction:column;justify-content:center;gap:1.9mm;
  background:#FBF6EA;border:.4mm solid var(--ink);border-radius:2.4mm;padding:4mm;}
.legend h4{margin:0 0 .8mm;font-size:6.4pt;letter-spacing:.22em;color:var(--grande);text-transform:uppercase;}
.legend .it{display:flex;gap:2mm;align-items:flex-start;font-size:6.9pt;line-height:1.24;color:var(--ink2)}
.legend .sw{width:4.4mm;height:4.4mm;border-radius:.8mm;flex:0 0 auto;margin-top:.4mm;
  border:.25mm solid rgba(23,37,46,.3)}
.legend b{display:block;font-size:7.3pt;color:var(--ink);margin-bottom:.2mm}
.legend .note{border-top:.25mm solid var(--ink);padding-top:2.2mm;margin-top:1mm;font-size:6.7pt;line-height:1.34;color:var(--ink2)}
"""

# --------------------------------------------------------------------- CARTAS
CARDS_CSS = r"""
@page{size:A4;margin:0}
.sheet{width:210mm;height:297mm;padding:6mm 7mm;display:flex;flex-wrap:wrap;
  align-content:center;justify-content:center;gap:2.2mm;page-break-after:always;background:#fff}
.card{width:63mm;height:88mm;background:var(--card);border:0.4mm solid var(--ink);
  border-radius:1.8mm;display:flex;flex-direction:column;overflow:hidden;position:relative;break-inside:avoid}
.card .band{height:6.4mm;display:flex;align-items:center;justify-content:center;color:#fff;
  font-size:5.9pt;font-weight:700;letter-spacing:.2em;background:#888;flex:0 0 auto}
.card .title{font-family:Georgia,serif;font-size:10.2pt;font-weight:700;line-height:1.13;
  padding:2.8mm 3mm 1mm;flex:0 0 auto}
.card .tag{display:inline-block;font-size:5.2pt;letter-spacing:.16em;color:#fff;background:var(--ink2);
  border-radius:.9mm;padding:.45mm 1.5mm;margin:0 3mm 1mm;align-self:flex-start}
.card .hlab{font-size:5.3pt;letter-spacing:.2em;color:var(--ink2);text-transform:uppercase;
  padding:1mm 3mm 0;flex:0 0 auto}
.card .hero{font-family:Georgia,serif;font-size:23pt;font-weight:700;line-height:1;
  padding:.9mm 3mm 1.6mm;font-variant-numeric:tabular-nums;flex:0 0 auto;letter-spacing:-.01em}
.card .hrule{height:.3mm;background:var(--ink);margin:0 3mm 1.2mm;flex:0 0 auto}
.card .body{flex:1 1 auto;padding:0 3mm;display:flex;flex-direction:column;justify-content:flex-start}
.card .row{display:flex;align-items:baseline;justify-content:space-between;gap:1mm;
  border-bottom:.2mm dotted #B9C4C9;padding:1.25mm 0;font-size:6.7pt;color:var(--ink2)}
.card .row b{font-size:8.8pt;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}
.card .note{font-size:6pt;font-style:italic;line-height:1.3;color:#4E6069;
  padding:2mm 3mm 1mm;flex:0 0 auto}
.card .mark{font-size:4.4pt;letter-spacing:.26em;text-align:center;color:#A3B2B8;
  padding:0 0 1.3mm;flex:0 0 auto}
.card.peq .band{background:var(--peq)} .card.grande .band{background:var(--grande)}
.card.mercado .band{background:var(--mercado)} .card.gusto .band{background:var(--gusto)}
.card.sueno .band{background:var(--sueno)} .card.prof .band{background:var(--prof)}
.card .huge{font-family:Georgia,serif;font-size:32pt;font-weight:700;text-align:center;
  line-height:1;margin:auto 0;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.card .huge small{font-size:7.4pt;letter-spacing:.22em;display:block;margin-top:2.4mm;
  color:var(--ink2);font-family:'Segoe UI',sans-serif;font-weight:600}
.card .prose{font-size:9.6pt;line-height:1.4;padding:4mm 3.4mm;text-align:left;
  display:flex;align-items:center;flex:1;font-family:Georgia,serif}
.card.mercado .title{font-size:9pt;letter-spacing:.03em;padding-bottom:1.6mm}
.watermark{position:absolute;right:-2mm;bottom:2mm;font-family:Georgia,serif;font-size:44pt;
  color:rgba(23,37,46,.05);line-height:1;pointer-events:none}
.wm-letter{font-size:78pt;right:4mm;bottom:12mm;font-weight:700;color:rgba(43,58,85,.07)}
"""

# ---------------------------------------------------------------------- REGLAS
DOC_CSS = r"""
@page{size:A4;margin:0}
.sheet{width:210mm;height:297mm;padding:16mm 18mm;background:#fff;page-break-after:always;
  display:flex;flex-direction:column;position:relative}
h1,h2,h3,h4{font-family:Georgia,'Times New Roman',serif;margin:0}
.eyebrow{font-size:7.5pt;letter-spacing:.26em;text-transform:uppercase;color:var(--grande);font-weight:700}
h1{font-size:34pt;line-height:1.02;margin:4mm 0 3mm;letter-spacing:-.01em}
h2{font-size:14pt;margin:5.4mm 0 2.2mm;padding-bottom:1.2mm;border-bottom:0.5mm solid var(--ink)}
h2:first-of-type{margin-top:0}
h3{font-size:10pt;margin:3.2mm 0 .8mm}
p{font-size:9.2pt;line-height:1.47;margin:0 0 1.8mm;color:#22333C}
ul,ol{margin:0 0 1.8mm;padding-left:5mm}
li{font-size:9.2pt;line-height:1.42;margin-bottom:.8mm;color:#22333C}
.kicker{font-size:10.5pt;line-height:1.45;color:var(--ink2);font-style:italic}
.rule{height:.4mm;background:var(--ink);width:100%;margin:4mm 0}
.two{display:grid;grid-template-columns:1fr 1fr;gap:7mm}
.box{border:.45mm solid var(--ink);border-radius:2mm;padding:4mm 4.5mm;background:#FBF6EA}
.box h4{font-size:8pt;letter-spacing:.18em;text-transform:uppercase;color:var(--grande);margin-bottom:2mm}
.box p,.box li{font-size:8.4pt;line-height:1.4}
.note{background:#F4EBD9;border-left:1.4mm solid var(--grande);padding:3mm 4mm;font-size:8.6pt;line-height:1.42}
table.money{width:100%;border-collapse:collapse;font-size:8.4pt}
table.money td{padding:1.6mm 0;border-bottom:.2mm dotted #9FB0B7;vertical-align:top}
table.money td.r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;font-weight:700}
.foot{position:absolute;bottom:9mm;left:18mm;right:18mm;display:flex;justify-content:space-between;
  font-size:6.6pt;letter-spacing:.16em;text-transform:uppercase;color:#8B9AA0;border-top:.2mm solid #D8CFBC;padding-top:2mm}
.cover{justify-content:space-between}
.cover .top{padding-top:6mm}
.cover .bigtitle{font-family:Georgia,serif;font-size:64pt;line-height:.92;letter-spacing:-.02em;margin:6mm 0 0}
.cover .bigtitle em{font-style:normal;color:var(--grande)}
.cover .sub{font-size:11pt;letter-spacing:.3em;text-transform:uppercase;color:var(--ink2);margin-top:6mm}
.cover .lead{font-family:Georgia,serif;font-size:13pt;line-height:1.45;max-width:130mm;margin-top:8mm;color:#22333C}
.cover .strip{display:grid;grid-template-columns:repeat(4,1fr);gap:2.5mm;margin-top:auto}
.cover .strip div{border:.4mm solid var(--ink);border-radius:1.5mm;padding:2.4mm;font-size:7pt;text-align:center;background:#FBF6EA}
.cover .strip b{display:block;font-size:8pt;font-family:Georgia,serif;margin-bottom:.6mm}
.cover-mid{display:grid;grid-template-columns:repeat(4,1fr);gap:5mm;margin:10mm 0 0}
.cstep{border-top:1.2mm solid var(--grande);padding-top:2.5mm}
.cstep .n{font-family:Georgia,serif;font-size:19pt;font-weight:700;color:var(--grande);line-height:1}
.cstep b{display:block;font-family:Georgia,serif;font-size:9.4pt;margin:1.6mm 0 1mm;line-height:1.2}
.cstep .d{font-size:8pt;line-height:1.4;color:var(--ink2);display:block}
.cover-quote{margin-top:16mm;border-left:1.6mm solid var(--ink);padding:1mm 0 1mm 6mm;
  font-family:Georgia,serif;font-size:17pt;line-height:1.45;color:var(--ink);max-width:150mm}
.cover-quote span{display:block;font-family:'Segoe UI',sans-serif;font-size:7pt;letter-spacing:.24em;
  text-transform:uppercase;color:#8B9AA0;margin-top:4mm}
.pgnum{position:absolute;bottom:9mm;right:18mm;font-size:7pt;color:#8B9AA0;letter-spacing:.2em}
"""

# ------------------------------------------------------------ HOJA DE JUGADOR
SHEET_CSS = r"""
@page{size:A4;margin:0}
.sheet{width:210mm;height:297mm;padding:11mm 12mm;background:#fff;page-break-after:always;
  display:flex;flex-direction:column;position:relative}
.head{display:flex;justify-content:space-between;align-items:flex-end;
  border-bottom:1mm solid var(--ink);padding-bottom:2.5mm;margin-bottom:4mm}
.head .t{font-family:Georgia,serif;font-size:20pt;font-weight:700;line-height:1}
.head .s{font-size:6.6pt;letter-spacing:.22em;text-transform:uppercase;color:var(--ink2);margin-top:1.4mm}
.fields{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:4mm;margin-bottom:4mm}
.field{border-bottom:.4mm solid var(--ink);padding-bottom:1mm;font-size:7pt;letter-spacing:.12em;
  text-transform:uppercase;color:var(--ink2)}
.field span{display:block;height:5mm}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:5mm;flex:1;align-items:stretch}
.col{display:flex;flex-direction:column;gap:4mm;height:100%;min-height:0}
.panel.grow{flex:1 1 auto;display:flex;flex-direction:column;min-height:0}
.panel.grow table{height:100%}
.panel.grow td{height:auto}
.reminder{margin-top:4mm;border:.45mm solid var(--ink);border-radius:2mm;background:#F4EBD9;
  padding:3.2mm 4mm;display:grid;grid-template-columns:repeat(3,1fr);gap:6mm;flex:0 0 auto}
.reminder h4{font-size:6.4pt;letter-spacing:.18em;text-transform:uppercase;color:var(--grande);margin-bottom:1mm}
.reminder p{font-size:7.6pt;line-height:1.35;margin:0;color:#22333C}
.panel{border:.45mm solid var(--ink);border-radius:2mm;overflow:hidden;background:#fff}
.panel h3{background:var(--ink);color:#fff;font-size:7.4pt;letter-spacing:.2em;text-transform:uppercase;
  padding:1.8mm 3mm;font-weight:600;margin:0}
.panel .in{padding:3mm}
.line{display:flex;justify-content:space-between;align-items:baseline;border-bottom:.2mm dotted #A9B6BC;
  padding:1.7mm 0;font-size:8.6pt;color:var(--ink2)}
.line b{font-size:9.6pt;color:var(--ink);font-variant-numeric:tabular-nums}
.line.total{border-bottom:none;border-top:.4mm solid var(--ink);margin-top:1mm;font-weight:700;color:var(--ink)}
.flowbox{background:#F4EBD9;border:.45mm solid var(--ink);border-radius:2mm;padding:3mm 4mm;margin-top:3mm;
  display:flex;justify-content:space-between;align-items:center}
.flowbox .k{font-size:7.4pt;letter-spacing:.18em;text-transform:uppercase;color:var(--ink2);max-width:45mm;line-height:1.3}
.flowbox .v{font-family:Georgia,serif;font-size:19pt;font-weight:700;font-variant-numeric:tabular-nums}
table.tb{width:100%;border-collapse:collapse;font-size:8pt}
table.tb th{font-size:6.2pt;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2);
  text-align:left;padding:0 1mm 1.2mm;border-bottom:.3mm solid var(--ink);font-weight:600}
table.tb td{border-bottom:.25mm solid #DCD3C0;height:7.2mm;padding:0 1mm}
table.tb td.d{width:26mm}
table.tb.fill{flex:1 1 auto;height:100%}
table.tb.fill td{height:auto}
.thead{display:grid;grid-template-columns:1fr 26mm 26mm;gap:0;padding:0 1mm 1.4mm;
  border-bottom:.3mm solid var(--ink);font-size:6.2pt;letter-spacing:.14em;
  text-transform:uppercase;color:var(--ink2);font-weight:600}
.panel.grow .in{display:flex;flex-direction:column;justify-content:space-between;height:100%}
.bar{display:flex;flex-wrap:wrap;gap:1mm;margin-top:2mm}
.bar i{flex:0 0 calc(10% - 1mm);height:6mm;border:.3mm solid var(--ink);border-radius:.6mm;display:block}
.barlegend{display:flex;justify-content:space-between;font-size:5.6pt;color:#8B9AA0;margin-top:1mm;
  letter-spacing:.1em}
.freedom{border:.4mm solid var(--ink);border-radius:1.6mm;padding:3mm 3.5mm;margin-bottom:4mm;
  background:#FBF6EA}
.fk{font-size:6pt;letter-spacing:.2em;text-transform:uppercase;color:var(--grande)}
.fv{font-family:Georgia,serif;font-size:16pt;font-weight:700;margin:1mm 0;font-variant-numeric:tabular-nums}
.fm{font-size:6.6pt;line-height:1.35;color:var(--ink2)}
.legendmini{font-size:6.4pt;color:var(--ink2);margin-top:1.6mm;letter-spacing:.04em}
.big{font-family:Georgia,serif;font-size:26pt;font-weight:700;line-height:1}
.muted{color:#8B9AA0;font-size:6.6pt;letter-spacing:.14em;text-transform:uppercase}
.log td{height:8mm}
"""


# ------------------------------------------------------------------ utilidades
def money_pill(v):
    return m(v)


# ===================================================================== TABLERO
def build_board():
    TYPE_META = {
        "peq": ("PEQUEÑA", "▲", "Roba 1 carta"),
        "grande": ("GRANDE", "◆", "Roba 1 carta"),
        "mercado": ("MERCADO", "⇄", "Roba 1 carta"),
        "gusto": ("GUSTO", "◑", "Gasta o ahorra"),
        "cobrar": ("COBRA", "$", "Cobra un mes extra"),
        "banco": ("BANCO", "§", "Préstamo o caridad"),
    }
    CORNER_ARROW = {0: "▶", 7: "▲", 12: "◀", 19: "▼"}
    cells = []
    for i, (name, kind, sub) in enumerate(TABLERO):
        c, r = RATONERA_POS[i]
        band, glyph, default_sub = TYPE_META[kind]
        label = {"peq": "Pequeña", "grande": "Grande"}.get(kind, name)
        if i == 0:
            label, sub = "SALIDA", "Empieza aquí · cobra"
        arrow = f'<span class="arrow">{CORNER_ARROW[i]}</span>' if i in CORNER_ARROW else ""
        cells.append(f"""
      <div class="cell {kind}{' start' if i == 0 else ''}" style="grid-column:{c};grid-row:{r}">
        <div class="band">{band}</div>
        <div class="idx">{i:02d}</div>
        <div class="glyph">{glyph}</div>
        <div class="lbl">{label}</div>
        <div class="sub">{sub}</div>{arrow}
      </div>""")

    VIA_WORD = {"peq": ("OPORTUNIDAD", "◆", "Roba 1 carta"),
                "mercado": ("MERCADO", "⇄", "Roba 1 carta"),
                "sueno": ("SUEÑO", "★", "Cómpralo y ganas"),
                "cobrar": ("COBRA", "$", "Flujo × 10"),
                "banco": ("AUDITORÍA", "§", "10% de tu efectivo")}
    via_cells = []
    for i, (name, kind, sub) in enumerate(VIA):
        band, glyph, default_sub = VIA_WORD[kind]
        if i < 5:
            d = '<span class="dir">›</span>'
        elif i == 5:
            d = '<span class="dir">↓</span>'
        elif i < 11:
            d = '<span class="dir l">‹</span>'
        else:
            d = '<span class="dir l">↑</span>'
        via_cells.append(f"""
      <div class="via {kind}">
        <div class="band">{band}</div>
        <div class="n">{i+1}</div>
        <div class="glyph">{glyph}</div>
        {'<div class="lbl">Sueño</div>' if kind == 'sueno' else ''}
        <div class="sub">{sub}</div>{d}
      </div>""")

    return f"""<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>FLUJO LIBRE - Tablero</title><style>{BASE}{BOARD_CSS}</style></head><body>
<div class="board">
  <div class="frame"></div><div class="frame2"></div>
  <div class="grid">
    {''.join(cells)}
    <div class="interior">
      <div class="via-head">
        <span class="l">VÍA RÁPIDA</span>
        <span class="r">Entras al salir de la ratonera · avanza en serpiente del 1 al 12</span>
      </div>
      <div class="via-grid">{''.join(via_cells)}</div>
      <div class="core">
        <div class="logo-block">
          <div class="logo"><span class="fl">FLUJO</span> <span class="lb">LIBRE</span></div>
          <div class="logo-rule"></div>
          <div class="logo-sub">El juego de la libertad financiera</div>
          <div class="tagline">«No trabajes por dinero.<br>Haz que tu dinero trabaje por ti.»</div>
          <div class="logo-foot">2–6 jugadores · 90–120 minutos · edición imprimible</div>
        </div>
        <div class="legend">
          <h4>Cómo se lee el tablero</h4>
          <div class="it"><span class="sw" style="background:#3F7A4A"></span>
            <span><b>Cobra</b>Salario + rentas − gastos.</span></div>
          <div class="it"><span class="sw" style="background:#2E6E6B"></span>
            <span><b>Oportunidad pequeña</b>Acciones, fondos, negocios de bolsillo.</span></div>
          <div class="it"><span class="sw" style="background:#C2452D"></span>
            <span><b>Oportunidad grande</b>Propiedades y negocios que pagan cada mes.</span></div>
          <div class="it"><span class="sw" style="background:#D99A1F"></span>
            <span><b>Mercado</b>Compra, vende o aguanta la economía.</span></div>
          <div class="it"><span class="sw" style="background:#7A4E6E"></span>
            <span><b>Gusto</b>El gasto que decide tu futuro.</span></div>
          <div class="it"><span class="sw" style="background:#44586B"></span>
            <span><b>Banco</b>Préstamos y donaciones.</span></div>
          <div class="note"><b style="letter-spacing:.14em">SALIR DE LA RATONERA</b><br>
            Cuando tu flujo pasivo iguala o supera tus gastos, mueves tu ficha a la Vía Rápida.
            Allí compites por comprar un Sueño: el primero que lo logra, gana.</div>
        </div>
      </div>
    </div>
  </div>
</div></body></html>"""


# ====================================================================== CARTAS
def card(kind, band, title, body, note="", extra="", cls=""):
    return f"""<div class="card {kind} {cls}">
  <div class="band">{band}</div>
  <div class="title">{title}</div>
  {extra}
  <div class="body">{body}</div>
  {f'<div class="note">{note}</div>' if note else ''}
  <div class="mark">FLUJO LIBRE · EDICIÓN IMPRIMIBLE</div>
</div>"""


def deal_body(costo, ini, flujo, big=False):
    if big:
        rows = [("Costo total", m(costo)),
                ("Deuda con el banco", m(costo - ini)),
                ("Flujo mensual", "+" + m(flujo) if flujo else "sin flujo")]
        if flujo:
            rows.append(("Recuperas el inicial", f"en {round(ini / flujo)} meses"))
    else:
        ret = round(flujo * 12 / ini * 100) if ini else 0
        rows = [("Costo total", m(costo)),
                ("Flujo mensual", "+" + m(flujo) if flujo else "sin flujo"),
                ("Retorno anual", f"{ret}%" if flujo else "—")]
    rows_html = "".join(f'<div class="row"><span>{k}</span><b>{v}</b></div>' for k, v in rows)
    return (f'<div class="hlab">Pago inicial</div>'
            f'<div class="hero">{m(ini)}</div>'
            f'<div class="hrule"></div>{rows_html}')


def build_cards():
    cards = []
    # profesiones
    for name, ini, sal, gas, cash, note in PROFESIONES:
        libre = sal - gas
        body = "".join(
            f'<div class="row"><span>{k}</span><b>{v}</b></div>'
            for k, v in [("Gastos / mes", m(gas)), ("Flujo libre / mes", m(libre)),
                         ("Efectivo inicial", m(cash))])
        cards.append(card(
            "prof", "PROFESIÓN", name,
            body, note,
            extra=(f'<div class="hlab">Salario neto / mes</div>'
                   f'<div class="hero">{m(sal)}</div>'
                   f'<div class="hrule"></div>'
                   f'<div class="tag">FICHA {ini}</div>'
                   f'<div class="watermark wm-letter">{ini}</div>')))
    # pequenas
    for name, tag, costo, ini, flujo, note in PEQUENAS:
        cards.append(card("peq", "OPORTUNIDAD PEQUEÑA", name,
                          deal_body(costo, ini, flujo), note,
                          extra=f'<div class="tag">{tag}</div>'))
    # grandes
    for name, tag, costo, ini, flujo, note in GRANDES:
        cards.append(card("grande", "OPORTUNIDAD GRANDE", name,
                          deal_body(costo, ini, flujo, big=True),
                          note, extra=f'<div class="tag">{tag}</div>'))
    # mercado
    for name, text in MERCADO:
        cards.append(card("mercado", "MERCADO", name, "", "",
                          extra=f'<div class="prose">{text}</div>'
                                f'<div class="watermark">⇄</div>'))
    # gustos
    for name, amount, note in GUSTOS:
        if amount >= 0:
            body = f'<div class="huge">{m(amount)}<small>PAGA AHORA</small></div>'
        else:
            body = f'<div class="huge" style="color:#3F7A4A">{m(-amount)}<small>COBRA AHORA</small></div>'
        cards.append(card("gusto", "GUSTO", name, body, note))
    # suenos
    for name, cost in SUENOS:
        cards.append(card("sueno", "SUEÑO", name,
                          f'<div class="huge">{m(cost)}<small>PRECIO</small></div>',
                          "Si caes en una casilla SUEÑO y tienes el dinero, lo compras y GANAS la partida."))

    sheets = []
    for i in range(0, len(cards), 9):
        sheets.append(f'<div class="sheet">{"".join(cards[i:i+9])}</div>')

    return f"""<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>FLUJO LIBRE - Cartas</title><style>{BASE}{CARDS_CSS}</style></head><body>
{''.join(sheets)}
</body></html>"""


# ====================================================================== DINERO
MONEY_CSS = r"""
@page{size:A4;margin:0}
.sheet{width:210mm;height:297mm;padding:9mm 10mm;background:#fff;page-break-after:always}
.head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4mm}
.head h1{font-family:Georgia,serif;font-size:14pt;margin:0}
.head span{font-size:7pt;letter-spacing:.18em;text-transform:uppercase;color:#8B9AA0}
.bills{display:grid;grid-template-columns:1fr 1fr;gap:3.2mm}
.bill{height:44mm;border:.5mm solid var(--ink);border-radius:1.6mm;position:relative;
  padding:3.5mm 4mm;display:flex;flex-direction:column;justify-content:space-between;
  background:#FCF7EA;overflow:hidden}
.bill .top{display:flex;justify-content:space-between;align-items:center;font-size:6pt;
  letter-spacing:.18em;text-transform:uppercase;color:var(--ink2)}
.bill .val{font-family:Georgia,serif;font-size:26pt;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.bill .val small{font-size:7pt;letter-spacing:.2em;font-family:'Segoe UI',sans-serif;font-weight:600;color:var(--ink2);margin-left:2mm}
.bill .bot{font-size:5.4pt;letter-spacing:.16em;text-transform:uppercase;color:#8B9AA0}
.bill .seal{position:absolute;right:4mm;bottom:10mm;width:13mm;height:13mm;border:.4mm solid var(--ink);
  border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;
  font-size:7pt;font-weight:700;text-align:center;line-height:1;opacity:.5;transform:rotate(-8deg)}
.bill.b1{background:#FCF7EA}
.bill.b2{background:#F6EFE0}
.bill.b3{background:#EFE9DC}
.bill.b4{background:#F7F0DC}
.bill.b5{background:#F1EEE4}
.note{margin-top:5mm;font-size:8pt;line-height:1.45;color:#43555F}
.note b{color:var(--ink)}
"""


def build_money():
    denoms = [(1000, "mil"), (5000, "cinco mil"), (10000, "diez mil"),
              (50000, "cincuenta mil"), (100000, "cien mil")]
    bills = []
    k = 0
    for v, word in denoms:
        for _rep in range(2):
            k += 1
            bills.append(f"""
      <div class="bill b{(k % 5) + 1}">
        <div class="top"><span>Flujo Libre</span><span>Moneda del juego</span></div>
        <div class="val">{m(v)}<small>FLUJOS</small></div>
        <div class="bot">{word} flujos · sin valor real</div>
        <div class="seal">FLUJO<br>LIBRE</div>
      </div>""")
    return f"""<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>FLUJO LIBRE - Dinero</title><style>{BASE}{MONEY_CSS}</style></head><body>
<div class="sheet">
  <div class="head"><h1>Dinero del juego</h1><span>Imprime 2 copias · corta por el borde</span></div>
  <div class="bills">{''.join(bills)}</div>
  <div class="note"><b>Cómo usarlo:</b> cada jugador empieza con su “Efectivo inicial” ya separado en billetes.
  Todo lo que entra o sale se paga con billetes reales del juego: si te falta, es porque te falta.
  El banco (un jugador o quien no esté jugando) maneja el cambio. Los montos son mensuales.</div>
</div></body></html>"""


# ====================================================================== FICHAS
PIECES_CSS = r"""
@page{size:A4;margin:0}
.sheet{width:210mm;height:297mm;padding:12mm;background:#fff;page-break-after:always}
h1{font-family:Georgia,serif;font-size:16pt;margin:0 0 1mm}
.sub{font-size:7pt;letter-spacing:.2em;text-transform:uppercase;color:#8B9AA0;margin-bottom:6mm}
.tokens{display:grid;grid-template-columns:repeat(3,52mm);gap:5mm;margin-bottom:6mm;justify-content:start}
.tok{width:52mm;height:52mm;border:.5mm solid var(--ink);border-radius:50%;display:flex;
  flex-direction:column;align-items:center;justify-content:center;background:#FBF6EA}
.tok .l{font-family:Georgia,serif;font-size:26pt;font-weight:700;line-height:1}
.tok .s{font-size:5.6pt;letter-spacing:.2em;color:#8B9AA0;margin-top:1mm}
.dice{display:flex;gap:8mm;align-items:flex-start}
.net{width:66mm;height:50mm;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(3,1fr);
  gap:1mm}
.net .face{border:.35mm solid var(--ink);border-radius:1mm;display:grid;
  grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:1.6mm;gap:.3mm;background:#FDFBF4}
.net .face.blank{visibility:hidden}
.pip{width:2.3mm;height:2.3mm;border-radius:50%;background:var(--ink);place-self:center}
.pip.h{background:transparent}
.qr{flex:1}
.qr h3{font-family:Georgia,serif;font-size:10pt;margin:0 0 2mm}
.qr p{font-size:8pt;line-height:1.45;color:#43555F;margin:0 0 2mm}
.checklist{margin-top:auto;border:.45mm solid var(--ink);border-radius:2mm;background:#FBF6EA;padding:4mm 5mm}
.checklist h4{font-size:6.6pt;letter-spacing:.2em;text-transform:uppercase;color:var(--grande);margin-bottom:2.5mm}
.checklist .cl{display:grid;grid-template-columns:repeat(2,1fr);gap:2mm 6mm}
.checklist .it{display:flex;gap:2mm;align-items:center;font-size:8pt;color:#22333C}
.checklist .bx{width:4mm;height:4mm;border:.35mm solid var(--ink);border-radius:.6mm;flex:0 0 auto}
"""

PIPS = {1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]}


def die_face(n, pos):
    cells = []
    for i in range(9):
        cells.append('<span class="pip"></span>' if i in PIPS[n] else '<span class="pip h"></span>')
    return f'<div class="face" style="grid-column:{pos[0]};grid-row:{pos[1]}">{"".join(cells)}</div>'


def build_pieces():
    letters = "ABCDEF"
    toks = "".join(
        f'<div class="tok"><span class="l">{L}</span><span class="s">JUGADOR</span></div>'
        for L in letters)
    net = "".join(die_face(n, p) for n, p in
                  [(1, (2, 1)), (2, (1, 2)), (3, (2, 2)), (4, (3, 2)), (5, (4, 2)), (6, (2, 3))])
    items = ["Tablero A3", "119 cartas", "6 hojas de jugador", "Reglas (4 páginas)",
             "Dinero (2 copias)", "6 fichas", "1 dado", "Ayuda de mesa"]
    checks = "".join(f'<div class="it"><span class="bx"></span>{t}</div>' for t in items)
    return f"""<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>FLUJO LIBRE - Fichas</title><style>{BASE}{PIECES_CSS}</style></head><body>
<div class="sheet" style="display:flex;flex-direction:column">
  <h1>Fichas de jugador</h1>
  <div class="sub">Recorta, pega sobre cartón y listo</div>
  <div class="tokens">{toks}</div>
  <div class="dice">
    <div>
      <h1 style="font-size:10pt;margin-bottom:2.5mm">Dado de papel</h1>
      <div class="net">{net}</div>
      <p style="font-size:7pt;color:#43555F;margin-top:3mm;max-width:70mm">Recorta el contorno, dobla
      por las aristas y pega las pestañas. Rellénalo con un poco de arroz o papel para que ruede.
      También sirve cualquier dado de casa.</p>
    </div>
    <div class="qr">
      <h3>Antes de empezar</h3>
      <p><b>1.</b> Cada jugador toma una ficha, una carta de PROFESIÓN y una hoja de estado financiero.</p>
      <p><b>2.</b> Anota tu salario, tus gastos y tu efectivo inicial. Calcula tu flujo libre.</p>
      <p><b>3.</b> Separa las cartas en cuatro mazos: Pequeña, Grande, Mercado y Gusto. Baraja cada uno.</p>
      <p><b>4.</b> Todos empiezan en la casilla SALIDA (00).</p>
      <p><b>5.</b> Sal de la ratonera cuando tu flujo pasivo cubra tus gastos.
      Gana el primero que compre un Sueño.</p>
    </div>
  </div>
  <div class="checklist">
    <h4>¿Está todo impreso?</h4>
    <div class="cl">{checks}</div>
  </div>
</div></body></html>"""


# ================================================================== HOJA JUGADOR
def build_sheet():
    active_rows = "".join(
        '<tr><td></td><td class="d"></td><td></td></tr>' for _ in range(9))
    debt_rows = "".join(
        '<tr><td></td><td class="d"></td><td></td></tr>' for _ in range(4))
    bars = "".join('<i></i>' for _ in range(20))
    log_rows = "".join('<tr><td></td><td></td><td></td></tr>' for _ in range(9))
    return f"""<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>FLUJO LIBRE - Estado financiero</title><style>{BASE}{SHEET_CSS}</style></head><body>

<div class="sheet">
  <div class="head">
    <div><div class="t">Estado financiero</div>
      <div class="s">Flujo Libre · hoja de jugador</div></div>
    <div style="text-align:right"><div class="muted">Flujo libre = ingresos − gastos</div>
      <div style="font-family:Georgia,serif;font-size:9pt;margin-top:1mm">Meta: flujo pasivo ≥ gastos</div></div>
  </div>

  <div class="fields">
    <div class="field">Jugador<span></span></div>
    <div class="field">Profesión<span></span></div>
    <div class="field">Ficha<span></span></div>
  </div>

  <div class="cols">
    <div class="col">
      <div class="panel">
        <h3>Ingresos (por mes)</h3>
        <div class="in">
          <div class="line"><span>Salario</span><b>&nbsp;</b></div>
          <div class="line"><span>Flujo de activos</span><b>&nbsp;</b></div>
          <div class="line total"><span>Total ingresos</span><b>&nbsp;</b></div>
        </div>
      </div>
      <div class="panel">
        <h3>Gastos (por mes)</h3>
        <div class="in">
          <div class="line"><span>Gastos fijos + impuestos</span><b>&nbsp;</b></div>
          <div class="line"><span>Pago de deudas</span><b>&nbsp;</b></div>
          <div class="line total"><span>Total gastos</span><b>&nbsp;</b></div>
        </div>
      </div>
      <div class="flowbox" style="margin-top:0">
        <div class="k">Flujo libre<br>por mes</div>
        <div class="v">$ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
      </div>
      <div class="flowbox" style="margin-top:0">
        <div class="k">Efectivo<br>en mano</div>
        <div class="v">$ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
      </div>
      <div class="panel grow">
        <h3>Progreso: flujo pasivo vs. gastos</h3>
        <div class="in">
          <div class="freedom">
            <div class="fk">Tu número de libertad</div>
            <div class="fv">$ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; /mes</div>
            <div class="fm">Es exactamente igual a tu total de gastos. Cuando tus rentas
            lo alcancen, dejas de necesitar el sueldo.</div>
          </div>
          <div class="bar">{bars}</div>
          <div class="barlegend"><span>0%</span><span>50%</span><span>100%</span></div>
          <div class="legendmini">Marca una casilla por cada 5% de tus gastos cubiertos con rentas.
          Al llenar las 20, sales de la ratonera.</div>
        </div>
      </div>
    </div>

    <div class="col">
      <div class="panel grow">
        <h3>Activos que me pagan</h3>
        <div class="thead"><span>Activo</span><span>Costo</span><span>Flujo / mes</span></div>
        <table class="tb fill">{active_rows}</table>
      </div>
      <div class="panel">
        <h3>Pasivos y deudas</h3>
        <div class="thead"><span>Deuda</span><span>Saldo</span><span>Pago / mes</span></div>
        <table class="tb">{debt_rows}</table>
      </div>
      <div class="panel">
        <h3>Mi sueño</h3>
        <div class="in" style="padding:2.6mm 3mm">
          <div class="muted" style="margin-bottom:1mm">Vía rápida · precio</div>
          <div class="big">&nbsp;</div>
        </div>
      </div>
    </div>
  </div>

  <div class="reminder">
    <div><h4>Al empezar tu turno</h4><p>Cobra tu flujo: salario + rentas − gastos.
      Anótalo en la bitácora del reverso.</p></div>
    <div><h4>Al comprar</h4><p>Suma el activo a la tabla, su flujo a ingresos y el pago inicial
      réstalo del efectivo.</p></div>
    <div><h4>Al vender</h4><p>Borra la fila, suma el dinero al efectivo y actualiza el total
      de ingresos.</p></div>
  </div>
</div>

<div class="sheet">
  <div class="head">
    <div><div class="t">Bitácora</div><div class="s">Registro de la partida</div></div>
    <div class="muted">Anota cada compra y cada venta</div>
  </div>
  <div class="panel" style="flex:1">
    <h3>Movimientos</h3>
    <table class="tb log">
      <tr><th style="width:16mm">Turno</th><th>Qué hice</th><th style="width:34mm">Efectivo después</th></tr>
      {log_rows}{log_rows}{log_rows}
    </table>
  </div>
  <div class="panel" style="margin-top:4mm;flex:0 0 auto">
    <h3>Notas y recordatorios</h3>
    <div class="in" style="height:42mm"></div>
  </div>
</div>
</body></html>"""


# ====================================================================== REGLAS
def build_rules():
    def page(content, num, cls=""):
        return f"""<div class="sheet {cls}">{content}
  <div class="foot"><span>Flujo Libre · Reglas</span><span>Edición imprimible</span></div>
  <div class="pgnum">{num}</div>
</div>"""

    p1 = f"""
  <div class="cover" style="height:100%;display:flex;flex-direction:column">
    <div class="top">
      <div class="eyebrow">Juego de mesa para 2 a 6 jugadores · 90–120 minutos</div>
      <div class="bigtitle">FLUJO<br><em>LIBRE</em></div>
      <div class="sub">El juego de la libertad financiera</div>
      <div class="lead">Todos empiezan con un sueldo y una lista de gastos.
      La pregunta no es cuánto ganas: es cuánto de lo que gastas lo paga tu dinero.</div>    </div>
    <div style="margin-top:8mm">
      <div class="two">
        <div class="box"><h4>La idea en una frase</h4>
          <p>Construye activos hasta que su renta mensual cubra todos tus gastos.
          Ese día dejas de necesitar el sueldo: sales de la ratonera. El que compra su sueño, gana.</p></div>
        <div class="box"><h4>Lo que vas a practicar</h4>
          <p>Leer un estado financiero, distinguir activo de pasivo, calcular el retorno
          de una inversión, usar deuda con criterio y decir que no a un gasto.</p></div>
      </div>
      <div class="cover-mid">
        <div class="cstep"><div class="n">01</div><b>Cobra tu flujo</b>
          <span class="d">Salario + rentas − gastos. Cada turno es un mes.</span></div>
        <div class="cstep"><div class="n">02</div><b>Compra activos</b>
          <span class="d">Cosas que ponen dinero en tu bolsillo, no que lo sacan.</span></div>
        <div class="cstep"><div class="n">03</div><b>Sal de la ratonera</b>
          <span class="d">Cuando tus rentas cubren tus gastos, dejas de necesitar el sueldo.</span></div>
        <div class="cstep"><div class="n">04</div><b>Compra tu sueño</b>
          <span class="d">En la vía rápida. El primero que lo logra gana la partida.</span></div>
      </div>
      <div class="cover-quote">
        «La libertad financiera no es tener mucho dinero.<br>
        Es que tu dinero cubra tu vida.»
        <span>La regla que resume el juego</span>
      </div>
    </div>
    <div class="strip">
      <div><b>1 tablero</b>ratonera + vía rápida</div>
      <div><b>119 cartas</b>4 mazos + sueños</div>
      <div><b>6 hojas</b>estado financiero</div>
      <div><b>1 dado</b>y fichas</div>
    </div>
  </div>"""

    p2 = """
  <h2>Preparación (5 minutos)</h2>
  <ol>
    <li><b>Reparte una profesión al azar.</b> No se elige: te toca. Cada carta trae salario,
        gastos, efectivo inicial y una advertencia.</li>
    <li><b>Llena tu hoja.</b> Escribe el salario, los gastos y el efectivo. Tu
        <b>flujo libre</b> es salario − gastos.</li>
    <li><b>Separa los mazos:</b> Oportunidad pequeña, Oportunidad grande, Mercado y Gusto.
        Baraja cada uno y déjalos boca abajo junto al tablero. Las cartas de Sueño van aparte,
        solo se usan en la vía rápida.</li>
    <li><b>Elige ficha y ponla en SALIDA (00).</b> El jugador más joven empieza.</li>
  </ol>

  <h2>Tu turno, paso a paso</h2>
  <table class="money">
    <tr><td><b>1. Cobra tu flujo de caja</b> al empezar: salario + renta de tus activos − gastos.
        Si el resultado es negativo, pagas la diferencia.</td><td class="r">→</td></tr>
    <tr><td><b>2. Tira el dado y avanza</b> en sentido horario. Varias fichas pueden
        ocupar la misma casilla.</td><td class="r">→</td></tr>
    <tr><td><b>3. Resuelve la casilla</b> (está explicada abajo).</td><td class="r">→</td></tr>
    <tr><td><b>4. Actualiza tu hoja</b> si compraste, vendiste o cambiaste una renta. Pasa el dado.</td><td class="r">→</td></tr>
  </table>

  <h2>Las casillas</h2>
  <h3>Cobra — el corazón del juego</h3>
  <p>Ya cobras al inicio de cada turno; caer aquí te da <b>un mes extra</b> de flujo de caja.
  Es la casilla que todo el mundo celebra y la razón por la que un activo que paga
  <b>vale más que uno que promete</b>.</p>

  <h3>Oportunidad pequeña</h3>
  <p>Robas una carta y decides: <b>la compras o la pasas</b>. Solo tú puedes comprarla.
  Si la pasas, va al fondo del mazo. Puedes comprar aunque no tengas todo el efectivo,
  usando un préstamo del banco (ver página 3).</p>

  <h3>Oportunidad grande</h3>
  <p>Igual, pero son propiedades y negocios: pago inicial alto y renta mensual alta.
  Aquí es donde se compra la renta que te saca de la ratonera.</p>

  <h3>Mercado</h3>
  <p>La carta afecta a todos o solo a ti, según lo que diga. Es la única forma de
  <b>vender</b> un activo por más de lo que costó. Si no tienes nada que vender, no pasa nada:
  la economía también es una lección.</p>

  <h3>Gusto</h3>
  <p>Un gasto que no estaba en el presupuesto. Paga el monto de la carta con tu efectivo.
  Algunas cartas suben tus gastos fijos para siempre: anótalo en la hoja. Otras te devuelven dinero.</p>

  <h3>Banco / Caridad</h3>
  <p>Elige una de las dos opciones de la página 3. No es obligatorio hacer nada.</p>

  <h3>Salida</h3>
  <p>Es la casilla de partida y también una casilla de cobro: un mes extra de flujo.</p>
"""

    p3 = """
  <h2>El banco: deuda con criterio</h2>
  <p>Puedes pedir prestado en cualquier momento de tu turno, no solo en la casilla del banco.</p>
  <ul>
    <li>Máximo: <b>10 veces tu salario mensual</b>.</li>
    <li>Cada <b>10.000</b> prestados suman <b>1.000</b> a tus gastos mensuales (10% de interés).</li>
    <li>Anota la deuda en “Pasivos” y el pago en “Gastos”.</li>
    <li>Puedes pagar el saldo cuando quieras y borrar el pago mensual.</li>
  </ul>
  <div class="note"><b>La trampa clásica:</b> un préstamo para comprar un gusto es una deuda.
  Un préstamo para comprar un activo que paga más que el interés es apalancamiento.
  La misma herramienta, dos destinos.</div>

  <h2>Caridad</h2>
  <p>Donas el 10% de tu salario. Durante los próximos <b>3 turnos</b> puedes tirar
  <b>dos dados</b> y elegir con cuál avanzar. Es la única forma de moverte más rápido.
  El dinero donado no vuelve, pero la reputación y la suerte sí.</p>

  <h2>Salir de la ratonera</h2>
  <p>En cuanto tu <b>flujo pasivo</b> (la renta de tus activos) sea igual o mayor que tus
  <b>gastos totales</b>, ya no necesitas el sueldo. Anúncialo y mueve tu ficha a la
  <b>Vía Rápida</b>: acabas de comprar tu libertad.</p>
  <p>Salir no es ganar todavía. Es tener el boleto para la última carrera.</p>

  <h2>La vía rápida</h2>
  <p>Es la recta final. Ahora el dinero no se cuenta en sueldos sino en <b>flujo</b>.</p>
  <ul>
    <li><b>Cobra:</b> recibes tu flujo libre <b>multiplicado por 10</b> (mínimo 15.000).</li>
    <li><b>Oportunidad:</b> robas una carta de Oportunidad grande y pagas el inicial en efectivo.
        Su renta se suma a tu flujo.</li>
    <li><b>Mercado:</b> igual que en la ratonera.</li>
    <li><b>Auditoría:</b> pagas el 10% de tu efectivo (redondeado a la centena).</li>
    <li><b>Sueño:</b> robas una carta de Sueño. Si tienes el precio, lo compras
        <b>y ganas la partida</b>. Si no, la carta vuelve al mazo y sigues ahorrando.</li>
  </ul>

  <h2>Cuando el dinero no alcanza</h2>
  <ol>
    <li>Paga con tu efectivo.</li>
    <li>Si no alcanza, vende activos al <b>50% de su costo</b> (venta de emergencia).</li>
    <li>Si aún no alcanza, pide un préstamo (si el banco te lo da).</li>
    <li>Si nada funciona, quedas <b>en bancarrota</b> y sales del juego. Sí: pasa.</li>
  </ol>

  <h2>Cómo se gana</h2>
  <div class="box" style="margin-top:2mm">
    <h4>Regla principal</h4>
    <p style="font-size:9.4pt">Gana quien <b>compra un Sueño en la vía rápida</b>. Para llegar ahí
    hay que salir primero de la ratonera: el dinero que no genera renta no compra libertad.
    Si quieres una partida corta, termina en el momento en que alguien salga de la ratonera.</p>
  </div>
"""

    p4 = """
  <h2>Cuentas que te van a servir</h2>
  <table class="money">
    <tr><td><b>Flujo libre</b></td><td class="r">salario + rentas − gastos</td></tr>
    <tr><td><b>Retorno anual sobre tu dinero</b></td><td class="r">flujo × 12 ÷ pago inicial</td></tr>
    <tr><td><b>Regla del 1%</b></td><td class="r">renta mensual ÷ precio ≥ 1%</td></tr>
    <tr><td><b>Años para recuperar</b></td><td class="r">pago inicial ÷ flujo ÷ 12</td></tr>
  </table>
  <p style="margin-top:3mm"><b>Ejemplo:</b> apartamento de 150.000 con 30.000 de inicial y 6.400 de renta
  neta al mes. Recuperas el inicial en <b>5 meses</b> (30.000 ÷ 6.400) y el resto es flujo para ti.
  En la vida real ese plazo es mucho mayor: aquí está comprimido para que puedas jugar veinte años
  en una tarde. Lo que importa es la mecánica, no el número: <b>pago inicial contra flujo mensual</b>.
  Y si el inquilino se va dos meses, ese año ganas 12.800 menos.</p>

  <h2>Ocho reglas de oro</h2>
  <div class="two">
    <div>
      <p><b>1. Un activo pone dinero en tu bolsillo.</b> Un pasivo lo saca. Tu casa grande
      y tu auto no son activos si cada mes te cuestan.</p>
      <p><b>2. El flujo manda.</b> Una propiedad que sube de precio pero no renta
      no te da libertad: te da una esperanza.</p>
      <p><b>3. Compara siempre contra tu pago inicial.</b> El precio total importa menos
      que lo que pones de tu bolsillo.</p>
      <p><b>4. La deuda no es buena ni mala.</b> Es una herramienta. Depende de qué compras con ella.</p>
    </div>
    <div>
      <p><b>5. Nunca inviertas sin fondo de emergencia.</b> En el juego es un Gusto malo;
      en la vida es una crisis.</p>
      <p><b>6. Vender también es ganar.</b> El Mercado existe para rotar capital.</p>
      <p><b>7. Tu sueldo no es riqueza.</b> Es la materia prima. Lo que hagas con él, sí.</p>
      <p><b>8. La libertad tiene número.</b> Calcula tus gastos y sabrás exactamente cuánto necesitas.</p>
    </div>
  </div>

  <h2>Variantes</h2>
  <p><b>Partida corta (45 min):</b> empieza con el doble de efectivo y cobra en cada casilla “Cobra”
  sin descontar gastos.<br>
  <b>Modo difícil:</b> nadie puede pedir préstamos. Todo se compra con efectivo.<br>
  <b>Modo familia:</b> sin quiebras; el que no puede pagar pierde un turno.<br>
  <b>Modo cooperativo:</b> todos ganan si el 80% del grupo sale de la ratonera antes de 20 rondas.</p>

  <h2>Glosario express</h2>
  <p><b>Activo:</b> algo que produce ingreso. <b>Pasivo:</b> algo que produce gasto.
  <b>Flujo de caja:</b> lo que entra menos lo que sale en un mes.
  <b>Apalancamiento:</b> usar dinero prestado para comprar un activo.
  <b>Pago inicial:</b> la parte que pones de tu bolsillo.
  <b>Retorno:</b> lo que ganas al año comparado con lo que invertiste.</p>

  <div class="note" style="margin-top:6mm">
    <b>Una nota honesta:</b> este juego enseña mecánicas financieras reales, pero no es
    asesoría de inversión. Los números son simplificados para que puedas jugar en una tarde
    y las decisiones siguen siendo tuyas.
  </div>
"""

    return f"""<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>FLUJO LIBRE - Reglas</title><style>{BASE}{DOC_CSS}</style></head><body>
{page(p1, "01", "cover")}
{page(p2, "02")}
{page(p3, "03")}
{page(p4, "04")}
</body></html>"""


# =============================================================== AYUDA DE MESA
def build_help():
    card = """
  <div class="hcard">
    <div class="hhead">
      <div><div class="ht">Tu turno</div>
        <div class="hs">Ayuda de mesa · Flujo Libre</div></div>
      <div class="hn">2–6 jugadores</div>
    </div>
    <div class="hsteps">
      <div><b>1</b><span>Cobra tu flujo<br><i>salario + rentas − gastos</i></span></div>
      <div><b>2</b><span>Tira el dado<br><i>y avanza</i></span></div>
      <div><b>3</b><span>Resuelve<br><i>la casilla</i></span></div>
      <div><b>4</b><span>Actualiza tu hoja<br><i>y pasa el dado</i></span></div>
    </div>
    <table class="money" style="font-size:8.2pt">
      <tr><td><b>Cobra</b></td><td>Un mes extra de tu flujo de caja.</td></tr>
      <tr><td><b>Pequeña</b></td><td>Compra o pasa. Bolsa, fondos, negocios chicos.</td></tr>
      <tr><td><b>Grande</b></td><td>Propiedades y negocios. Aquí se compra la renta.</td></tr>
      <tr><td><b>Mercado</b></td><td>Vende o ajusta rentas. Aquí se realiza la ganancia.</td></tr>
      <tr><td><b>Gusto</b></td><td>Paga el monto. Si dice “fijo”, súmalo a gastos.</td></tr>
      <tr><td><b>Banco</b></td><td>10.000 prestados = +1.000/mes. O dona 10%: 2 dados por 3 turnos.</td></tr>
    </table>
    <div class="htips">
      <div><b>El activo te paga, el pasivo te cobra.</b> Un auto que cuesta cada mes no es un activo,
      aunque sea tuyo.</div>
      <div><b>La deuda se paga sola.</b> Cada 10.000 prestados suman 1.000 de gastos al mes:
      cómpralo solo si el activo renta más que eso.</div>
      <div><b>Vender también es ganar.</b> El Mercado existe para convertir plusvalía en efectivo
      y volver a invertir.</div>
    </div>
    <div class="hnote">
      <b>Para salir de la ratonera</b> flujo pasivo ≥ gastos totales.
      <b>Para ganar</b> compra un Sueño en la vía rápida.
    </div>
    <div class="hfoot"><span>Corta por la línea</span><span>Flujo Libre · edición imprimible</span></div>
  </div>"""
    return f"""<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>FLUJO LIBRE - Ayuda de mesa</title><style>{BASE}{DOC_CSS}
@page{{size:A4;margin:0}}
body{{margin:0}}
.hcard{{width:210mm;height:147mm;padding:10mm 13mm;display:flex;flex-direction:column;
  background:#fff;position:relative}}
.hcut{{height:0;border-top:.4mm dashed #B9C4C9;margin:0 10mm}}
.hhead{{display:flex;justify-content:space-between;align-items:flex-end;
  border-bottom:.8mm solid var(--ink);padding-bottom:2mm}}
.ht{{font-family:Georgia,serif;font-size:16pt;font-weight:700;line-height:1}}
.hs{{font-size:6.2pt;letter-spacing:.22em;text-transform:uppercase;color:#8B9AA0;margin-top:1.4mm}}
.hn{{font-size:6.6pt;letter-spacing:.18em;text-transform:uppercase;color:#8B9AA0}}
.hsteps{{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin:4mm 0 3.5mm}}
.hsteps>div{{border-top:1mm solid var(--grande);padding-top:1.8mm;display:flex;gap:2mm;align-items:flex-start}}
.hsteps b{{font-family:Georgia,serif;font-size:13pt;color:var(--grande);line-height:1}}
.hsteps span{{font-size:7.8pt;line-height:1.25}}
.hsteps i{{font-style:normal;color:#6B7C84;font-size:6.8pt}}
.htips{{display:grid;grid-template-columns:1fr;gap:2.2mm;margin-top:5mm;font-size:8.2pt;
  line-height:1.38;color:#22333C}}
.htips b{{font-family:Georgia,serif}}
.htips>div{{padding-left:3.5mm;border-left:.5mm solid #D8CFBC}}
.hnote{{margin-top:auto;background:#F4EBD9;border-left:1.4mm solid var(--grande);
  padding:2.6mm 3.5mm;font-size:8pt;line-height:1.4}}
.hfoot{{display:flex;justify-content:space-between;font-size:5.8pt;letter-spacing:.16em;
  text-transform:uppercase;color:#8B9AA0;margin-top:3mm}}
</style></head><body>{card}<div class="hcut"></div>{card}</body></html>"""


# ====================================================================== SALIDA
def main():
    os.makedirs(OUT, exist_ok=True)
    files = {
        "tablero": build_board(),
        "cartas": build_cards(),
        "reglas": build_rules(),
        "hoja-jugador": build_sheet(),
        "dinero": build_money(),
        "fichas": build_pieces(),
        "ayuda": build_help(),
    }
    for name, html in files.items():
        path = os.path.join(SRC, name + ".html")
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        print("html:", path)


if __name__ == "__main__":
    main()
