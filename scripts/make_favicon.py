# -*- coding: utf-8 -*-
"""
Genera el favicon y los iconos de app de Taller de Sintaxis a partir del
arte fuente en assets/Nuevas_imagenes/ (monograma T/S + hoja/helice + nodos,
sobre tarjeta blanca redondeada), recortado y reducido con LANCZOS a cada
tamano final.

Uso: python scripts/make_favicon.py   (desde la raiz del repo)

Sustituye al enfoque anterior (isotipo dibujado por vectores propios en
PIL): el nuevo diseno viene ya como artwork terminado (encargo de Josele),
no como forma parametrica, asi que aqui solo se recorta/escala -- no se
inventan formas nuevas. Si cambia el artwork fuente, sustituye el PNG en
assets/Nuevas_imagenes/ y vuelve a ejecutar este script; no edites los
PNG/ICO/SVG de salida a mano.

Un unico recorte cuadrado centrado (mismo encuadre para todos los tamanos)
en vez de recortes distintos por tamano. OJO resolucion: el archivo fuente
es una lamina de presentacion de 1254x1254 con varias muestras de tamano
dibujadas dentro del mismo lienzo -- el glifo real del "favicon principal"
mide ~440x440px efectivos (no 512 ni 1024 como sugieren sus etiquetas), asi
que favicon-512/logo_2/logo.png llevan un escalado hacia arriba (~1.2x-2.8x)
desde esa resolucion. Aceptado por Josele (ver conversacion): al ser un
diseno plano de formas solidas, no textura fina, el upscale con LANCZOS no
se nota mal salvo mirando muy de cerca.
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


def load_master():
    src = Image.open(SRC).convert('RGB')
    return src.crop((CX - HALF, CY - HALF, CX + HALF, CY + HALF))


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
