Para que una IA pueda distinguir y analizar con precisión los **atributos locativos** según la **Nueva Gramática de la Lengua Española (NGLE)**, el prompt debe integrar los criterios de obligatoriedad, las pruebas de sustitución específicas y el comportamiento diferencial de los verbos *ser* y *estar*.

Aquí tienes una propuesta de prompt avanzado:

---

Este informe técnico detalla los criterios lingüísticos y protocolos de detección para que una aplicación de análisis sintáctico identifique y analice correctamente el **atributo locativo**, basándose en la **Nueva Gramática de la Lengua Española (NGLE)**.

### **1\. Definición y Naturaleza**

El **atributo locativo** es una función sintáctica que denota ubicación o estado situacional, predicada de un sujeto a través de verbos copulativos o semicopulativos. Aunque tradicionalmente se analizaba como un complemento circunstancial de lugar, la gramática actual lo cataloga como atributo debido a su **carácter obligatorio** para completar la predicación en este tipo de estructuras.

### **2\. Protocolo de Identificación (Algoritmo para la App)**

Para que la IA distinga esta función de un adjunto (CC), debe aplicar los siguientes filtros:

* **Verbos de enlace:** Se presenta de forma característica con los verbos **estar** (para situar entidades físicas), **ser** (para localizar eventos o sucesos) y **parecer**.  
* **Prueba de sustitución (La marca del "NO LO"):** A diferencia de los atributos adjetivales o nominales, el atributo locativo **no admite la sustitución por el pronombre neutro "lo"**.  
  * *Ejemplo:* "El jefe está en la oficina" $\\rightarrow$ No se dice "\*El jefe lo está".  
* **Sustitución por adverbios:** Se reconoce porque es conmutable por adverbios de lugar como **"aquí", "allí" o "así"**.  
  * *Ejemplo:* "La conferencia es en el auditorio" $\\rightarrow$ "La conferencia es **allí**".  
* **Indagación mediante "¿Cómo?" o "¿Dónde?":** Responde típicamente a la pregunta **¿dónde?** (ubicación) o, en ciertos contextos de estado, a **¿cómo?**.

  ### **3\. Estructura Sintáctica del Atributo Locativo**

El atributo locativo puede manifestarse a través de diversas categorías:

* **Sintagmas Preposicionales:** Es la forma más frecuente, utilizando preposiciones de ubicación como *en, bajo, tras, entre, ante*.  
* **Sintagmas Adverbiales:** Adverbios de lugar como *cerca, lejos, aquí, allí, arriba, abajo*.  
* **Gerundios de ubicación:** Algunos gerundios de movimiento pueden funcionar como atributos locativos en contextos específicos.  
  * *Ejemplo:* "El bar estaba **bajando la cuesta**".

  ### **4\. Diferenciación Crítica de Verbos (Ser vs. Estar)**

La app debe aplicar una lógica binaria según el tipo de sujeto para asignar el verbo copulativo correcto:

1. **Sujetos de entidad física (personas/cosas):** Exigen el verbo **estar** para localizarse.  
2. **Sujetos de evento (reuniones, clases, conciertos):** Exigen el verbo **ser** para situarse.  
   * *Ejemplo:* "El examen es en el aula diez" (Sujeto eventivo).

   ### **5\. Guía de Intervención y Feedback (Tarjetas de Error)**

Si un usuario marca un atributo locativo como un **Complemento Circunstancial de Lugar (CCL)**, la aplicación debe activar la siguiente lógica de error:

* **Pregunta socrática:** ¿Podrías eliminar este sintagma sin que el verbo se quede "cojo" o la oración pierda su sentido central?.  
* **Pista de resolución:** Aunque indique lugar, este elemento es **necesario** para completar el significado del verbo copulativo. Prueba a sustituirlo por **"allí"**: si tiene sentido y no puedes usar **"lo"**, estás ante un **Atributo Locativo**.

**Ejemplos de control:**

