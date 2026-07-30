Claude 

Actúas como Ingeniero de Software especialista en Google Apps Script y Google Sheets avanzado.

CONTEXTO DEL PROYECTO:  
Tengo un libro de cálculo de Google Sheets que actúa como backend de una app educativa llamada "Taller de Sintaxis". Ya existe código GAS en el proyecto (extensiones \> Apps Script). Cualquier código nuevo debe poder añadirse sin romper el código existente.

ENTORNO TÉCNICO:  
\- Volumen estimado de datos: \~200-500 filas por hoja de resultados  
\- Permisos: soy propietario del Sheets, tengo acceso al editor de Apps Script  
\- Formato de entrega deseado: un bloque de código GAS por función, comentado en español, listo para copiar y pegar en el editor de Apps Script  
\- Para fórmulas de Sheets: incluye la fórmula exacta entre comillas, especificando en qué celda debe pegarse  
\- Si hay opciones de implementación distintas, explícame brevemente el tradeoff y recomiéndame una

ESTRUCTURA DE HOJAS (columnas con índice de letra para evitar errores):

📊 Panel\_Profesor:  
  Dashboard manual (no tiene columnas fijas de datos — es el destino de fórmulas)

Alumnos\_Resultados (sintaxis simple):  
  A: Fecha | B: Correo | C: Nombre | D: Grupo | E: Examen | F: PIN | G: Nota  
  H: Err\_CD | I: Err\_CI | J: Err\_Atr | K: Err\_CPvo | L: Err\_CReg | M: Err\_CC

Compuestas\_Resultados (sintaxis compuesta):  
  A: Fecha | B: Correo | C: Nombre | D: Grupo | E: PIN | F: Modo | G: Nota | H: Detalle\_JSON

Compuestas\_Practica\_Log (log de prácticas):  
  A: Timestamp | B: Session\_ID | C: Texto | D: Errores\_Verbos | E: Errores\_Nexos  
  F: Errores\_Delimitar | G: Errores\_Clasificar | H: Duracion\_Segundos

Ranking\_Arcade:  
  A: Fecha | B: Apodo | C: Grupo | D: Nombre | E: Correo | F: Modo | G: Puntuacion | H: Racha\_Max

Misiones\_Resultados:  
  A: Fecha | B: Correo | C: Nombre | D: Grupo | E: Tipo\_Mision | F: Puntos | G: Detalle

\[PEGA AQUÍ EL PROMPT MAESTRO DE CONTEXTO\]

TAREA: Formato condicional mediante Apps Script (Requerimiento 1\)

