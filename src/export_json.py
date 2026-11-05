# -*- coding: utf-8 -*-
"""Exporta los datos del juego a JSON para la version web."""
import json
import os
from game_data import *

AQUI = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(os.path.dirname(AQUI), "web")

MARKET_EFFECTS = [
    {"type": "sell", "mult": 2, "target": "property", "label": "vende una propiedad al doble"},
    {"type": "rent", "pct": 25, "target": "property"},
    {"type": "sell", "mult": 1.5, "target": "stock"},
    {"type": "sell", "mult": 0.7, "target": "stock", "optional": True, "label": "vende al 70% o mantén"},
    {"type": "sell", "mult": 1.5, "target": "business"},
    {"type": "cash_flow_months", "months": 3},
    {"type": "skip", "amount": -5000},
    {"type": "sell", "mult": 1.8, "target": "land"},
    {"type": "sell", "mult": 1.3, "target": "stock"},
    {"type": "inflation", "pct": 10},
    {"type": "rent", "pct": 20, "target": "property"},
    {"type": "cash", "amount": 8000},
    {"type": "draw_big"},
    {"type": "sell", "mult": 2, "target": "any"},
    {"type": "freeze"},
    {"type": "rent_lost", "turns": 2},
    {"type": "none"},
    {"type": "cash", "amount": 10000},
    {"type": "none"},
    {"type": "all_pay", "amount": 3000},
]


def main():
    os.makedirs(WEB, exist_ok=True)
    gustos = []
    for i, (name, amount, note) in enumerate(GUSTOS):
        fixed = 0
        if "cuotas" in name:
            fixed = 1500
        if "Auto nuevo" in name:
            fixed = 2500
        gustos.append({"name": name, "amount": amount, "note": note, "fixed": fixed})

    data = {
        "professions": [
            {"name": n, "salary": s, "expenses": g, "cash": c, "note": note}
            for n, _i, s, g, c, note in PROFESIONES
        ],
        "small": [
            {"name": n, "tag": t, "cost": co, "down": d, "flow": f, "note": note}
            for n, t, co, d, f, note in PEQUENAS
        ],
        "big": [
            {"name": n, "tag": t, "cost": co, "down": d, "flow": f, "note": note}
            for n, t, co, d, f, note in GRANDES
        ],
        "market": [
            {"name": n, "text": t, "effect": MARKET_EFFECTS[i]}
            for i, (n, t) in enumerate(MERCADO)
        ],
        "gusto": gustos,
        "dreams": [{"name": n, "cost": c} for n, c in SUENOS],
        "board": [{"name": n, "kind": k, "sub": s} for n, k, s in TABLERO],
        "via": [{"name": n, "kind": k, "sub": s} for n, k, s in VIA],
        "ratoneraPos": RATONERA_POS,
        "viaPos": VIA_POS,
    }

    path = os.path.join(WEB, "data.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print("ok:", path, len(data["small"]) + len(data["big"]) + len(data["market"]) +
          len(data["gusto"]) + len(data["dreams"]) + len(data["professions"]), "cartas")


if __name__ == "__main__":
    main()