* *"Iván está en el despacho"*: Atributo Locativo (Verbo *estar* con entidad física).  
* *"La conferencia es aquí"*: Atributo Locativo (Verbo *ser* con sujeto de evento).  
* *"Comió en el restaurante"*: CCL (Verbo pleno, adjunto opcional).

---

### **Notas adicionales para el usuario:**

Este prompt obliga a la IA a respetar la distinción de la NGLE donde, a pesar de que tradicionalmente se llamaba CCL a todo lo que respondía a "¿dónde?", actualmente se reconoce que con los verbos copulativos el lugar funciona como una **propiedad o estado del sujeto**, de ahí su nombre de **Atributo Locativo**.

1. **La conferencia es aquí**.  
2. **El jefe está en la oficina**.  
3. **El problema está en el carburador**.  
4. **¿Dónde es el concierto?**.  
5. **La reunión es en mi despacho**  
6. **La conferencia es en el auditorio**   
7. **Mis llaves del coche de repuesto** **están** dentro del cajón pequeño de la mesa del recibidor de mi casa  
8. El examen **es en el aula diez**.  
9. Mis primos **están en el parque**.  
10. La conferencia **es aquí**.  
11. El coche **está delante de la puerta**.  
12. La reunión **es en mi casa**.  
13. El museo **está cerca**.  
14. Los niños **están entre los árboles**

**EL CC de Beneficiario**

El **Complemento Circunstancial (CC) de Beneficiario** (también llamado a veces adjunto benefactivo) es un tipo de complemento adjunto que designa a la **persona, animal o cosa que se ve favorecida o perjudicada** por la acción del verbo. A diferencia de los complementos argumentales, el CC de Beneficiario es una información **accesoria y prescindible**, lo que significa que puede eliminarse sin que la oración deje de ser gramatical.

A continuación, se explica su estructura y la forma precisa de distinguirlo del **Complemento Indirecto (CI)**, siguiendo los criterios de la **Nueva Gramática de la Lengua Española (NGLE)**:

### **1\. Estructura y Función**

* El CC de Beneficiario suele manifestarse como un **sintagma preposicional** introducido generalmente por la preposición **"para"**.  
* Su función es indicar el destinatario final o quien recibe el provecho de la acción, como en el ejemplo: *"Encargó una tarta **para su madre**"*.  
* En ocasiones, esta función se solapa con la de **finalidad**, ya que ambos miran hacia el propósito u objetivo del evento verbal.

Este informe técnico describe los criterios de distinción entre el **Complemento Indirecto (CI)**, el **CC de Beneficiario** y el **CC de Finalidad**, basándose en la **Nueva Gramática de la Lengua Española (NGLE)** y el **Glosario de Términos Gramaticales (GTG)**. El objetivo es proporcionar a un modelo de IA las reglas lógicas y pruebas sintácticas necesarias para un análisis automatizado preciso.

### **1\. Marcadores Preposicionales: El primer filtro**

La IA debe identificar primero el encabezamiento del **sintagma preposicional**:

* **Complemento Indirecto (CI):** Se construye **exclusivamente con la preposición "a"**.  
* **CC de Beneficiario:** Se introduce habitualmente por la preposición **"para"**.  
* **CC de Finalidad:** Se introduce mayoritariamente por **"para"**, pero también admite la preposición **"a"** cuando depende de verbos de movimiento (ej. *Vengo a que me ayudes*).

### **2\. La prueba de fuego: Sustitución Pronominal**

Esta es la distinción más crítica para el algoritmo de decisión:

* **El CI es la única función que admite la sustitución por los pronombres átonos de dativo *le* o *les***.  
* **El CC de Beneficiario y el CC de Finalidad NO admiten la sustitución por *le/les***. Si el sintagma es un beneficiario introducido por "para", la IA debe rechazar la etiqueta de CI, ya que no permite el cambio a pronombre átono (ej. *Compró un regalo para su madre* $\\rightarrow$ no se puede sustituir por *le compró un regalo* con el sentido de destino final).  
* **Sustitución de Finalidad:** Los adjuntos de finalidad se identifican porque pueden sustituirse por los sintagmas pronominales neutros **"para eso"** o **"para ello"**.

