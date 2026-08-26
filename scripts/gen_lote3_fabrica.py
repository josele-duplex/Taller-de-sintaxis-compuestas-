# -*- coding: utf-8 -*-
"""Genera docs/lotes/Formacion_Banco_lote3.tsv (FP_0099-FP_0122).

NO hace falta ejecutarlo para el dia a dia: el TSV ya esta generado y commiteado,
y es ese archivo el que se importa al Sheet. Esto vive aqui para poder CORREGIR el
lote sin editar a mano 24 lineas de JSON gigante: se toca el reto aqui, se lanza
`python scripts/gen_lote3_fabrica.py` desde la raiz del repo y se valida con
`node scripts/validar-banco.mjs formacion docs/lotes/Formacion_Banco_lote3.tsv`.

Contenido y criterios: docs/Auditoria_Fabrica_Reflexion_2026-08.md §3.
Schema: docs/Schema_Formacion_v1.0.md (v1.3, con la causa `no_lexicalizada`).
"""
import json, io
FUENTE = "Auditoria_Fabrica_Reflexion_2026-08 §3 (lote 3)"
retos = []

def reto(id_, nivel, curso, titulo, corpus, items, gris=False, origen="propio"):
    retos.append({
        "schema_version": "1.0", "id": id_, "nivel": nivel,
        "titulo_problema": titulo, "corpus": corpus, "items": items,
        "zona_gris": gris, "metadatos": {"origen_ud": origen, "curso_min": curso},
    })

def op(texto, ok, micro): return {"texto": texto, "ok": ok, "micro": micro}

def intruso(palabras, respuesta, feedback):
    return {"tipo": "intruso", "palabras": palabras, "respuesta": respuesta, "feedback": feedback}

def agrupa(criterio, cestas, sobrantes, feedback):
    it = {"tipo": "agrupa", "criterio": criterio,
          "cestas": [{"nombre": n, "palabras": p} for n, p in cestas], "feedback": feedback}
    if sobrantes: it["sobrantes"] = [{"palabra": p, "micro": m} for p, m in sobrantes]
    return it

def par(a, b, opciones):
    return {"tipo": "par_minimo", "forma_a": a, "forma_b": b, "cambio": a + " → " + b, "opciones": opciones}

def juicio(forma, veredicto, explicacion, causa=None, opciones_causa=None,
           forma_correcta=None, contexto=None):
    it = {"tipo": "juicio", "forma": forma, "veredicto": veredicto}
    if contexto: it["contexto"] = contexto
    if causa:
        it["causa"] = causa
        it["opciones_causa"] = opciones_causa
        if forma_correcta is not None: it["forma_correcta"] = forma_correcta
    it["explicacion"] = explicacion
    return it

def cortar(palabra, cortes, feedback):
    return {"tipo": "piezas", "modo": "cortar", "palabra": palabra, "cortes": cortes, "feedback": feedback}

def etiquetar(palabra, cortes, etiquetas):
    return {"tipo": "piezas", "modo": "etiquetar", "palabra": palabra, "cortes": cortes, "etiquetas": etiquetas}

def cadena(pasos, distractores, feedback):
    return {"tipo": "cadena", "pasos": pasos, "distractores": distractores, "feedback": feedback}

def clasifica(palabra, procedimiento, prueba, distractores, enunciado="tecnico", peso=None):
    it = {"tipo": "clasifica_prueba", "palabra": palabra, "procedimiento": procedimiento,
          "prueba_id": prueba, "distractores": distractores, "enunciado": enunciado}
    if peso: it["peso"] = peso
    return it

def cascada(palabra, pasos, procedimiento=None, conclusion=None):
    it = {"tipo": "cascada", "palabra": palabra,
          "pasos": [{"pregunta": q, "respuesta": r} for q, r in pasos]}
    if conclusion: it["conclusion"] = conclusion
    else: it["procedimiento"] = procedimiento
    return it

def frontera(palabra, opciones, explicacion, peso=2):
    return {"tipo": "frontera", "palabra": palabra, "opciones": opciones,
            "explicacion": explicacion, "peso": peso}

# Preguntas de cascada reutilizables (redacción fijada en la revisión ago-2026)
Q_COMPUESTA = "¿Está formada uniendo dos palabras que aportan su significado a la palabra nueva?"
Q_INICIALES = "¿Está hecha solo con las iniciales de varias palabras?"
Q_OTRA_LENGUA = "¿Ha entrado desde otra lengua, tal cual o adaptada a nuestra escritura?"

# ══════════════════════════════════════════════════════════════════════════
# LÍNEA A · ¿Imposible o solo no acuñada? (avanzado, causa `no_lexicalizada`)
# ══════════════════════════════════════════════════════════════════════════

