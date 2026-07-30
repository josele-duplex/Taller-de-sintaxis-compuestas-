# Notas sobre rediseño visual del Taller de Sintaxis

> **Cuándo cargar**: el usuario menciona rediseño visual, estética, "Gramática Viva", o cambios de paleta/tipografía a gran escala. **Cuándo NO**: para un ajuste puntual de color/CSS que no toca la identidad visual global.

## 1. Contexto

En mayo de 2026, Josele recibió un **Informe Técnico de Rediseño Visual** (de fuente externa, probablemente otro AI o un diseñador) que propone transformar la estética actual de "Taller de Sintaxis" hacia una dirección llamada **"Gramática Viva"**: navy editorial + Fraunces + Lora, inspirada en Oxford University Press, The Economist, Notion.

Josele tiene **dudas legítimas** sobre si es la dirección adecuada para alumnos de ESO/Bachillerato (12-17 años).

**Decisión actual**: NO aplicar el rediseño global sin discutirlo a fondo. Aplicar solo cambios de `aclaraciones.md` (mejoras puntuales pedagógicas del módulo Compuestas).

## 2. Diagnóstico técnico del informe (lo que es cierto y útil)

El informe identifica problemas reales en el código actual:

### Problema 1: Dos sistemas de tokens CSS en conflicto
- El `:root` tiene tokens del Sistema 1 (`--parch-*`, `--ink`, `--blue`) y Sistema 2 (`--ui-*`).
- Se usan ambos en distintas partes sin coordinación.
- Resultado: sensación visual híbrida, inconsistencias.
- **Diagnóstico cierto**: hay que unificar.

### Problema 2: Tipografía mezclada
- `body` usa Nunito.
- Los tokens definen Fraunces + DM Sans.
- Lora aparece esporádicamente.
- Sin jerarquía clara.
- **Diagnóstico cierto**: hay que jerarquizar.

### Problema 3: Contraste WCAG insuficiente
- `--muted (#7A6655)` sobre `--paper2 (#F4F0E8)` ≈ ratio 3.8:1. Falla AA (requiere 4.5:1).
- Colores sintácticos pastel: cbg-sn (`#EFF6FF`) con texto gris, muy bajo contraste.
- **Diagnóstico cierto**: hay que recalibrar.

### Problema 4: Sombras y radii inconsistentes
- Tres sistemas de sombras conviviendo (`--sh`, `--ui-sh-*`, `--parch-shadow`).
- Radii distintos en componentes similares (`14px` vs `12px` vs `16px`).
- **Diagnóstico cierto**: hay que unificar.

## 3. Las dudas legítimas de Josele sobre el rediseño global

Josele identificó cuatro reservas que son **muy buenas**:

### Reserva 1: Riesgo de sobre-intelectualización
La combinación Fraunces + navy + Lora + estética Oxford/Economist puede ser "demasiado adulta" para alumnos de ESO. La sintaxis ya es cognitivamente exigente; si el diseño transmite "seriedad universitaria", puede aumentar rechazo. **Esta reserva es muy seria** y debería ponderar fuertemente cualquier decisión de rediseño.

### Reserva 2: Side-panel como sobrecarga cognitiva
El panel lateral propuesto (ayuda, stats, glosario, funciones todo a la vez) es muy SaaS pero pedagógicamente cuestionable. En educación: **menos UI = más aprendizaje**. La pantalla ideal para un niño haciendo sintaxis es: instrucción + oración + acción. Nada más. **Esta reserva es válida**.

### Reserva 3: Topbar oscuro demasiado dominante
Una topbar navy muy contrastada puede competir con el contenido central. El protagonista debe ser la oración, no la chrome de la app. **Vale la pena probar dos versiones**.

### Reserva 4: Lora para la oración analizada
La oración analizada es un **objeto de trabajo cognitivo**, no texto editorial. El alumno selecciona, arrastra, identifica funciones — no lee literatura. Una serif puede reducir escaneabilidad. **Hay que probarlo, no asumirlo**.

## 4. Lo que probablemente SÍ vale la pena hacer

Si en el futuro se aborda el rediseño, mi recomendación para Claude futura es defender que se apliquen:

### Sí (Fase A del informe — quick wins)
- Unificar tokens CSS en `:root` (un solo sistema).
- Recalibrar colores sintácticos para WCAG AA.
- Unificar sombras y radii.
- **Mantener Nunito como font del body** — es escolar, amable, redondeada. No cambiar.
- Si se cambia algo de tipografía, hacerlo solo en títulos.

### Con prudencia (Fase B — cambios medios)
- Solo si pruebas con alumnos lo respaldan: cambiar la oración a una sans más legible que Nunito (no a Lora).
- Aumentar contraste de funciones sintácticas.

### Solo si genuinamente se demuestra el beneficio (Fase C — layout)
- El Focus Workspace (eliminar fatiga de scroll) ES bueno conceptualmente, pero requiere mucho trabajo y testing.
- No hacerlo "porque sí". Hacerlo solo si Josele ve a sus alumnos sufriendo el scroll.

## 5. Lo que probablemente NO debería hacerse

- ❌ Cambiar el tono general de "amigable escolar" a "Oxford académico". El público es ESO/Bachillerato, no postgrado.
- ❌ Cambiar la oración analizada a Lora.
- ❌ Añadir un side-panel con todo a la vez.
- ❌ Topbar dark contrastado dominante.
- ❌ Eliminar el modo Arcade o reducir el componente lúdico. La motivación importa en aprendizaje.

## 6. Recomendaciones de Josele que SÍ vale aplicar

Del documento `aclaraciones.md` (mayo 2026), Josele pidió:

✅ **Tokens sin colorear hasta que el alumno active el análisis** — ya aplicado en E2.
✅ **Símbolo corto (letra+número) en lugar de PP/PS** — ya aplicado en E2, aunque acabó siendo O1/O2/O3, no P1/P2/P3 como decía este apunte (comprobado jul-2026 contra el código real; corregido también en `conventions.md` y `SKILL.md`).
✅ **Símbolos `→/↔/∥` en lugar de la flecha diagonal `↘`** — ya aplicado en E2.
✅ **Redacción explícita en prosa, sin abreviaturas** — ya aplicado en E2.
⏳ **Árbol visual ascendente para subordinación + coordinación combinada** (`O1 → (O2 ↔ O3)`) — pendiente, planeado para E3.

## 7. Si llega una nueva propuesta de rediseño

**Reglas para Claude futuro**:

1. **No aplicar sin discutir**. Aunque venga muy bien argumentada.
2. **Identificar el público real**: ESO/Bachillerato. No son lectores del *Economist*.
3. **Distinguir lo que es "estética" de lo que es "pedagogía"**. La pedagogía manda.
4. **Probar con alumnos reales antes de cambios grandes**. La opinión de Josele en aula es más valiosa que cualquier informe de diseño.
5. **Cambios incrementales > revolución**. Aplicar quick wins primero. Layout solo si demuestra beneficio.

## 8. Notas adicionales sobre estética actual

- **Fuente actual del body**: Nunito (escolar, redondeada).
- **Fuente de display**: una mezcla de Fraunces + Lora + DM Sans (sin jerarquía clara).
- **Paleta base**: cream/parchment (`#EDE4CC` y derivados).
- **Sombras**: brown-tinted (`rgba(59,42,26,…)`).
- **Estética declarada**: "Bento-Neobrutalista Refinado" — bordes marcados, sombras cálidas, cajas con esquinas redondeadas, paleta cálida.

Esta estética **funciona para el público objetivo**. No hay urgencia de cambiarla a algo "más serio".