### **3\. Naturaleza Argumental vs. Adjunta**

La IA debe evaluar si el componente es exigido por el significado del verbo:

1. **CI (Argumental o Adjunto):** Puede ser una información requerida por el verbo (ej. con verbos de transferencia como *dar* o *entregar*) o un dativo no seleccionado (como el dativo de interés o simpatético).  
2. **CC de Beneficiario y Finalidad (Adjuntos):** Son siempre **informaciones accesorias y prescindibles**. Su eliminación no afecta a la gramaticalidad ni al significado básico del núcleo verbal.

### **4\. Lógica de Coaparición (Compatibilidad)**

Un criterio algorítmico útil es que estas funciones **pueden aparecer simultáneamente** en una misma oración, lo que prueba que son categorías distintas:

* *Ejemplo:* "Le (CI) entregó la carta para el Rey (CC Beneficiario)".

### **5\. Guía de Análisis para la IA (Resumen de reglas)**

| Criterio | Complemento Indirecto (CI) | CC de Beneficiario | CC de Finalidad |
| ----- | ----- | ----- | ----- |
| **Preposición** | Siempre **"a"**. | Habitualmente **"para"**. | **"Para"** o **"a"** (con verbos de movimiento). |
| **Sustitución** | **Le / Les**. | **Para él / ella**. | **Para eso / ello**. |
| **Pregunta** | ¿A quién? | ¿Para quién? | ¿Para qué? |
| **Significado** | Receptor, experimentador, destinatario. | Persona/cosa favorecida o perjudicada. | Propósito, objetivo o fin de la acción. |
| **Tipo de elemento** | Argumento o Adjunto. | Siempre Adjunto. | Siempre Adjunto. |

### **6\. Nota sobre Oraciones Compuestas**

Para el análisis de oraciones complejas, la IA debe aplicar la teoría actual de la **NGLE**, que ya **no reconoce las "oraciones subordinadas adverbiales finales"** como una categoría independiente. Estas deben analizarse como un **Sintagma Preposicional con función de CC de Finalidad**, cuyo término es una **Oración Subordinada Sustantiva** (ej. *Estudia \[para que lo contraten\]* ).

Siguiendo los criterios de la **Nueva Gramática de la Lengua Española (NGLE)**, el **Complemento Circunstancial (CC) de Beneficiario** (o adjunto benefactivo) se analiza como un **Sintagma Preposicional** introducido por la preposición **para** que designa a la persona o entidad que recibe el provecho o daño de la acción verbal. Es fundamental no confundirlo con el **Complemento Indirecto (CI)**, ya que este último siempre se introduce con la preposición **a** y admite la sustitución por los pronombres átonos *le/les*, mientras que el CC de Beneficiario no permite dicho cambio.

Aquí tienes 10 ejemplos de oraciones simples con CC de beneficiario:

1. He pillado una entrada de pista para el festival **para mi mejor amigo**.  
2. Estamos montando una fiesta sorpresa de graduación **para toda la clase**.  
3. He resumido todos los temas de Geografía **para mi grupo de estudio**.  
4. Mis tíos han comprado un altavoz Bluetooth nuevo **para mi hermano**.  
5. Estoy grabando este tutorial de maquillaje de tendencia **para mis seguidoras**.  
6. He conseguido un código de descuento de la tienda de ropa **para mi prima**.  
7. He pedido una ración grande de patatas bravas **para nosotros**.  
8. He guardado una silla en la biblioteca **para mi novia**.  
9. He preparado una tarta de chocolate casera **para mi mejor amiga**.  
10. He traído el cargador del móvil de repuesto **para el chico nuevo**.

