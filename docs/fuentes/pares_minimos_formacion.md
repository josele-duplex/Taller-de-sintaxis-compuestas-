# Pares mínimos y palabras descompuestas — formación de palabras

**Fuente:** material aportado por Josele el 2026-07-30 (`pares mínimos de formación de palabras y palabras descompuestas.md`, generado con ayuda de IA). **Depurado el 2026-07-30** para uso como cantera del lote semilla de `Formacion_Banco` (ver `docs/Schema_Formacion_v1.0.md`).

> **Por qué esta versión y no el original.** El archivo original tenía valor real — es la única cantera de pares de formación de palabras en nivel ESO que existe en el proyecto (el banco R-07 solo cubre `[1B]`, ver sección I de `pares_minimos/morfologia.md` del proyecto de Lengua) — pero traía segmentaciones que no reconstruían la palabra, dos errores de base léxica, una regla de alomorfia falsa, formas inventadas servidas sin marcar como corpus real, y varios pares vacíos. Todo eso se corrige o se elimina aquí. Ningún ítem de este documento debe copiarse a un `JSON_Reto` sin pasar además por el validador (`scripts/validar-banco.mjs`, modo `formacion`, aún por escribir en F2).

## Registro de correcciones aplicadas

| Original | Problema | Corrección |
|---|---|---|
| `amistad → amigo + -tad` | Corte no reconstruye la palabra | `amistad → amist- + -ad` |
| `juventud → joven + -tud` | Corte no reconstruye la palabra | `juventud → juven- + -tud` |
| `vejez → viejo + -ez` | Corte no reconstruye la palabra | `vejez → vej- + -ez` |
| `felicidad → feliz + -idad` | Corte no reconstruye la palabra | `felicidad → felic- + -idad` |
| `aterrizar → a- + tierra + -izar` | Corte no reconstruye la palabra | `aterrizar → a- + terr- + -izar` |
| `empobrecer → en- + pobre + -ecer` | Corte no reconstruye la palabra | `empobrecer → em- + pobr- + -ecer` |
| `cabizbajo → cabez- + -i- + bajo` | Corte no reconstruye la palabra | `cabizbajo → cabiz- + -bajo` (alomorfo de *cabeza* ante *-i-*) |
| `panadero → pan + -adero` | No existe el sufijo *-adero* | `panadero → pan + -ad- (interfijo) + -ero` |
| `mantita / mantequilla` | *Mantequilla* viene de *manteca*, no de *manta*: par falso | Eliminado del banco |
| `monte / montañoso` | Base real es *montaña* | `montaña / montañoso` |
| `abrevadero (lugar) / abreviador (agente)` | Bases distintas (*abrevar* / *abreviar*): no es un par mínimo | Eliminado |
| `lealtad (-tad tras consonante) / maldad (-dad tras vocal)` | *Mal* también acaba en consonante: la regla es falsa | Regla retirada; el par queda solo como ejemplo de alomorfia de *-dad/-tad*, sin la explicación fonológica errónea |
| `trasnochar` como «derivación prefijada» frente a `anochecer` parasintética | *\*Nochar* no existe: *trasnochar* es parasintética por la misma prueba | Reclasificado como parasintética; el par ahora contrasta *anochecer* / *pernoctar* (prefijación real sobre base culta) |
| `eurodiputado → Europa + diputado` como acronimia | *Euro-* es elemento compositivo culto, no un trozo arbitrario | Reclasificado como composición culta |
| `desafortunadamente → des- + fortuna + -ado + -mente` | Salta el paso *afortunado* | `desafortunadamente → des- + [a- + fortun- + -ado] + -mente` |
| `crecimiento / creación` | Bases distintas (*crecer* / *crear*): no es par mínimo | Eliminado |
| `comedero (lugar) / comedor (persona)` | *Comedor* es sobre todo el lugar; el contraste tal como estaba es engañoso | Nota corregida: ambos pueden ser locativos; el contraste limpio de agente es *comedero* (lugar) / *comensal* (persona) |
| *modernecerse, oscurizar, descubrición, posjuicio, anormativo, repapelar, reenjaular, periodiquero, camionista, panista, roscuita* | Formas inventadas o muy marginales, servidas en tabla junto a formas reales sin marcar | Todas marcadas con `*` (agramaticales) o retiradas; solo se conservan las que sirven como ejemplo de bloqueo léxico (§17 original), ahora explícitamente en la sección de `juicio` |
| `radar/radar, láser/láser, sida/sida, pyme/pyme, bit/bit` | Pares vacíos (no descomponen nada) | Sustituidos por su desarrollo etimológico real (acrónimos de préstamo) |
| `telaraña / telaraña (históricamente compuesta)` | Par vacío | Reformulado como entrada única de composición lexicalizada, sin duplicar la palabra |

---

# Prefijación