reto("FP_0099", "avanzado", "1B", "¿Se puede fabricar 'desrobotizar'?",
     ["robot", "robótica", "robotizar", "robotización", "desrobotizar"], [
    intruso(["robot", "robótica", "robotizar", "robusto"], "robusto",
            "'Robusto' empieza igual, pero significa fuerte: el parecido es solo de letras."),
    juicio("desrobotizar", "dudosa",
           "'Des-' se une a verbos que nombran una acción, y 'robotizar' lo es: cualquiera entiende "
           "'desrobotizar' a la primera. No está en el diccionario porque casi nadie ha necesitado nombrar "
           "esa operación, no porque el español la rechace.",
           causa="no_lexicalizada", opciones_causa=["no_lexicalizada", "restriccion_sufijo"]),
    juicio("*robotidad", "no_existe",
           "'-idad' se apoya en adjetivos ('normal' → 'normalidad'), no en nombres como 'robot'. Aquí el "
           "español ya tiene 'robótica' ocupando ese hueco. Fíjate en la diferencia con 'desrobotizar': "
           "aquella se podía fabricar y solo faltaba que alguien la usara; esta ni siquiera se puede.",
           causa="restriccion_sufijo", opciones_causa=["restriccion_sufijo", "falta_base"],
           forma_correcta="robótica",
           contexto="Un alumno quería nombrar el campo de los robots y escribió…"),
    juicio("robotización", "correcta",
           "'Robotizar' existe y '-ción' nombra la acción de un verbo: la palabra está bien fabricada y "
           "además se usa todos los días."),
    clasifica("robotización", "derivada", "PRU-MORF-DERIV-01",
              ["PRU-MORF-CLEX-01", "HEUR-DOS-PARTES"]),
])

reto("FP_0100", "avanzado", "1B", "Una palabra traída del inglés, ¿fabrica familia en español?",
     ["tuit", "tuitear", "tuitero", "tuiteo"], [
    agrupa("familia_lexica",
           [("Salen de 'tuit'", ["tuit", "tuitear", "tuitero", "retuitear"]),
            ("No tienen nada que ver", ["tutear", "tutor"])],
           [("tutear", "Se parece en las letras, pero 'tutear' es tratar de tú: no habla de mensajes.")],
           "Compartir letras no basta: hay que compartir el significado de base."),
    juicio("*tuitación", "no_existe",
           "El hueco para nombrar la acción ya lo ocupa 'tuiteo', que es la forma que ha cuajado. Cuando la "
           "casilla está llena, la otra pieza no entra.",
           causa="restriccion_sufijo", opciones_causa=["restriccion_sufijo", "alomorfo_incorrecto"],
           forma_correcta="tuiteo",
           contexto="Un alumno quería nombrar la acción de tuitear y escribió…"),
    juicio("tuiteable", "dudosa",
           "'-ble' se une a verbos y significa 'que se puede…': 'tuiteable' se entiende sin que nadie la "
           "explique. Que no esté en el diccionario no la hace imposible; es una palabra que la lengua "
           "podría adoptar mañana.",
           causa="no_lexicalizada", opciones_causa=["no_lexicalizada", "restriccion_sufijo"]),
    juicio("tuitero", "correcta",
           "'-ero' fabrica nombres de persona sobre nombres, igual que en 'pan' → 'panadero'. Una palabra "
           "venida de fuera ya se comporta como cualquier palabra de aquí."),
    cascada("tuit", [(Q_COMPUESTA, "no"), (Q_INICIALES, "no"), (Q_OTRA_LENGUA, "si")],
            procedimiento="prestamo"),
])

reto("FP_0101", "avanzado", "1B", "¿Hasta dónde se puede seguir fabricando sobre 'reciclar'?",
     ["reciclar", "reciclable", "reciclaje", "reciclabilidad"], [
    intruso(["reciclar", "reciclaje", "reciclable", "recital"], "recital",
            "'Recital' empieza con las mismas letras, pero es un concierto: no tiene nada que ver con "
            "volver a usar algo."),
    juicio("*reciclamiento", "no_existe",
           "'-miento' y '-aje' compiten para nombrar la acción, y en este verbo el hueco lo ocupa "
           "'reciclaje'. No es que '-miento' esté mal en general: es que aquí llega tarde.",
           causa="restriccion_sufijo", opciones_causa=["restriccion_sufijo", "parasintesis_incompleta"],
           forma_correcta="reciclaje"),
    juicio("reciclabilidad", "dudosa",
           "Está bien fabricada: '-idad' se apoya en un adjetivo ('reciclable') y fabrica un nombre. Aparece "
           "en informes técnicos y suena rara en una conversación: posible, pero todavía no asentada.",
           causa="no_lexicalizada", opciones_causa=["no_lexicalizada", "restriccion_sufijo"]),
    juicio("reciclable", "correcta",
           "'Reciclar' es un verbo y '-ble' se une a verbos: la palabra está bien fabricada y es de uso "
           "corriente."),
    etiquetar("reciclable", ["re", "cicl", "able"], ["prefijo", "raiz", "sufijo"]),
])

