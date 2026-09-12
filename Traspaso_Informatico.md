# Traspaso al informático — despliegue de la versión ligera de Taller de Sintaxis

> **Para:** el desarrollador/administrador que se encarga del dominio, el
> alojamiento y el DNS.
> **De:** Josele Asensio (autor y propietario del proyecto), joseleasensio@gmail.com.
> **Fecha:** 12 de septiembre de 2026.
>
> Este documento está pensado para que puedas ejecutar el despliegue sin
> conocer el proyecto y sin tener que preguntar detalles técnicos. Si algo de
> lo que hay aquí no coincide con lo que ves en el repositorio, **manda el
> repositorio**: este documento describe el estado a la fecha de arriba.

---

## ⛔ LÍMITE DURO — LÉELO ANTES DE NADA

**NO TOQUES, NO REDESPLIEGUES Y NO INTERFIERAS CON LA WEB ACTUAL EN GITHUB
PAGES:**

- Repositorio: `https://github.com/josele-duplex/Taller-de-sintaxis-compuestas-`
- Rama: `main`, servida por GitHub Pages **desde la raíz del repositorio**.
- URL pública actual: `https://josele-duplex.github.io/Taller-de-sintaxis-compuestas-/`

**Esa es la versión COMPLETA, con backend real (Google Apps Script + Google
Sheets), y la están usando AHORA MISMO alumnos reales en el centro de
Josele.** Recoge nombres, correos, exámenes y calificaciones de menores.

Lo que se te encarga es **otro despliegue distinto del mismo repositorio**:
la versión ligera, en un dominio nuevo, en un alojamiento nuevo. Los dos
despliegues **no se mezclan ni comparten dominio, hosting ni configuración**.

En concreto, esto queda prohibido:

| Prohibido | Por qué |
|---|---|
| Hacer `git push` a `main` | Cada push a `main` redespliega automáticamente la app de los alumnos en menos de un minuto. |
| Cambiar la configuración de GitHub Pages (rama, carpeta, dominio personalizado) | Tumbaría o desviaría la app de los alumnos. |
| Apuntar `tallerdesintaxis.com` a GitHub Pages | Publicaría la versión completa (con backend real) en el dominio público. |
| Cambiar la visibilidad del repositorio (público → privado) | GitHub Pages en plan gratuito exige repositorio público: la app de los alumnos dejaría de servirse. (Ver §6.2.) |
| Añadir un archivo `CNAME` al repositorio | Es el mecanismo de dominio personalizado de GitHub Pages; movería la versión completa. |
| Subir `dist-light/` a mano a ningún sitio, o hacer commit de esa carpeta | Ver §3: es un artefacto generado. |

Si en algún momento crees que necesitas hacer alguna de estas cosas, **para y
pregunta a Josele**. Cualquier cambio de código va por *pull request* que
aprueba y fusiona él (§6.1).

---

## 1. Qué es esto

**Taller de Sintaxis** es una aplicación web educativa de análisis
sintáctico y morfológico del español (ESO y Bachillerato), en uso real en
aulas desde hace más de un curso.

Técnicamente es una **SPA estática**: HTML + CSS + JavaScript nativo (ES
modules). No hay framework, no hay bundler, no hay TypeScript, no hay
dependencias en tiempo de ejecución, **no hay `package.json`**. Lo único
externo que carga son las fuentes de Google Fonts. Lo que hay en el
repositorio es lo que se ejecuta en el navegador.

Del **mismo repositorio** salen **dos versiones**, distinguidas por una
bandera en el código fuente:

```js
// js/core/constants.js
export const LIGHT = false;   // SIEMPRE false en el repositorio
```

| | Versión **completa** | Versión **ligera** (la que te encargo) |
|---|---|---|
| Quién la usa | Los alumnos de Josele en su centro | El público general, vía buscadores |
| Backend | Google Apps Script + Google Sheets (URL real en `constants.js`) | **Ninguno.** Los bancos de ejercicios van en tres JSON locales (`data/`) |
| Panel del profesor, exámenes, informes | Sí | **No** — se excluyen del build, no solo se ocultan |
| Datos personales | Recoge nombre, correo, grupo, notas | **No recoge nada.** Solo pide un nombre para mostrarlo en pantalla; no sale del dispositivo |
| Dónde vive | GitHub Pages (ver límite duro) | `https://tallerdesintaxis.com/app/` (nuevo) |
| Cómo se obtiene | Los archivos del repo tal cual | `node build-light.js` → carpeta `dist-light/` |
| Quién la despliega | Josele, con `git push` | **Tú**, con el alojamiento que configures |