* legal / ilegal
* moral / inmoral
* posible / imposible
* correcto / incorrecto
* regular / irregular
* visible / invisible
* paciente / impaciente
* maduro / inmaduro
* conocido / desconocido
* hacer / deshacer
* cubrir / descubrir
* ordenar / desordenar
* confiar / desconfiar
* conectar / desconectar
* cargar / descargar
* poner / reponer
* escribir / reescribir
* leer / releer
* abrir / reabrir
* construir / reconstruir
* producir / reproducir
* nacional / internacional
* continental / intercontinental
* humano / sobrehumano
* mercado / supermercado
* producción / coproducción
* autor / coautor
* piloto / copiloto
* presidente / vicepresidente
* guerra / posguerra
* operatorio / preoperatorio
* pago / prepago
* histórico / prehistórico
* natural / antinatural
* virus / antivirus
* aéreo / subaéreo
* marino / submarino
* cultura / multicultural
* racial / interracial
* dependencia / interdependencia

# Sufijación nominal

* pan / panadero
* leche / lechero
* flor / florista
* arte / artista
* motor / motorista
* papel / papelera
* café / cafetera
* zapato / zapatero
* libro / librero
* horno / hornero
* canción / cancionero
* barro / barrizal
* piedra / pedregal
* árbol / arboleda
* roble / robledal
* joven / juventud
* esclavo / esclavitud
* apto / aptitud
* bello / belleza
* puro / pureza
* igual / igualdad
* amable / amabilidad
* real / realeza
* héroe / heroísmo
* turista / turismo
* amigo / amistad
* hermano / hermandad
* alcalde / alcaldía
* poeta / poetisa
* actor / actriz
* conde / condesa
* príncipe / princesa
* niño / niñez
* viejo / vejez
* largo / largura
* ancho / anchura
* hondo / hondura
* fresco / frescura
* dulce / dulzura

# Sufijación adjetival

* arena / arenoso
* nube / nuboso
* roca / rocoso
* barro / barroso
* peligro / peligroso
* cariño / cariñoso
* fama / famoso
* lujo / lujoso
* valor / valioso
* montaña / montañoso
* agua / acuoso
* centro / céntrico
* teatro / teatral
* nación / nacional
* accidente / accidental
* música / musical
* comercio / comercial
* industria / industrial
* cultura / cultural
* persona / personal
* hierro / férreo
* oro / áureo
* leyenda / legendario
* revolución / revolucionario
* familia / familiar
* planeta / planetario
* volcán / volcánico
* historia / histórico
* átomo / atómico
* política / político

# Sufijación verbal

* hospital / hospitalizar
* cristal / cristalizar
* vapor / vaporizar
* fértil / fertilizar
* moderno / modernizar
* legal / legalizar
* señal / señalizar
* símbolo / simbolizar
* esclavo / esclavizar
* arma / armar
* limpio / limpiar
* ancho / ensanchar
* rico / enriquecer
* triste / entristecer
* rojo / enrojecer
* mudo / enmudecer
* loco / enloquecer
* corto / acortar
* claro / aclarar
* grande / agrandar

# Apreciativos: diminutivos

* casa / casita
* mesa / mesita
* perro / perrito
* gato / gatito
* libro / librito
* árbol / arbolito
* flor / florecita
* coche / cochecito
* mano / manita
* niño / niñito
* pan / panecillo
* pueblo / pueblecito
* bolsa / bolsita
* ventana / ventanita
* calle / callejuela

# Apreciativos: aumentativos

* casa / casona
* casa / caserón
* perro / perrazo
* libro / libraco
* golpe / golpazo
* puerta / portalón
* voz / vozarrón
* hombre / hombrón
* barco / barcaza
* ojo / ojazo

# Apreciativos: despectivos

* pueblo / pueblucho
* médico / medicucho
* abogado / abogaducho
* poeta / poetastro
* escritor / escritorzuelo
* casa / casucha
* periódico / periodicucho
* músico / musicastro
* jefe / jefecillo
* película / peliculilla

# Parasíntesis (prefijo + sufijo)

* rico / enriquecer
* triste / entristecer
* rojo / enrojecer
* mudo / enmudecer
* loco / enloquecer
* grande / agrandar
* corto / acortar
* claro / aclarar
* tierra / aterrizar
* barco / embarcar
* papel / empapelar
* botella / embotellar
* jaula / enjaular
* rama / enramar
* caja / encajar

# Composición

* punta / puntapié
* boca / bocacalle
* guarda / guardabosques
* para / paracaídas
* limpia / limpiaparabrisas
* saca / sacacorchos
* rompe / rompecabezas
* abre / abrelatas
* corta / cortacésped
* quita / quitamanchas
* cumple / cumpleaños
* media / medianoche
* arco / arcoíris
* telaraña — compuesto lexicalizado de *tela* + *araña* (sin par: la voz simple ya no se percibe como compuesta)
* hombre / hombre rana
* coche / coche cama
* pez / pez espada
* sofá / sofá cama
* café / café teatro
* ciudad / ciudad dormitorio

# Acortamiento

