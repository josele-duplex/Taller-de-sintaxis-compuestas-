---
name: taller-sintaxis
description: "Use this skill whenever the user mentions Taller de Sintaxis, oración compuesta, oración simple, Compuestas_Banco, Oraciones_Banco, Code_v6.gs, Compuestas.gs, schema 1.2, funcion_sp, modo lectura, motor pedagógico, modo examen con PIN, RAE/NGLE in school syntax, EBAU Murcia, or any task involving this Spanish syntax-teaching webapp (modular JS frontend + Google Apps Script + Google Sheets — see repo root CLAUDE.md / arquitectura.md for current code structure, this skill does not duplicate it). Also trigger for bug diagnosis on GAS deployment URLs, JSON schema validation for compound sentences, lote generation prompts, or pedagogical redesign of the Compuestas module. Loads stable project conventions — schema 1.2, terminology (O1/O2/O3 never PP/PS/P1P2P3, "oración" never "proposición"; sintagma never grupo; para never CI), deployment workflow, and known recurring problems with their solutions. For current project status/dates, defer to Claude Code memory (project_*.md), not this skill."
---

# Taller de Sintaxis — Project Skill

Este skill contiene las **convenciones estables del proyecto Taller de Sintaxis** desarrollado por Josele (filólogo, IES Murcia) con apoyo de Claude. El proyecto es una webapp educativa para enseñar sintaxis del español según NGLE/EBAU Murcia, con módulos de análisis de oración simple, sintagmas, oración compuesta, morfología y arcade.

> **Lee este SKILL.md siempre que el usuario mencione el proyecto.** Luego carga los `references/` que sean relevantes a la tarea concreta. No hace falta leer todos: cada referencia describe cuándo conviene.
>
> **Este archivo documenta solo lo estable** (arquitectura, terminología, convenciones de schema) — **nunca el estado con fecha de qué está hecho o pendiente**. Para eso, la fuente de verdad es el repo (`roadmap.md`, `arquitectura.md`, `deuda_tecnica.md` en la raíz) y la memoria automática de Claude Code (`project_*.md`). Escribir aquí "hecho en mayo 2026" es exactamente el tipo de dato que se queda obsoleto sin que nadie lo note — ya pasó una vez con este mismo archivo, y otra vez con la sección de validador (ver §3 y `references/schema_compuesta_v1_2.md` §0/§7).
>
> **Persistencia (jul-2026):** este skill vivió una temporada solo en la caché de sesión de otra aplicación (fuera de este repo) y por eso una sesión de Claude Code no podía invocarlo pese a que `CLAUDE.md` lo exige. Ahora vive en `.claude/skills/taller-sintaxis/` **dentro del repo**, con una excepción explícita en `.gitignore` para que se versione (el resto de `.claude/` sigue siendo config local, sin versionar). Si en el futuro vuelve a fallar `Skill(taller-sintaxis)`, lo primero es comprobar que esta carpeta sigue existiendo tal cual tras el último `git pull`.

---

## 1. Convenciones lingüísticas innegociables

Estas convenciones son **decisiones tomadas con base pedagógica y NGLE**. Nunca las cambies sin consultarlo con Josele:

### Terminología obligatoria (oración simple, hoja `Oraciones_Banco`)
- `Sujeto`, `CD`, `CI`, `Atr.`, `CPvo`, `C.Rég.`, `C.Ag.` (con puntos y tildes exactos)
- `CC Tiempo`, `CC Lugar`, `CC Modo`, `CC Causa`, `CC Finalidad`, `CC Compañía`, `CC Instrumento`, `CC Cantidad`, `CC Benef.`
- `Marca.Pas.Ref.`, `Marca.Imp.`, `Marca.Pron.`, `Mod.Or.`, `Vocat.`, `Conector`, `Dativo`, `Atr. Loc.`
- **Nunca usar**: `Aposición`, `Dat.Et.`, `N (V. Pronominal)`, `CPred`, `CRég`, ni etiquetas similares. No existen en el motor (`js/glosario/tags.js` es la lista cerrada real).
- «sintagma» (NUNCA «grupo»)
- «adyacente» NUNCA. Usar el nombre real de la función.
- **Preposición = núcleo del SP** (N), no «Enlace» ni «Nexo».
- **«para» NUNCA introduce CI**. Es CC Finalidad.

### Terminología obligatoria (oración compuesta, schema 1.2)
- **O1/O2/O3** en interfaz (nunca «PP», «PS», ni «P1/P2/P3»: esa era una convención de diseño que nunca se implementó así — comprobado en `js/modules/compuestas/index.js`, corregido jul-2026).
- «oración», nunca «proposición», en todo texto visible al alumno (el array `proposiciones[]` del JSON es solo el nombre interno del dato).
- Subordinación: `O1 → O2`
- Coordinación: `O1 ↔ O2`
- Yuxtaposición: `O1 ∥ O2`
- **No existe subtipo `sustantiva_c_regimen`**. Si la PS es término de preposición, subtipo = `sustantiva_termino_preposicion` y `funcion_sp` indica la función del SP completo.
- Perífrasis = un solo núcleo verbal. No se desglosa en auxiliar+principal. Campo `verbo.indices_perifrasis` (opcional) lista los tokens.
- Sujetos tácitos: `tipo: "tacito"`, `indices: []`. NO se añade token Ø.
- Pasiva refleja: `se` se etiqueta como `marca_pas_ref` separado.
- Conjunción completiva en PS: NO va en `indices` de la PS. Pronombre relativo en PS: SÍ va en `indices`.
- «no» de negación: no se etiqueta como función separada.

