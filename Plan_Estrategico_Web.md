# Plan Estratégico Web — Taller de Sintaxis

> **Documento brújula.** Consolida todas las decisiones tomadas hasta hoy.
> Redactado el **2 de septiembre de 2026**. Sustituye a las conversaciones
> sueltas sobre versión light, tiendas y monetización.
>
> No duplica lo que ya vive en otros documentos. Cuando algo está desarrollado
> en otro sitio, se enlaza:
> - Campaña RAE y editoriales → `Estrategia_Contacto_RAE_Editoriales.md`
> - Arquitectura del código → `arquitectura.md`
> - Pendientes de producto → `roadmap.md`
> - Viabilidad de la versión ligera → `Informe_Version_Light_Taller_Sintaxis.pdf`

---

## 0. Decisiones tomadas (y qué queda descartado)

| Decisión | Estado |
|---|---|
| Dominio propio `tallerdesintaxis.com` o similar | **Adoptada** |
| Estrategia 100 % web + posicionamiento en buscadores | **Adoptada** |
| PWA instalable como argumento central de comunicación | **Adoptada** |
| Licencias a **centros educativos** | **Adoptada** |
| Licencias a **profesores individuales** | **Adoptada** (vía nueva) |
| Google Play Store | **Descartada** por ahora |
| Apple App Store | **Descartada** por ahora |
| Suscripción de consumo para alumnos | **Descartada** |
| Publicidad dentro de la app | **Descartada** (no negociable) |
| Campaña RAE y editoriales | **Aplazada** a fase posterior |

**Por qué descartar las tiendas es una buena decisión y no una renuncia:**
elimina 99 $/año, la dependencia de un Mac, las revisiones de Apple, la fase de
prueba cerrada de Google y las políticas de apps infantiles. A cambio pierdes un
canal de descubrimiento que, en tu nicho, aporta poco: nadie busca «análisis
sintáctico» en la App Store, pero muchísima gente lo busca en Google.

**Y hay un efecto secundario favorable:** las tiendas eran la razón por la que te
recomendé no medir nada. Fuera de ellas puedes usar analítica agregada sin
cookies. Descartar las tiendas te desbloquea la medición.

---

## 1. La tesis del negocio en una frase

**Una herramienta gratuita y excelente que posiciona en buscadores capta al
alumno; el alumno la enseña a su profesor; el profesor compra una licencia; el
departamento compra la del centro; y esa base instalada es lo que después se
negocia con una editorial.**

Cada escalón alimenta al siguiente. Ninguno se salta.

```
Buscador  →  Web gratuita  →  El alumno la instala  →  El profesor la ve
                                                            ↓
              Editorial  ←  Centro  ←  Licencia individual del profesor
```

---

## 2. Los tres niveles de producto

### 2.1 Nivel gratuito — «Taller de Sintaxis»

Sin registro, sin correo, sin servidor. Todo ocurre en el dispositivo del alumno.

**Incluye:** motores de sintaxis simple, morfología, sintagmas y compuestas;
feedback y micro-lecciones; glosario; gamificación (XP, niveles, rachas);
Chispa; itinerarios de práctica elegidos por el alumno; **calificación al
terminar**; instalable en la pantalla de inicio.

**No incluye:** seguimiento del profesor, exámenes, informes, ni calificaciones
que lleguen a nadie.

**Su función no es vender.** Es posicionar, demostrar calidad y fabricar la base
de usuarios. Que sea genuinamente buena es el requisito: una versión mutilada no
capta a nadie y además arruina la primera impresión ante un profesor.

#### 2.1.1 Qué entra y qué no — decidido el 8 de septiembre de 2026

| Módulo | ¿Entra? | Nota |
|---|---|---|
| Oración simple | **Sí** | **150** oraciones elegidas a mano (de 658 activas) |
| Oración compuesta | **Sí** | **~80** por topes de demanda real (de 258 activas y válidas); 5 subtipos (distributiva, explicativa-coord., locativa, modal, comparativa) aparcados: no se dan en PAU Murcia ni en la práctica de 4º ESO/Bachillerato |
| Sintagmas | **Sí** | |
| Morfología | **Sí** | bolsa completa de `Morfologia_Textos` (95 activos), orden por cobertura de categorías/niveles + brevedad — sin corte duro por posición en la hoja (cortar en la fila 50 dejaba fuera pronombres y niveles n2/n3, ver `build-seleccion-banco.js`) |
| Chispa | **Sí** | solo lee banco: no necesita servidor |
| Arcade | **Sí, sin clasificación en línea** | ver aviso |
| Laboratorio de Oraciones | **No** | botón visible; ver 2.1.2 |
| Fábrica de Palabras | **No** | botón visible; ver 2.1.2 |
| Panel del profesor, exámenes, informes | **No** | son el producto de pago (§2.2) |