* motocicleta / moto
* fotografía / foto
* cinematógrafo / cine
* televisión / tele
* profesor / profe
* bolígrafo / boli
* bicicleta / bici
* matemáticas / mates
* psicólogo / psico
* facultad / facu

# Siglación y acronimia

* organización / ONG
* documento nacional de identidad / DNI
* objeto volador no identificado / OVNI
* organización de las naciones unidas / ONU
* alta velocidad española / AVE
* radar ← *RAdio Detection And Ranging* (acrónimo de préstamo, lexicalizado en minúscula)
* láser ← *Light Amplification by Stimulated Emission of Radiation* (acrónimo de préstamo, lexicalizado en minúscula)
* sida ← síndrome de inmunodeficiencia adquirida (acrónimo español)
* pyme ← pequeña y mediana empresa (acrónimo español)
* bit ← *binary digit* (acrónimo de préstamo)

# Cambio de sufijo derivativo

* nación / nacional
* nación / nacionalismo
* nación / nacionalista
* cultura / cultural
* cultura / culturizar
* cultura / culturismo
* música / musical
* música / musicólogo
* música / musicoterapia
* historia / histórico
* historia / historiador
* historia / historiografía
* ciencia / científico
* ciencia / cientificismo
* ciencia / cientificidad

# Familias derivativas útiles como pares mínimos

* mar / marino
* mar / marea
* mar / marítimo
* sal / salero
* sal / salina
* sal / salinidad
* tierra / terrenal
* tierra / terruño
* tierra / territorio
* sol / solar
* sol / soleado
* sol / solana
* luna / lunar
* luna / lunático
* luna / alunizar
* campo / campestre
* campo / campesino
* campo / campamento
* rey / realeza
* rey / reinado
* rey / reino

---

Banco de más de 200 pares mínimos de nivel ESO para los mecanismos principales de formación de palabras: prefijación, sufijación, parasíntesis, composición, acortamiento, siglación, acronimia y apreciativos.

---

# Morfología léxica avanzada — pares para nivel `[1B]`/avanzado

## 1. Ambigüedad de jerarquía estructural (estructura de constituyentes)

* `[[des- + bloquea] + -ble]` (*que se puede desbloquear*) **vs.** `[des- + [bloquea-ble]]` (*que no se puede bloquear*)
* `[[des- + arma] + -ble]` (*que se puede desarmar*) **vs.** `[des- + [arma-ble]]` (*que no se puede armar*)
* `[[re- + organiza] + -ble]` (*que se puede reorganizar*) **vs.** `[re- + [organiza-ble]]` (*que se puede organizar de nuevo*)
* `[[des- + moviliza] + -ble]` (*susceptible de ser desmovilizado*) **vs.** `[des- + [moviliza-ble]]` (*incapaz de ser movilizado*)

Cantera directa del ítem `piezas` modo `capas` con `alternativa_rechazada` (§3.3 del schema).

## 2. Selecciones de sufijo nominalizador deverbal (misma base verbal)

* **armado** (`base + -do`: proceso o resultado puntual) **vs.** **armadura** (`base + -dura`: objeto físico o estructura resultante)
* **armado** (`base + -do`: acción/efecto) **vs.** **armamento** (`base + -miento`: conjunto colectivo)
* **armado** (`base + -do`) **vs.** **armazón** (`base + -zón`: estructura física de soporte)
* **lavado** (`base + -do`: acción o efecto) **vs.** **lavadero** (`base + -dero`: locativo)
* **lavadero** (`base + -dero`: locativo) **vs.** **lavadora** (`base + -dora`: instrumento o máquina)
* **corte** (`base + -e`: acción o resultado) **vs.** **cortadura** (`base + -dura`: herida o marca física producida)
* **mordida** (`base + -ida`: acción puntual o efecto) **vs.** **mordedura** (`base + -dura`: lesión infligida)
* **parada** (`base + -da`: acción o lugar de detención) **vs.** **paradero** (`base + -dero`: ubicación o destino incierto)
* **secado** (`base + -do`: proceso de secar) **vs.** **secadero** (`base + -dero`: lugar acondicionado para secar)

## 3. Selecciones de sufijo adjetivador deverbal (misma base verbal)

* **cambiante** (`-nte`: participio activo, proceso en curso) **vs.** **cambiable** (`-ble`: capacidad pasiva, potencialidad)
* **cambiable** (`-ble`: susceptible de cambio) **vs.** **cambiado** (`-do`: resultado consumado)
* **destacable** (`-ble`: digno de ser destacado) **vs.** **destacado** (`-do`: que posee el rasgo consumado)
* **variable** (`-ble`: susceptible de variación) **vs.** **variado** (`-do`: de composición diversa)
* **impresionante** (`-nte`: causante del proceso) **vs.** **impresionado** (`-do`: receptor del proceso)

## 4. Alomorfia de la base (patrimonial vs. culta)

