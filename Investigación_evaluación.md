# Resumen Ejecutivo  
Un sistema de evaluación en línea de un taller de sintaxis arroja consistentemente calificaciones más altas que los exámenes en papel, indicando un posible *efecto de modalidad* (“mode effect”) o sesgo. Este informe identifica las causas potenciales (p. ej., facilidades de hacer trampa, retroalimentación instantánea, ítems más fáciles online, diferencias temporales, mala rúbrica o escalado) y propone métricas de diagnóstico (correlación con pruebas en papel, análisis de ítems, confiabilidad, DIF, ANOVA, validez predictiva). Como soluciones plantea métodos de **calibración** estadística (equiparación de escalas) y ajustes por dificultad (métodos TRÍ/CAT); medidas de control (limitación de tiempo, preguntas de verificación, penalizaciones) y mejoras pedagógicas (rúbricas más objetivas, evaluación por pares calibrada, mezcla de corrección automática/manual, muestreo de respuestas abiertas) para reducir trampas. Se propone un plan técnico y operativo que incluye cambios en la interfaz (evitar pistas, no mostrar soluciones), registro detallado (logging de interacciones), detección de colusión, pruebas A/B y piloto progresivo, con indicadores de éxito (p. ej. nivelación de medias entre modos, aumento de correlación concurrente). Por último, se discuten riesgos éticos y legales (privacidad de datos, sesgos algorítmicos) que deben atenderse. El informe se apoya en estudios académicos y guías de evaluación para fundamentar cada aspecto.  

## 1. Diagnóstico: causas de la inflación de calificaciones en línea  
- **Sesgo de modalidad (formato)**: Estudios muestran que las pruebas en línea pueden medir distinto que las en papel. Por ejemplo, en una meta-revisión de ACT se define el *“mode effect”* cuando las puntuaciones en un modo (online) son sistemáticamente más altas que en el otro para alumnos de igual habilidad. En ese mismo estudio, los puntajes promedio online resultaron mayores en varias materias. Por tanto, diferencias de formato (tipografía, navegación, backtracking) pueden facilitar mejores resultados en línea.  
- **Retroalimentación inmediata**: Las plataformas en línea permiten retroalimentación instantánea y estadísticas en tiempo real. Aunque esto mejora el aprendizaje, puede inducir calificaciones más altas en pruebas sucesivas o orientar a los alumnos si ven sus errores en caliente.  
- **Colaboración y plagio no autorizados**: En entornos a distancia, los estudiantes disponen de recursos digitales, lo que eleva el riesgo de fraude. En investigaciones sobre educación virtual se destaca que los alumnos tienen *“mayor facilidad para cometer fraudes”* en exámenes remotos. La disponibilidad de “una amplia gama de materiales” fomenta el plagio a menos que se diseñen preguntas de aplicación. Colaboración no vigilada (por ejemplo, chats grupales) también puede inflar artificialmente los puntajes.  
- **Diferencias de tiempo y control**: Si la versión digital otorga más tiempo o permite repeticiones, los alumnos pueden rendir mejor. (Por ejemplo, ACT evaluó agregar 5 minutos extra en línea, pero halló que no era necesario). La falta de supervisión presencial puede traducirse en pausas o consultas extra.  
- **Auto-calificación y ajustes de dificultad**: Algunas plataformas asignan puntajes automáticos basados en reglas. Si el algoritmo no refleja la dificultad real de los ítems, se podría sobreestimar la habilidad. En tests adaptativos (CAT) la calibración inapropiada de los ítems o perfiles de estudiante puede sesgar las puntuaciones.  
- **Variación en los ítems y rúbricas**: Ítems de opción múltiple pueden ser más fácil de contestar en pantalla (p. ej., se observa que en línea los últimos ítems fueron notoriamente más fáciles). Rúbricas poco objetivas o marcajes laxos pueden inflar notas. Por ejemplo, si la corrección automática de ensayo utiliza un vocabulario limitado, puede puntuar de más. Además, falta de escalado/extrapolación: sin procedimientos formales de normalización, un conjunto online puede evaluarse de modo distinto al papel.  

## 2. Métricas de realismo y validez concurrente  
Para cuantificar la brecha online–papel y la validez del sistema, se recomiendan:

- **Correlación con exámenes en papel**: Comparar las puntuaciones del mismo grupo de alumnos en ambas modalidades (idealmente con diseño aleatorio). Estudios previos hallan alta correlación en tests temporizados (r≈0.97), pero menor en tests de velocidad. Si la correlación cae muy por debajo de 1, sugiere discrepancias.  
- **Análisis de ítems**: Evaluar estadísticos de cada pregunta: p-valores (porcentaje de aciertos) y tasas de omisión online vs. papel. En el estudio ACT, la curva de dificultad variaba por posición: los ítems posteriores, especialmente, resultaron más fáciles en línea. La **grafica de diferencias de p-valores** puede revelar ítems con *sesgo de formato*.  
- **Funcionamiento Diferencial del Ítem (DIF)**: Aplicar análisis DIF para detectar ítems que favorecen a grupos (p.ej., experto en computación vs. no). El DIF ayuda a identificar sesgos de contenido o interfaz. La Teoría de Respuesta al Ítem (TRÍ) ofrece métodos robustos para esto.  
- **Confiabilidad (consistencia interna)**: Calcular el alfa de Cronbach en cada modalidad. En el estudio ACT mencionado, los valores de alfa fueron muy similares entre modos (~0.9 en todas las materias), lo que indica fiabilidad consistente. No obstante, alta fiabilidad por sí sola no garantiza validez.  
- **Validez concurrente/predictiva**: Si existen puntajes externos (por ejemplo, calificación global de curso o exámenes estandarizados), correlacionar ambas versiones con dicha medida. Una validez concurrente baja sugiere que alguna modalidad se desvía del constructo.  
- **Análisis de varianza (ANOVA)**: Realizar ANOVA con factores *profesor* o *grupo de control* vs *metodología (online/papel)*. Esto ayuda a discriminar si la fuente de varianza viene del formato más que del profesor o del nivel de los estudiantes.  
- **Muestras control y A/A testing**: Implementar tests A/A (dos versiones online iguales) para verificar la aleatorización y el sistema. Un diseño piloto controlado (grupo presencial vs. remoto) mejora la precisión del diagnóstico.  

## 3. Alternativas de corrección  
Se listan posibles intervenciones con sus consideraciones:

| Alternativa                        | Ventajas                                | Desventajas                                   | Coste aproximado      | Complejidad técnica | Impacto esperado                             |
|------------------------------------|-----------------------------------------|-----------------------------------------------|-----------------------|----------------------|---------------------------------------------|
| **Equiparación estadística** (Equating) | Ajusta las escalas de puntaje para que comparen directamente online vs papel. Muy efectivo para eliminar sesgo global de modo. | Requiere recolectar datos de calibración (muestras duales) y experiencia psicométrica. No corrige causas de fondo (solo el síntoma). | Moderado (software estadístico) | Alta (necesita especialistas en IRT/CTT) | Alto: corrige sistemáticamente la inflación de puntaje. |
| **Viñetas ancladas** (anchoring vignettes) | Ayudan a calibrar la autoevaluación subjetiva. | Pocas referencias en evaluación automática. Requiere diseño cuidadoso. | Bajo-moderado | Media | Moderado: mejora la equidad subjetiva (más aplicable a encuestas). |
| **Ajuste por dificultad de ítem** (p. ej. lineal) | Sencillo: multiplicar puntajes online por factor (<1) estimado. | Mejora solo escala global, no aborda trampas ni sesgos en ítems específicos. | Bajo (fácil de implementar) | Baja | Moderado: corrige media, pero no varianza desigual. |
| **Control de tiempo y bloqueo** | Limita oportunidades de consulta/ayuda. Reduce cheaters. | Puede estresar a alumnos; depende de infraestructura (p.ej. apertura simultánea). | Bajo-medio | Media | Alto: menor tiempo significa menos chance de buscar info. |
| **Preguntas trampa/verificación** | Detección activa: ítems con respuesta conocida para delatar mala práctica. | Puede frustrar al estudiante honesto; no siempre detecta todo tipo de trampas. | Bajo | Baja | Moderado: disuasivo, pero cobertura limitada. |
| **Rúbricas más objetivas / supervisión humana** | Disminuye variabilidad subjetiva; más transparencia. Si es humano, evalúa conocimiento profundo. | Requiere tiempo extra de evaluadores; posible falta de escalabilidad. | Alto (especialmente pago de evaluadores) | Alta | Alto (mejora calidad pero costoso). |
| **Evaluación por pares calibrada** | Involucra estudiantes en calificación, lo que puede aumentar compromiso y escalabilidad. | Debe incluir calibración (p.ej. ítems ancla) para unificar criterios; riesgo de colusión si mal implementada. | Medio | Alta (se necesita infraestructura y entrenamiento) | Medio-Alto: más revisiones, pero depende de capacitación. |
| **Mezcla automática y humana** | Combina eficiencia del auto-corrector con criterio humano en casos difíciles. | Complejidad en flujo de trabajo (¿qué evalúa cada modalidad?), puede duplicar esfuerzo. | Alto | Alta | Alto: puede corregir errores del auto y matizar respuestas abiertas. |
| **Muestreo de respuestas abiertas** | Solo una fracción de ensayos se califica manualmente (p.ej. 20%), para ajustar estadísticas. | No corrige instantáneamente todas las notas; riesgo de sesgo si la muestra no es aleatoria. | Medio | Media | Moderado: mejora confiabilidad de nota global con esfuerzo reducido. |
| **Modelos IRT y pruebas adaptativas (CAT)** | Diseño más preciso: ajusta dificultad según habilidad, manteniendo equidad. Permite equiparar bases. | Requiere gran banco de ítems calibrados y expertise en TRÍ. Implementación técnica compleja. | Muy alto | Muy alta | Alto: mejora comparabilidad y precisión, pero es proyecto mayor. |