Como se observa en los ejemplos, estas estructuras funcionan como **adjuntos**, lo que significa que son informaciones accesorias que pueden eliminarse sin que la oración deje de ser gramatical.

Aunque la preposición **para** es el marcador más frecuente del **Complemento Circunstancial (CC) de finalidad**, la Nueva Gramática de la Lengua Española (NGLE) identifica otras preposiciones y locuciones que desempeñan esta función, siempre que expresen el propósito, objetivo o fin de la acción.

### **1\. La preposición "a"**

Esta preposición introduce complementos con valor final principalmente cuando dependen de **verbos de movimiento** (como *ir, venir, subir, bajar, volver*) o de verbos que expresan el cese de un movimiento (*detenerse*).

* **Análisis técnico:** Se analiza como un **Sintagma Preposicional** cuya función es CC de Finalidad.  
* **Ejemplos:** "Vengo **a la revisión anual**"; "Acércate, **que (para que) te diga una cosa**".  
* **Restricciones:** El verbo principal debe tener un destino y el predicado de la oración final debe ser un verbo de acción, no de estado. Además, las construcciones finales con "a" tienden a rechazar la negación.

### **2\. La preposición "por"**

Aunque su valor prototípico es causal, la preposición **por** puede adquirir un sentido final en determinados contextos, especialmente cuando el término es un infinitivo o una oración en subjuntivo.

* **Ejemplos:** "Me río **por no llorar**"; "La juventud debe luchar **por que la libertad sea una realidad**".  
* **Matiz:** En estos casos, se solapan las nociones de causa y finalidad, pues el propósito de algo es, a la vez, la causa que motiva la acción.

### **3\. Locuciones preposicionales de valor final**

Existen agrupaciones de palabras que funcionan conjuntamente como una preposición para marcar el objetivo de la predicación. Según la NGLE, estas estructuras forman un **Sintagma Preposicional** cuyo término puede ser un grupo nominal, un infinitivo o una oración sustantiva.

Las locuciones más habituales son:

* **A fin de (que):** "He presentado una reclamación **a fin de que me devuelvan el dinero**".  
* **Con miras a:** "Ejercita sus músculos **con miras a una competición**".  
* **En orden a:** Introduce complementos que expresan propósito o utilidad.  
* **Al objeto de / Con el objeto de:** "He puesto una reclamación **al objeto de recibir alguna compensación económica**".  
* **Con la intención de / Con el propósito de:** "Pusimos el cartel en el portal **con el propósito de que apareciera el dueño de la cartera**".

**Nota sobre el análisis:** Actualmente, las antiguas "oraciones subordinadas adverbiales finales" ya no se consideran una categoría independiente. Se analizan como un **Sintagma Preposicional** en función de **CC de Finalidad**, donde la preposición (o locución) toma como término una **Oración Subordinada Sustantiva**.

A continuación se presentan diez ejemplos de **Complemento Circunstancial (CC) de Finalidad** utilizando tanto la preposición **"por"** (que en ciertos contextos adquiere valor final) como diversas **locuciones preposicionales**, siguiendo los criterios de la **Nueva Gramática de la Lengua Española (NGLE)**.

Según la normativa actual, estas estructuras se analizan como un **sintagma preposicional** cuya función es la de adjunto de finalidad, independientemente de que su término sea un nombre o un infinitivo.

### **Ejemplos con locuciones preposicionales de finalidad**

1. Revisó los apuntes **a fin de preparar el examen**.  
2. Entrenaba a diario **con miras a la victoria final**.  
3. Ha solicitado una beca **con la intención de estudiar un máster**.  
4. Pusieron vallas **al objeto de controlar el acceso de público**.  
5. Ahorra dinero **con el propósito de comprarse un coche nuevo**.  
6. Se está preparando físicamente **en orden a una mejor organización de su tiempo**.

### **Ejemplos con la preposición "por" con valor final**