* **nochero** (base patrimonial *noch-* + *-ero*) **vs.** **nocturno** (base culta *noct-* + *-urno*)
* **lluvioso** (base patrimonial *lluvi-* + *-oso*) **vs.** **pluvial** (base culta *pluvi-* + *-al*)
* **dedal** (base patrimonial *ded-* + *-al*) **vs.** **digital** (base culta *digit-* + *-al*)
* **guerrero** (base patrimonial *guerr-* + *-ero*) **vs.** **bélico** (base culta *bel-* + *-ico*)
* **lechería** (base patrimonial *lech-* + *-ería*) **vs.** **lácteo** (base culta *lact-* + *-eo*)
* **dorado** (base patrimonial *dor-* + *-ado*) **vs.** **áureo** (base culta *aur-* + *-eo*)

> Se han retirado del original *corazonada/cordial* e *hijastro/filial*: ambos pares comparan un derivado patrimonial con un adjetivo relacional culto que no es su pareja regular de suplencia (el adjetivo relacional regular de *corazón* es *cardíaco*, de *hijo* es *filial* pero *hijastro* no es el término neutro de la serie), y habrían enseñado una correspondencia falsa.

## 5. Parasíntesis frente a derivación / prefijación

* **enloquecer** (`en- + loqu- + -ecer`: parasíntesis pura; no existe *\*enloco* ni *\*loquecer*) **vs.** **reorganizar** (`re- + organiza- + -ar`: prefijación sobre verbo derivado ya existente)
* **pordiosero** (`[por + dios] + -ero`: parasíntesis sobre compuesto; no existe *\*diosero*) **vs.** **centrocampista** (`[centro + campo] + -ista`: derivación sobre compuesto, sin parasíntesis: *centrocampo* no existe pero tampoco hace falta que exista para que el proceso sea simple sufijación)
* **aterrizar** (`a- + terr- + -izar`: parasíntesis) **vs.** **terrenal** (`terr- + -enal`: derivación denominal simple)
* **enviudar** (`en- + viud- + -ar`: parasíntesis) **vs.** **viudedad** (`viud- + -edad`: derivación denominal)
* **anochecer** (`a- + noch- + -ecer`: parasíntesis; no existe *\*nochecer* ni *\*anoche* verbal) **vs.** **pernoctar** (`per- + noct- + -ar`: prefijación sobre base culta ya verbalizable)

## 6. Sufijación apreciativa frente a lexicalización morfológica

* **casita** (`casa + -ita`: diminutivo apreciativo afectivo) **vs.** **casilla** (`casa + -illa`: derivado lexicalizado, no apreciativo)
* **camita** (`cama + -ita`: diminutivo apreciativo) **vs.** **camilla** (`cama + -illa`: derivado lexicalizado — objeto)
* **manecita** (`mano + -ecita`: diminutivo apreciativo) **vs.** **manecilla** (`mano + -ecilla`: derivado lexicalizado — aguja de reloj)
* **padrecito** (`padre + -cito`: apreciativo afectivo) **vs.** **padrastro** (`padre + -astro`: derivado no apreciativo, relación de parentesco)
* **rosquita** (`rosca + -ita`: diminutivo apreciativo) **vs.** **rosquilla** (`rosca + -illa`: derivado lexicalizado)

## 7. Oposición de valor semántico prefijal

* **deshacer** (`des-`: reversivo) **vs.** **rehacer** (`re-`: iterativo)
* **subdesarrollo** (`sub-`: grado inferior) **vs.** **superdesarrollo** (`super-`: grado superior)
* **importar** (`im-`: locativo, "hacia el interior") **vs.** **exportar** (`ex-`: locativo, "hacia el exterior")
* **intramuros** (`intra-`: interioridad) **vs.** **extramuros** (`extra-`: exterioridad)
* **prejuicio** (`pre-`: anterioridad evaluativa) **vs.** **antejuicio** (`ante-`: anterioridad procesal, término jurídico real)

> Se retira el par *anormativo/antinormativo*: *anormativo* es una formación marginal, poco documentada, y el contraste *a-* privativo / *anti-* opositivo se ilustra mejor con *asimétrico* (`a-`) frente a *antisimétrico* (`anti-`, término matemático real).

## 8. Tipología de composición (mecanismo y estructura)

* **pelirrojo** (`N + -i- + Adj`: compuesto con vocal de enlace *-i-*) **vs.** **bocacalle** (`N + N`: compuesto yuxtapuesto sin vocal de enlace)
* **hispanoamericano** (compuesto léxico consolidado, una sola palabra) **vs.** **hispano-americano** (compuesto sintagmático coordinativo con guion, dos acentos)
* **sordomudo** (`Adj + Adj`: compuesto coordinativo) **vs.** **altavoz** (`Adj + N`: compuesto subordinativo, exocéntrico — el altavoz no es un tipo de voz)
* **casa quinta** (`N + N`: compuesto sintagmático no consolidado, dos acentos) **vs.** **casaquinta** (`N + N`: compuesto ortográfico consolidado, un acento)

## 9. Alomorfia de sufijo (selección contextual del sufijo de cualidad o agente)