reto("FP_0102", "avanzado", "1B", "Una palabra prestada que ya fabrica hijas",
     ["fútbol", "futbolista", "futbolero", "futbolístico"], [
    intruso(["fútbol", "futbolista", "futbolero", "futuro"], "futuro",
            "'Futuro' empieza parecido y habla del tiempo que vendrá: nada que ver con el balón."),
    juicio("*futbolidad", "no_existe",
           "'-idad' necesita un adjetivo debajo, y 'fútbol' es un nombre. Para decir 'lo relativo al fútbol' "
           "el español ya tiene 'futbolístico'.",
           causa="restriccion_sufijo", opciones_causa=["restriccion_sufijo", "falta_base"],
           forma_correcta="futbolístico",
           contexto="Un alumno quería decir 'lo relativo al fútbol' y escribió…"),
    juicio("futbolizar", "dudosa",
           "'-izar' fabrica verbos sobre nombres ('nación' → 'nacionalizar'), así que 'futbolizar' se "
           "entiende: convertir algo en fútbol. Nadie la ha necesitado todavía, y por eso no está recogida.",
           causa="no_lexicalizada", opciones_causa=["no_lexicalizada", "alomorfo_incorrecto"]),
    juicio("futbolero", "correcta",
           "Sobre una palabra venida del inglés, el español fabrica con sus propias piezas: 'futbolero' está "
           "bien formada y se usa."),
    clasifica("fútbol", "prestamo", "PRU-MORF-PREST-01", ["PRU-MORF-ACORT-01", "HEUR-MEMORIA"]),
])

reto("FP_0103", "avanzado", "1B", "¿Por qué 'salinidad' sí y 'salidad' no?",
     ["sal", "salero", "salado", "salinidad"], [
    agrupa("familia_lexica",
           [("Tienen que ver con la sal", ["sal", "salero", "salado", "salina"]),
            ("No tienen que ver con la sal", ["salir", "salón"])],
           [("salón", "Empieza igual y no tiene nada que ver: en un salón no hay sal.")],
           "El mismo trozo de letras no garantiza el mismo significado de base."),
    juicio("*salidad", "no_existe",
           "'-idad' se apoya en un adjetivo, no en un nombre: no parte de 'sal', sino de 'salino'. Por eso "
           "la palabra que existe es 'salinidad'.",
           causa="restriccion_sufijo", opciones_causa=["restriccion_sufijo", "falta_base"],
           forma_correcta="salinidad",
           contexto="Un alumno quería nombrar la cantidad de sal que tiene el agua del mar y escribió…"),
    juicio("salerito", "dudosa",
           "Los diminutivos se fabrican sobre la marcha: 'salerito' no está en el diccionario y no le hace "
           "ninguna falta, porque cualquier hablante la crea y la entiende al vuelo. Ahí se ve que la lengua "
           "no es una lista cerrada de palabras.",
           causa="no_lexicalizada", opciones_causa=["no_lexicalizada", "alomorfo_incorrecto"]),
    juicio("salado", "correcta",
           "'Sal' + '-ado' fabrica un adjetivo perfectamente normal: la palabra existe y se usa."),
    etiquetar("salinidad", ["sal", "in", "idad"], ["raiz", "sufijo", "sufijo"]),
])

# ══════════════════════════════════════════════════════════════════════════
# LÍNEA B · ¿Qué hace cada pieza? (efecto formativo dentro de `par_minimo`)
# ══════════════════════════════════════════════════════════════════════════

reto("FP_0104", "basico", "1E", "¿Qué cambia cada vez que 'zapato' se convierte en otra palabra?",
     ["zapato", "zapatero", "zapatería", "zapatilla"], [
    agrupa("familia_lexica",
           [("Son de la familia de 'zapato'", ["zapato", "zapatero", "zapatería", "zapatilla"]),
            ("No son de esa familia", ["zapear", "zarpa"])],
           [("zapear", "Empieza igual, pero es cambiar de canal: no tiene nada que ver con los zapatos.")],
           "Para ser de la misma familia hay que compartir el trozo Y el significado."),
    par("zapato", "zapatero", [
        op("Nombra a la persona que trabaja con eso", True, "El zapatero es quien hace o arregla zapatos."),
        op("Dice que hay más de uno", False, "Eso es lo que hace 'zapatos'.")]),
    juicio("*eríazapat", "no_existe",
           "Los trozos están puestos al revés: primero va 'zapat-' y detrás '-ería'.",
           causa="orden_piezas", opciones_causa=["orden_piezas", "falta_base"],
           forma_correcta="zapatería"),
    par("zapato", "zapatilla", [
        op("Nombra otra cosa parecida, pero distinta", True,
           "Una zapatilla no es un zapato pequeño: es otro tipo de calzado."),
        op("Dice que es más pequeño", False, "Eso pasa con 'zapatito', que sí es un zapato pequeño.")]),
    etiquetar("zapatería", ["zapat", "ería"], ["raiz", "sufijo"]),
], origen="UD Gramatica_01 1ESO S4")

