# El Laboratorio de Oraciones — semilla del plan (para que Opus lo termine)
## Gemelo sintáctico de «La Fábrica de Palabras»: manipular oraciones para la reflexión metalingüística y los juicios de gramaticalidad

**v0.1 · 30-jul-2026 · Estado: IDEAS PRINCIPALES fijadas por Josele + Sonnet. Falta el plan completo (encargo para 🟣 Opus, ver §6).**

---

## 1. La idea en tres líneas

Mismo patrón de la Fábrica (tres estaciones bloqueadas en orden = descubrimiento → manipulación → etiqueta), pero la materia prima son **oraciones**, y el gesto central es **manipularlas** (sustituir, suprimir, conmutar, permutar, transformar) y **juzgar gramaticalidad** (*\*Los niños juega*). El alumno no etiqueta funciones: **experimenta con ellas** y descubre que cada función se define por lo que resiste o no resiste una manipulación. Nombre de trabajo: **🧪 El Laboratorio de Oraciones** (metáfora de experimento/hipótesis, coherente con la SDG de Camps).

**El hueco que llena:** el plan de integración fija que la app solo entra *después* de la fase de etiqueta de cada UD, porque Simples/Sintagmas/Compuestas son etiqueta-first. El Laboratorio cubre las **fases 1-3** del método (lo que hoy solo pasa en el aula) — con él, la app acompaña la UD de sintaxis **desde la primera sesión**, no desde la penúltima. Es al módulo Simples lo que la estación de manipulación es a la de etiqueta: su antesala y su justificación.

## 2. Las tres estaciones (espejo exacto de la Fábrica)

| Estación | Qué hace el alumno | Sin metalenguaje hasta la 3 |
|---|---|---|
| **1 · Observa** | Corpus de oraciones mínimamente contrastadas: ¿qué cambia entre ellas? ¿cuál no sigue el patrón? + **valencia intuitiva**: «¿cuántos actores pide este verbo?» (*dormir* 1, *romper* 2, *regalar* 3) — la entrada por el significado de Zayas | ✔ |
| **2 · Manipula** | Los **5 experimentos**: SUSTITUYE (por *lo/la*, *le*, *eso/ello*, *lo* neutro), SUPRIME (¿se rompe la oración?), CAMBIA EL NÚMERO (¿qué más cambia? — concordancia), MUEVE (¿puede desplazarse?), TRANSFORMA (activa↔pasiva). + **juicios de gramaticalidad** con asterisco: ¿funciona o no? ¿por qué? + **pares mínimos** (¿qué ha cambiado de función entre estas dos oraciones casi idénticas?) + **análisis inverso** («construye una oración cuyo sujeto vaya detrás del verbo») | ✔ |
| **3 · Etiqueta + prueba** | El **Banco de reflexión metalingüística ya especificado** (`Banco_reflexion_metalinguistica.md`) ES esta estación: «¿qué prueba demuestra que X es CD?». Al cerrar, puente directo al módulo Simples («ahora analiza tú entero») | aquí aparece todo |

**Insight clave para no duplicar:** la estación 3 no reimplementa el análisis — para eso ya está Simples. El Laboratorio termina donde Simples empieza. La Mesa de Herramientas gemela aquí es la **Caja de Pruebas del Detective** (así la llama la UD de 3.º ESO: HR-D-3E-sint): cada prueba conquistada añade su fila con el ejemplo del propio alumno.

## 3. Materia prima que YA existe (por eso este módulo es barato en contenido)

1. **`bancos_ejercicios/pares_minimos/sintaxis.md`** del proyecto de Lengua (banco R-07, jul-2026): **58 pares mínimos de sintaxis + 16 de análisis inverso**, curados, con ID estable y marca de nivel `[2E+]…[1B]`. Es el corpus semilla de los ítems de par mínimo y análisis inverso — ya validado por el docente.
2. **`Banco_reflexion_metalinguistica.md`** (este repo): las 10 funciones con su prueba ✓, sus distractores ✗ razonados y la matriz de vecinos confundibles. Es la estación 3 entera, ya diseñada. Incluye la variante 1.º-2.º ESO anotada como pendiente («¿cuál de estos cambios funciona?» sin nombrar la prueba) — el Laboratorio la implementa.
3. **`Oraciones_Banco`** (~450 oraciones con análisis completo): materia prima para generar manipulaciones con solucionario (la app ya sabe qué es CD en cada oración → puede validar la sustitución esperada).
4. Las **pruebas NGLE** de `marco_teorico_didactico.md` §3.2 y de `Referencia_Morfologia_Sintaxis.md` PARTE 5: concordancia para sujeto (nunca «¿quién?»), *lo/la* CD, *le* CI, *eso/ello* C.Rég., *lo* neutro Atr., supresión adjuntos, activa C.Ag. Son literalmente los verbos del juego.

