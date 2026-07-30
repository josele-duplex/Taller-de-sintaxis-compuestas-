# Guía de uso — carpeta «Difusion_Taller_Sintaxis»

Esta carpeta reúne **solo** lo necesario para la campaña de contacto con la RAE
y las editoriales. No mezcla aquí nada de mantenimiento interno de la app
(informes de bugs, datos de pilotaje, memoria del Registro de la Propiedad
Intelectual, etc.) — esos documentos siguen en la raíz del proyecto porque son
para uso tuyo, no para enviar a nadie.

---

## 1. Qué hay aquí y para qué sirve cada cosa

### 📄 `Estrategia_Contacto_RAE_Editoriales.md`
El documento maestro. Ábrelo primero. Contiene:
- El "pitch" base y cómo adaptarlo según a quién escribes.
- Las **dos cartas ya redactadas** (RAE / Fundación pro-RAE, y editoriales) —
  copia el texto directamente en el correo, rellena los `[corchetes]`.
- El guion completo del vídeo de 2 minutos (locución + plano a plano).
- A quién escribir exactamente (nombres de cargos, editoriales por tiers).
- La checklist final antes de enviar cualquier correo.

**Cuándo usarlo:** es tu referencia constante mientras dura la campaña. No se
envía a nadie — es para ti.

### 🌐 `dossier_taller_sintaxis.html`
El "one-pager" visual de la app: qué es, qué incluye, por qué tomarla en
serio, con capturas de la interfaz ya maquetadas. Es la pieza que enseñas
**si alguien te pide más información por escrito** antes de la llamada, o
para adjuntar cuando ya hay interés confirmado (la estrategia recomienda no
enviar nada pesado en el primer correo frío — esto entra en la segunda
vuelta).
- Se abre haciendo doble clic (se ve en cualquier navegador).
- Antes de mandarlo: rellena los `[corchetes]` (enlaces al vídeo, a la app, tu
  correo y teléfono) igual que en las cartas.
- **Nota:** repite la misma frase del «paso de infraestructura pendiente» que
  ya suavizamos en la carta de editoriales. Si quieres, en otra sesión
  revisamos también este texto con el mismo criterio — no lo he tocado ahora
  porque me pediste centrarme en la carta.

### 📘 `Manual_Profesor_Taller_Sintaxis.docx`
El manual breve para el profesorado: cómo empezar, los cuatro módulos,
navegador y dispositivos compatibles. Sirve como **material de apoyo en la
demo o la llamada** — si un editor o un académico quiere ver "cómo lo usaría
un profesor real" con algo más formal que la propia app, este es el
documento. No hace falta enviarlo en el primer correo.

### 🎬 (pendiente) El vídeo de 2 minutos
Es la pieza que falta y la más importante de toda la campaña — sin ella, el
correo frío tiene muchas menos probabilidades. Ve a la sección 2 de esta guía
para el montaje.

---

## 2. Orden de uso recomendado

1. Graba el vídeo de 2 minutos (sección 2 de esta guía + §7 de la Estrategia).
2. Súbelo a YouTube como **"oculto/no listado"** y copia el enlace.
3. Rellena los `[corchetes]` de las dos cartas en `Estrategia_Contacto_RAE_Editoriales.md`
   y del dossier HTML con: tu nombre, cargo, centro, teléfono, el enlace al
   vídeo y el enlace a la app.
4. Envía primero a la RAE / Fundación pro-RAE (§9.1 de la Estrategia).
5. Envía a 2-3 editoriales (§9.2), un correo por destinatario, personalizado.
6. Anota la fecha para el seguimiento a los 10-14 días (§3.4).

---

## 3. Cómo hacer el montaje del vídeo (para alguien sin experiencia en imagen)

Tienes ya la parte difícil resuelta: un estudio de grabación con micro de
condensador, previo Audient y Cubase. El §7.3 de la Estrategia ya detalla
toda la cadena de audio (filtro paso alto, de-noise, de-esser, EQ, compresor,
limitador, -16/-14 LUFS). Lo que falta es la parte de **vídeo e imagen**, que
es sencilla si sigues estos tres bloques por separado — no hace falta saber
edición de vídeo "de verdad".

### Bloque A — Grabar la pantalla (sin preocuparte del audio todavía)