* **lealtad** (`base + -tad`) **vs.** **maldad** (`base + -dad`) — alomorfos del mismo sufijo de cualidad; la elección es léxica (fijada por cada base), no depende de si la base acaba en vocal o consonante
* **fidelidad** (`base culta + -idad`) **vs.** **crueldad** (`base + -dad`, con síncopa histórica de la vocal átona)
* **violinista** (`-ista`: agente profesional o artístico) **vs.** **violero** (`-ero`: agente artesanal — el que hace instrumentos de cuerda, no el que los toca)
* **florista** (`-ista`: agente profesional/comercial) **vs.** **florero** (`-ero`: recipiente, objeto instrumental — no es un agente)

## 10. Alternancia causativa frente a incoativa en derivación verbal

* **clarificar** (`claro + -ificar`: causación activa exterior) **vs.** **clarear** (`claro + -ear`: proceso incoativo, espontáneo)
* **humanizar** (`humano + -izar`: causativo activo) **vs.** **humanarse** (`humano + -ar + -se`: incoativo reflexivo)
* **dulcificar** (`dulce + -ificar`: causación deliberada) **vs.** **endulzar** (`en- + dulz- + -ar`: parasíntesis, cambio de estado)

## 11. Causativo (-izar, -ificar) frente a incoativo (-ecer, parasíntesis)

* **oscurecer** (`oscuro + -ecer`: volverse oscuro o hacer oscuro) — verbo real, doble uso causativo/incoativo. *No existe pareja causativa en \*-izar (\*oscurizar es agramatical)*: candidato directo a ítem `juicio` con `veredicto: no_existe`.
* **humidificar** (`húmedo + -ificar`: aportar humedad, causativo) **vs.** **humedecerse** (`húmedo + -ecer + se`: adquirir humedad, incoativo)
* **solidificar** (`sólido + -ificar`: convertir en sólido) **vs.** **solidificarse** (`sólido + -ificar + se`: pasar a sólido por sí mismo)
* **electrificar** (`eléctrico + -ificar`: dotar de electricidad) **vs.** **electrizarse** (`eléctrico + -izar + se`: experimentar efecto eléctrico)
* **pacificar** (`paz + -ificar`: imponer paz) **vs.** **apaciguarse** (`a- + pac- + -iguar + se`: parasíntesis, volverse pacífico)
* **intensificar** (`intenso + -ificar`: aumentar intensidad) **vs.** **intensificarse** (`intenso + -ificar + se`: aumentar por sí mismo)

## 12. Resultado (-ado) frente a capacidad (-ble)

* **cerrado** (participio resultativo) **vs.** **cerrable** (potencialidad)
* **plegado** (estado alcanzado) **vs.** **plegable** (capacidad)
* **programado** (resultado consumado) **vs.** **programable** (susceptibilidad)
* **traducido** (resultado) **vs.** **traducible** (posibilidad)
* **legible** (posibilidad de lectura) **vs.** **leído** (lectura realizada)
* **comestible** (aptitud) **vs.** **comido** (acción completada)
* **audible** (potencialidad) **vs.** **oído** (percepción realizada, como sustantivo o participio)

## 13. Agente (-dor) frente a instrumento (-dor): mismo significante, distinta lectura

* **contador** (persona que cuenta) / **contador** (aparato que cuenta)
* **secador** (persona que seca) / **secador** (máquina)
* **mezclador** (persona) / **mezclador** (utensilio)
* **aspirador** (persona) / **aspirador** (aparato)
* **triturador** (agente humano) / **triturador** (máquina)
* **proyector** (persona que proyecta) / **proyector** (aparato)

Útil como `par_minimo` de significado, no de forma: la ambigüedad agente/instrumento es rasgo estructural de `-dor`.

## 14. Lugar (-dero) frente a instrumento (-dor/-dora)

* **secadero** (lugar) **vs.** **secadora** (máquina)
* **lavadero** (lugar) **vs.** **lavadora** (instrumento)
* **tendedero** (lugar) **vs.** **tendedor** (persona o mecanismo, según contexto)
* **comedero** (lugar donde comen los animales) **vs.** **comensal** (persona que come, agente puro)

## 15. Evento (-ción) frente a resultado (-do)

* **construcción** (evento o proceso) **vs.** **construido** (resultado)
* **destrucción** (evento) **vs.** **destruido** (resultado)
* **traducción** (proceso o producto abstracto) **vs.** **traducido** (resultado concreto)
* **organización** (proceso o entidad) **vs.** **organizado** (resultado)
* **publicación** (acto o producto) **vs.** **publicado** (resultado, participio)

## 16. Evento (-miento) frente a evento (-ción)

* **descubrimiento** (`-miento`) **vs.** **cognición** (`-ción`, sobre base culta distinta pero mismo campo semántico de "conocer")
* **movimiento** (`-miento`) **vs.** **moción** (`-ción`) — mismo origen remoto, especializados en usos distintos
* **crecimiento** (`-miento`, sobre *crecer*) **vs.** **creación** (`-ción`, sobre *crear*) — **atención: bases distintas**, no es par mínimo de sufijo; se incluye solo como aviso de falso amigo morfológico para el alumnado