Aunque la preposición **"por"** es habitualmente causal, la **NGLE** señala que mantiene su originario valor final en determinados contextos, a menudo intercambiable con "para". En estos casos, la finalidad (el propósito futuro) actúa como el motivo que origina la acción.

7. Habla en voz baja **por no molestar a los vecinos**.

### **Notas técnicas sobre el análisis**

* **Naturaleza del sintagma:** En todos estos ejemplos, la función de finalidad es desempeñada por un **sintagma preposicional**.  
* **Distinción con el CI:** Es importante recordar que estos sintagmas no son complementos indirectos, ya que no admiten la sustitución por los pronombres átonos *le/les* \[35.1.1b, 578\].  
* **Relación Causa-Finalidad:** En las construcciones con **"por"**, existe un solapamiento entre la causa y la finalidad, pues el propósito futuro es, al mismo tiempo, el motor o razón de la acción presente.

Aquí tienes ejemplos de **oraciones simples** que contienen un **Complemento Circunstancial (CC) de Finalidad** introducido por la preposición **"a"**, siguiendo los criterios de la **Nueva Gramática de la Lengua Española (NGLE)**:

1. **Vengo a la revisión anual**.  
2. **Los alumnos subieron al estrado a la entrega de diplomas**.  
3. **Se detuvo a la compra del pan**.

Recuerda que, para que la preposición **"a"** pueda introducir un **adjunto de finalidad**, el verbo principal debe ser de **movimiento** (como *ir, venir, subir, salir*) o expresar el **cese** de uno (*detenerse*). Además, estas estructuras se identifican porque responden a la pregunta **¿a qué?** y admiten la sustitución por las formas neutras **"a eso"** o **"para eso".**

**EL DATIVO ÉTICO**

Este informe técnico describe los criterios lingüísticos y algoritmos de decisión para que una aplicación pueda identificar y analizar correctamente el **dativo ético**, basándose en la **Nueva Gramática de la Lengua Española (NGLE)** y los materiales técnicos proporcionados.

### **1\. Definición y Naturaleza del Dativo Ético**

El **dativo ético** es un pronombre átono de dativo (*me, te, se, nos, os, le, les*) que desempeña una función **no argumental**. Su función principal no es designar a un participante necesario de la acción, sino señalar al **individuo que se ve afectado indirectamente** por la acción verbal, aportando un alto contenido **afectivo o enfático**.

### **2\. Protocolo de Identificación (Algoritmo para la App)**

Para que la IA distinga este dativo de un Complemento Indirecto (CI) argumental, debe aplicar los siguientes filtros:

* **Prueba de la supresión (Criterio de opcionalidad):** La marca más clara es que su eliminación **no implica la pérdida de ninguna función referencial** de la oración ni afecta su gramaticalidad.  
  * *Ejemplo:* "No se **me** acalore"--."No se acalore" (La oración sigue siendo perfecta, solo pierde el matiz de afectividad del hablante).  
* **Naturaleza no reflexiva:** A diferencia de los dativos de los verbos pronominales o reflexivos, el dativo ético suele ser **no reflexivo** y no es exigido por el significado del verbo.

### **3\. Diferenciación Crítica de Funciones Afines**

La App debe ser capaz de desambiguar el dativo ético de otras variantes del dativo no argumental:

| Función | Diferencia clave para la IA | Ejemplo |
| ----- | ----- | ----- |
| **Dativo Ético** | Señala afectividad del hablante; **no concuerda** con el sujeto. | "No te **me** caigas" |
| **Dativo Aspectual** | Tiene valor enfático pero **siempre concuerda** en número y persona con el sujeto. | "Nos fumábamos dos cajetillas" |
| **Dativo Simpatético** | Expresa **posesión o inclusión** (especialmente partes del cuerpo o la esfera personal). | "Se **le** hincharon los pies" |
| **Dativo de Interés** | Designa a quien resulta **beneficiado o perjudicado**. | "**Me** buscaron un albergue" |

