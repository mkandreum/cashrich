# -*- coding: utf-8 -*-
"""Previsualiza una pagina suelta de un HTML de impresion."""
import os
import re
import subprocess
import sys

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
AQUI = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(AQUI), "out")


def pages(html):
    parts = html.split('<div class="sheet')
    head = parts[0]
    body = ['<div class="sheet' + p for p in parts[1:]]
    return head, body


def preview(name, indexes, size="794,1123"):
    src = os.path.join(AQUI, name + ".html")
    with open(src, encoding="utf-8") as f:
        html = f.read()
    head, sheets = pages(html)
    for idx in indexes:
        chunk = head + sheets[idx - 1]
        if "</body>" not in chunk:
            chunk += "</body></html>"
        tmp = os.path.join(AQUI, "_prev.html")
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(chunk)
        png = os.path.join(OUT, f"_{name}_p{idx}.png")
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        f"--screenshot={png}", f"--window-size={size}",
                        "file:///" + tmp.replace("\\", "/")],
                       capture_output=True)
        print("png:", png)


if __name__ == "__main__":
    name = sys.argv[1]
    idxs = [int(x) for x in sys.argv[2].split(",")]
    size = sys.argv[3] if len(sys.argv) > 3 else "794,1123"
    preview(name, idxs, size)