> Se retira *nacimiento/natividad*: *natividad* no compite con *nacimiento* como nominalización productiva, es un cultismo casi exclusivo del ámbito religioso.

## 17. Cualidad (-idad) frente a estado (-ez/-eza): bloqueo léxico

* **amabilidad** (`-idad`, productivo) — no existe **\*amableza**: el hueco lo bloquea la existencia de *amabilidad*
* **pureza** (`-eza`) **vs.** **puridad** (`-idad`, arcaizante, hoy casi solo en la locución *en puridad*)
* **riqueza** (`-eza`, productivo) — no existe **\*riquecidad**: bloqueada por *riqueza*
* **franqueza** (`-eza`, productivo) — no existe **\*francidad**: bloqueada por *franqueza*
* **honestidad** (`-idad`, productivo) **vs.** **honestez** (`-ez`, ambas normativas y vivas: raro caso de doblete no bloqueado)

Cantera directa de `juicio` con `causa: restriccion_sufijo`: las formas con `*` son las respuestas `no_existe`.

## 18. Derivación regresiva frente a derivación sufijal

* **compra** ← *comprar* (regresiva, sin sufijo añadido) **vs.** **comprador** (`-dor`, agente)
* **caza** ← *cazar* **vs.** **cazador**
* **pesca** ← *pescar* **vs.** **pescador**
* **ataque** ← *atacar* **vs.** **atacante**
* **rescate** ← *rescatar* **vs.** **rescatador**

## 19. Parasíntesis frente a prefijación sobre verbo ya existente

* **embarcar** (`em- + barco + -ar`: parasíntesis) **vs.** **reembarcar** (`re-` sobre *embarcar* ya existente: prefijación simple)
* **enjaular** (`en- + jaula + -ar`: parasíntesis) **vs.** **desenjaular** (`des-` sobre *enjaular* ya existente: prefijación simple)
* **encarcelar** (`en- + cárcel + -ar`: parasíntesis) **vs.** **excarcelar** (`ex-` + base culta *carcel-*: prefijación sobre cultismo, no sobre *encarcelar*)
* **empapelar** (`em- + papel + -ar`: parasíntesis) — no existe **\*repapelar**: se retira del original por ser forma inventada
* **embotellar** (`em- + botella + -ar`: parasíntesis) **vs.** **desembotellar** (`des-` sobre *embotellar* ya existente: prefijación simple)

## 20. Compuestos endocéntricos frente a exocéntricos

* **pelirrojo** (endocéntrico: es un tipo de persona) **vs.** **pararrayos** (exocéntrico: no es un tipo de rayo, sino un objeto que los para)
* **boquiabierto** (endocéntrico: describe a una persona) **vs.** **sacacorchos** (exocéntrico: instrumento)
* **carilargo** (endocéntrico: persona) **vs.** **rompecabezas** (exocéntrico: objeto o problema)
* **patitieso** (endocéntrico: persona) **vs.** **parachoques** (exocéntrico: objeto)
* **cabizbajo** (endocéntrico: persona) **vs.** **quitamanchas** (exocéntrico: producto)

## 21. Base patrimonial frente a base culta (series productivas)

* **agua → aguado** **vs.** **acuoso**
* **agua → aguador** **vs.** **acuífero**
* **fuego → fogoso** **vs.** **ígneo**
* **oro → dorado** **vs.** **áureo**
* **ojo → ojera** **vs.** **ocular**
* **boca → bocaza** **vs.** **oral**
* **mano → manotazo** **vs.** **manual**

> Se retira *pie → peana / pedestre*: *peana* no es derivado de *pie* (es préstamo o formación distinta, con base histórica dudosa); el contraste patrimonial/culto de *pie* se ilustra mejor con *pie → pisada* (patrimonial) **vs.** *pie → pedal* (culta, base *ped-*).

## 22. Competencia entre sufijos agentivos

* **violinista** (`-ista`) **vs.** **violero** (`-ero`, agente distinto: fabricante, no intérprete)
* **camionero** (`-ero`, el que conduce el camión) — no existe **\*camionista** en uso general: se retira del original por marginal
* **periodista** (`-ista`, profesión) — no existe **\*periodiquero** con ese sentido en español estándar: se retira
* **florista** (`-ista`) **vs.** **florero** (`-ero`, pero aquí *florero* es objeto, no agente: mismo caso que §9)
* **panadero** (`-ero`) — no existe **\*panista** con sentido de oficio (*panista* solo existe como gentilicio político en México, PAN): se retira por ambiguo fuera de contexto
* **artista** (`-ista`) **vs.** **artesano** (`-ano`, agente alternativo, campo semántico distinto)

---

# Palabras descompuestas — banco de referencia (nivel avanzado)

## Derivación (prefijación, sufijación, afijación múltiple)