> **Aviso — la clasificación de Arcade no puede viajar a la versión gratuita.**
> Hoy `saveArcadeScore` manda al servidor el alias y el grupo del alumno. En una
> versión gratuita dirigida a menores, eso choca de frente con la línea roja de
> §6. En la versión ligera, Arcade conserva la marca personal guardada en el
> propio dispositivo y pierde la clasificación compartida. No es una pérdida
> grave: es lo que hace que la versión gratuita no necesite política de cookies
> ni consentimiento.

**Por qué compuestas lleva menos oraciones y por qué eso no es debilidad.** Una
oración compuesta pasa por seis fases; una simple, por tres. En minutos de alumno,
una compuesta vale por tres o cuatro simples: 65 compuestas dan más trabajo que
150 simples. La cifra no sale de un porcentaje del banco, sino de la
**cobertura**: mínimo tres ejemplos por cada subtipo del currículo —coordinadas
(copulativa, adversativa, disyuntiva, explicativa, distributiva), sustantivas,
relativas, adverbiales y construcciones, yuxtapuestas— para que un alumno que
filtre «condicionales» no se quede sin material a la segunda. Con ~22 subtipos
vivos, el suelo cae en 60-70.

> **Regla de proceso para compuestas: primero el validador, después la
> selección.** Este banco tiene un historial documentado de ejercicios sin
> salida (el parche del lote literario de julio de 2026, los subtipos fuera de
> lista, las direcciones ausentes). En clase, un ejercicio atascado lo rescata el
> profesor; en la versión gratuita no hay nadie. Pasar
> `node scripts/validar-banco.mjs compuestas` y **excluir todo lo que dé error
> antes** de que nada llegue a la hoja de selección.

Conviene además no ser tacaño aquí: según el mapa de intención de búsqueda del
§8.3, «cómo analizar oraciones compuestas» y «subordinadas sustantivas» son
justo lo que busca el alumno de 2.º de Bachillerato. Es el contenido con más
tirón de todo el proyecto.

#### 2.1.2 Los dos módulos ausentes: cómo se cuentan

Dejar fuera el Laboratorio y la Fábrica es acertado por razones de alcance: son
los dos módulos cuyos datos cuesta más llevar a un archivo local, y nadie los
busca en un buscador, así que no cuestan nada en captación.

**Pero no deben presentarse como «de pago».** Si se etiquetan como Premium se
abre un segundo eje de muro —funciones de alumno— que enturbia el relato limpio
del §2.2: *gratis es aprender, se paga por enseñar y evaluar*. Además, quien mira
ese botón apagado es un menor que no puede comprar nada.

**Forma acordada:** botón visible y **pulsable**, agrupado bajo un rótulo del
tipo «En preparación», que abre una página real explicando qué hace el módulo.
Informa en vez de frustrar, sirve de contenido indexable y no compromete el
precio de nada.

> **No usar «más oraciones en la versión Premium» como reclamo.** Es
> exactamente el error contra el que avisa §3: vender lista de funciones. El
> tope de ~100 oraciones es un límite de *revisión de calidad* (§12), no una
> palanca comercial, y anunciarlo le dice al alumno que lo que tiene está
> recortado a propósito. El gancho honesto y más fuerte es otro: **con licencia,
> el profesor elige y crea lo que practican sus alumnos.** Eso ya está
> construido.

### 2.2 Nivel profesor — «Licencia Docente»

> **Nota importante: esto ya está construido.** El protocolo de cuadernos por
> profesor con enlaces `?prof=` (agosto de 2026, `js/core/cuadernos.js`) *es*
> exactamente este producto. Lo estás regalando a tu departamento. Lo que falta
> no es programarlo: es dar de alta, cobrar y sostenerlo.

Un profesor individual, con su propio cuaderno de datos, para sus grupos.

**Añade sobre el gratuito:** panel del profesor; examen con PIN; recepción de
calificaciones; informe por alumno y por grupo; errores más frecuentes por
función sintáctica; histograma y evolución; exportación de notas.

**Público:** los mismos que ya pagan por iDoceo o Additio. Gente acostumbrada a
pagar de su bolsillo por herramientas que le ahorran trabajo de corrección.

**Precio propuesto:** **29 €/curso** por profesor, o **39 €** con alta
acompañada y una videollamada de puesta en marcha. Es menos que un libro de
texto y se amortiza en la primera evaluación.

### 2.3 Nivel centro — «Licencia de Departamento»

Todo el departamento de Lengua, con datos compartidos y comparativa entre grupos.

**Añade:** varios profesores sobre cuadernos enlazados; visión de departamento;
informes agregados por nivel; formación inicial al claustro.

**Precio propuesto:** **149 €/curso** hasta 6 profesores; **249 €** hasta 15. Un
centro que gasta miles en licencias digitales aprueba esa cifra sin comité.