Necesito una función GAS llamada \`aplicarFormatoCondicionalNotas()\` que aplique colores de fondo y texto a las filas de resultados según la nota obtenida. 

ESCALA DE COLORES:  
\- 0.0 a 4.9 → Fondo rojo pastel (\#FFCCCC), texto rojo oscuro (\#990000)  
\- 5.0 a 6.9 → Fondo amarillo pastel (\#FFF2CC), texto marrón (\#7D6608)  
\- 7.0 a 8.9 → Fondo verde pastel (\#D9EAD3), texto verde oscuro (\#274E13)  
\- 9.0 a 10.0 → Fondo azul oscuro (\#1F3864), texto blanco (\#FFFFFF)

COMPORTAMIENTO ESPERADO:  
1\. La función debe colorear la celda de la "Nota" (columna G en ambas hojas) Y la celda del "Nombre" (columna C) de la misma fila  
2\. Debe aplicarse a las hojas: Alumnos\_Resultados y Compuestas\_Resultados  
3\. Solo debe procesar filas con datos (ignorar filas vacías y la fila 1 de cabeceras)  
4\. Debe poder ejecutarse manualmente desde un menú personalizado Y también debe dispararse automáticamente cuando se añade una fila nueva (trigger onEdit o installable trigger — recomiéndame cuál es mejor aquí y por qué)  
5\. Que sea eficiente: si hay 300 filas, no debe tardar más de unos segundos

OUTPUT ESPERADO:  
\- Un bloque de código GAS completo con la función \`aplicarFormatoCondicionalNotas()\`  
\- Un segundo bloque con la función \`crearMenuPersonalizado()\` para añadirla al menú de Sheets  
\- Un tercer bloque (si lo recomiendas) con el trigger automático  
\- Comenta cada sección del código explicando qué hace y por qué

\[PEGA AQUÍ EL PROMPT MAESTRO DE CONTEXTO\]

TAREA: Fórmulas SPARKLINE para el Panel\_Profesor (Requerimiento 2\)

Necesito las fórmulas exactas de SPARKLINE para visualizar en el 📊 Panel\_Profesor tres tipos de minigráficos. Indica en qué celda pegar cada fórmula y qué datos de apoyo necesito preparar previamente (si los hay).

MINIGRÁFICO 1 — Evolución de notas por examen (línea):  
  Fuente: columna G (Nota) y columna E (Examen) de Alumnos\_Resultados  
  Quiero ver la media de nota por examen como línea temporal  
  Color de línea: azul (\#1F3864)

MINIGRÁFICO 2 — Funciones sintácticas más falladas (barras):  
  Fuente: columnas H:M de Alumnos\_Resultados (Err\_CD, Err\_CI, Err\_Atr, Err\_CPvo, Err\_CReg, Err\_CC)  
  Quiero la suma total de errores de cada columna como barras comparativas  
  Color de barras: rojo (\#CC0000) — mayor barra \= función más fallada

MINIGRÁFICO 3 — Tipos de error en sintaxis compuesta (barras):  
  Fuente: columnas D:G de Compuestas\_Practica\_Log (Errores\_Verbos, Errores\_Nexos, Errores\_Delimitar, Errores\_Clasificar)  
  Misma lógica que el anterior  
  Color de barras: naranja (\#E69138)

Para cada SPARKLINE:  
\- Dame la fórmula exacta, entre comillas, lista para pegar  
\- Indica si necesito una celda auxiliar con QUERY o SUMIF previo para que el SPARKLINE tenga datos correctos  
\- Explica brevemente qué limitación tiene SPARKLINE en este caso (si la hay) y si recomendarías un gráfico nativo como alternativa

\[PEGA AQUÍ EL PROMPT MAESTRO DE CONTEXTO\]

TAREA: Métricas comparativas por grupo en Panel\_Profesor (Requerimiento 3\)

Los grupos de clase son: 2ºA, 2ºC, 3ºA (valor exacto en columna D de Alumnos\_Resultados y Compuestas\_Resultados).

Necesito las fórmulas para construir una tabla de resumen en el Panel\_Profesor con esta estructura (diseña tú las celdas si lo ves conveniente):

| Grupo | Nº alumnos | Media nota | % Aprobados (≥5) | % Suspensos (\<5) | Mejor nota | Peor nota |  
|-------|-----------|------------|------------------|-----------------|------------|-----------|  
| 2ºA   | ...        | ...        | ...              | ...             | ...        | ...       |  
| 2ºC   | ...        | ...        | ...              | ...             | ...        | ...       |  
| 3ºA   | ...        | ...        | ...              | ...             | ...        | ...       |

REQUISITOS:  
\- Las fórmulas deben funcionar con QUERY o COUNTIF/AVERAGEIF (elige lo más limpio)  
\- Deben considerar ambas hojas (Alumnos\_Resultados \+ Compuestas\_Resultados) o explícame si es más sensato hacer tablas separadas  
\- Incluye una fórmula de "tasa de finalización": alumnos únicos con nota registrada vs total de alumnos únicos que han interactuado con la app (pueden estar en cualquier hoja)  
\- Aplica formato condicional nativo de Sheets (no GAS) a la columna "Media nota" con escala de color verde-rojo para comparar grupos de un vistazo  
\- Explícame paso a paso cómo insertar el gráfico de barras nativo de Sheets que muestre esta tabla visualmente

\[PEGA AQUÍ EL PROMPT MAESTRO DE CONTEXTO\]

TAREA: Diseño de la hoja Analitica\_Evolutiva — PASO 1 de 2: Estructura y fórmulas

IMPORTANTE: Este requerimiento es más complejo. En este primer mensaje solo quiero el DISEÑO y las FÓRMULAS. El código GAS lo pediremos en un segundo mensaje.

Necesito crear una nueva hoja llamada Analitica\_Evolutiva que consolide el uso global de la app por semana/mes.

MÉTRICAS A CALCULAR (por periodo temporal y por grupo):  
1\. Alumnos únicos activos (basado en columna de Correo/Apodo en cada hoja)  
2\. Sesiones totales (cada fila de log \= 1 sesión)  
3\. Tiempo total invertido en minutos (columna H: Duracion\_Segundos de Compuestas\_Practica\_Log ÷ 60\)  
4\. Distribución de uso por módulo:  
   \- % Sintaxis Simple \= filas de Alumnos\_Resultados  
   \- % Sintaxis Compuesta \= filas de Compuestas\_Resultados  
   \- % Práctica Compuesta \= filas de Compuestas\_Practica\_Log  
   \- % Arcade \= filas de Ranking\_Arcade  
5\. Evolución de errores: media de errores totales por alumno por semana (para ver si disminuyen)

OUTPUT ESPERADO EN ESTE MENSAJE:  
1\. Propuesta de estructura de columnas para Analitica\_Evolutiva (encabezados y organización)  
2\. Las fórmulas QUERY o ARRAYFORMULA que poblarían cada columna, especificando en qué celda van  
3\. Indica claramente qué datos es imposible calcular solo con fórmulas y necesitaría GAS (eso lo abordaremos en el Paso 2\)  
