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

### 11.5 Documentos obligatorios de la web

Aviso legal, política de privacidad y términos de la licencia. Si la versión
gratuita no recoge datos, la política de privacidad es breve y honesta — y eso es
un argumento de venta ante un jefe de estudios, no un trámite.

### 11.6 Repositorio

Si el objetivo final es vender o licenciar, **el repositorio no debe ser
público**. Publicar el motor completo le resta valor a lo que intentas vender.

---

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