reto("FP_0105", "basico", "1E", "Tres trozos distintos para la misma palabra",
     ["leche", "lechero", "lechería", "lechoso"], [
    intruso(["leche", "lechero", "lechuga", "lechoso"], "lechuga",
            "'Lechuga' empieza igual, pero es una verdura: no tiene nada que ver con la leche."),
    par("leche", "lechero", [
        op("Nombra a la persona que la reparte o la vende", True, "El lechero trae la leche."),
        op("Dice cómo es algo", False, "Eso lo hace 'lechoso'.")]),
    par("leche", "lechoso", [
        op("Dice cómo es algo: que parece leche", True, "Un líquido lechoso tiene el aspecto de la leche."),
        op("Nombra el sitio donde se vende", False, "Ese sitio es la 'lechería'.")]),
    juicio("*lechuguero", "no_existe",
           "'Lechuga' no es de la familia de 'leche', aunque empiece igual: quien vende leche es el 'lechero'.",
           causa="familia_falsa", opciones_causa=["familia_falsa", "orden_piezas"],
           forma_correcta="lechero",
           contexto="Un alumno quería nombrar a quien vende leche y escribió…"),
    etiquetar("lechero", ["lech", "ero"], ["raiz", "sufijo"]),
], origen="UD Gramatica_01 1ESO S4")

reto("FP_0106", "medio", "3E", "¿Qué hace cada peldaño de la escalera?",
     ["nación", "nacional", "nacionalizar", "nacionalización"], [
    intruso(["nación", "nacional", "nacionalidad", "narración"], "narración",
            "'Narración' suena parecido, pero viene de 'narrar': contar algo."),
    cadena(["nación", "nacional", "nacionalizar", "nacionalización"], ["nacionalista"],
           "Cada peldaño se fabrica sobre el anterior: sin 'nacionalizar' no hay 'nacionalización'."),
    par("nación", "nacional", [
        op("Fabrica una palabra que acompaña a un nombre", True,
           "'Nacional' se dice de algo: equipo nacional, fiesta nacional."),
        op("Nombra la acción de hacer algo", False, "Eso lo hace la última pieza de 'nacionalización'.")]),
    par("nacional", "nacionalizar", [
        op("Fabrica un verbo: una acción que se hace", True, "Nacionalizar es pasar algo al Estado."),
        op("Nombra a la persona que defiende esa idea", False, "Esa persona es el 'nacionalista'.")]),
    etiquetar("nacionalización", ["nacion", "al", "iza", "ción"], ["raiz", "sufijo", "sufijo", "sufijo"]),
])

reto("FP_0107", "medio", "3E", "Dos caminos que salen de la misma palabra",
     ["útil", "utilizar", "utilización", "utilidad"], [
    agrupa("familia_lexica",
           [("Salen de 'útil'", ["útil", "utilidad", "utilizar", "inútil"]),
            ("No salen de ahí", ["utopía", "uva"])],
           [("utopía", "Empieza parecido y no tiene relación: una utopía es un sueño imposible.")],
           "El parecido del principio de la palabra engaña: hay que mirar el significado."),
    par("útil", "utilidad", [
        op("Nombra la cualidad, algo que no se toca", True, "La utilidad de una herramienta es lo que sirve."),
        op("Fabrica una acción", False, "Eso es 'utilizar'.")]),
    par("útil", "utilizar", [
        op("Fabrica una acción que se hace", True, "Utilizar es usar algo."),
        op("Nombra la cualidad", False, "Eso es 'utilidad'.")]),
    clasifica("utilización", "derivada", "PRU-MORF-DERIV-01",
              ["PRU-MORF-SIMPLE-01", "HEUR-DOS-PARTES"]),
])

reto("FP_0108", "avanzado", "1B", "Tres piezas para el mismo trabajo: ¿quién elige?",
     ["aterrizar", "aterrizaje", "entrenar", "entrenamiento", "fundar", "fundación"], [
    agrupa("pieza_comun",
           [("Acaban como 'aterrizaje'", ["aterrizaje", "rodaje", "montaje"]),
            ("Acaban como 'entrenamiento'", ["entrenamiento", "movimiento", "aburrimiento"])],
           [],
           "Tres piezas distintas hacen el mismo trabajo: nombrar la acción de un verbo."),
    juicio("*aterrizamiento", "no_existe",
           "Cada verbo tiene ya elegida su pieza para nombrar la acción, y 'aterrizar' se quedó con '-aje'. "
           "No es que '-miento' esté mal en general: es que en este verbo la casilla está ocupada.",
           causa="restriccion_sufijo", opciones_causa=["restriccion_sufijo", "alomorfo_incorrecto"],
           forma_correcta="aterrizaje",
           contexto="Un alumno quería nombrar la acción de aterrizar y escribió…"),
    juicio("*entrenación", "no_existe",
           "Mismo caso al revés: aquí la casilla la ocupa '-miento'. Saber qué pieza elige cada verbo no se "
           "deduce de una regla: se comprueba.",
           causa="restriccion_sufijo", opciones_causa=["restriccion_sufijo", "falta_base"],
           forma_correcta="entrenamiento"),
    juicio("fundación", "correcta",
           "'Fundar' nombra su acción con '-ción', y esa es la forma que la lengua ha fijado."),
    clasifica("aterrizaje", "derivada", "PRU-MORF-DERIV-01",
              ["PRU-MORF-PARA-01", "HEUR-DOS-PARTES"]),
])