> **Regla de comunicación:** la web debe decir desde el primer pantallazo que
> existe la versión con licencia. No escondida en el pie: presente en la página
> de inicio, con página propia y con lenguaje propio — **no «más funciones», sino
> «cambia tu forma de evaluar»**.

**Dentro de la aplicación** (decidido el 8 de septiembre de 2026) el mismo aviso
aparece en dos sitios y en ninguno más: una entrada discreta y permanente en el
menú o el pie, y **la pantalla de resultados al terminar una sesión** —el momento
natural, porque el alumno acaba de ver su nota y la pregunta «¿y si esto lo
recogiera tu profesor de toda la clase?» se cae por su peso. Nunca un cartel a
mitad de un ejercicio.

Dos condiciones: es **un enlace a la web, jamás un formulario dentro de la app**
(§6 no admite recoger el correo de un menor); y mientras no esté resuelta la
compatibilidad del §11.1, ese enlace lleva a una página de información y lista de
espera, no a un botón de compra.

---

## 3. Cómo se cuenta la versión de pago

El error a evitar es vender una lista de funciones. Lo que compra un profesor no
es un panel: es **dejar de corregir sintaxis a mano y saber, en treinta
segundos, qué función sintáctica se le atraganta a su grupo**.

Tres mensajes, por orden de fuerza:

1. **«Sabes qué falla antes de corregir el examen.»** El informe de errores por
   función es lo que ningún libro de texto da.
2. **«La calificación ya está puesta.»** El examen con PIN corrige y califica
   solo, con la curva que tú decidas.
3. **«Ves la evolución de cada alumno a lo largo del curso.»** No una foto: una
   línea.

Y una promesa de tono, no de función: *hecho por un profesor en activo, que da
clase con esto los lunes*. Es tu mayor diferencia frente a cualquier producto
editorial, y no se puede copiar.

---

## 4. La PWA como argumento de venta

**Casi nadie sabe que una web se puede instalar.** Convertir eso en punto fuerte
de comunicación es gratis y te diferencia.

Cómo contarlo en la web, en lenguaje de persona y no de técnico:

> **Sin tiendas, sin descargas, sin cuenta.**
> Abre la web, pulsa «Instalar» y te queda el icono en el móvil como cualquier
> otra aplicación. Funciona sin conexión. Ocupa menos que una foto.

Requisitos para que eso sea verdad y no publicidad:

- Botón de instalar visible y explicado, con instrucciones **distintas para
  Android y para iPhone**: en iPhone se hace desde «Compartir → Añadir a inicio»
  y no es nada evidente, así que necesita captura paso a paso.
- Funcionamiento sin conexión real, no solo la pantalla de carga.
- Icono y pantalla de arranque cuidados: es la primera impresión en el móvil.

---

## 5. Dominio y presencia

- **Dominio:** `tallerdesintaxis.com`. Comprobar disponibilidad y registrar
  también el `.es` para proteger la marca. Entre 10 y 15 €/año cada uno.
- **Alojamiento:** Cloudflare Pages o Netlify, plan gratuito. Al ser archivos
  estáticos aguanta cualquier pico de visitas sin coste.
- **Correo profesional:** `hola@tallerdesintaxis.com`. Nunca el correo personal
  ni el del centro en comunicaciones comerciales.
- **La aplicación vive dentro del dominio:** `tallerdesintaxis.com/app`. El resto
  del dominio es el sitio de captación.

---

## 6. Métricas: qué contar y qué significa

Sin tiendas no hay «descargas». El equivalente honesto es **instalaciones**, y sí
se puede medir: el navegador avisa cuando alguien instala la aplicación, y al
abrirse se puede saber si viene del icono instalado o de una pestaña normal.

Por orden de valor real:

| Métrica | Cómo se obtiene | Para qué sirve |
|---|---|---|
| **Profesores activos con grupo** | Altas de licencia + cuadernos con actividad | El número que compra una editorial |
| **Oraciones analizadas** | Contador agregado en el cliente | Prueba de uso real, no de curiosidad |
| **Instalaciones PWA** | Evento de instalación + arranque desde el icono | El equivalente a «descargas» |
| **Usuarios únicos mensuales** | Analítica sin cookies | Tamaño del embudo |
| **Recurrencia a 30 días** | Analítica sin cookies | Calidad del producto |
| **Centros** | Licencias vendidas | Ingresos y prescripción |

**Herramientas:** Plausible, Umami o Cloudflare Web Analytics. Agregadas, sin
cookies, sin datos personales y sin banner de consentimiento.

**La línea que no se cruza:** ni un dato personal de un menor sale del
dispositivo en la versión gratuita. Contar visitas de forma anónima es legítimo;
guardar nombres, correos o resultados de menores sin base legal, no.

---

## 7. Arquitectura del sitio web