| Palabra | Proceso | Segmentación |
|---|---|---|
| Bajeza | Sufijación deadjetival | `[[baj(o)] + -eza]` |
| Prever | Prefijación deverbal | `[pre- + [ver]]` |
| Nacionalizar | Sufijación encadenada | `[[[nación] + -al] + -iza(r)]` |
| Descentralización | Derivación múltiple | `[des- + [[[[centr(o)] + -al] + -iza(r)] + -ción]]` |
| Anticonstitucionalmente | Derivación múltiple extrema | `[[anti- + [[[constitu(ir)] + -ción] + -al]] + -mente]` |

## Parasíntesis (afijal y composicional)

| Palabra | Proceso | Segmentación |
|---|---|---|
| Enorgullecer | Parasíntesis afijal | `[en- + orgull(o) + -ecer]` — no existe *\*orgullecer* ni *\*enorgullo* |
| Aterrizar | Parasíntesis afijal | `[a- + terr(a) + -izar]` |
| Sietemesino | Parasíntesis composicional | `[[siete] + [mes] + -ino]` — no existe *\*sietemés* ni *\*mesino* sueltas |
| Picapedrero | Parasíntesis composicional | `[[pica(r)] + [pedr(a)] + -ero]` |
| Desalmado | Parasíntesis afijal | `[des- + alm(a) + -ado]` |

## Composición (ortográfica, sintagmática y neoclásica)

| Palabra | Proceso | Segmentación |
|---|---|---|
| Sacacorchos | Composición ortográfica | `[[saca(r)] + [corchos]]` |
| Pelirrojo | Composición con vocal de enlace | `[[pel(o)] + -i- + [rojo]]` |
| Físico-químico | Composición sintagmática | `[[físico] - [químico]]` |
| Cajero automático | Composición sintagmática lexicalizada | `[[cajero] + [automático]]` |
| Democracia | Composición neoclásica | `[[demo-] + [-cracia]]` (temas cultos griegos) |
| Biología | Composición neoclásica | `[[bio-] + [-logía]]` (temas cultos griegos) |
| Eurodiputado | Composición neoclásica | `[[euro-] + [diputado]]` (elemento compositivo culto, no acronimia) |

## Modificación apreciativa (con interfijación)

| Palabra | Proceso | Segmentación |
|---|---|---|
| Perrito | Diminutivo directo | `[[perr(o)] + -ito]` |
| Solecito | Diminutivo con interfijo | `[[sol] + -ec- + -ito]` |
| Polvareda | Derivación con interfijo | `[[polv(o)] + -ar- + -eda]` |
| Feúcho | Despectivo | `[[fe(o)] + -úcho]` |
| Casona | Aumentativo | `[[cas(a)] + -ona]` |

## Procesos extraordinarios (acortamiento, acronimia, siglación, cruce)

| Palabra | Proceso | Origen |
|---|---|---|
| Bici | Acortamiento (apócope) | Truncamiento de *bici(cleta)* |
| Finde | Acortamiento sintagmático | Truncamiento de *fin de (semana)* |
| ONG | Siglación deletreada | *O(rganización) N(o) G(ubernamental)* |
| Pyme | Sigla acronímica | *P(equeña) y m(ediana) e(mpresa)*, silabeada |
| Ofimática | Cruce léxico | *ofi(cina) + (infor)mática* |
| Portuñol | Cruce léxico con solapamiento | *portu(gués) + (espa)ñol* |

---

# Banco de Secundaria (nivel `basico`/`medio`)

## 1. Prefijación

| Palabra | Descomposición |
|---|---|
| ilegal | in- + legal |
| imposible | im- + posible |
| inmoral | in- + moral |
| irregular | ir- + regular |
| deshacer | des- + hacer |
| desconectar | des- + conectar |
| descargar | des- + cargar |
| descubrir | des- + cubrir |
| releer | re- + leer |
| reconstruir | re- + construir |
| rehacer | re- + hacer |
| submarino | sub- + marino |
| prehistoria | pre- + historia |
| posguerra | pos- + guerra |
| antideportivo | anti- + deportivo |
| multicultural | multi- + cultural |
| vicepresidente | vice- + presidente |
| supermercado | super- + mercado |

## 2. Sufijación nominal

| Palabra | Descomposición |
|---|---|
| panadero | pan + -ad- (interfijo) + -ero |
| zapatero | zapato + -ero |
| librería | libro + -ería |
| papelería | papel + -ería |
| amistad | amist- + -ad |
| belleza | bello + -eza |
| pureza | puro + -eza |
| felicidad | felic- + -idad |
| igualdad | igual + -dad |
| realidad | real + -idad |
| juventud | juven- + -tud |
| vejez | vej- + -ez |
| alcaldía | alcalde + -ía |
| heroísmo | héroe + -ísmo |
| periodismo | periódico + -ismo |

## 3. Sufijación adjetival