Usa **OBS Studio** (gratis, en español, el estándar para esto):
1. Descárgalo de `obsproject.com` e instálalo.
2. Añade una "Fuente" → "Captura de pantalla" (o "Captura de ventana" si solo
   quieres el navegador).
3. En Ajustes → Vídeo, pon la resolución de salida a **1920×1080**.
4. Abre la app en un navegador limpio (sin barra de marcadores, ventana
   maximizada) y sigue el **plano a plano del §7.2** de la Estrategia: un
   clic detrás de otro, despacio, sin prisa. No hables mientras grabas esto
   — solo necesitas la imagen. Puedes repetir cada bloque tantas veces como
   quieras hasta que los clics salgan limpios.
5. Pulsa "Iniciar grabación", haz la secuencia, "Detener grabación". El
   archivo se guarda como `.mkv` o `.mp4` en la carpeta que configures.

*Alternativa más simple todavía si OBS te resulta pesado:* el grabador de
juego de Windows (**tecla Windows + G**) también graba pantalla en 1080p sin
instalar nada, aunque con menos control.

### Bloque B — Grabar y mezclar la voz (esto ya lo tienes dominado)

Sigue exactamente el §7.3 de la Estrategia con tu equipo habitual (Audient +
condensador + Cubase). Al final, **exporta el resultado como un único archivo
de audio** (`.wav` o `.mp3`) — esa es la pieza que vas a llevar al montaje.

### Bloque C — Juntar vídeo + audio y hacer el montaje (la parte nueva para ti)

Usa **CapCut de escritorio** (gratis, en español, pensado para gente sin
experiencia — es el editor más usado hoy para vídeos cortos y su curva de
aprendizaje es de minutos, no de días):

1. Descárgalo de `capcut.com` (versión de escritorio, no la app de móvil).
2. Nuevo proyecto → arrastra tu vídeo de pantalla (Bloque A) a la línea de
   tiempo.
3. Arrastra tu archivo de audio (Bloque B) a la pista de audio, justo debajo.
4. **Ajusta la duración:** alarga o recorta los tramos de vídeo (arrastrando
   los bordes de cada clip) para que cada bloque de pantalla dure lo mismo
   que su parte correspondiente de la locución — usa la tabla del §7.2 como
   guía de tiempos (0:00-0:12, 0:12-0:30, etc.).
5. **Zoom en los momentos clave** (feedback, nota, informe): selecciona el
   clip, en el panel derecho busca "Recorte/Zoom" o añade un fotograma clave
   (keyframe) al inicio y otro al final del tramo con un tamaño mayor —
   CapCut interpola el movimiento automáticamente, no hay que animar nada a
   mano.
6. **Tarjeta final:** al final de la línea de tiempo, usa "Texto" → elige una
   plantilla simple → escribe el nombre de la app y la URL. Dale 2-3
   segundos de duración.
7. Silencia (o borra) cualquier audio que hubiera quedado del vídeo de
   pantalla original — la única voz que debe sonar es la de tu pista de
   Cubase.
8. Exporta en **1080p, MP4** (opción "Exportar" arriba a la derecha).

*Si en algún momento quieres más control* (más tipos de zoom, transiciones),
el siguiente escalón natural es **DaVinci Resolve** (también gratis), pero
tiene más curva de aprendizaje — para este vídeo, CapCut es más que
suficiente.

### Bloque D — Publicarlo

1. Sube el `.mp4` final a YouTube.
2. Al publicarlo, elige **"Oculto"** (antes llamado "no listado") — así solo
   lo ve quien tenga el enlace, no aparece en búsquedas ni en tu canal.
3. Copia el enlace y pégalo en los `[corchetes]` de las cartas y del dossier.

---

## 4. Lo que NO está en esta carpeta (y por qué)

- **Informes internos de bugs y de resultados del curso piloto** — contienen
  problemas técnicos y datos de inflación de notas que no aportan nada a una
  editorial o a la RAE; son para tu uso interno.
- **La memoria del Registro de la Propiedad Intelectual** — es un documento
  legal para el registro de Murcia, con tu DNI y campos aún pendientes; no es
  para compartir externamente. Basta con mencionar en las cartas que la app
  **está inscrita** (ya lo hacen).
