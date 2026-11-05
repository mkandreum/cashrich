# -*- coding: utf-8 -*-
"""Dibuja los edificios de web/shared/models3d.json en isometrica, como SVG vectorial."""
import json
import math
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
MODELS = json.load(open(os.path.join(AQUI, "..", "web", "shared", "models3d.json"), encoding="utf-8"))

INK = "#1D1A33"
YAW = math.radians(35)
PITCH = math.radians(32)
LIGHT = (-0.45, 0.8, 0.4)
WINDOW_LIT = "#FFE9A8"
WINDOW_DARK = "#1B2A4A"


def _norm(v):
    n = math.sqrt(sum(c * c for c in v)) or 1.0
    return tuple(c / n for c in v)


def _box():
    h = 0.5
    def f(*pts):
        return [tuple(p) for p in pts]
    return [
        f((-h, -h, h), (h, -h, h), (h, h, h), (-h, h, h)),
        f((h, -h, -h), (-h, -h, -h), (-h, h, -h), (h, h, -h)),
        f((h, -h, h), (h, -h, -h), (h, h, -h), (h, h, h)),
        f((-h, -h, -h), (-h, -h, h), (-h, h, h), (-h, h, -h)),
        f((-h, h, h), (h, h, h), (h, h, -h), (-h, h, -h)),
        f((-h, -h, -h), (h, -h, -h), (h, -h, h), (-h, -h, h)),
    ]


def _lathe(top, bottom, segments=20):
    faces = []
    ring = [(math.cos(i * 2 * math.pi / segments), math.sin(i * 2 * math.pi / segments)) for i in range(segments)]
    for i in range(segments):
        (ca, sa), (cb, sb) = ring[i], ring[(i + 1) % segments]
        if top > 0:
            faces.append([(ca * bottom, -0.5, sa * bottom), (ca * top, 0.5, sa * top), (cb * top, 0.5, sb * top), (cb * bottom, -0.5, sb * bottom)])
        else:
            faces.append([(ca * bottom, -0.5, sa * bottom), (0, 0.5, 0), (cb * bottom, -0.5, sb * bottom)])
    if top > 0:
        faces.append([(c * top, 0.5, s * top) for c, s in reversed(ring)])
    faces.append([(c * bottom, -0.5, s * bottom) for c, s in ring])
    return faces


def _sphere(rings=8, segs=14):
    def p(r, s):
        th, ph = r * math.pi / rings, s * 2 * math.pi / segs
        return (0.5 * math.sin(th) * math.cos(ph), 0.5 * math.cos(th), 0.5 * math.sin(th) * math.sin(ph))
    faces = []
    for r in range(rings):
        for s in range(segs):
            faces.append([p(r, s), p(r + 1, s), p(r + 1, s + 1), p(r, s + 1)])
    return faces


def _gem():
    ring = [(0.5, 0, 0), (0, 0, 0.5), (-0.5, 0, 0), (0, 0, -0.5)]
    faces = []
    for i in range(4):
        a, b = ring[i], ring[(i + 1) % 4]
        faces.append([(0, 0.5, 0), b, a])
        faces.append([(0, -0.5, 0), a, b])
    return faces


def _roof():
    h = 0.5
    return [
        [(-h, -h, h), (h, -h, h), (0, h, h)],
        [(h, -h, -h), (-h, -h, -h), (0, h, -h)],
        [(h, -h, h), (h, -h, -h), (0, h, -h), (0, h, h)],
        [(-h, -h, -h), (-h, -h, h), (0, h, h), (0, h, -h)],
        [(-h, -h, h), (-h, -h, -h), (h, -h, -h), (h, -h, h)],
    ]


SHAPES = {"box": _box(), "win": _box(), "cyl": _lathe(0.5, 0.5), "cone": _lathe(0, 0.5), "sphere": _sphere(), "gem": _gem(), "roof": _roof()}


def _rotate(p, r):
    x, y, z = p
    if r:
        # mismo orden que la web: Rx * Ry * Rz aplicado al punto
        c, s = math.cos(math.radians(r[2])), math.sin(math.radians(r[2]))
        x, y = x * c - y * s, x * s + y * c
        c, s = math.cos(math.radians(r[1])), math.sin(math.radians(r[1]))
        x, z = x * c + z * s, -x * s + z * c
        c, s = math.cos(math.radians(r[0])), math.sin(math.radians(r[0]))
        y, z = y * c - z * s, y * s + z * c
    return (x, y, z)