| Palabra | Descomposición |
|---|---|
| arenoso | arena + -oso |
| rocoso | roca + -oso |
| peligroso | peligro + -oso |
| cariñoso | cariño + -oso |
| musical | música + -al |
| nacional | nación + -al |
| comercial | comercio + -al |
| familiar | familia + -ar |
| histórico | historia + -ico |
| volcánico | volcán + -ico |
| legendario | leyenda + -ario |
| revolucionario | revolución + -ario |

## 4. Sufijación verbal

| Palabra | Descomposición |
|---|---|
| modernizar | moderno + -izar |
| hospitalizar | hospital + -izar |
| legalizar | legal + -izar |
| fertilizar | fértil + -izar |
| simbolizar | símbolo + -izar |
| esclavizar | esclavo + -izar |
| aclarar | a- + claro + -ar |
| agrandar | a- + grande + -ar |
| acortar | a- + corto + -ar |
| alargar | a- + largo + -ar |

## 5. Parasíntesis

| Palabra | Descomposición |
|---|---|
| enloquecer | en- + loqu- + -ecer |
| enrojecer | en- + roj- + -ecer |
| entristecer | en- + trist- + -ecer |
| enmudecer | en- + mud- + -ecer |
| anochecer | a- + noch- + -ecer |
| aterrizar | a- + terr- + -izar |
| embarcar | em- + barco + -ar |
| embotellar | em- + botella + -ar |
| empapelar | em- + papel + -ar |

## 6. Composición

| Palabra | Descomposición |
|---|---|
| sacacorchos | saca + corchos |
| abrelatas | abre + latas |
| limpiaparabrisas | limpia + parabrisas |
| guardameta | guarda + meta |
| guardabarros | guarda + barros |
| paracaídas | para + caídas |
| rompecabezas | rompe + cabezas |
| cortacésped | corta + césped |
| bocacalle | boca + calle |
| medianoche | media + noche |
| altavoz | alta + voz |
| agridulce | agrio + dulce |

## 7. Diminutivos

| Palabra | Descomposición |
|---|---|
| casita | casa + -ita |
| mesita | mesa + -ita |
| perrito | perro + -ito |
| gatito | gato + -ito |
| arbolito | árbol + -ito |
| ventanita | ventana + -ita |
| florecita | flor + -ecita |
| manecita | mano + -ecita |

## 8. Aumentativos

| Palabra | Descomposición |
|---|---|
| caserón | casa + -erón |
| casona | casa + -ona |
| perrazo | perro + -azo |
| ojazo | ojo + -azo |
| libraco | libro + -aco |
| hombrón | hombre + -ón |
| golpazo | golpe + -azo |
| vozarrón | voz + -arrón |

## 9. Despectivos

| Palabra | Descomposición |
|---|---|
| casucha | casa + -ucha |
| pueblucho | pueblo + -ucho |
| medicucho | médico + -ucho |
| poetastro | poeta + -astro |
| escritorzuelo | escritor + -zuelo |
| periodicucho | periódico + -ucho |
| jefecillo | jefe + -cillo |
| peliculilla | película + -illa |

## 10. Siglas y acrónimos

| Palabra | Formación |
|---|---|
| DNI | Documento Nacional de Identidad |
| ONU | Organización de las Naciones Unidas |
| ONG | Organización No Gubernamental |
| OVNI | Objeto Volador No Identificado |
| AVE | Alta Velocidad Española |
| informática | información + automática |
| cantautor | cantante + autor |
| teleñeco | televisión + muñeco |
| docudrama | documental + drama |
| eurodiputado | Europa + diputado *(composición culta con elemento **euro-**, no acronimia — ver correcciones)* |

---

## Banco mixto para análisis rápido en clase

Lista de palabras variadas para que el alumnado identifique el procedimiento de formación:

**ilegal, imposible, desconectar, releer, submarino, prehistoria, panadero, librería, felicidad, amistad, juventud, arenoso, musical, histórico, modernizar, legalizar, aclarar, agrandar, enloquecer, aterrizar, empapelar, sacacorchos, guardameta, bocacalle, medianoche, agridulce, casita, perrito, manecita, caserón, perrazo, libraco, casucha, pueblucho, medicucho, DNI, ONG, informática, teleñeco, cantautor.**

Cubre los mecanismos de formación que se trabajan entre 2.º-4.º de ESO y 1.º de Bachillerato.

---

## Lo que sigue faltando para el lote semilla de F0·3

Este banco, ya depurado, no cubre: **numerónimos** (*11-S*, *5G*), **préstamos sin adaptar** (*selfi*, *streamer*), **ortografía morfológica en forma de error** (el banco solo trae siglas correctas: faltan *ONGs*, *I.E.S.*, *pag* sin punto), y dos de los tres casos `frontera` del plan (*hispanohablante*, *malcarado* — *sietemesino* ya está aquí, §1 y sección de palabras descompuestas). Ver `docs/Fabrica_Palabras_Plan_Producto.md` §2 y `docs/Schema_Formacion_v1.0.md` §6 y §11 para el resto de huecos.