reto("FP_0109", "avanzado", "1B", "La pieza que no significa nada y sin embargo está ahí",
     ["pan", "panecillo", "polvo", "polvareda", "humo", "humareda"], [
    agrupa("pieza_comun",
           [("Llevan un trozo de más entre medias", ["panecillo", "polvareda", "humareda"]),
            ("No lo llevan", ["panadero", "humoso"])],
           [],
           "Ese trozo de enlace no significa nada por sí solo, pero sin él la palabra suena mal."),
    cortar("panecillo", ["pan", "ec", "illo"],
           "Entre 'pan' y '-illo' aparece '-ec-', que no significa nada: solo sirve de enlace."),
    juicio("*panillo", "no_existe",
           "Sin el trozo de enlace la palabra se cae: el español dice 'panecillo'. Ese trozo no aporta "
           "significado, pero es obligatorio.",
           causa="alomorfo_incorrecto", opciones_causa=["alomorfo_incorrecto", "restriccion_sufijo"],
           forma_correcta="panecillo"),
    etiquetar("panecillo", ["pan", "ec", "illo"], ["raiz", "interfijo", "sufijo"]),
    etiquetar("humareda", ["hum", "ar", "eda"], ["raiz", "interfijo", "sufijo"]),
])

# ══════════════════════════════════════════════════════════════════════════
# LÍNEA C · Familia de verdad o parecido de letras (`familia_falsa`)
# ══════════════════════════════════════════════════════════════════════════

reto("FP_0110", "basico", "1E", "¿Cuál de estas palabras no es de la familia del mar?",
     ["mar", "marítimo", "marea", "marinero"], [
    agrupa("familia_lexica",
           [("Son de la familia de 'mar'", ["mar", "marítimo", "marea", "marejada", "marinero"]),
            ("No son de esa familia", ["matrimonio", "martillo"])],
           [("matrimonio", "Empieza con 'mar-' y no habla del mar: un matrimonio es una pareja casada."),
            ("martillo", "Comparte las letras y nada más: un martillo sirve para clavar.")],
           "Compartir el principio de la palabra no basta: hay que compartir el significado."),
    intruso(["marinero", "marítimo", "marea", "matrimonio"], "matrimonio",
            "Las tres primeras hablan del mar; 'matrimonio', no."),
    par("mar", "marinero", [
        op("Nombra a la persona que trabaja en el mar", True, "El marinero navega."),
        op("Dice que hay mucha agua", False, "Eso lo dice 'marea', que es el subir y bajar del agua.")]),
    juicio("*matrimoniero", "no_existe",
           "'Matrimonio' no es de la familia de 'mar' aunque empiece igual: quien trabaja en el mar es el "
           "'marinero'.",
           causa="familia_falsa", opciones_causa=["familia_falsa", "orden_piezas"],
           forma_correcta="marinero",
           contexto="Un alumno quería nombrar a quien trabaja en el mar y escribió…"),
    clasifica("marítimo", "derivada", "PRU-MORF-DERIV-01",
              ["PRU-MORF-SIMPLE-01", "HEUR-PARECIDO"], enunciado="simple"),
])

reto("FP_0111", "basico", "1E", "'Camarero' se parece a 'cama', pero ¿es de su familia?",
     ["cama", "camilla", "camastro", "camarero"], [
    agrupa("familia_lexica",
           [("Son de la familia de 'cama'", ["cama", "camilla", "camastro", "camita"]),
            ("No son de esa familia", ["camarero", "camaleón"])],
           [("camarero", "Un camarero no trabaja con camas: la palabra viene de 'cámara', que era la "
                         "habitación donde se servía.")],
           "A veces el parecido es una casualidad: hay que preguntarse por el significado."),
    intruso(["cama", "camilla", "camastro", "camarero"], "camarero",
            "Las tres primeras son camas de algún tipo; el camarero sirve mesas."),
    par("cama", "camastro", [
        op("Nombra la misma cosa, pero fea o vieja", True, "Un camastro es una cama mala."),
        op("Nombra el sitio donde se guardan", False, "Ese sitio no se fabrica con este trozo.")]),
    etiquetar("camilla", ["cam", "illa"], ["raiz", "sufijo"]),
    clasifica("camilla", "derivada", "PRU-MORF-DERIV-01",
              ["PRU-MORF-SIMPLE-01", "HEUR-PARECIDO"], enunciado="simple"),
])