```
tallerdesintaxis.com
├── /                        Inicio — qué es, para quién, instalar, licencias
├── /app                     La aplicación (versión gratuita)
├── /licencias               Comparativa gratuito / docente / centro + precios
│   ├── /licencias/profesor
│   └── /licencias/centros
├── /para-profesores         Cómo se usa en clase, con casos reales
├── /para-alumnos            Cómo estudiar sintaxis con esto
├── /instalar                Guía de instalación en Android, iPhone y ordenador
├── /guias/                  El motor de posicionamiento (ver §8)
│   ├── /guias/analisis-sintactico-oracion-simple
│   ├── /guias/complemento-directo-e-indirecto
│   ├── /guias/oraciones-subordinadas-sustantivas
│   └── …
├── /oraciones/              Oraciones analizadas paso a paso (ver §8)
├── /manual-profesor         El manual que ya tienes, publicado como web
├── /manual-alumno           Ídem
├── /sobre-el-proyecto       Quién lo hace y por qué. Tu historia es un activo
├── /contacto
├── /aviso-legal   /privacidad   /terminos
```

**Los dos manuales ya existen en HTML.** Publicarlos es contenido de calidad,
indexable, que atrae exactamente al público que quieres y demuestra seriedad
antes de que nadie instale nada. Coste: cero. Es la primera acción de
posicionamiento y debería hacerse este mes.

---

## 8. Posicionamiento en buscadores

Es **el canal principal**, no un complemento. Todo lo demás lo apoya.

### 8.1 Los tres tipos de contenido

1. **Guías** (`/guias/`) — explicación docente de un concepto. Compiten por
   búsquedas del tipo «cómo distinguir complemento directo e indirecto».
2. **Oraciones analizadas** (`/oraciones/`) — una oración concreta, analizada
   paso a paso, con enlace para practicarla en la aplicación. **Aquí está tu foso
   defensivo:** tienes cientos de oraciones ya analizadas con criterio NGLE
   coherente. Ningún competidor puede fabricar eso deprisa.
3. **Páginas de producto** — inicio, licencias, instalar. Son las que convierten.

### 8.2 Advertencia sobre las oraciones

No volcar las 670 de golpe generadas automáticamente. Los buscadores penalizan
el contenido masivo de poco valor. **Empezar con 50-80 seleccionadas a mano**,
cada una con análisis completo, explicación redactada y ejercicio enlazado.
Ampliar solo si esas primeras posicionan.

### 8.3 Mapa de intención de búsqueda

| Lo que busca el usuario | Página que responde | Qué quiere |
|---|---|---|
| «análisis sintáctico» | Inicio + guía general | Una herramienta |
| «cómo analizar oraciones compuestas» | Guía | Aprender |
| «diferencia entre CD y CI» | Guía | Resolver una duda concreta |
| «analizador sintáctico online gratis» | Inicio | Usarlo ya |
| «ejercicios de sintaxis resueltos» | `/oraciones/` | Practicar |
| «app para corregir sintaxis» | `/licencias/profesor` | Comprar |

### 8.4 Ámbito geográfico

La NGLE es panhispánica: **el contenido gramatical vale para todo el ámbito**. Lo
que es local es la envoltura. «PAU», «selectividad» y «2.º de Bachillerato»
posicionan muy bien en España y no significan nada en México o en Argentina.
Solución: páginas específicas para España con esos términos, y el grueso del
contenido en términos neutros («análisis sintáctico», «oración subordinada»).

### 8.5 Competencia directa

Ya identificada en `Estrategia_Contacto_RAE_Editoriales.md` §8: **EdAS** y
**Syntagma Digital**. Analizar qué búsquedas les traen tráfico es el atajo más
barato para construir el calendario de contenidos.

---

## 9. Difusión

El orden importa: primero el sitio, después la difusión. Enviar tráfico a una web
a medio hacer quema la única primera impresión que tienes.

| Canal | Papel | Coste |
|---|---|---|
| **Buscadores** | Canal principal. Todo lo demás lo alimenta | Tiempo |
| **LinkedIn** | Doble papel: prospección de editoriales (ya definida) **y** contenido de autoridad como docente que programa | Tiempo |
| **Redes docentes** | Instagram, TikTok y X del claustro virtual; grupos de Telegram y Facebook de profesores de Lengua | Tiempo |
| **Opositores a Secundaria** | Público enorme, muy motivado, que estudia sintaxis a diario. Muy infravalorado | Tiempo |
| **Centros de Profesores (CPR)** | Sesión formativa sobre la app. Prescripción con sello oficial | Tiempo |
| **Prensa educativa** | «Un profesor programa su propia herramienta y la regala» es un reportaje. Se publica la historia, no la app | Tiempo |
| **Publicidad de pago** | **No, por ahora.** Sin datos de conversión es quemar dinero | — |