**Nunca dos repositorios.** Una copia del repo que diverja del original es
exactamente lo que este diseño evita. La versión ligera se *genera*; no se
edita.

---

## 2. Requisitos previos

- **Node.js 18 o superior** (solo para ejecutar el script de build; en la
  máquina de desarrollo de Josele hay Node 24). Sin `npm install`: el script
  no tiene dependencias.
- **Git** para clonar el repositorio (hoy es público; ver §6.2).
- Cualquier servidor estático para probar en local (`npx http-server`,
  `python -m http.server`, lo que uses).

---

## 3. Cómo se genera la versión ligera

```bash
node build-light.js
```

Tarda un segundo. Escribe la carpeta **`dist-light/`**, que está en
`.gitignore` **a propósito**: es un artefacto generado, como una carpeta de
compilación. **No se commitea, no se sube a mano, no se edita** — el
siguiente build la borra y la regenera entera.

### 3.1 Qué hace el script (para que sepas qué esperar)

1. Copia con **lista blanca** (lo que no está en la lista, no se copia):
   `index.html`, `manual-alumno.html`, `manifest.json`, `sw.js`, y las
   carpetas `css/`, `assets/`, `data/`, `js/`.
2. **Excluye** `js/modules/teacher/` (el panel del profesor, ~2.600 líneas) y
   `vendor/` (librería del informe Excel del profesor).
3. Parchea **solo la copia**: `LIGHT = true`, `DEFAULT_API_URL = ''` (la URL
   real del backend desaparece), quita el HTML del panel del profesor, quita
   del precache del service worker lo que ya no existe, y neutraliza un
   término local de la descripción del `manifest.json`.
4. Deja la app dentro de **`dist-light/app/`** y escribe en la raíz de
   `dist-light/` una página `index.html` mínima (`noindex` + `canonical`) que
   reenvía a `app/`, más **`robots.txt`** y **`sitemap.xml`**.
5. Ejecuta **autochequeos** y los imprime. Salida correcta:

```
OK: dist-light/ generado (la app en dist-light/app/, publicable en https://tallerdesintaxis.com/app/).
  LIGHT = true en la copia: true
  DEFAULT_API_URL vacía en la copia: true
  js/modules/teacher/ ausente: true
  vendor/ ausente: true
  HTML del panel del profesor ausente en index.html: true
  app/index.html + reenvío en la raíz: true
  robots.txt + sitemap.xml en la raíz: true
```

**Si aparece la línea `⚠ Algo no salió como se esperaba`, no publiques.**
Avisa a Josele.

### 3.2 Estructura resultante

```
dist-light/                      ← ESTA carpeta es la raíz del dominio
├── index.html                   ← reenvío a app/ (noindex)
├── robots.txt
├── sitemap.xml                  ← hoy, una sola URL: /app/
└── app/                         ← la aplicación (~7 MB, 70 archivos)
    ├── index.html
    ├── manual-alumno.html
    ├── manifest.json            ← PWA instalable
    ├── sw.js                    ← service worker (scope: /app/)
    ├── assets/                  ← logos, iconos, favicons
    ├── css/
    ├── data/                    ← banco-simple.json, banco-compuestas.json, banco-morfologia.json
    └── js/                      ← sin modules/teacher/
```

Toda la app usa **rutas relativas** (`./sw.js`, `./manifest.json`,
`js/app.js`…): funciona en `/app/` sin ninguna reescritura de rutas.

### 3.3 La única constante que quizá tengas que cambiar

Arriba del todo de `build-light.js`:

```js
const URL_PUBLICA = 'https://tallerdesintaxis.com';
const RUTA_APP = '/app/';
```

De ahí salen el `sitemap.xml`, el `canonical` de la página de reenvío y, en
general, cualquier URL absoluta de la copia. **Si el dominio final fuera
otro, es lo único que hay que tocar** — y lo toca Josele (tú se lo dices), por
la regla de §6.1.

### 3.4 Prueba en local antes de nada

```bash
node build-light.js
npx -y http-server dist-light -p 8767 -c-1
```