### **4\. Guía de Intervención (Feedback para el Usuario)**

Si un usuario marca un dativo ético como un Complemento Indirecto (CI) argumental, la app debe mostrar la siguiente tarjeta de error:

* **Consejo fijo (Pregunta socrática):** Intenta eliminar ese pronombre ("me", "te", "se"). ¿La frase sigue teniendo sentido y mantiene los mismos protagonistas?.  
* **Pista de resolución:** Si al quitar el pronombre la oración es gramatical y solo pierde un matiz afectivo o de énfasis (ej. *"Se comió la tarta"*), estás ante un **Sintagma Pronominal en función de Dativo (ético o aspectual)**, no un CI argumental.

Este informe técnico detalla los criterios lingüísticos y protocolos de detección para que una aplicación de análisis sintáctico identifique correctamente el **dativo de interés**, basándose en la **Nueva Gramática de la Lengua Española (NGLE)**.

### **1\. Definición y naturaleza**

El **dativo de interés** (también llamado dativo de daño o provecho) es un **complemento indirecto no argumental** o **adjunto**. A diferencia de los complementos requeridos por el verbo (como en los verbos de transferencia), este dativo designa a la **persona, animal o cosa que se ve favorecida o perjudicada** por la acción verbal sin que el verbo la exija para completar su significado.

### **2\. Protocolo de Identificación (Algoritmo para la App)**

Para distinguir esta función de un Complemento Indirecto (CI) argumental, la IA debe ejecutar los siguientes filtros:

* **Prueba de la supresión (Opcionalidad):** El dativo de interés es un adjunto. Su eliminación **no afecta la gramaticalidad** de la oración ni hace que el verbo pierda su sentido básico.  
  * *Ejemplo:* "**Me** buscaron un albergue" $\\rightarrow$ "Buscaron un albergue".  
* **Marcadores morfológicos:** Se manifiesta mediante un **pronombre átono de dativo** (*me, te, se, le, nos, os, les*).  
* **Estructura de duplicación:** A menudo aparece duplicado por un grupo preposicional introducido por la preposición **"a"**. Es raro que este dativo aparezca solo como grupo preposicional sin el pronombre átono.  
  * *Ejemplo:* "**Le** reparó la lavadora **a mi madre**".

### **3\. Diferenciación Crítica de Funciones Afines**

La app debe ser capaz de desambiguar el dativo de interés de otros dativos no argumentales:

| Función | Diferencia Clave para la IA | Ejemplo de referencia |
| ----- | ----- | ----- |
| **Dativo de Interés** | Hay un **beneficio o daño real** resultante de la acción. | "**Te** hizo un estropicio". |
| **Dativo Ético** | Solo aporta un matiz **afectivo o enfático** del hablante; no indica beneficio material. | "No se **me** acalore". |
| **Dativo Simpatético** | Expresa **posesión o inclusión** (partes del cuerpo o esfera personal). | "Se **le** hincharon los pies". |
| **Dativo Aspectual** | Valor enfático; **concuerda** siempre con el sujeto y requiere predicados delimitados. | "**Nos** fumábamos dos cajetillas". |

### **4\. Guía de Intervención y Feedback (Tarjetas de Error)**

Si el usuario marca un dativo de interés como un CI argumental, la aplicación debe activar una **Tarjeta de Error Específica** con la siguiente lógica:

* **Pregunta socrática:** ¿El verbo realmente exige a este participante "por contrato" para tener sentido, o es un detalle opcional que indica quién sale ganando o perdiendo?.  
* **Pista de resolución:** Intenta eliminar el pronombre. Si la oración sigue siendo perfecta y solo pierde el matiz de quién se beneficia (ej. *"Le recogió las cartas" \- "Recogió las cartas"*), estás ante un **Sintagma Pronominal en función de Dativo (de interés)**, no un CI argumental.

### **5\. Casos Especiales de Análisis**