**Sobre LinkedIn:** en `Estrategia_Contacto_RAE_Editoriales.md` está definido
como herramienta de prospección para llegar a editores concretos. Ahora suma un
segundo papel: publicar con regularidad sobre didáctica de la sintaxis construye
la autoridad que hace que esos mismos editores te contesten. Publicar **antes**
de escribir el correo frío mejora mucho la tasa de respuesta.

---

## 10. Editoriales y plataformas de aula (fase posterior)

### 10.1 Editoriales

Toda la estrategia está escrita en `Estrategia_Contacto_RAE_Editoriales.md`:
pitch, dos cartas redactadas, guion del vídeo, cargos a buscar en LinkedIn y
editoriales por niveles. **No se toca. Se ejecuta cuando haya números.**

Lo que este plan añade: **no lanzar esa campaña hasta tener seis meses de datos
de la web.** La diferencia entre «he hecho una aplicación» y «hay cuatro mil
personas usándola en once países y treinta profesores pagando licencia» es un
orden de magnitud en la posición negociadora.

### 10.2 Plataformas de gestión de aula

**Qué son:** el software donde el profesor lleva su clase — notas, asistencia,
tareas, comunicación con las familias. Dos familias distintas:

- **Cuaderno del profesor (individual):** **iDoceo**, **Additio**. Los paga el
  docente de su bolsillo. *Es exactamente tu público de licencia individual.*
- **Plataformas de centro:** **Google Classroom**, **Microsoft Teams for
  Education**, **Moodle**, **Alexia**, **Clickedu**, **Educamos** (de SM),
  **Esemtia**, **Blinklearning**.

**Por qué interesan más que las editoriales como primer socio:**

- Ciclos de decisión de meses, no de años.
- Integran herramientas de terceros de forma natural: existe un estándar del
  sector (LTI) y varias tienen API pública.
- **iDoceo ya está en tu hoja de ruta** por el exportador de notas. Ese trabajo
  es, además, la primera pieza de una integración futura.

**Cautela:** una integración LTI completa es trabajo de ingeniería serio. No la
prometas. Sí conviene usar el vocabulario correcto cuando hables con ellos.

---

## 11. Legal, fiscal y de propiedad

Cuatro asuntos por orden de urgencia. **Ninguno es opcional si vas a cobrar.**

### 11.1 Compatibilidad con tu puesto — resolver ANTES de facturar

Eres profesor en un centro público. La normativa de incompatibilidades del
personal al servicio de las Administraciones Públicas regula el ejercicio de
actividades privadas y, en general, exige **reconocimiento previo de
compatibilidad**. Vender licencias es actividad económica.

**Esto no es un detalle administrativo: es la condición previa de todo el modelo
de negocio.** Consúltalo con la Consejería o con un gestor **antes** de emitir la
primera factura. No te estoy dando asesoramiento legal: te señalo que es lo
primero que hay que despejar, porque condiciona si el plan es viable tal cual o
hay que darle otra forma.

Si la compatibilidad resultara problemática, existen salidas conocidas —cesión a
una entidad, licencia a un tercero que comercialice, modelo de donación—, pero
conviene conocerlas antes y no después de haber construido la tienda.

### 11.2 Marca

Registrar **«Taller de Sintaxis»** en la OEPM, en la clase de programas
informáticos (del orden de 150 € en solicitud en línea). Es un nombre
descriptivo y la oficina puede poner objeciones: registrar **el logotipo junto al
nombre** aumenta las probabilidades. Tarda meses en resolverse, así que conviene
pedirlo cuanto antes.

### 11.3 Propiedad intelectual

La versión 6 está inscrita y la memoria v7 está generada; solo falta el número de
asiento. **Cerrar ese trámite antes de publicar.** Es la prueba de autoría que se
enseña cuando una editorial pregunta de quién es esto.

### 11.4 Facturación y cobro

- **Pasarela recomendada:** una que actúe como vendedor responsable (tipo Paddle
  o Lemon Squeezy) en lugar de cobrar tú directamente. Se encargan del IVA de
  cada país, que en venta internacional es el mayor quebradero de cabeza para un
  operador individual.
- **Alternativa** si vendes solo en España: Stripe y factura propia.
- **Los centros públicos** suelen exigir factura formal y a veces alta como
  proveedor. Conviene prever ese trámite antes de la primera venta a un centro.

### 11.5 Derechos de autor de los textos de Morfología — hallazgo del 9-sep-2026

Al generar la selección de la versión ligera apareció un riesgo que no estaba
recogido aquí: varios textos de `Morfologia_Textos` (niveles n2/n3/arcade) son
**fragmentos literarios extensos con autoría vigente** — p. ej. un párrafo de
*Cien años de soledad* (García Márquez, fallecido en 2014; derechos vigentes
hasta 2084). Usarlos con tus propios alumnos, dentro de un entorno cerrado, cae
en la excepción educativa de la Ley de Propiedad Intelectual. **Publicarlos en
la web pública ya no es lo mismo: es una comunicación abierta a cualquiera, un
régimen distinto al de aula.**