reto("FP_0112", "medio", "3E", "Dos familias que suenan igual",
     ["sol", "solar", "soleado", "soledad", "solitario"], [
    agrupa("familia_lexica",
           [("Hablan del sol", ["sol", "solar", "soleado", "girasol"]),
            ("Hablan de estar sin compañía", ["soledad", "solitario", "solista"])],
           [("soledad", "Empieza igual que 'sol' y no viene de ahí: viene de 'solo'.")],
           "Dos familias distintas pueden empezar con las mismas letras y no tener ninguna relación."),
    intruso(["sol", "solar", "soleado", "soledad"], "soledad",
            "'Soledad' no viene de 'sol', sino de 'solo': es estar sin compañía."),
    par("soleado", "soledad", [
        op("Son de familias distintas aunque empiecen igual", True,
           "'Soleado' viene de 'sol'; 'soledad', de 'solo'."),
        op("Son de la misma familia", False,
           "Compartir letras no basta: hay que compartir el significado de base.")]),
    juicio("*soledario", "no_existe",
           "'Soledad' y 'solitario' no son de la familia de 'sol', así que no sirven de base para hablar del "
           "sol: lo que aprovecha su luz es 'solar'.",
           causa="familia_falsa", opciones_causa=["familia_falsa", "orden_piezas"],
           forma_correcta="solar",
           contexto="Un alumno quería nombrar lo que aprovecha la luz del sol y escribió…"),
    cascada("soledad", [(Q_COMPUESTA, "no"),
                        ("¿Tiene una pieza principal con algo pegado detrás que le cambia el significado?", "si")],
            procedimiento="derivada"),
])

reto("FP_0113", "medio", "3E", "¿'Piedad' tiene algo que ver con los pies?",
     ["pie", "peatón", "piecito", "piedad"], [
    agrupa("familia_lexica",
           [("Tienen que ver con el pie", ["pie", "pedal", "piecito", "peatón"]),
            ("No tienen que ver con el pie", ["piedad", "piedra"])],
           [("piedad", "Suena a 'pie' y significa compasión: no hay ninguna relación."),
            ("piedra", "También empieza igual, y es una roca.")],
           "El oído engaña: 'peatón' sí es de la familia de 'pie' aunque no lo parezca, y 'piedad' no lo es "
           "aunque lo parezca."),
    intruso(["pie", "pedal", "peatón", "piedad"], "piedad",
            "Las tres primeras tienen que ver con andar o con los pies; 'piedad' es compasión."),
    par("pie", "piecito", [
        op("Dice que es pequeño", True, "Un piecito es un pie pequeño."),
        op("Nombra otra cosa distinta", False, "Eso pasa con 'pedal', que ya es otro objeto.")]),
    clasifica("piecito", "derivada", "PRU-MORF-DERIV-01",
              ["PRU-MORF-NUEVA-01", "HEUR-PARECIDO"]),
])

# ══════════════════════════════════════════════════════════════════════════
# LÍNEA D · Cuando una reducción se vuelve palabra
# ══════════════════════════════════════════════════════════════════════════

reto("FP_0114", "medio", "3E", "¿Cuándo deja una sigla de comportarse como una sigla?",
     ["ONG", "radar", "láser"], [
    intruso(["ONG", "OMS", "ONU", "radar"], "radar",
            "'Radar' nació de unas iniciales, pero hoy se escribe y se lee como una palabra corriente."),
    juicio("IESs", "norma_culta",
           "Esta forma no ha dado el paso: se sigue escribiendo con mayúsculas y no admite la '-s'. El plural "
           "lo marca la palabra de delante, igual que en 'las ONG'.",
           causa="sigla_plural", opciones_causa=["sigla_plural", "sigla_minuscula"],
           forma_correcta="los IES",
           contexto="En un trabajo de clase aparece escrito: 'En Murcia hay muchos IESs'."),
    juicio("radares", "correcta",
           "'Radar' ya se comporta como cualquier palabra española: se escribe en minúscula y hace el plural "
           "con '-es'. Que admita piezas es la prueba de que ha dejado de ser una fórmula."),
    par("ONG", "radar", [
        op("Una sigue siendo una fórmula de iniciales y la otra ya es una palabra corriente", True,
           "'Radar' admite plural y minúscula; 'ONG', no."),
        op("Las dos funcionan igual", False,
           "La prueba está en si admiten piezas: 'radares' existe, 'ONGs' no.")]),
    cascada("láser", [(Q_COMPUESTA, "no"), (Q_INICIALES, "si"),
                      ("¿Se escribe hoy en minúscula y admite plural?", "si")],
            conclusion="Nació de unas iniciales y hoy se comporta como una palabra corriente: por eso se "
                       "escribe 'láser' y su plural es 'láseres'."),
])

reto("FP_0115", "medio", "3E", "Fórmulas de iniciales que ya son palabras corrientes",
     ["wifi", "pyme", "uci"], [
    intruso(["wifi", "pyme", "uci", "hacker"], "hacker",
            "'Hacker' viene del inglés entera; las otras tres nacieron de las iniciales de varias palabras."),
    juicio("wifis", "correcta",
           "'Wifi' ya es una palabra corriente: se escribe en minúscula y hace el plural con '-s', como "
           "cualquier nombre."),
    juicio("PYMEs", "norma_culta",
           "Esta forma mezcla las dos etapas: si la palabra ya se ha hecho corriente, va entera en minúscula "
           "y con su plural normal.",
           causa="sigla_plural", opciones_causa=["sigla_plural", "sigla_minuscula"],
           forma_correcta="pymes"),
    clasifica("uci", "sigla", "PRU-MORF-SIGLA-01",
              ["PRU-MORF-ACRO-01", "HEUR-MAYUSCULAS"], peso=2),
])