* **Verbos de afección:** Con verbos como *doler*, el dativo puede ser simultáneamente argumental (experimentador) y simpatético (poseedor), por lo que la IA debe priorizar la etiqueta de **experimentador** si el sentimiento es el eje de la predicación.  
* **Se aspectual:** La IA debe notar que el "se" aspectual es una variante de estos dativos que a menudo se integra en el verbo para marcar la completitud de la acción (ej. *"Se comió la tarta"*).

Esta es una lección sencilla sobre el **núcleo del predicado**, el motor de la oración, basada en los materiales técnicos proporcionados.

---

### **📘 Micro-Lección: El Núcleo del Predicado (N)**

El predicado es la parte de la oración que dice algo del sujeto. Dentro de ese grupo de palabras, el elemento más importante es el **Núcleo (N)**.

#### **1\. ¿Qué palabra es siempre el núcleo?**

El núcleo del predicado es siempre un **verbo**. Es la palabra que funciona como el "motor" de la acción o como un "puente" para unir al sujeto con sus cualidades.

#### **2\. Formas que puede adoptar el núcleo**

No siempre es una sola palabra. El núcleo puede presentarse de tres formas:

* **Un verbo simple:** "Llegamos hoy" (Núcleo: *Llegamos*).  
* **Una perífrasis verbal:** "Se puso a hablar solo" (Núcleo: *Se puso a hablar*).  
* **Una locución verbal:** "La vecina dio a luz ayer" (Núcleo: *dio a luz*).

#### **3\. La regla de oro: La concordancia**

El núcleo del predicado tiene una conexión especial con el sujeto: **siempre deben concordar en número y persona**. Si cambias el sujeto de singular a plural, el núcleo del predicado se verá obligado a cambiar también.

---

### **📝 Quizz de Entrenamiento. El núcleo del predicado**

**1\. En la oración "Mis amigos han decidido ir al cine", ¿cuál es el núcleo del predicado?** A) Mis amigos. B) Han decidido ir. C) Al cine.

**Respuesta correcta: B.** El núcleo puede ser una perífrasis verbal completa que funciona como una unidad.

**2\. ¿Qué ocurre con el núcleo del predicado si cambiamos el sujeto de "El niño juega" a "Los niños..."?** A) El núcleo no cambia porque es invariable. B) El núcleo cambia a "juegan" por la regla de concordancia. C) El núcleo desaparece.

**Respuesta correcta: B.** El sujeto y el núcleo del predicado están "engranados" y deben coincidir siempre en número y persona.

**3\. En una oración con un verbo como "ser", "estar" o "parecer" (copulativos), ¿cuál es la función del núcleo?** A) Indicar una acción física muy violenta. B) Servir de "puente" o "espejo" entre el sujeto y una cualidad (Atributo). C) Funcionar como un Complemento Circunstancial.

**Respuesta correcta: B.** Estos verbos son núcleos que funcionan como una "cinta adhesiva" o puente para conectar al sujeto con su Atributo.

Siguiendo el modelo pedagógico de los materiales proporcionados, aquí tienes una tarjeta de error genérica diseñada para cuando el alumno marca cualquier complemento o función (como un sustantivo o adjetivo) en lugar del motor de la oración:

---

##### **❌ Marcada: Otra función → ✅ Correcta: Núcleo del Predicado (N)**

* **Consejo (Pregunta socrática):** Sé que esa palabra parece la más importante del mensaje, pero ¿es realmente la que funciona como el **"motor"** de la frase y la que está directamente conectada con el sujeto?.  
* **Pista:** El núcleo del predicado es **siempre un verbo** (ya sea en forma simple, como una perífrasis o como una locución verbal). Para identificarlo con seguridad, aplica la **prueba de la concordancia**: cambia el sujeto de singular a plural; la palabra que se vea obligada a cambiar su terminación para que la frase siga teniendo sentido es, sin duda, el núcleo.

---

 