No bloquea nada de lo hecho hoy. Sí es un criterio a aplicar **a mano** al marcar
la columna INCLUIR de `Seleccion_Morfologia_Light.csv`: los textos largos de
autoría reconocible piden verificar cita/atribución o sustituirlos por textos
propios antes de publicarlos; los textos cortos generados para el banco no
tienen este problema.

### 11.6 Documentos obligatorios de la web

Aviso legal, política de privacidad y términos de la licencia. Si la versión
gratuita no recoge datos, la política de privacidad es breve y honesta — y eso es
un argumento de venta ante un jefe de estudios, no un trámite.

### 11.7 Repositorio

Si el objetivo final es vender o licenciar, **el repositorio no debe ser
público**. Publicar el motor completo le resta valor a lo que intentas vender.

---

## 11.8 Optimización técnica de las Fases 1-6 (9-sep-2026)

El `Informe_Version_Light_Taller_Sintaxis.pdf` (1-sep-2026) estimó las fases 1-6
sin mirar el código línea a línea. Con el banco ya seleccionado (§2.1.1) tocaba
comprobarlo contra el repo real antes de decir "empieza por aquí". Cuatro
correcciones, todas a favor de ir más rápido y más barato salvo la última:

**Fase 2 es más barata de lo que parecía — ya existe el patrón, solo hay que
extenderlo.** El informe hablaba de "imitar la forma exacta de los datos en 5
endpoints, 2-3 sesiones, ALTA dificultad". Comprobado en el código real:
- Con el examen-PIN, el ranking y las analíticas ya descartados de la light
  (tabla §2.1.1), los módulos que sobreviven solo llaman a **3 endpoints de
  lectura**: `getOraciones` (sint/sintagmas/arcade), `getOracionesCompuestas`
  (compuestas/chispa), `getTextosMorfologia` (maestro).
- `sint`, `sintagmas` y `arcade` **ya tienen** una función `getMock()`
  (`js/modules/sint/index.js:369`) que se usa como respaldo sin backend, con
  el objeto de oración YA en la forma final que consume el motor (fase1/fase2/
  fase3 precalculados, no el JSON en bruto del Sheet). Es exactamente el patrón
  que la Fase 2 necesita — probado en producción, no una idea nueva. El trabajo
  real es: (a) que ese `getMock()` cargue de un archivo JSON externo en vez de
  5 oraciones de ejemplo en línea, y (b) construir el mismo patrón para
  `compuestas` y `maestro`, que hoy no lo tienen.
- Revisado: **1-2 sesiones, MEDIA**, no 2-3 ALTA.

**Fase 1 tiene un coste conocido, no una estimación.** La transformación
Sheet-fila → objeto-que-consume-el-motor vive en Apps Script y tiene tamaño
medible: `buildOracionObject` (simples) 244 líneas, `getOracionesCompuestas_`
63 líneas, `getTextosMorfologia_` 46 líneas — sin contar las funciones de
normalización (`normalizeFuncOrac`, `normalizeSintagma_`) que
`build-seleccion-banco.js` ya porta parcialmente a Node. Portar ~350 líneas de
transformación de datos pura (sin llamadas a Sheets dentro) es trabajo
mecánico acotado, no una incógnita. Se mantiene en **1 sesión, baja-media**.

**Fase 5 (idioma neutro) es bastante más grande de lo que decía el informe —
y ha crecido justo esta semana.** El informe la calificó "1 sesión, baja pero
larga". Recuento real hoy: **96 apariciones de "PAU"/"Murcia"** en 7 archivos,
concentradas en `js/modules/compuestas/index.js` (70) y `js/modules/maestro/index.js`
(13). Además, el commit `de6d835` (después de escribirse el informe) *añadió*
34 apariciones de "PAU" sustituyendo "EBAU" — en la dirección contraria a lo
que necesita la light. Recomendación: no reescribir 96 sitios a mano. Crear un
módulo pequeño (`js/core/terminologia.js`) con un diccionario de términos y un
getter consciente de una bandera `LIGHT` (`términoExamen()` → "la PAU" en la
versión de centro, "la prueba de acceso a la universidad" en la light), y
hacer la sustitución con un script asistido por regex, no a mano. **2 sesiones,
media** (subo la estimación, no la bajo, en esta fase).

**Fase 6 (PWA) se confirma sin cambios.** `manifest.json` completo (iconos,
colores, `display: standalone`) y `sw.js` de 192 líneas, igual que el 1-sep.
Sigue siendo la fase más barata: 1 sesión, media.

**Total revisado: 6-8 sesiones** (antes 7-10), con el ahorro concentrado en
las Fases 1-2 gracias al patrón `getMock()` ya probado, y el coste extra
absorbido por una Fase 5 más grande de lo previsto.

