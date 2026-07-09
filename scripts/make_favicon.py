# -*- coding: utf-8 -*-
"""
Genera el favicon de Taller de Sintaxis a partir de vectores propios (no
escala una imagen existente). Un solo isotipo (plumilla) sobre fondo solido
de marca, renderizado en alta resolucion y reducido con LANCZOS a cada
tamano final -- criterio "pixel-perfect" en vez de un unico PNG escalado.

Uso: python scripts/make_favicon.py   (desde la raiz del repo)

Dos variantes del isotipo, no una sola escalada:
  - "simple"  (16px y favicon.svg): silueta pura, sin ranura ni orificio --
    a ese tamano el detalle interno se convierte en ruido y arruina la
    silueta (verificado: con detalle, a 16px se leia como una mancha).
  - "detalle" (32px en adelante): anade la ranura central + el orificio,
    perfectamente legibles a partir de ahi.

Colores: los YA declarados como marca oficial en manifest.json / meta
theme-color de index.html -- no son una eleccion nueva de este script.
  theme_color      #102A43  (navy "petroleo" -- fondo solido)
  background_color #F5F1E8  (pergamino/crema -- color del isotipo)

Para regenerar tras cambiar algun color o proporcion, edita este archivo y
vuelve a ejecutarlo -- no edites los PNG/ICO a mano.
"""
from PIL import Image, ImageDraw

NAVY = (16, 42, 67, 255)      # #102A43
CREAM = (245, 241, 232, 255)  # #F5F1E8
SS = 8  # factor de supersampling

def bezier(p0, p1, p2, p3, steps=40):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        mt = 1 - t
        x = (mt**3)*p0[0] + 3*(mt**2)*t*p1[0] + 3*mt*(t**2)*p2[0] + (t**3)*p3[0]
        y = (mt**3)*p0[1] + 3*(mt**2)*t*p1[1] + 3*mt*(t**2)*p2[1] + (t**3)*p3[1]
        pts.append((x, y))
    return pts

def nib_path(cx, cy, scale):
    """Plumilla: cuerpo redondeado arriba que se afila en una punta larga y
    marcada hacia abajo (mas daga/kite que gota) -- silueta que no se
    confunde con una ficha/pick generica y llena bien el marco. Mismas
    coordenadas (viewBox 0 0 128 128, scale=1) que assets/favicon.svg --
    si tocas esto, actualiza tambien el <path> del SVG a mano."""
    def P(x, y):
        return (cx + x * scale, cy + y * scale)

    top      = P(0, -46)
    r_ctrl1  = P(36, -46)
    r_ctrl2  = P(42, -20)
    r_mid    = P(34, 2)
    r_ctrl3  = P(24, 22)
    tip      = P(0, 54)
    l_ctrl3  = P(-24, 22)
    l_mid    = P(-34, 2)
    l_ctrl2  = P(-42, -20)
    l_ctrl1  = P(-36, -46)

    pts = []
    pts += bezier(top, r_ctrl1, r_ctrl2, r_mid, 28)
    pts += bezier(r_mid, r_ctrl3, r_ctrl3, tip, 24)
    pts += bezier(tip, l_ctrl3, l_ctrl3, l_mid, 24)
    pts += bezier(l_mid, l_ctrl2, l_ctrl1, top, 28)
    return pts

def draw_master(size, detail=True):
    hi = size * SS
    img = Image.new('RGBA', (hi, hi), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    radius = hi * 0.225
    d.rounded_rectangle([0, 0, hi - 1, hi - 1], radius=radius, fill=NAVY)

    cx, cy = hi / 2, hi * 0.5
    scale = hi / 128.0

    pts = nib_path(cx, cy, scale)
    d.polygon(pts, fill=CREAM)

    if detail:
        slit_w = 2.8 * scale
        d.line([(cx, cy - 9 * scale), (cx, cy + 48 * scale)], fill=NAVY, width=max(1, int(slit_w)))
        hole_r = 5.2 * scale
        hy = cy - 14 * scale
        d.ellipse([cx - hole_r, hy - hole_r, cx + hole_r, hy + hole_r], fill=NAVY)

    return img.resize((size, size), Image.LANCZOS)

def save(img, path):
    img.save(path)
    print('OK', path, img.size)

if __name__ == '__main__':
    import os
    out = 'assets'
    os.makedirs(out, exist_ok=True)

    png16  = draw_master(16,  detail=False)  # silueta pura, sin ruido
    png32  = draw_master(32,  detail=True)
    png180 = draw_master(180, detail=True)
    png512 = draw_master(512, detail=True)

    save(png16,  f'{out}/favicon-16.png')
    save(png32,  f'{out}/favicon-32.png')
    save(png180, f'{out}/favicon-180.png')
    save(png512, f'{out}/favicon-512.png')

    # .ico multi-resolucion: cada tamano con su propio render (no un unico
    # escalado), mismo criterio "pixel-perfect" que el resto.
    ico_frames = [draw_master(16, detail=False), draw_master(32, detail=True), draw_master(48, detail=True)]
    ico_frames[0].save(f'{out}/favicon.ico', format='ICO',
                        sizes=[(16, 16), (32, 32), (48, 48)],
                        append_images=ico_frames[1:])
    print('OK', f'{out}/favicon.ico')