Abre `http://localhost:8767/` → debe reenviar a `http://localhost:8767/app/`
y cargar la portada. Pasa el checklist de §8 en local; ahorra vueltas.

---

## 4. Alojamiento recomendado

Un servicio de páginas estáticas **con paso de build conectado al
repositorio**. Así la copia ligera se regenera sola en cada despliegue y
nadie tiene que subir carpetas a mano. Plan gratuito de sobra: son archivos
estáticos.

### 4.1 Configuración (idéntica en Netlify y Cloudflare Pages)

| Ajuste | Valor |
|---|---|
| Repositorio | `josele-duplex/Taller-de-sintaxis-compuestas-` |
| Rama de producción | `main` |
| Comando de build | `node build-light.js` |
| Carpeta a publicar | `dist-light` |
| Framework / preset | Ninguno |
| Versión de Node | variable de entorno `NODE_VERSION=20` (o superior) |
| Dominio personalizado | `tallerdesintaxis.com` (y `www` → redirigido al apex, o al revés; elige uno y sé consistente) |
| HTTPS | Automático en ambos. **Obligatorio**: sin HTTPS no hay service worker ni instalación PWA |

Al no existir `package.json`, ninguno de los dos intentará instalar nada:
ejecutan el comando y publican la carpeta.

### 4.2 Reenvío de la raíz a `/app/`

El build ya deja una página de reenvío en `/` (funciona en cualquier host).
**Si el servicio permite un 301 de `/` a `/app/`, configúralo**: es mejor
para el buscador. En Netlify es una línea en `netlify.toml` o `_redirects`;
en Cloudflare, una *Redirect Rule* desde el panel (sin tocar el repo).
Cualquier archivo de configuración que tenga que vivir en el repositorio
(`netlify.toml`, `_redirects`…) va por *pull request* (§6.1). El reenvío es
**temporal**: cuando exista la web de captación (fase posterior, fuera de
este encargo), la raíz será una página real y el reenvío se quita.

### 4.3 Caché

**No configures cabeceras de caché largas** (`immutable`, `max-age` de días)
para HTML, JS, CSS ni JSON. La app no usa nombres de archivo con *hash*: el
service worker es *network-first* precisamente porque no puede distinguir
versiones por nombre. Los valores por defecto de Netlify y Cloudflare Pages
(revalidación con ETag) son los correctos. Déjalos.

### 4.4 Si prefieres otra alternativa

Vale (GitHub Actions publicando en otro host, Vercel, etc.) **siempre que
respete la regla: un repositorio, la copia se genera en el despliegue, no se
edita ni se sube a mano, y `dist-light/` nunca entra en git.** Justifícalo
brevemente a Josele antes de configurarlo.

**No vale:** subir `dist-light/` por FTP o arrastrándola a un panel, hacer
un *fork* que evolucione por su cuenta, o mantener una copia editada de la
app en el servidor.

---

## 5. Dominio y DNS

- **Dominio:** `tallerdesintaxis.com`. **A 12-sep-2026 NO está registrado.**
  Comprueba disponibilidad y regístralo (o guía a Josele para que lo haga).
  Recomendación del plan del proyecto: registrar también el **`.es`** para
  proteger la marca y redirigirlo al `.com`.
- **Titularidad:** el dominio se registra **a nombre de Josele**, con su
  correo como contacto. Tú operas; él es el titular. Si usas Cloudflare
  Pages, Cloudflare Registrar simplifica todo (dominio, DNS y alojamiento en
  el mismo panel), pero cualquier registrador serio sirve.
- **DNS:** los registros exactos (CNAME / A / ALIAS) te los da el panel del
  servicio de alojamiento al añadir el dominio personalizado. No hay nada
  especial: es un sitio estático.
- **Correo:** más adelante habrá un `hola@tallerdesintaxis.com`. No es parte
  de este encargo, pero no elijas nada que impida añadir registros MX
  después.
- **Ruta de la app:** `/app/`, decidido. La raíz del dominio queda reservada
  para la futura web de captación (guías, licencias), que no existe todavía.

---

## 6. Qué necesitas de Josele y quién crea cada cuenta

Principio: **todas las cuentas a nombre de Josele; tú, invitado con
permisos de operación.** Si la colaboración termina, nada debe depender de
una cuenta personal tuya.