**Orden recomendado — no cambia respecto al informe, sí el porqué:** 1 y 2
primero porque son las que ya tienen patrón probado y coste conocido; podar
(Fase 3) después de tener el dato local funcionando, no antes, para no
arriesgar cabos sueltos con el panel/login todavía a medias.

### 11.9 Fases 1+2 — CERRADAS (11-sep-2026)

Hecho para los tres bancos (compuestas primero, empezando por Chispa como
demo pequeña, tal como se decidió; simples y morfología después, mismo día).
`build-banco-json.js` genera `data/banco-{compuestas,simple,morfologia}.json`
a partir de las hojas `Seleccion_*_Light.csv` ya marcadas a mano. Cada motor
que sobrevive a la ligera (`compuestas`, `chispa`, `sint`, `sintagmas`,
`arcade`, `maestro` en sus dos modos) prueba primero el servidor y, si no
hay `apiUrl` o falla, cae al JSON local — sin bandera `LIGHT`, sin tocar
nada de lo que ya funciona con backend. Verificado forzando una `apiUrl`
inalcanzable en el navegador: los seis funcionan de principio a fin.

El puerto de `buildOracionObject` (simples) se verificó **byte a byte**
contra el backend real, no solo "a ojo": las 165 oraciones curadas
coinciden con `JSON.stringify` idéntico a lo que sirve hoy `getOraciones`.

De paso, un hallazgo de datos: el ID "52" de `Morfologia_Textos` está
duplicado en dos filas con contenido distinto (una es de García Márquez).
`build-banco-json.js` desambigua por texto; el Sheet sigue teniendo el
problema pendiente de corregir cuando Josele tenga un rato.

### 11.10 Fase 3 (parte 1 y 2) — panel del profesor y login, HECHO (11-sep-2026)

Decisión: bandera `LIGHT` en el mismo repo (`js/core/constants.js`, siempre
`false` en el código fuente). `build-light.js` copia el repo a `dist-light/`
con lista blanca de archivos, excluye `js/modules/teacher/` (~2600 líneas)
y `vendor/` (xlsx del informe), y parchea SOLO la copia: `LIGHT=true`,
`DEFAULT_API_URL=''`. `.claude/launch.json` tiene una tercera entrada
(`taller-sintaxis-light`, puerto 8767) para servir `dist-light/` aparte.

**Hecho:**
- Panel del profesor fuera del build público (excluido, no solo oculto).
- URL real del backend nunca viaja en `dist-light/` (comprobado con grep
  del identificador exacto, no solo revisado a ojo).
- El icono del pie (✒️) y su texto desaparecen si `LIGHT`.
- Login: correo y grupo dejan de ser obligatorios si `LIGHT` (el dominio
  murciaeduca.es no tiene sentido fuera de España, y nadie recoge el dato
  de todas formas). El nombre se sigue pidiendo — es solo para mostrarlo en
  pantalla, no se envía a ningún sitio sin backend.
- Tres cabos sueltos de excluir `teacher/index.js` (que no es solo el panel:
  también inicializa `_activeReto`, `_activeMission` y expone
  `getMisionesForMode`, leídos por `sint/index.js` sin comprobar que
  existan) — encontrados jugando de verdad en el navegador, no leyendo
  código, y corregidos con el mismo patrón ya usado en `compuestas/index.js`.

**Verificado con clics reales** (no invocación directa de funciones: eso
corre en un contexto aislado que da falsos positivos/negativos, lección
aprendida esta sesión) en `dist-light/` servido aparte: entra a Oración
Simple sin correo, sin colgarse, con datos reales. Regresión en la versión
completa: correo sigue obligatorio, selector de misiones reales sigue
funcionando igual que siempre.

**Ampliado el mismo día:** Fábrica y Laboratorio ya muestran «próximamente»
en vez de abrir (commit `5f36a10`) — nunca «Premium», por la misma razón de
§2.1.2. El modo «Examen con PIN» ya no aparece en el login de simples,
compuestas ni morfología en la versión ligera — sin panel del profesor no
hay quien configure un PIN, así que dejarlo visible era un callejón sin
salida silencioso (commit `c92ed1b`).

**Pendiente de Fase 3** (no bloqueante — con `DEFAULT_API_URL` vacía,
ningún envío de resultados llega a ningún sitio aunque el código todavía
esté ahí, así que no es un riesgo de privacidad, solo pulido):
- Quitar (no solo dejar inerte) el HTML del panel del profesor de
  `index.html` — hoy sigue presente pero inalcanzable.