def _view(p):
    """Del mundo a la camara: x derecha, y arriba, z hacia el observador."""
    x, y, z = p
    x, z = x * math.cos(YAW) - z * math.sin(YAW), x * math.sin(YAW) + z * math.cos(YAW)
    y, z = y * math.cos(PITCH) - z * math.sin(PITCH), y * math.sin(PITCH) + z * math.cos(PITCH)
    return (x, y, z)


def _hex_shade(color, k):
    r, g, b = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
    return "#%02X%02X%02X" % tuple(max(0, min(255, int(c * k))) for c in (r, g, b))


def _normal(face):
    a, b, c = face[0], face[1], face[2]
    u = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
    v = (c[0] - a[0], c[1] - a[1], c[2] - a[2])
    return _norm((u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]))


def _lerp(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def _windows(face):
    """Rejilla de ventanas sobre una cara lateral de cuatro esquinas."""
    a, b, c, d = face
    out = []
    width = math.dist(a, b)
    height = math.dist(a, d)
    cols = max(2, min(5, int(width / 0.09)))
    rows = max(2, min(12, int(height / 0.1)))
    for row in range(rows):
        for col in range(cols):
            u0, u1 = (col + 0.2) / cols, (col + 0.8) / cols
            v0, v1 = (row + 0.25) / rows, (row + 0.75) / rows
            def at(u, v):
                return _lerp(_lerp(a, b, u), _lerp(d, c, u), v)
            lit = (row * 7 + col * 13 + rows) % 10 > 2
            out.append(([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)], WINDOW_LIT if lit else WINDOW_DARK))
    return out


def _polys(name):
    """Caras visibles en orden de pintado: [(puntos 2D, color)], sin coordenadas de pagina."""
    parts = []
    for part in MODELS[name]:
        faces = []
        for face in SHAPES[part["s"]]:
            world = []
            for p in face:
                q = (p[0] * part["z"][0], p[1] * part["z"][1], p[2] * part["z"][2])
                q = _rotate(q, part.get("r"))
                world.append((q[0] + part["p"][0], q[1] + part["p"][1], q[2] + part["p"][2]))
            n = _normal(world)
            if n[0] == 0 and n[1] == 0 and n[2] == 0:
                continue
            view_pts = [_view(p) for p in world]
            if _view(n)[2] <= 0.001:
                continue
            light = max(0.0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / math.sqrt(sum(c * c for c in LIGHT))
            color = _hex_shade(part["c"], 0.68 + 0.4 * light)
            faces.append(([(v[0], -v[1]) for v in view_pts], color))
            if part["s"] == "win" and abs(n[1]) < 0.5:
                for quad, win in _windows(world):
                    faces.append(([(_view(p)[0], -_view(p)[1]) for p in quad], win))
        cx = _view(tuple(part["p"]))
        # El orden entre piezas: primero lo que queda mas lejos o mas bajo
        parts.append((cx[2] - part["p"][1] * 0.05, faces))
    parts.sort(key=lambda item: item[0])
    return [face for _, faces in parts for face in faces]


_cache = {}


def _symbol(name):
    if name in _cache:
        return _cache[name]
    polys = _polys(name)
    xs = [p[0] for poly, _ in polys for p in poly]
    ys = [p[1] for poly, _ in polys for p in poly]
    pad = 0.05
    box = (min(xs) - pad, min(ys) - pad, max(xs) - min(xs) + pad * 2, max(ys) - min(ys) + pad * 2)
    def d(poly):
        return "M" + "L".join("%.3f %.3f" % p for p in poly) + "Z"
    # Primero toda la silueta en tinta y engordada: da el contorno de pegatina.
    outline = '<path d="%s" fill="%s" stroke="%s" stroke-width=".05" stroke-linejoin="round"/>' % ("".join(d(p) for p, _ in polys), INK, INK)
    body = "".join('<path d="%s" fill="%s" stroke="%s" stroke-width=".004" stroke-linejoin="round"/>' % (d(p), c, c) for p, c in polys)
    _cache[name] = (box, outline + body)
    return _cache[name]


def symbols(names):
    """Bloque <defs> con cada edificio: se define una vez y se reutiliza."""
    out = []
    for name in names:
        box, body = _symbol(name)
        out.append('<symbol id="m-%s" viewBox="%.3f %.3f %.3f %.3f" preserveAspectRatio="xMidYMax meet">%s</symbol>' % (name, box[0], box[1], box[2], box[3], body))
    return '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0">%s</svg>' % "".join(out)


def use(name, cls="art"):
    return '<svg class="%s" xmlns="http://www.w3.org/2000/svg"><use href="#m-%s"/></svg>' % (cls, name)


ALL = [k for k in MODELS if k != "_"]