### Niveles (morfología y compuestas)
- `basico` / `medio` / `avanzado`
- Equivalencia con módulo morfología: Aprendiz / ESO34 / Maestro

Más detalles en `references/conventions.md`.

---

## 2. Arquitectura

```
Frontend  →  SPA estática modular: index.html (markup) + js/**/*.js (ES modules)
Backend   →  Apps Script: Server/Code_v6.gs + Server/Compuestas.gs + otros .gs
Database  →  Google Sheets: una hoja por tipo de datos
```

Esto es solo el mapa de una línea. **El mapa completo de módulos (qué archivo hace qué, estado global, localStorage, convenciones de código) vive en `CLAUDE.md` y `arquitectura.md` en la raíz del repo — léelos primero**, antes de asumir dónde está algo. Este skill solo añade el detalle específico de trabajar con el Sheet/GAS que esos documentos no cubren: ver `references/architecture.md`.

- **El `DEFAULT_API_URL`** apunta a la URL del web app del GAS (`js/core/constants.js`). Sobrescribible desde el panel del profesor, que la guarda en `localStorage`.
- **El GAS debe redesplegarse** después de cada cambio: "Implementar → Gestionar implementaciones → Editar → Nueva versión". NUNCA "Nueva implementación" (genera URL nueva y rompe enlaces).
- **Las hojas activas**: `Oraciones_Banco`, `Alumnos_Resultados`, `Examenes_Config`, `Compuestas_Banco`, `Compuestas_Examenes`, `Compuestas_Resultados`, `Compuestas_Practica_Log`, `Sesiones_Practica`, `Misiones`, `Misiones_Resultados`, `Morfologia_Textos`, `Config`, `Ranking_Arcade` — y, si ya se han desplegado, `Laboratorio_Banco`/`Formacion_Banco` de los módulos nuevos (comprobar en `roadmap.md` si ya existen o siguen en fase de plan).

---

## 3. Schema JSON de oración compuesta (v1.2)

El campo `JSON_Compuesta` de cada fila contiene un objeto con: `schema_version`, `id`, `tipo_ejercicio`, `tipo_oracion`, `texto`, `tokens[]`, `proposiciones[]`, `nexos[]`, `relaciones[]`, `metadatos`. Estructura completa y listas cerradas de subtipos y funciones en `references/schema_compuesta_v1_2.md`.

**El validador es `node scripts/validar-banco.mjs compuestas archivo.tsv`** (raíz del repo, Node, sin dependencias) — también tiene modos `simples` y, si ya existen los módulos nuevos, `laboratorio`/`formacion`. No hay validador en Python en este repo: ver la nota histórica en `references/schema_compuesta_v1_2.md` §7 antes de sugerir o buscar uno.

---

## 4. Cómo proceder según la tarea

### Si el usuario reporta un bug
1. Lee `references/troubleshooting.md`. Cubre todos los problemas recurrentes: URL antigua del API, caché del navegador, caché del GAS, importaciones duplicadas, cabeceras fantasma, propagación lenta de Apps Script.
2. **Pide siempre el panel de "Detalles técnicos del error"** del módulo CP antes de hacer hipótesis. Es el diagnóstico más rápido.

### Si el usuario quiere generar un lote nuevo
1. Lee `references/lote_generation.md`. Contiene los prompts maestros actuales (`docs/Nuevas_funciones_sintácticas/` del repo) para compuestas y simples, más la convención de TSV.
2. El TSV se importa con separador **Tabulador**, NO autodetect.
3. Valida siempre con `node scripts/validar-banco.mjs <modo> archivo.tsv` antes de dar el lote por bueno.

### Si el usuario quiere iterar sobre el motor pedagógico de compuestas o su modo examen con PIN
El motor pedagógico interactivo y el modo examen ya están implementados en `js/modules/compuestas/index.js` y `Server/Compuestas.gs` (ver `roadmap.md` del repo para el estado exacto). No repitas un plan de implementación desde cero — lee el código real primero. Si Josele pide retomar algo de los planes de diseño originales, están archivados en `references/_archivado/plan_E3.md` y `plan_E4.md` (documentan el diseño original, no el estado actual).

### Si el usuario quiere modificar el código
1. Antes de tocar: pídele que haga **backup** (`Archivo → Hacer copia` para el Sheet; el código ya vive en git).
2. Después del cambio: si tocaste GAS, recuérdale **redespliegue como NUEVA VERSIÓN de la implementación existente**, no como nueva implementación.

### Si el usuario discute un rediseño visual
1. Lee `references/visual_redesign_notes.md`. Hay una propuesta global de rediseño y dudas legítimas de Josele sobre si es adecuada para ESO/Bachillerato. **No aplicar el informe global sin discutirlo**.