reto("FP_0116", "medio", "3E", "Palabras que alguien recortó",
     ["bici", "finde", "insti", "boli"], [
    intruso(["bici", "boli", "insti", "tuit"], "tuit",
            "'Tuit' no es el recorte de una palabra española más larga: viene del inglés."),
    juicio("*bicic", "no_existe",
           "El recorte se hace por sílabas completas: 'bi-ci'. Cortar por donde cae mal deja una forma que "
           "nadie reconoce.",
           causa="acortamiento_mal", opciones_causa=["acortamiento_mal", "abreviatura_sin_punto"],
           forma_correcta="bici"),
    juicio("finde", "correcta",
           "'Fin de semana' se ha recortado a 'finde', y el recorte respeta las sílabas: la palabra funciona."),
    cascada("boli", [(Q_COMPUESTA, "no"), (Q_INICIALES, "no"),
                     ("¿Existía antes una palabra más larga de la que esta se ha recortado?", "si")],
            procedimiento="acortamiento"),
])

reto("FP_0117", "avanzado", "1B", "Lo que solo existe cuando se escribe",
     ["pág.", "Sra.", "núm.", "EE. UU."], [
    agrupa("pieza_comun",
           [("Se leen enteras aunque se escriban cortas", ["pág.", "Sra.", "núm.", "etc."]),
            ("Se leen tal como se escriben", ["ONG", "láser", "uci"])],
           [],
           "Unas son una manera de escribir; otras son palabras que se dicen en voz alta."),
    juicio("Sra", "norma_culta",
           "Falta el punto: sin él no queda claro que esa forma corta se lee entera, 'señora'.",
           causa="abreviatura_sin_punto", opciones_causa=["abreviatura_sin_punto", "sigla_puntos"],
           forma_correcta="Sra.",
           contexto="En la cabecera de una carta aparece escrito…"),
    juicio("EE. UU.", "correcta",
           "Las formas cortas de plural doblan la letra y llevan punto y espacio: está bien escrita."),
    clasifica("núm.", "abreviatura", "PRU-MORF-ABREV-01",
              ["PRU-MORF-ACORT-01", "HEUR-MAYUSCULAS"], peso=2),
])

reto("FP_0118", "avanzado", "1B", "Palabras con números dentro",
     ["5G", "MP3", "4x4", "11-S"], [
    intruso(["5G", "MP3", "4x4", "OMS"], "OMS",
            "'OMS' está hecha solo con letras iniciales: no lleva ninguna cifra."),
    juicio("los 4x4", "correcta",
           "La cifra forma parte del nombre y no se puede quitar. El plural no se pega al final: lo marca la "
           "palabra de delante."),
    clasifica("5G", "numeronimo", "PRU-MORF-NUM-01",
              ["PRU-MORF-SIGLA-01", "HEUR-MAYUSCULAS"]),
    cascada("MP3", [(Q_COMPUESTA, "no"), (Q_INICIALES, "no"),
                    ("¿Mezcla cifras y letras, y la cifra forma parte del nombre?", "si")],
            procedimiento="numeronimo"),
])

# ══════════════════════════════════════════════════════════════════════════
# LÍNEA E · Las piezas cultas no son un vocabulario
# ══════════════════════════════════════════════════════════════════════════

reto("FP_0119", "medio", "3E", "La misma pieza en cuatro palabras distintas",
     ["biología", "biólogo", "biografía", "biodegradable"], [
    agrupa("pieza_comun",
           [("Llevan la pieza de 'biología'", ["biología", "biólogo", "biografía", "biodegradable"]),
            ("No la llevan", ["bicicleta", "bingo"])],
           [("bicicleta", "Empieza por 'bi-', que aquí significa 'dos ruedas', no 'vida'.")],
           "La misma pieza aparece en palabras muy distintas: lo que cambia es con qué se junta."),
    par("biología", "biólogo", [
        op("Una nombra el estudio y la otra a la persona que lo practica", True,
           "La pieza final es la que decide: una nombra la ciencia, la otra a quien la ejerce."),
        op("Significan lo mismo", False, "Si significaran lo mismo, sobraría una de las dos.")]),
    cortar("biografía", ["bio", "grafía"],
           "La vocal va dentro de la pieza: 'bio-' se presenta siempre así, nunca 'bi-' + 'o'."),
    etiquetar("biología", ["bio", "logía"], ["elemento_culto", "elemento_culto"]),
    clasifica("biología", "compuesta_culta", "PRU-MORF-CCULTA-01",
              ["PRU-MORF-CLEX-01", "HEUR-LONGITUD"]),
])