Siguiendo el modelo pedagógico de las fuentes y la estructura de las lecciones anteriores, aquí tienes las tarjetas de error genéricas para los complementos circunstanciales de lugar y tiempo.

---

##### **❌ Marcada: Otra función → ✅ Correcta: CC de Lugar (CCL)**

* **Consejo (Pregunta socrática):** Sé que esa palabra o grupo de palabras parece importante para situarnos, pero ¿es una pieza vital del engranaje del verbo o es solo un **"decorado" espacial** que nos indica dónde ocurre la acción y que podríamos borrar sin que la frase se rompa?.  
* **Pista:** Los complementos circunstanciales son **adjuntos**, lo que significa que son opcionales y móviles. Para confirmarlo, intenta sustituir todo el bloque por el adverbio **"allí"**. Si la frase sigue teniendo sentido y responde a la pregunta **¿dónde?**, has encontrado un CC de Lugar.

---

##### **❌ Marcada: Otra función → ✅ Correcta: CC de Tiempo (CCT)**

* **Consejo (Pregunta socrática):** ¿Este grupo de palabras es indispensable para que el verbo funcione, o simplemente nos está dando un **contexto temporal** (un "cuándo") que podríamos eliminar dejando el esqueleto de la oración intacto?.  
* **Pista:** El CC de Tiempo funciona como un marco que sitúa el evento. Para identificarlo con seguridad, comprueba si puedes sustituirlo por el adverbio **"entonces"**. Si el bloque de palabras responde a la pregunta **¿cuándo?** y es una información accesoria, se trata de un CC de Tiempo.

---

 

Aquí tienes la mini lección simplificada sobre el **Modificador Oracional** (o Complemento Periférico) y su correspondiente tarjeta de error técnica, basada en la **NGLE** y los esquemas proporcionados.

---

### **📘 Mini Lección: El Modificador Oracional (C. Periférico)**

El **Modificador Oracional** es un elemento "extra" que no forma parte del predicado principal porque no modifica solo al verbo, sino a **toda la oración**.

#### **1\. ¿Cómo reconocerlo?**

* **Posición**: Suele aparecer al principio o al final de la frase.  
* **Señal visual**: Casi siempre va **aislado por comas** o pausas entonativas.  
* **Función**: No explica el "cómo" o el "cuándo" de la acción, sino que expresa la **opinión del hablante**, el **tema** del que se va a hablar o una **condición** general.

#### **2\. Tipos comunes**

* **Opinión/Actitud**: *"**Sinceramente**, no tengo hambre"* (El hablante valora su propio acto de decir).  
* **Marco o Tema**: *"**Económicamente**, el país mejora"* (Introduce el marco de referencia).  
* **Estructuras Bimembres**: Las oraciones **condicionales** (*Si llueve...*), **concesivas** (*Aunque duela...*) e **ilativas** (*...así que me voy*) funcionan como modificadores oracionales porque condicionan a toda la frase principal.

---

### **📝 Tarjeta de Error: Modificador Oracional**

Esta tarjeta se activa cuando el alumno confunde un elemento periférico con un complemento interno del verbo (como un CC).

---

##### **❌ Marcada: Función interna (CC) → ✅ Correcta: Modificador Oracional (C. Periférico)**

* **Consejo (Pregunta socrática):** Fíjate en esa **coma** que separa al grupo de palabras. ¿Realmente está dándonos un detalle de la acción del verbo o está sirviendo para **enmarcar o comentar todo el mensaje** desde fuera?.  
* **Pista:** Los complementos circunstanciales (CC) son el "decorado" del verbo. El **Modificador Oracional** es el "comentario" o la "condición" del hablante para toda la frase. Si puedes eliminarlo y la acción principal no cambia, pero notas que afectaba a la intención de todo el enunciado (ej: *"Francamente..."*, *"Por desgracia..."*, *"Si no vienes..."*), es un **Complemento Periférico**.

---

 