**Fase 4 (itinerarios del alumno) — por comprobar, puede que ya esté hecha
en su mayor parte:** al probar en el navegador esta sesión, tanto simples
como compuestas YA muestran filtros al alumno antes de practicar («🔍
Filtros de funciones» en simples, pantalla completa de filtros en
compuestas) — el informe original (1-sep) asumía que los filtros eran solo
del profesor, pero el código ha evolucionado desde entonces. Antes de dar
por hecha esta fase hace falta una revisión deliberada (no solo lo visto de
pasada), y decidir si conviene envolverlo en itinerarios con nombre
pedagógico («Empiezo por el sujeto»…) como proponía el informe, o si los
filtros tal cual ya cumplen.

**Fase 5 (idioma neutro) — sin empezar, necesita una decisión de diseño
antes de tocar código:** 96 apariciones de «PAU»/«Murcia» (§11.8) piden un
diccionario de términos con getter consciente de `LIGHT` — hay que decidir
su forma exacta (¿un solo archivo `js/core/terminologia.js`? ¿qué términos
además de «PAU» hace falta neutralizar?) antes de hacer la pasada.

## 12. Riesgos

| Riesgo | Gravedad | Mitigación |
|---|---|---|
| **Incompatibilidad con tu puesto** | Crítica | Resolver antes de facturar (§11.1) |
| **El tiempo.** Empieza el curso y ya hay compromisos con fecha | Alta | Trabajo de vacaciones. No solapar con septiembre |
| **El soporte.** Los usuarios de pago escriben y esperan respuesta | Alta | Preguntas frecuentes, formulario y expectativa declarada («respondo los viernes») |
| **Mantener dos versiones** | Alta | Un solo repositorio con bandera de compilación. Innegociable |
| **Errores en el banco publicado** | Media | Revisión previa. Menos oraciones bien revisadas, no todas |
| **Filtrar la URL del backend** en la versión gratuita | Media | Borrarla del archivo generado y comprobarlo antes de publicar |
| **El posicionamiento tarda** | Media | Es normal: de seis meses a un año. No abandonar al tercer mes |
| **Que nadie pague** | Media | El nivel gratuito sigue siendo útil para ti y tu departamento. Pérdida acotada |

---

## 13. Calendario contra el curso 2026-27

Diseñado para **no chocar** con lo ya comprometido en `roadmap.md`.

| Cuándo | Qué | Por qué entonces |
|---|---|---|
| **Septiembre** | Cerrar el registro de PI. Comprar el dominio. Publicar los manuales. Iniciar la consulta de compatibilidad. Solicitar la marca | Todo barato, reversible y sin programar. Arranca el curso: no hay tiempo para más |
| **Octubre-noviembre** | Nada del plan web. Curso en marcha y exportador de iDoceo | Compromiso previo. No solaparlo |
| **Diciembre-enero** | Fases técnicas 1 y 2: bancos en JSON y capa de datos conmutable | Vacaciones. Es el trabajo que exige concentración |
| **Febrero-marzo** | Fases 3 a 6: podar, itinerarios, lenguaje neutro, PWA a punto. Sitio web y primeras 20 guías | Con la versión ligera lista, el sitio tiene sentido |
| **Abril** | Publicar. Difusión docente. Empezar a medir | Curso avanzado: los alumnos de 2.º de Bachillerato buscan práctica de sintaxis |
| **Mayo-junio** | Observar sin tocar. Primeras licencias docentes a compañeros reales | Validación con usuarios que te dirán la verdad |
| **Julio-septiembre 2027** | Con datos en la mano: campaña de editoriales y plataformas de aula | Ya con posición negociadora |

---

## 14. Puertas de decisión

No seguir por inercia. En cada punto, mirar el número y decidir.

- **A los 3 meses de publicar:** ¿crece el tráfico orgánico? Si no, el problema
  es el contenido, no el producto: más guías antes que más funciones.
- **A los 6 meses:** ¿algún profesor ajeno a tu centro la usa con sus alumnos? Si
  no, la propuesta de valor docente no se está entendiendo: revisar el mensaje
  antes de construir la pasarela de pago.
- **A las 10 licencias vendidas:** el modelo funciona. Entonces —y solo
  entonces— tiene sentido invertir dinero en desarrollo externo o en publicidad.
- **A los 12 meses:** con los números encima de la mesa, ejecutar la campaña de
  `Estrategia_Contacto_RAE_Editoriales.md`.

---

## 15. Lo siguiente, hoy

1. Comprobar la disponibilidad de `tallerdesintaxis.com` y registrarlo.
2. Iniciar la consulta de compatibilidad. Es lo que condiciona todo lo demás.
3. Cerrar el número de asiento del Registro de la Propiedad Intelectual.
4. Publicar los dos manuales que ya tienes escritos.

Nada de eso exige escribir una línea de código.

---

## Recordatorio permanente

**Integración con iDoceo** (exportador de notas): pendiente, a la espera de tu
plantilla de ponderación, prevista para finales de septiembre de 2026. Es un
compromiso anterior a este plan y tiene prioridad sobre él.