| Qué | Quién lo crea | Qué recibes tú |
|---|---|---|
| **Repositorio GitHub** | Ya existe (Josele) | Acceso de **lectura**. El repo es público hoy, así que puedes clonarlo sin más. **Sin permiso de push a `main`** (ver límite duro). |
| **Autorización del alojamiento sobre el repo** | Josele, desde su cuenta de GitHub, al conectar el repositorio en Netlify/Cloudflare (es un clic de "instalar la app de GitHub en `josele-duplex`") | Hacedlo juntos en una llamada de 10 minutos. |
| **Cuenta del alojamiento** (Netlify o Cloudflare) | **Josele**, con su correo | Invitación como miembro del equipo / colaborador del sitio |
| **Registrador del dominio** | **Josele** (titular) | Acceso a la gestión DNS, o bien tú le dictas los 2-3 registros y los pone él |
| **Google Search Console** | **Josele**, con su cuenta de Google (verificación por registro TXT en DNS) | Añadido como usuario para enviar el `sitemap.xml` y ver la indexación |

### 6.1 Cambios de código

**No haces push a `main`.** Cualquier cambio que necesites en el repositorio
(la constante de §3.3, un `netlify.toml`, una cabecera…) va en una rama o un
*fork* y se propone por *pull request*; Josele lo revisa y lo fusiona. Razón:
`main` es a la vez la fuente de la versión completa de los alumnos.

Ten en cuenta la asimetría:
- **Cambios en `build-light.js` NO afectan a la versión completa** (GitHub
  Pages sirve los archivos tal cual; nunca ejecuta ese script).
- **Cambios en `index.html`, `js/`, `css/`, `sw.js` o `manifest.json` afectan
  a las DOS versiones.** Máxima cautela; en la duda, no.

### 6.2 Sobre la visibilidad del repositorio

Hoy el repositorio es **público**. La estrategia del proyecto prevé hacerlo
privado más adelante (el motor completo es lo que se licencia), pero GitHub
Pages en plan gratuito exige repositorio público, así que ese cambio
tumbaría la app de los alumnos. **No es decisión tuya ni de este encargo.**
Lo que sí importa para ti: configura el alojamiento mediante la app de
GitHub (no con un token personal), porque así seguirá funcionando si el
repositorio pasa a privado en el futuro.

---

## 7. Pasos del despliegue, en orden

1. **Clona** el repositorio y ejecuta `node build-light.js`. Comprueba los
   7 autochequeos (§3.1) y prueba en local (§3.4). Pasa el checklist de §8
   en `localhost`.
2. **Crea el sitio** en el alojamiento (cuenta de Josele, tú invitado),
   conecta el repositorio, configura build y carpeta (§4.1), `NODE_VERSION`.
3. **Primer despliegue en la URL provisional** del servicio
   (`algo.netlify.app` / `algo.pages.dev`). **Pasa el checklist de §8 ahí,
   completo, antes de tocar DNS.** Si algo falla, se arregla aquí, no en
   producción.
4. **Registra el dominio** (si no lo ha hecho Josele) y añádelo como dominio
   personalizado en el alojamiento. Configura DNS. Espera al certificado
   HTTPS.
5. **Reenvío 301** de `/` a `/app/` (§4.2), si el servicio lo permite.
6. **Repite el checklist de §8 en el dominio real.**
7. **Search Console:** propiedad de dominio verificada (cuenta de Josele),
   envía `https://tallerdesintaxis.com/sitemap.xml`.
8. **Comprueba que la versión completa sigue intacta** (último punto del
   checklist). Es la prueba de que no ha habido efectos cruzados.
9. **Entrega** (§10).

---

## 8. Checklist de verificación post-despliegue

Sustituye `BASE` por `http://localhost:8767`, la URL provisional o
`https://tallerdesintaxis.com` según la fase. **Comprueba con comandos, no
solo a ojo**: varios de estos puntos son invisibles en pantalla.

### 8.1 La copia es la ligera y no lleva backend

```bash
# La bandera y la URL del backend, en el archivo publicado:
curl -s BASE/app/js/core/constants.js | grep -E "export const (LIGHT|DEFAULT_API_URL)"
#   → export const LIGHT = true;
#   → export const DEFAULT_API_URL = ''; // versión ligera: sin backend, a propósito

# Ningún identificador de Apps Script en toda la carpeta generada (en local):
grep -rl "AKfyc" dist-light/        # → (nada)
```