## 4. Decisiones ya tomadas (Opus NO las reabre)

- Patrón de 3 estaciones bloqueadas; metalenguaje solo en la 3 (idéntico a la Fábrica).
- Ítems autocorregibles: las manipulaciones se validan por **opciones de resultado** (elegir qué queda tras la manipulación / si suena bien), no por texto libre, salvo el análisis inverso que se valida por piezas como «Fabrica tu palabra».
- El error y el asterisco son material de trabajo (marco §2.3): cada reto incluye al menos un juicio de gramaticalidad; se evalúa el porqué, no solo el veredicto.
- Niveles = las UD reales: **2E** «La escena del verbo» (sujeto/CD/CI/CC, enunciado simplificado) · **3E-4E** «Detective de oraciones» + valencia UD-D-04b (fronteras Atr./CPvo, C.Rég./CC, pasiva) · **1B** completo (pasiva refleja, impersonales, valores de *se*, periféricos).
- Reutilización: misma lista §5.2 del plan de la Fábrica (login, XP, pistas, examen PIN, analíticas, informes) + `GrammarRules` de Simples.
- Terminología: la canónica del repo (skill `taller-sintaxis`); «para» nunca CI; heurísticos de pregunta («¿quién?») solo como distractores.
- Examen: solo estaciones 2-3, curva 100/40/10/0, ponderación discriminante. **Bonus estratégico:** este modo digitaliza parte de la **parte razonada ⚓** de las pruebas de bloque (el «¿cómo lo sabes?» del plan de integración) — hasta ahora obligatoriamente en papel.
- Convención de modelos por sesión: 🟣 Opus para schema/canon/corpus agramatical; 🟢 Sonnet para motor/UI/lotes (misma tabla-tipo que la §6 de la Fábrica).

## 5. Lo que Opus debe resolver (el plan pendiente)

1. **Schema `laboratorio v1.0`** (hoja nueva `Laboratorio_Banco` o extensión de `Oraciones_Banco` — decidir): cómo se codifica una manipulación (tipo, objetivo, opciones de resultado, resultado esperado, feedback), un juicio (oración agramatical + causa de lista cerrada + explicación) y un análisis inverso (consigna + validación por slots). Con validador Python gemelo.
2. **Reglas editoriales del corpus agramatical**: qué tipos de agramaticalidad entran por nivel (concordancia rota, régimen, leísmo/laísmo, queísmo…), cómo se marca el asterisco en UI, y el límite entre agramatical e incorrección normativa (marco §2.3 distingue error de comprensión vs norma culta — decidir cuáles juega cada nivel).
3. **Relación exacta con Simples**: ¿módulo independiente en portada o antesala integrada (pestaña/fase previa)? Propuesta a evaluar: card propia, pero con puente al final de cada reto.
4. **Catálogo cerrado de ítems** (tabla por estación como la §2 de la Fábrica) con ejemplos reales tomados de R-07 y del banco de reflexión.
5. **Fases F0-F5** con sesiones, modelo por sesión y calendario contra el curso 2026-27 (ojo: la sintaxis de 2E/3E/1B cae en la **2.ª evaluación** → hay más margen que con la Fábrica; prioridad tras F3 de la Fábrica y tras los lotes de exámenes de diciembre).
6. **Riesgos/decisiones de Josele** (tabla): canon de aceptabilidad de los juicios (qué «suena raro» cuenta como agramatical), validación del lote semilla, colisión de portada.

## 6. Encargo listo para pegar en una sesión nueva con Opus

> Lee `docs/Laboratorio_Oraciones_Semilla.md` y `docs/Fabrica_Palabras_Plan_Producto.md` de este repo, más `Banco_reflexion_metalinguistica.md` y, del proyecto de Lengua, `documentos_base/marco_teorico_didactico.md` (§§1.2, 2.1, 2.3, 3.3) y `bancos_ejercicios/pares_minimos/INDICE_pares-minimos.md` + `sintaxis.md`. Escribe el plan de producto completo del Laboratorio de Oraciones siguiendo la MISMA estructura del plan de la Fábrica (§0 tesis → §8 por qué gana), respetando las decisiones ya tomadas en la semilla (§4) y resolviendo exactamente los seis puntos de su §5. No reabras decisiones cerradas ni cambies la terminología del proyecto.

---

*Semilla del Laboratorio de Oraciones · v0.1 (jul-2026) · Gemelo sintáctico de la Fábrica de Palabras. Relacionado: `Fabrica_Palabras_Plan_Producto.md`, `Banco_reflexion_metalinguistica.md`, plan de integración app↔aula (proyecto de Lengua).*