---

## 5. Estilo de comunicación con Josele

Josele es **filólogo, especialista en gramática y teoría de la literatura**. Es novato en programación pero quiere aprender el lenguaje técnico para poder hablar con desarrolladores. Reglas:

- **Conceptos de programación**: explicar sin entrar en matemáticas o detalles muy técnicos, usando metáforas y analogías.
- **Conceptos pedagógicos/lingüísticos**: tratarle de igual a igual.
- **Cuando le entregues archivos**: breve descripción, y dile claramente qué tiene que hacer con ellos.
- **Pasos de despliegue**: numerar, ser muy específico ("Apps Script → Implementar → Gestionar implementaciones → lápiz → Versión nueva"). Asume cero familiaridad con Apps Script.
- **No prometas funciones que no has confirmado**: si vas a tocar el GAS, verifica que la función existe antes de prometer comportamiento.
- **Cuando algo "funciona sin tocar nada"**: la causa más probable es propagación lenta de Apps Script post-despliegue. Mencionarlo.

---

## 6. Cosas que NUNCA debes hacer

- ❌ Cambiar terminología NGLE sin permiso explícito.
- ❌ Usar PP/PS o «proposición» en interfaz (debe ser O1/O2/O3 y «oración»).
- ❌ Usar «grupo» en lugar de «sintagma».
- ❌ Sugerir crear «Nueva implementación» del GAS cuando hay que actualizar (es siempre «Nueva versión»).
- ❌ Aceptar contenido en ejercicios que viole la regla "«para» nunca introduce CI".
- ❌ Tocar el `analisis_interno` de seeds antiguos sin avisar (estado real de esto: consultar memoria/roadmap, cambia con el tiempo).
- ❌ Etiquetar una PS como `sustantiva_c_regimen` (ese subtipo se eliminó en schema 1.2).
- ❌ Reescribir partes grandes de un módulo JS sin verificar sintaxis al final con `node --check`.
- ❌ Asumir la estructura de datos de un módulo (`fase3`, `analisis_interno`, columnas del Sheet...) sin comprobarla en el código real — este mismo skill tuvo dos referencias desactualizadas que llevaron a explorar el archivo equivocado o a citar un validador que no existía en el repo.

---

## 7. Archivos del skill

- `references/conventions.md` — Terminología completa y convenciones de etiquetado.
- `references/architecture.md` — Detalle de GAS/Sheets que no vive en `arquitectura.md` del repo: helpers, caché, schema columna-por-columna de los bancos.
- `references/schema_compuesta_v1_2.md` — Schema JSON completo de oración compuesta v1.2 + ampliaciones posteriores (v1.3-v1.5), el validador real, listas cerradas.
- `references/troubleshooting.md` — Diagnóstico paso a paso de problemas recurrentes.
- `references/lote_generation.md` — Cómo generar lotes de ejercicios (prompts, importación, validación).
- `references/visual_redesign_notes.md` — Notas sobre la propuesta de rediseño visual y dudas de Josele (abierto, sin resolver).
- `references/_archivado/plan_E3.md`, `plan_E4.md` — Diseño original de la fase interactiva y el modo examen de compuestas. **Ambas funciones ya están implementadas**; estos documentos son historia de diseño, no una guía de qué falta hacer.
- `scripts/check_html.py` — Verificador rápido de integridad de `index.html` (trae su propio aviso: puede necesitar revisión contra la estructura modular actual antes de confiar en su resultado).

**Ya no incluye** `scripts/validate_compuesta.py`: era un validador Python que nunca llegó a vivir en el repo y se había quedado atrás del schema real. Sus comprobaciones estructurales útiles (tokens consecutivos, IDs únicos, texto reconstruible, subordinación binaria) se portaron a `scripts/validar-banco.mjs`, que es el único validador que hay que usar (§3).

---

## 8. Recordatorio final

Este proyecto lleva muchos meses de evolución. Hay capas y decisiones que parecen arbitrarias pero no lo son. Cuando dudes:

1. **Lee `CLAUDE.md` y `arquitectura.md` del repo antes que este skill** para la estructura de código actual; este skill cubre lo que esos documentos no cubren (terminología NGLE, schema de datos, convenciones pedagógicas).
2. **Pregunta a Josele si la dirección que tomarías es la correcta**, especialmente para cambios que afecten al schema, a la terminología, o al flujo del alumno.
3. **No reinventes lo que ya existe**: el GAS tiene helpers (`getColMap_`, `safeParseJSON`, `ensureCompBancoSheet_`); el frontend tiene patrones de `fetchWithRetry`, `showScreen`, `getApiUrl` en `js/core/`. Reutilízalos.
4. **Valida sintaxis** antes de entregar un módulo JS (`node --check archivo.js`).
5. **Antes de citar un validador, un script o una ruta de archivo de este skill como si existiera, comprueba que sigue existiendo en el repo real.** Este mismo documento ha citado en el pasado un archivo que nunca se llegó a commitear — no repitas el error de memoria en el otro sentido.