*(Nota: los costes son cualitativos y dependerán del contexto. Complejidad técnica considera recursos de TI y capacidades analíticas.)*

## 4. Plan de implementación técnico-operativo  
**Cambios UI/UX y plataforma**:  
- Ocultar retroalimentación y respuestas correctas hasta terminar la prueba. No permitir “volver atrás” si esto otorga ventaja.  
- Uniformizar el diseño de ítems (p.ej. mostrar una pregunta por pantalla de forma similar al examen escrito) para reducir diferencias de formato.  
- Incluir *preguntas de control* (trampa) o firmas digitales que validen la atención del alumno.  
- Preestablecer límites de tiempo por sección similares al examen presencial. Mostrar temporizador sin pausas.  

**Registro (logging) y analítica**:  
- Capturar *metadata*: tiempos de respuesta, movimientos del mouse/teclado, número de intentos.  
- Generar informes automáticos de indicadores clave (tiempo medio por pregunta, tasa de abandono, patrones de respuestas).  
- Implementar algoritmos básicos de “person-fit” o detección de colusión (p. ej., respuestas idénticas entre usuarios en poco tiempo), de acuerdo con prácticas recomendadas.

**Pruebas A/B y piloto**:  
- Realizar un piloto controlado con grupos equitativos: un grupo toma la prueba en línea con el sistema actual y otro en papel. Analizar diferencias (medias, varianzas, correlaciones) para calibrar el sistema.  
- Usar A/A testing inicial (misma prueba en ambos grupos) para verificar que la asignación aleatoria funciona y que métricas clave (turnout, distribución de puntuaciones) son estables.  
- Iterar con pruebas piloto de alcance creciente (primero con pocos estudiantes, luego con cursos completos).  

**Cronograma (ejemplo de 6 meses)**:  

```mermaid
gantt
    title Cronograma piloto de validación
    dateFormat  YYYY-MM-DD
    section Preparación
      Definir métricas y procedimientos      :done, a1, 2026-07-01, 2w
      Ajustes técnicos iniciales             :a2, after a1, 3w
      Diseño de ítems y rúbrica revisada     :a3, after a2, 2w
    section Piloto fase I (pequeña escala)
      Prueba A/A con grupo reducido          :a4, 2026-08-15, 3w
      Análisis de datos preliminar          :a5, after a4, 2w
      Ajustes basados en hallazgos          :a6, after a5, 2w
    section Piloto fase II (ampliado)
      Prueba A/B con curso completo         :a7, after a6, 2026-09-15, 4w
      Evaluación final de correlaciones     :a8, after a7, 2w
      Informe de resultado y despliegue     :a9, after a8, 2w
```