reto("FP_0120", "medio", "3E", "Agrupar por la pieza, no por lo que sabes de memoria",
     ["geología", "geografía", "biografía", "ortografía"], [
    agrupa("pieza_comun",
           [("Terminan como 'geografía'", ["geografía", "biografía", "ortografía"]),
            ("Terminan como 'geología'", ["geología", "biología", "psicología"])],
           [],
           "Las dos series empiezan igual y terminan distinto: la pieza final es la que manda."),
    par("geología", "geografía", [
        op("Cambia lo que se hace con la Tierra: estudiarla o describirla", True,
           "Las dos hablan de la Tierra; la pieza final dice qué se hace con ella."),
        op("Cambia el sitio del que hablan", False, "El sitio es el mismo en las dos.")]),
    etiquetar("geografía", ["geo", "grafía"], ["elemento_culto", "elemento_culto"]),
    clasifica("geografía", "compuesta_culta", "PRU-MORF-CCULTA-01",
              ["PRU-MORF-CLEX-01", "HEUR-MEMORIA"]),
])

reto("FP_0121", "avanzado", "1B", "'Euro-': ¿pieza culta o palabra recortada?",
     ["eurodiputado", "euroescéptico", "europeo"], [
    intruso(["eurodiputado", "euroescéptico", "eurozona", "euforia"], "euforia",
            "'Euforia' empieza parecido y es una alegría enorme: no habla de Europa."),
    frontera("eurodiputado", [
        op("compuesta culta", True,
           "'Euro-' se comporta como las piezas cultas: no aparece nunca sola y se pega delante de un nombre."),
        op("formada sobre 'europeo' recortado", True,
           "'Euro-' sale de 'Europa' y 'europeo', que sí son palabras: por eso funciona también como un recorte.")],
        "Las dos lecturas se defienden. Lo que se evalúa es que sepas justificar la tuya."),
    cortar("eurodiputado", ["euro", "diputado"],
           "La segunda pieza es una palabra entera; la primera, no aparece nunca sola."),
    clasifica("euroescéptico", "compuesta_culta", "PRU-MORF-CCULTA-01",
              ["PRU-MORF-ACORT-01", "HEUR-LONGITUD"]),
], gris=True)

reto("FP_0122", "avanzado", "1B", "¿Dónde se corta 'fotografía'?",
     ["fotografía", "fotógrafo", "telescopio"], [
    intruso(["fotografía", "fotógrafo", "fotocopia", "fortaleza"], "fortaleza",
            "'Fortaleza' empieza parecido y no tiene nada que ver: es un castillo o la fuerza de algo."),
    cortar("fotografía", ["foto", "grafía"],
           "La vocal de enlace va dentro de la pieza: 'foto-' se presenta así, como 'bio-' o 'tele-'. "
           "Cortar 'fot' + 'o' + 'grafía' inventa una pieza que no existe."),
    etiquetar("telescopio", ["tele", "scopio"], ["elemento_culto", "elemento_culto"]),
    clasifica("fotografía", "compuesta_culta", "PRU-MORF-CCULTA-01",
              ["PRU-MORF-CLEX-01", "HEUR-DOS-PARTES"]),
])

# ══════════════════════════════════════════════════════════════════════════

PROCS = {
    "FP_0099": "derivada", "FP_0100": "prestamo;derivada", "FP_0101": "derivada",
    "FP_0102": "prestamo;derivada", "FP_0103": "derivada",
    "FP_0104": "derivada", "FP_0105": "derivada", "FP_0106": "derivada",
    "FP_0107": "derivada", "FP_0108": "derivada", "FP_0109": "derivada",
    "FP_0110": "derivada", "FP_0111": "derivada", "FP_0112": "derivada", "FP_0113": "derivada",
    "FP_0114": "sigla", "FP_0115": "sigla", "FP_0116": "acortamiento",
    "FP_0117": "abreviatura", "FP_0118": "numeronimo",
    "FP_0119": "compuesta_culta", "FP_0120": "compuesta_culta",
    "FP_0121": "compuesta_culta", "FP_0122": "compuesta_culta",
}

HDR = ["ID", "Nivel", "Curso_Min", "Titulo_Problema", "Procedimientos", "Tipos_Item",
       "JSON_Reto", "Fuente", "Zona_Gris", "Activo"]

def fila(r):
    tipos = []
    for it in r["items"]:
        if it["tipo"] not in tipos: tipos.append(it["tipo"])
    return "\t".join([
        r["id"], r["nivel"], r["metadatos"]["curso_min"], r["titulo_problema"],
        PROCS[r["id"]], ";".join(sorted(tipos)),
        json.dumps(r, ensure_ascii=False, separators=(", ", ": ")),
        FUENTE, "TRUE" if r["zona_gris"] else "FALSE", "TRUE",
    ])

salida = "docs/lotes/Formacion_Banco_lote3.tsv"
with io.open(salida, "w", encoding="utf-8", newline="\n") as f:
    f.write("\t".join(HDR) + "\n")
    for r in retos:
        f.write(fila(r) + chr(10))

print("retos:", len(retos), "· items:", sum(len(r["items"]) for r in retos))
niveles = {}
for r in retos: niveles[r["nivel"]] = niveles.get(r["nivel"], 0) + 1
print("niveles:", niveles)