En el navegador, pestaña **Network** (Red) mientras usas la app: **ninguna
petición a `script.google.com`**. Solo `BASE/app/...` y `fonts.googleapis.com`
/ `fonts.gstatic.com`.

### 8.2 Sin panel del profesor

```bash
curl -s BASE/app/ | grep -c "screen-teacher"                                     # → 0
curl -s -o /dev/null -w "%{http_code}\n" BASE/app/js/modules/teacher/index.js   # → 404
curl -s -o /dev/null -w "%{http_code}\n" BASE/app/vendor/xlsx.bundle.js         # → 404
```

En la portada, el icono ✒️ de la esquina superior derecha **no aparece**
(en la versión completa, un triple clic ahí abre el panel del profesor).

### 8.3 Service worker

```bash
curl -sI BASE/app/sw.js | grep -iE "^(HTTP|content-type)"
#   → 200 y content-type application/javascript (o text/javascript)
```

DevTools → **Application → Service Workers**: registrado y *activated*, con
**scope `BASE/app/`**. **Consola sin errores** al cargar (un 404 en un
archivo del precache aparecería ahí).

### 8.4 Manifest e instalación

```bash
curl -sI BASE/app/manifest.json | grep -iE "^(HTTP|content-type)"     # → 200, application/manifest+json o application/json
curl -s -o /dev/null -w "%{http_code}\n" BASE/app/assets/logo_2.png     # → 200
```

DevTools → **Application → Manifest**: sin avisos; nombre "Taller de
Sintaxis", iconos cargan. En Chrome de escritorio/Android aparece la opción
**Instalar**; se instala y arranca desde el icono en `/app/`. En iPhone:
Safari → Compartir → Añadir a pantalla de inicio → el icono abre la app.

### 8.5 Raíz, robots y sitemap

```bash
curl -sI BASE/ | grep -iE "^(HTTP|location)"      # → 301 a /app/ (si configuraste el 301) o 200 con la página de reenvío
curl -s BASE/robots.txt                            # → User-agent: * / Allow: / / Sitemap: https://tallerdesintaxis.com/sitemap.xml
curl -s BASE/sitemap.xml                           # → XML con <loc>https://tallerdesintaxis.com/app/</loc>
curl -sI http://tallerdesintaxis.com/ | grep -i location   # → https://...  (solo en producción)
```

Los tres archivos de la raíz son de `dist-light/`, no de `app/`. Si
`robots.txt` sale 404, la carpeta publicada no es `dist-light` (quizá has
puesto `dist-light/app`).

### 8.6 Datos locales

```bash
for f in banco-simple banco-compuestas banco-morfologia; do curl -s -o /dev/null -w "$f %{http_code} %{content_type}\n" BASE/app/data/$f.json; done
#   → los tres 200, application/json
```

### 8.7 Prueba funcional con usuario nuevo (imprescindible)

Antes de empezar, en DevTools → Console: `localStorage.clear()` y borra el
service worker anterior (Application → Service Workers → Unregister). Así
simulas a alguien que entra por primera vez — es donde han aparecido los
bugs reales de esta versión.

- **Análisis Sintáctico** → nombre cualquiera (**sin correo, sin grupo**) →
  "Práctica" → ¡Empezar! → aparece una oración (contador tipo `1/165`) →
  haz clic en el verbo → avanza y termina al menos una oración hasta la
  pantalla de resultados.
- **Oración Compuesta** → igual: entra, filtra "Básico", resuelve una.
- **Arcade** → juega una partida: al terminar **no** hay clasificación de
  clase, solo marca personal; en Network, sigue sin haber peticiones a
  Google.
- **Fábrica de Palabras** y **Laboratorio de Oraciones** → muestran
  "próximamente", no se abren ni dan error.
- Móvil (o emulación 375×812): la portada y una oración se ven sin
  desbordes horizontales.

### 8.8 La versión completa sigue intacta

Abre `https://josele-duplex.github.io/Taller-de-sintaxis-compuestas-/`:

```bash
curl -s https://josele-duplex.github.io/Taller-de-sintaxis-compuestas-/js/core/constants.js | grep -E "export const (LIGHT|DEFAULT_API_URL)"
#   → LIGHT = false  y  DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfyc...'
```

El icono ✒️ **sí** aparece y el triple clic abre el panel del profesor. Si
esto no se cumple, algo se ha cruzado: **avisa a Josele inmediatamente.**