**Métricas de éxito**: Se considerará exitosa la intervención si:  
- Las medias de las calificaciones online vs. papel convergen (diferencia estadísticamente no significativa).  
- Aumenta la correlación concurrente con referencia externa o examen offline (hacia ideal, p.ej. >0.9).  
- Se reduce la varianza atribuible al modo en el ANOVA.  
- Disminuye el número de incidentes sospechosos de fraude detectados.  
- Feedback positivo de profesores y alumnos sobre claridad y fairness del sistema.  

## 5. Riesgos, consideraciones éticas y legales  
- **Privacidad y protección de datos**: Registrar datos de usuario (actividad, audio/video, comportamiento) puede chocar con normas de privacidad (RGPD, LOPDGDD). Se debe informar claramente a los estudiantes qué datos se recogen y con qué fin, y asegurarse de guardar sólo lo necesario. El consentimiento informado es obligatorio si se utilizan herramientas de proctoring (cámara, micrófono).  
- **Sesgo algorítmico**: Cualquier corrección automática o modelo estadístico puede introducir sesgos. Es esencial validar que el ajuste (p.ej. equiparación) no perjudique a subgrupos (género, nivel socioeconómico). La Teoría de Respuesta al Ítem puede mitigar sesgos mediante análisis DIF. Se debe monitorear periódicamente la equidad de resultados.  
- **Transparencia y aceptación**: Implementar cambios drásticos (p.ej. IA en calificación) sin consultar a la comunidad educativa puede generar desconfianza. Se recomienda capacitar a docentes en las nuevas herramientas y publicar los criterios de calificación y normatividad.  
- **Implicaciones legales**: En algunos países las normas de evaluación pueden exigir que los estudiantes conozcan la escala y criterios de nota. Cambios de escala (por calibración) deben comunicarse para evitar reclamaciones. Además, detectar fraude debe realizarse con rigor metodológico (p.ej. no basarse únicamente en supuestos injustificables) para cumplir con estándares éticos.  

## 6. Ejemplos y referencias clave  
- **Investigaciones académicas**: Numerosos estudios meta-analíticos (ej. Mead & Drasgow 1993; Kim 1999 en) concluyen que *en general* los puntajes online correlacionan muy alto con paper (r≈0.97) pero en estudios recientes se ha encontrado leve ventaja para papel en matemáticas (EFECTO ≈0.04 sd). Contrariamente, comparaciones concretas (ACT 2014) hallaron puntajes online más altos en varias materias. Estos hallazgos destacan la necesidad de revisar caso por caso.  
- **Guías oficiales**: Organismos como la OCDE/INEE (España) han observado efectos de la modalidad en PISA; por ejemplo, en 2012 los estudiantes españoles obtuvieron resultados *peores* en digital que en papel (diferencias significativas de ~20 puntos). Estas guías enfatizan que el diseño de la prueba debe priorizar el contenido sobre la habilidad técnica.  
- **Papers sobre IRT/CAT y equiparación**: La bibliografía de psicometría describe métodos formales de equiparación y pruebas adaptativas. Por ejemplo, Salomón et al. (2022) presentan una metodología en R para equiparar escalas de pruebas no equivalentes. Los modelos de respuesta al ítem permiten construir *escalas compartidas* y rediseñar bancos de preguntas a través del tiempo.  
- **Validación en entornos online**: Artículos recientes (e.g. Rodríguez & Luzardo 2020) analizan técnicas para detectar trampas en exámenes a distancia (person-fit, patrones de respuesta, etc.). Enriquez (PDF de Galileo) discute ventajas y desafíos de las evaluaciones automáticas, señalando la importancia de rúbricas claras y de educar sobre honestidad académica.  

Todos estos antecedentes respaldan la recomendación de combinar enfoques estadísticos (equiparación, análisis psicométrico) con medidas pedagógicas y técnicas. Al aplicar estas soluciones en sucesivas etapas piloto, se podrá ajustar el sistema hasta lograr que las calificaciones digitales reflejen fielmente el aprendizaje real, al igual que las pruebas tradicionales.  

