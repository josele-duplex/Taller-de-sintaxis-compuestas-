# -*- coding: utf-8 -*-
"""
Genera el favicon, los iconos de app y el logo de portada de Taller de
Sintaxis a partir del arte fuente en assets/Nuevas_imagenes/, recortado y
reducido con LANCZOS a cada tamano final.

Uso: python scripts/make_favicon.py   (desde la raiz del repo)

Dos fuentes DISTINTAS a proposito, no una sola reutilizada en todos lados
(decision de Josele, 2026-07-22):
  - favicon / apple-touch-icon / android (manifest.json: logo.png y
    logo_2.png) -> monograma T/S + hoja/helice + nodos, recortado del
    glifo dentro de la lamina de muestras (Nuevos favicon e iconos.png).
  - logo de portada (pantalla de inicio de la app, index.html) -> pluma +
    doble helice SIN letras (Logo portada pluma y doble helice.png): a
    Josele le gusta mas limpio para esa pantalla, sin competir con los
    botones de debajo. Archivo propio (logo-portada.png), NO se reutiliza
    para favicon/manifest ni viceversa.

Sustituye al enfoque anterior (isotipo dibujado por vectores propios en
PIL): el nuevo diseno viene ya como artwork terminado, no como forma
parametrica, asi que aqui solo se recorta/escala -- no se inventan formas
nuevas. Si cambia algun artwork fuente, sustituye el PNG correspondiente en
assets/Nuevas_imagenes/ y vuelve a ejecutar este script; no edites los
PNG/ICO/SVG de salida a mano.

Un unico recorte cuadrado centrado por fuente (mismo encuadre para todos
los tamanos de esa fuente) en vez de recortes distintos por tamano. OJO
resolucion en el monograma T/S: su archivo fuente es una lamina de
presentacion de 1254x1254 con varias muestras de tamano dibujadas dentro
del mismo lienzo -- el glifo real del "favicon principal" mide ~440x440px
efectivos (no 512 ni 1024 como sugieren sus etiquetas), asi que
favicon-512/logo_2/logo.png llevan un escalado hacia arriba (~1.2x-2.8x)
desde esa resolucion. Aceptado por Josele: al ser un diseno plano de
formas solidas, no textura fina, el upscale con LANCZOS no se nota mal
salvo mirando muy de cerca.
"""
from PIL import Image
import base64
import io
import os

SRC = 'assets/Nuevas_imagenes/Nuevos favicon e iconos.png'
OUT = 'assets'

# Centro y semilado del recorte cuadrado sobre el lienzo fuente (1254x1254):
# glifo del "favicon principal" sin el borde/sombra de la tarjeta redondeada.
CX, CY, HALF = 271, 320, 220

# Logo de portada (pluma + doble helice, sin letras) -- fuente y recorte
# independientes del favicon/iconos de arriba.
PORTADA_SRC = 'assets/Nuevas_imagenes/Logo portada pluma y doble hélice.png'
PORTADA_CX, PORTADA_CY, PORTADA_HALF = 627, 627, 545
PORTADA_OUT = f'{OUT}/logo-portada.png'
PORTADA_SIZE = 512


def load_master():
    src = Image.open(SRC).convert('RGB')
    return src.crop((CX - HALF, CY - HALF, CX + HALF, CY + HALF))


def load_portada_master():
    src = Image.open(PORTADA_SRC).convert('RGB')
    return src.crop((PORTADA_CX - PORTADA_HALF, PORTADA_CY - PORTADA_HALF,
                      PORTADA_CX + PORTADA_HALF, PORTADA_CY + PORTADA_HALF))


def save_png(master, size, path):
    master.resize((size, size), Image.LANCZOS).save(path, optimize=True)
    print('OK', path, size)


def save_svg(master, path, size=256):
    """SVG valido que envuelve el PNG (raster) via <image> base64 -- no hay
    fuente vectorial del nuevo diseno, pero mantiene el favicon.svg
    funcionando para navegadores que lo priorizan."""
    render = master.resize((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    render.save(buf, format='PNG')
    b64 = base64.b64encode(buf.getvalue()).decode('ascii')
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" '
        f'role="img" aria-label="Taller de Sintaxis">\n'
        f'  <title>Taller de Sintaxis</title>\n'
        f'  <image href="data:image/png;base64,{b64}" x="0" y="0" '
        f'width="{size}" height="{size}"/>\n'
        f'</svg>\n'
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(svg)
    print('OK', path)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    master = load_master()

    save_png(master, 16,   f'{OUT}/favicon-16.png')
    save_png(master, 32,   f'{OUT}/favicon-32.png')
    save_png(master, 180,  f'{OUT}/favicon-180.png')
    save_png(master, 512,  f'{OUT}/favicon-512.png')
    save_png(master, 1024, f'{OUT}/logo_2.png')
    save_png(master, 1254, f'{OUT}/logo.png')

    frames = [master.resize((s, s), Image.LANCZOS) for s in (16, 32, 48)]
    frames[0].save(f'{OUT}/favicon.ico', format='ICO',
                    sizes=[(16, 16), (32, 32), (48, 48)],
                    append_images=frames[1:])
    print('OK', f'{OUT}/favicon.ico')

    save_svg(master, f'{OUT}/favicon.svg')

    portada_master = load_portada_master()
    save_png(portada_master, PORTADA_SIZE, PORTADA_OUT)
