#!/usr/bin/env python3
"""
Verificador rápido del HTML del Taller de Sintaxis.

Comprueba:
  • Que los tags HTML cuadran (divs, scripts, styles…)
  • Que el JS interno es sintácticamente válido (extracción + node --check)
  • Que existe el módulo CP (compuestas)
  • Que existe goModule('compuestas')
  • Que la tarjeta mc-compuestas está en la portada
  • Que el screen-compuestas está definido
  • Que DEFAULT_API_URL no está vacía
  • Que las funciones críticas existen

Uso:
  python check_html.py index.html

NOTA (audit 2026-07): el proyecto se modularizó en mayo 2026; index.html hoy
es solo markup (~1.099 líneas) y funciones como DEFAULT_API_URL viven en
js/core/constants.js, no inline. Verificar si las comprobaciones de este
script siguen aplicando al HTML modular antes de confiar en su resultado.
"""

import sys
import os
import re
import subprocess
from collections import Counter


def check_html(path: str) -> int:
    if not os.path.exists(path):
        print(f"❌ No existe: {path}")
        return 2

    content = open(path, encoding='utf-8').read()
    issues = []
    info = []

    # 1. Balance de tags
    for tag in ['div', 'section', 'button', 'script', 'style', 'span']:
        opens = len(re.findall(rf'<{tag}[\s>]', content))
        closes = len(re.findall(rf'</{tag}>', content))
        if opens != closes:
            issues.append(f"<{tag}>: {opens} abiertos, {closes} cerrados")
        else:
            info.append(f"  <{tag}>: {opens} balanceados")

    # 2. Scripts y validación de sintaxis JS
    scripts = re.findall(r'<script>(.*?)</script>', content, re.DOTALL)
    info.append(f"  Bloques <script>: {len(scripts)}")
    if scripts:
        main_script = scripts[-1]  # el último es típicamente el principal
        tmp_path = '/tmp/_check_html_script.js'
        with open(tmp_path, 'w') as f:
            f.write(main_script)
        try:
            r = subprocess.run(['node', '--check', tmp_path], capture_output=True, text=True, timeout=20)
            if r.returncode != 0:
                issues.append(f"JavaScript con errores de sintaxis:\n{r.stderr}")
            else:
                info.append(f"  JavaScript: sintaxis válida ({len(main_script)} caracteres)")
        except FileNotFoundError:
            info.append("  (No se pudo validar JS: 'node' no instalado)")
        except subprocess.TimeoutExpired:
            issues.append("Validación de JS excedió 20s (sospechoso)")

    # 3. Presencia de elementos críticos
    critical = {
        'DEFAULT_API_URL': "const DEFAULT_API_URL = 'https://",
        'screen-compuestas': 'id="screen-compuestas"',
        'mc-compuestas (portada)': 'mc-compuestas',
        'CP module': 'const CP = (function()',
        "goModule('compuestas')": "goModule('compuestas')",
        'cpExit global': 'window.cpExit',
        'getOracionesCompuestas': 'getOracionesCompuestas',
        'fetchWithRetry': 'async function fetchWithRetry',
        'getApiUrl': 'function getApiUrl()',
        'showScreen': 'function showScreen('
    }
    for name, marker in critical.items():
        present = marker in content
        if present:
            info.append(f"  ✓ {name}")
        else:
            issues.append(f"FALTA: {name} (no se encontró '{marker[:50]}…')")

    # 4. DEFAULT_API_URL no vacía
    m = re.search(r"DEFAULT_API_URL\s*=\s*'([^']*)'", content)
    if m:
        url = m.group(1)
        if url == '':
            issues.append("DEFAULT_API_URL está vacío")
        elif not url.startswith('https://script.google.com/macros/'):
            issues.append(f"DEFAULT_API_URL sospechosa: {url[:80]}")
        else:
            info.append(f"  DEFAULT_API_URL: {url[:60]}...")

    # 5. Tamaño del archivo
    lines = content.count('\n')
    size_kb = len(content) / 1024
    info.append(f"  Tamaño: {lines} líneas, {size_kb:.1f} KB")

    # Resumen
    print("=" * 70)
    print(f"VERIFICACIÓN: {path}")
    print("=" * 70)
    for i in info:
        print(i)
    print()
    if not issues:
        print("✓ El HTML pasa todas las comprobaciones.")
        return 0
    else:
        print(f"❌ {len(issues)} problema(s) encontrado(s):")
        for i in issues:
            print(f"  • {i}")
        return 1


def main():
    if len(sys.argv) < 2:
        print("Uso: python check_html.py index.html")
        sys.exit(2)
    sys.exit(check_html(sys.argv[1]))


if __name__ == '__main__':
    main()
