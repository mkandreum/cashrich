# -*- coding: utf-8 -*-
"""Convierte los HTML de impresion a PDF con Chrome headless."""
import os
import re
import subprocess

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
AQUI = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(AQUI), "out")

TARGETS = [
    ("reglas", "CashRich-01-Reglas"),
    ("tablero", "CashRich-02-Tablero-A3"),
    ("cartas", "CashRich-03-Cartas"),
    ("hoja-jugador", "CashRich-04-Hoja-Estado-Financiero"),
    ("dinero", "CashRich-05-Dinero"),
    ("fichas", "CashRich-06-Fichas-y-Dado"),
    ("ayuda", "CashRich-07-Ayuda-de-mesa"),
]


def info(pdf):
    data = open(pdf, "rb").read()
    pages = len(re.findall(rb"/Type\s*/Page[^s]", data))
    box = re.findall(rb"/MediaBox\s*\[([^\]]*)\]", data)
    return pages, (box[0].decode() if box else "?")


def main():
    os.makedirs(OUT, exist_ok=True)
    for src, name in TARGETS:
        html = os.path.join(AQUI, src + ".html")
        pdf = os.path.join(OUT, name + ".pdf")
        subprocess.run([CHROME, "--headless=new", "--disable-gpu",
                        "--no-pdf-header-footer",
                        f"--print-to-pdf={pdf}",
                        "file:///" + html.replace("\\", "/")],
                       capture_output=True)
        if os.path.exists(pdf):
            pages, box = info(pdf)
            print(f"{name}.pdf -> {pages} pag.  {box}")
        else:
            print("FALLO:", name)


if __name__ == "__main__":
    main()