---

## 9. Qué puede salir mal (y cómo se evita)

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El sitio publica la app en la raíz y `/app/` da 404 | Carpeta a publicar puesta como `dist-light/app` | Carpeta a publicar = `dist-light` |
| `robots.txt` o `sitemap.xml` dan 404 | Ídem | Ídem |
| El build falla con `node: command not found` o error de sintaxis | Node antiguo o ausente en el entorno de build | `NODE_VERSION=20` |
| El build sale bien pero con `⚠ Algo no salió como se esperaba` | El repositorio cambió (p. ej. un texto que el script busca ya no existe) | **No publicar.** Avisa a Josele con la salida completa. |
| La app carga pero pide correo obligatorio | La copia publicada no es la generada por el build (se ha subido el repo tal cual) | Revisa comando y carpeta de build. `LIGHT` debe ser `true` en el archivo servido (§8.1). |
| Aparecen peticiones a `script.google.com` | Lo mismo: se está sirviendo la versión completa | Ídem |
| Pantalla en blanco + error de `import` en consola | Falta un archivo JS (copia parcial) o el servidor sirve `.js` con `content-type` incorrecto | Regenera con el build; comprueba cabeceras |
| Tras un despliegue, los usuarios ven la versión anterior | Caché larga configurada en el host | §4.3: quita las cabeceras `immutable`/`max-age` largas. El SW es *network-first*; con cabeceras por defecto se actualiza en la siguiente carga |
| La instalación PWA no se ofrece | Sin HTTPS, `manifest.json` con 404 o `content-type` incorrecto, o SW sin registrar | §8.3 y §8.4 |
| Hay que deshacer un despliegue | — | Usa el historial de despliegues del host (Netlify: *Publish deploy* de uno anterior; Cloudflare: *Rollback*). **Nunca** "arreglando" con un push a `main`. |

**Cosas que NO hay que hacer aunque parezcan buena idea:**

- Añadir una *Content Security Policy* que bloquee `fonts.googleapis.com` /
  `fonts.gstatic.com` (la app carga tipografías de ahí).
- Meter analítica o cualquier *script* de terceros en la app **sin
  consultar**: el público es menor de edad y el proyecto solo admite
  analítica agregada sin cookies (Plausible, Umami, Cloudflare Web
  Analytics), y **nunca** Google Analytics con su configuración por defecto.
  No forma parte de este encargo.
- Minificar, empaquetar o "optimizar" los JS: no hay build de la app a
  propósito, y el service worker precachea rutas concretas por nombre.
- Editar textos de la app. La terminología gramatical (NGLE) la fija el
  autor; un cambio "menor" de vocabulario puede ser un error de contenido.

---

## 10. Qué entregas al terminar

Un mensaje o documento breve con:

1. URL final de la app y URL provisional del host.
2. Qué cuentas se han creado, a nombre de quién, y quién tiene acceso a
   cada una (registrador, alojamiento, Search Console).
3. Los registros DNS configurados (tipo, nombre, valor).
4. Configuración exacta del build en el host (comando, carpeta, variables).
5. Cómo se redespliega (respuesta esperada: "automáticamente, con cada push
   a `main`") y cómo se deshace un despliegue en ese host, en 3-4 líneas.
6. Resultado del checklist de §8 en producción, con la fecha.

---

## Anexo — resumen para copiar y pegar

```
Repo:               https://github.com/josele-duplex/Taller-de-sintaxis-compuestas-   (solo lectura; PRs para cambios)
Rama:               main
Build:              node build-light.js        (Node >= 18, sin npm install)
Publicar:           dist-light                 (NO dist-light/app)
Dominio:            tallerdesintaxis.com       (sin registrar a 12-sep-2026; titular: Josele)
URL de la app:      https://tallerdesintaxis.com/app/
Raíz /:             301 -> /app/ (temporal; el build deja una página de reenvío como respaldo)
robots.txt:         https://tallerdesintaxis.com/robots.txt   (lo genera el build)
sitemap.xml:        https://tallerdesintaxis.com/sitemap.xml  (lo genera el build; hoy solo /app/)
Caché:              valores por defecto del host; nada de immutable/max-age largos
NO TOCAR:           GitHub Pages del repo (versión completa, alumnos reales) — ni push a main, ni CNAME, ni visibilidad
```
