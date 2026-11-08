/**
 * Una Sola Fuerza – Conclusiones para la emergencia (versión Google Workspace)
 *
 * NO EDITAR AQUÍ: este archivo lo genera preparar-apps-script.mjs a partir de
 * conclusiones.mjs y oficiales.json (2026-11-08).
 * Para cambiar una regla, se cambia conclusiones.mjs y se vuelve a preparar.
 *
 * Qué hace: toma las fichas de la pestaña Fichas y arma la pestaña
 * «Conclusiones para la emergencia» de la web: dónde hay más peligro para las
 * personas, qué hacer, salud, brechas, pronóstico y proyectos.
 * La sección «Calidad de las cifras» solo existe en la versión local
 * (necesita evaluar.mjs); aquí no se muestra.
 */

// Cifras oficiales de referencia (copiadas de oficiales.json; se citan, no se reinterpretan).
const OFICIALES = {
 "actualizado": "2026-11-08",
 "nota": "Cifras de referencia oficiales. Se citan tal como las publica la entidad; no se reinterpretan. 'via' indica cuando la cifra oficial se tomó de una nota de prensa que la atribuye a la entidad (confianza menor que la fuente primaria). Actualizar en cada lectura.",
 "indicadores": [
  {
   "id": "tumbes-damnificados",
   "indicador": "Personas damnificadas por lluvias",
   "departamento": "Tumbes",
   "tema": "damnificad",
   "clave": "damnificad",
   "valor": 324,
   "corte": "2026-11-06",
   "fuente": "COEN-INDECI",
   "via": "La República, 06/11/2026",
   "url": "https://larepublica.pe/sociedad/2026/11/06/lluvias-intensas-dejan-324-damnificados-y-808-afectados-en-tumbes-senamhi-preve-precipitaciones-hasta-el-domingo-314778"
  },
  {
   "id": "tumbes-afectados",
   "indicador": "Personas afectadas por lluvias",
   "departamento": "Tumbes",
   "tema": "afectad",
   "clave": "afectados(?![a-z])",
   "valor": 808,
   "corte": "2026-11-06",
   "fuente": "COEN-INDECI",
   "via": "La República, 06/11/2026",
   "url": "https://larepublica.pe/sociedad/2026/11/06/lluvias-intensas-dejan-324-damnificados-y-808-afectados-en-tumbes-senamhi-preve-precipitaciones-hasta-el-domingo-314778"
  },
  {
   "id": "tumbes-inhabitables",
   "indicador": "Viviendas inhabitables",
   "departamento": "Tumbes",
   "tema": "inhabitable",
   "clave": "viviendas inhabitables|inhabitables",
   "valor": 109,
   "corte": "2026-11-06",
   "fuente": "COEN-INDECI",
   "via": "La República, 06/11/2026",
   "url": "https://larepublica.pe/sociedad/2026/11/06/lluvias-intensas-dejan-324-damnificados-y-808-afectados-en-tumbes-senamhi-preve-precipitaciones-hasta-el-domingo-314778"
  },
  {
   "id": "tumbes-dengue-casos",
   "indicador": "Casos de dengue 2026",
   "departamento": "Tumbes",
   "tema": "dengue",
   "clave": "casos|contagi",
   "valor": 2394,
   "corte": "2026-10-29",
   "fuente": "Diresa Tumbes (reporte regional)",
   "via": "El Popular, 29/10/2026",
   "url": "https://elpopular.pe/actualidad/2026/10/29/dengue-se-dispara-en-tumbes-casos-superan-los-2300-y-lluvias-por-el-nino-encienden-las-alertas-que-zonas-preocupan-2504121"
  },
  {
   "id": "piura-dengue-casos",
   "indicador": "Casos de dengue 2026",
   "departamento": "Piura",
   "tema": "dengue",
   "clave": "casos",
   "valor": 15716,
   "corte": "2026-10-31",
   "fuente": "MINSA – Sala Situacional de Enfermedades Metaxénicas (SE 43)",
   "via": "El Tiempo",
   "url": "https://eltiempo.pe/local/dengue-en-piura-casos-aumentan-a-15-mil-716-casos-de-dengue-y-region-registra-17-fallecidos-en-2026/"
  },
  {
   "id": "piura-dengue-fallecidos",
   "indicador": "Fallecidos por dengue 2026 (12 confirmados + 5 en investigación)",
   "departamento": "Piura",
   "tema": "dengue",
   "clave": "fallecid|muert|decesos",
   "valor": 17,
   "corte": "2026-10-31",
   "fuente": "MINSA – Sala Situacional de Enfermedades Metaxénicas (SE 43)",
   "via": "El Tiempo",
   "url": "https://eltiempo.pe/local/dengue-en-piura-casos-aumentan-a-15-mil-716-casos-de-dengue-y-region-registra-17-fallecidos-en-2026/"
  },
  {
   "id": "lambayeque-dengue-casos",
   "indicador": "Casos de dengue 2026",
   "departamento": "Lambayeque",
   "tema": "dengue",
   "clave": "casos",
   "valor": 10559,
   "corte": "2026-11-05",
   "fuente": "CDC-MINSA, sala diaria (el CDC Lambayeque reporta 9793)",
   "via": "Diario Correo",
   "url": "https://diariocorreo.pe/edicion/lambayeque/lambayeque-registra-10559-casos-de-dengue-y-17-muertes-en-lo-que-va-del-2026-noticia/"
  },
  {
   "id": "lambayeque-dengue-fallecidos",
   "indicador": "Fallecidos por dengue 2026",
   "departamento": "Lambayeque",
   "tema": "dengue",
   "clave": "fallecid|muert|decesos",
   "valor": 25,
   "corte": "2026-10-31",
   "fuente": "CDC-MINSA (SE 43); el CDC Lambayeque reporta 17",
   "via": "La República, 07/11/2026",
   "url": "https://larepublica.pe/sociedad/2026/11/07/peru-supera-los-100-muertos-por-dengue-cifra-va-en-aumento-y-casi-duplica-los-registros-de-2025-202825"
  },
  {
   "id": "piura-lepto-casos",
   "indicador": "Casos de leptospirosis 2026 (probables y confirmados)",
   "departamento": "Piura",
   "tema": "leptospir",
   "clave": "casos",
   "valor": 3143,
   "corte": "2026-10-24",
   "fuente": "CDC-MINSA (SE 42)",
   "via": "Diario Correo, 03/11/2026",
   "url": "https://diariocorreo.pe/edicion/piura/piura-reporta-3143-casos-y-ocho-fallecidos-por-leptospirosis-en-lo-que-va-del-ano-noticia/"
  },
  {
   "id": "piura-lepto-fallecidos",
   "indicador": "Fallecidos por leptospirosis 2026",
   "departamento": "Piura",
   "tema": "leptospir",
   "clave": "fallecid|muert|decesos",
   "valor": 8,
   "corte": "2026-10-24",
   "fuente": "CDC-MINSA (SE 42)",
   "via": "Diario Correo, 03/11/2026",
   "url": "https://diariocorreo.pe/edicion/piura/piura-reporta-3143-casos-y-ocho-fallecidos-por-leptospirosis-en-lo-que-va-del-ano-noticia/"
  },
  {
   "id": "piura-distritos-emergencia",
   "indicador": "Distritos en estado de emergencia por El Niño (D.S. 149-2026-PCM)",
   "departamento": "Piura",
   "tema": "emergencia",
   "clave": "distritos",
   "valor": 65,
   "corte": "2026-11-03",
   "fuente": "El Peruano, D.S. N.° 149-2026-PCM (60 días)",
   "via": "conteo del anexo según Sol TV",
   "url": "https://busquedas.elperuano.pe/dispositivo/NL/2571017-4"
  },
  {
   "id": "peru-distritos-emergencia",
   "indicador": "Distritos en emergencia en el país (D.S. 149-2026-PCM)",
   "departamento": "*",
   "tema": "emergencia",
   "clave": "distritos",
   "valor": 1380,
   "corte": "2026-11-03",
   "fuente": "El Peruano, D.S. N.° 149-2026-PCM",
   "via": "La República (Sol TV cuenta 1363: revisar el anexo)",
   "url": "https://busquedas.elperuano.pe/dispositivo/NL/2571017-4"
  },
  {
   "id": "peru-dengue-fallecidos",
   "indicador": "Fallecidos por dengue en el país 2026",
   "departamento": "*",
   "tema": "dengue",
   "clave": "fallecid|muert|decesos",
   "valor": 101,
   "corte": "2026-10-31",
   "fuente": "MINSA (SE 43)",
   "via": "La República, 07/11/2026",
   "url": "https://larepublica.pe/sociedad/2026/11/07/peru-supera-los-100-muertos-por-dengue-cifra-va-en-aumento-y-casi-duplica-los-registros-de-2025-202825"
  },
  {
   "id": "peru-lepto-fallecidos",
   "indicador": "Fallecidos por leptospirosis en el país 2026",
   "departamento": "*",
   "tema": "leptospir",
   "clave": "fallecid|muert|decesos",
   "valor": 50,
   "corte": "2026-10-17",
   "fuente": "CDC-MINSA (SE 41)",
   "via": "El Búho, 29/10/2026",
   "url": "https://elbuho.pe/?p=441239"
  },
  {
   "id": "peru-lepto-casos",
   "indicador": "Casos de leptospirosis en el país 2026",
   "departamento": "*",
   "tema": "leptospir",
   "clave": "casos",
   "valor": 13962,
   "corte": "2026-10-17",
   "fuente": "CDC-MINSA (SE 41)",
   "via": "El Búho, 29/10/2026",
   "url": "https://elbuho.pe/?p=441239"
  }
 ]
};

/** La web la llama para pintar la pestaña de conclusiones. */
function obtenerConclusiones() {
  const datos = JSON.parse(obtenerFichas());
  return JSON.stringify(calcularConclusiones(datos, null, OFICIALES));
}

// ===== NÚCLEO (inicio) =====
// Desde aquí hasta «NÚCLEO (fin)» están las reglas. Este bloque se copia tal cual a
// apps-script/Conclusiones.gs (lo hace preparar-apps-script.mjs), así que no debe usar
// nada propio de Node (archivos, import). Si se mejora una regla aquí, la versión de
// Google Workspace la recibe en la siguiente preparación.
function calcularConclusiones({ generado, fichas }, evaluacion, oficiales) {
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const AHORA = new Date(generado);
const edadDias = f => (AHORA - new Date(f.publicada)) / 864e5;

// Titulares que el lector ubica mal (lugares homónimos de otras regiones o países).
// Si aparece otro caso, se agrega aquí, sin tildes y en minúsculas.
const FUERA_DE_ZONA = /nueva cajamarca|calarca|oxapampa|alianza atletico|fc cajamarca|liga 1/;

// ---------- 1. Señales de peligro para las personas ----------
// peso = cuánto suma al puntaje de prioridad de un lugar.
const SENALES = [
  { id: 'muertes',      grupo: 'vida',  peso: 10, nombre: 'Muertes o personas arrastradas', re: /fallec|muert|ahog|sin vida|arrastrad|cadaver|desaparecid/ },
  // 08/11/2026 05:15: se agrega «aisla»/«aislan» (verbo): «crecida del río Zaña destruye puente y aisla a 4 caseríos» no se detectaba.
  { id: 'aislamiento',  grupo: 'vida',  peso: 8,  nombre: 'Aislamiento o vías cortadas', re: /aislad|\baislan?\b|incomunicad|interrump|bloque\w* (la )?(via|carretera|transito)|puente\w* (artesanal )?(\w+ )?(colaps|cae|cay|arras|destru)|colapso de(l)? puente|arrasa con (el )?puente|queda aislado|via cerrada|cerrad\w* (el )?(transito|tunel)/ },
  { id: 'desborde',     grupo: 'vida',  peso: 8,  nombre: 'Desborde o crecida de ríos', re: /desbord|crecida|umbral rojo|supera\w* (el )?(umbral|alerta roja)|nivel critico|caudal/ },
  { id: 'huaicos',      grupo: 'vida',  peso: 7,  nombre: 'Huaicos y quebradas activas', re: /huaico|quebrada|deslizamiento|derrumbe/ },
  { id: 'damnificados', grupo: 'vida',  peso: 6,  nombre: 'Damnificados, evacuación o viviendas perdidas', re: /evacu|damnificad|inhabitable|viviendas? (colapsad|destruid|danad)|casas colapsaron|reubica|albergue/ },
  // 08/11/2026 10:11: «… cerca de 300 viviendas dañadas en Papayal por lluvias» no sumaba damnificados: se agrega «viviendas dañadas».
  { id: 'inundacion',   grupo: 'vida',  peso: 4,  nombre: 'Inundaciones urbanas', re: /inund|aniego|bajo el agua|anegad|sumergid/ },
  { id: 'electrico',    grupo: 'vida',  peso: 3,  nombre: 'Rayos y riesgo eléctrico', re: /rayo|tormenta\w* electric|riesgo electrico|descargas? electric|postes? electric|cortes? de luz/ },
  { id: 'dengue',       grupo: 'salud', peso: 6,  nombre: 'Dengue', re: /dengue|zancudo|aedes/ },
  { id: 'leptospirosis',grupo: 'salud', peso: 6,  nombre: 'Leptospirosis', re: /leptospir/ },
  { id: 'agua',         grupo: 'salud', peso: 4,  nombre: 'Agua potable y desagüe', re: /agua potable|desague|aguas residuales|alcantarillado|colaps\w* (de )?desag/ },
  { id: 'brecha',       grupo: 'brecha',peso: 5,  nombre: 'Brecha en la atención', re: /no cuenta|sin (banos|techo|grupo electrogeno|presupuesto|apoyo|fondos|respuesta|camas)|falta de|no soporto|no estan preparados|denuncia|cuestiona|\bcritica (a|al|la|el|las|los|falta|demora|lentitud)\b|(alcalde|gobernador|congresista|defensoria|poblacion|vecinos|dirigentes?|pobladores) critica|exige|exigen|piden|pide (ayuda|maquinaria)|reclam|sin ejecucion|medio motor|desabastec|no supera|solo hay|solo s\// },
];
// 08/11/2026 (corrida 5): en «brecha», «critica» suelto coincidía con «zonas críticas» o «situación crítica»
// («Ejército despliega militares y motobombas en zonas críticas» salía como brecha). Ahora solo cuenta el verbo
// («alcalde critica…», «critica la falta…»).
// Una señal solo cuenta si el titular habla de la emergencia, del clima o de la salud
// (así no se cuentan crímenes, accidentes de tránsito ni protestas como peligro por El Niño).
// 08/11/2026: «rio» va con \b porque «rio » coincidía dentro de «cementerio», «barrios», etc.
const CONTEXTO = /lluvia|precipitac|\brios?\b|quebrad|huaico|inund|desbord|el nino|nino costero|emergencia|damnific|dengue|leptospir|reservorio|corriente|caudal|tormenta|aniego|albergue|senamhi|indeci|coen|evacu|aislad|deslizamiento|derrumbe|hospital|salud|desague|alcantarill|agua potable|aguas residuales|granizo|rayo|sismo|vivienda|damnificad|afectad|reubicacion de \d+ familias/;
// 08/11/2026 12:10: «Tumbes: gobierno evalúa reubicación de 120 familias en Aguas Verdes» (tras el desborde del
// Zarumilla) no sumaba damnificados porque el titular no traía otra palabra de contexto: se agrega «reubicación de N familias».
// 08/11/2026: debate sobre un riesgo futuro (p. ej. el desvío del río Piura en Sechura): no es un peligro
// que esté ocurriendo, así que no suma señales de vida; el tema sigue contando como proyecto.
// 08/11/2026 05:15: un simulacro (Chiclayo, Cajamarca) tampoco es un peligro real: sus «damnificados» o
// «inundaciones» son ficticios y no deben sumar señales de vida.
const HIPOTETICO = /se veria inundad|no se va a inundar|evitar futura inundac|pondria en riesgo|por riesgo de inundac|simulacro/;
// 08/11/2026 (corrida 7): «Dengue se desborda en Lambayeque» sumaba «Desborde o crecida de ríos»:
// es un uso figurado (aumento de casos). No suma esa señal (sigue contando como dengue).
const DESBORDE_FIGURADO = /(dengue|casos|contagios|epidemia)\w* se desbord/;
// 08/11/2026 (corrida 7): «Lambayeque: 18 fallecidos por dengue…» sumaba «Muertes o personas arrastradas» y
// daba la acción «Señalizar o cercar el peligro (ríos, reservorios…)», que no sirve para el dengue.
// Las muertes por dengue o leptospirosis cuentan en su señal de salud, no en «muertes».
const MUERTE_SALUD = /dengue|leptospir/;
// 08/11/2026 (corrida 4): «Inician obra de agua y alcantarillado en Chiclayo con inversión de S/ 12 millones»
// y «… siguen esperando megaproyecto de saneamiento» sumaban la señal de peligro «Agua potable y desagüe»:
// son obras o reclamos de obra, no un daño que esté ocurriendo. No suman esa señal (siguen contando como proyecto).
const OBRA_AGUA = /inician obra|\bobras? de (agua|saneamiento|alcantarillado)|megaproyecto|con inversion de/;
// 08/11/2026 (corrida 5): «Contraloría supervisa limpieza de quebradas en Huancabamba» sumaba «Huaicos y quebradas activas»:
// es trabajo preventivo, no una quebrada activa. Esos titulares no suman la señal de huaicos (siguen contando como proyecto).
const PREVENCION_QUEBRADA = /limpieza de (las )?quebradas?|descolmatac\w* de (las? )?quebradas?/;
const RESPUESTA = /albergue|hospital de campana|ayuda humanitaria|motobomba|puente modular|puente terrestre|brigada|despliega|maquinaria|bienes de ayuda|minsa movil|kits?/;
const PRONOSTICO = /senamhi|aviso|alerta roja|pronostic|preve\b|prevén|coen|indeci (alerta|emite|advierte)|enfen/;

// Qué hacer cuando aparece cada señal (acciones para salvar vidas).
const ACCION = {
  aislamiento: 'Llevar ya víveres, agua segura, medicinas y combustible; asegurar comunicación por radio o satélite.',
  desborde: 'Evacuar a tiempo las riberas; vigilar el caudal con el umbral oficial del SENAMHI.',
  huaicos: 'Alejar viviendas y tránsito de los cauces; vigías comunitarios en las quebradas.',
  damnificados: 'Albergues con baños, techo, agua y luz; registrar a las familias y a las personas vulnerables.',
  inundacion: 'Motobombas y limpieza de drenes; advertir que el agua acumulada puede estar contaminada.',
  muertes: 'Señalizar o cercar el peligro que causó la muerte (ríos, reservorios, zanjas, cables).',
  electrico: 'Avisar de tormentas eléctricas y revisar cables y postes expuestos.',
  dengue: 'Eliminar criaderos, fumigar, vacunar y reforzar la atención de fiebre.',
  leptospirosis: 'Botas y guantes; no caminar en agua de desagüe; atender pronto la fiebre.',
  agua: 'Agua segura (cloración, cisternas) y reparación de desagües.',
  brecha: 'Llevar la brecha al COER, a INDECI y a la Defensoría del Pueblo, con nombre y lugar.',
};

// ---------- 5. Proyectos que reducirían el daño de El Niño ----------
const PROYECTOS = [
  { id: 'drenaje',     nombre: 'Drenaje pluvial y alcantarillado', re: /drenaje pluvial|alcantarillado|drenes?\b|agua y alcantarillado/ },
  { id: 'rio-piura',   nombre: 'Salida definitiva del río Piura al mar', re: /salida (definitiva )?del rio piura|desvio del rio piura|derivacion del rio piura|chutuque|rio loco|dren 1308|bifurcacion del rio|reventazon/ },
  { id: 'defensas',    nombre: 'Defensas ribereñas y descolmatación', re: /defensas? riberen|descolmat|limpieza de (la )?(quebrada|rio|cauce)|encauzamiento|encauzan?\b|sedimentos|reforzaran defensas|proteger a \d+ localidades/ },
  { id: 'puentes',     nombre: 'Puentes y vías definitivas', re: /puente de concreto|puentes? definitiv|construccion de(l)? puente|via de evitamiento|carretera .*(invertira|mejorar|millones)|estribo|puentes modulares/ },
  // 08/11/2026 06:xx: «presa» como palabra completa; antes coincidía dentro de «empresas»
  // («anula contratación de empresas para la salida del río Piura» caía en presas).
  { id: 'agua',        nombre: 'Presas y reservorios de agua', re: /\bpresas?\b|represa|almacenar agua/ },
  { id: 'cuencas',     nombre: 'Reforestación y cuidado de cuencas', re: /reforest|arboles plantados|desarrollo forestal|cuenca/ },
  { id: 'reubicacion', nombre: 'Reubicación de familias en zonas de riesgo', re: /reubica/ },
  { id: 'salud',       nombre: 'Hospitales y salud preparada', re: /ampliacion de su hospital|hospital (regional|de especialidades)|centro de salud|grupo electrogeno|control vectorial|vacunacion/ },
  { id: 'colegios',    nombre: 'Colegios seguros', re: /techo de \d+ colegios|colegios? .*(obras por impuestos|mejorar)/ },
  { id: 'alerta',      nombre: 'Alerta temprana e información', re: /alerta temprana|pluviometr|inteligencia geoespacial|sistema de alerta|umbrales de inundacion/ },
  { id: 'patrimonio',  nombre: 'Protección del patrimonio cultural', re: /patrimonio|huacas|arqueolog/ },
  { id: 'mineria',     nombre: 'Control de la minería ilegal y sus relaves', re: /mineria ilegal|relaves|mineros ilegales/ },
];
const ES_PROYECTO = /obra|proyecto|construc|ejecuc|invert|inversion|destina|millones|ampliacion|buena pro|propuesta|plan\b|estudio|exige|piden|pide|solicita|pendiente|reforz|impulsa|meta|protege|limpieza|descolmat|retira|rechaz|anula|descarta|prioriza|encauza/;
// 08/11/2026 12:10: «Encauzan el río Chancay-Lambayeque para reducir riesgos…» no contaba como defensa ribereña
// (solo se buscaba «encauzamiento»), y «Keiko Fujimori descarta salida del río Piura por Sechura y prioriza aliviadero
// de Chutuque» no contaba como proyecto: se agregan «encauza(n)», «descarta» y «prioriza».
function estadoProyecto(t) {
  if (/rechaz|en pie de lucha|no permitiran|conflicto|anula/.test(t)) return 'En conflicto';
  if (/sin ejecucion|pendiente|paraliz|medio motor|atras|10 anos|no estara lista|posterga/.test(t)) return 'Atrasado';
  if (/piden|pide|exige|solicita|reclam|demanda/.test(t)) return 'Pedido';
  if (/inicia|ejecuc|avanza|concluye|encauzan|buena pro|destina|invertira|retira|impulsa|cofinanciara|reforzaran|despliega/.test(t)) return 'En curso';
  return 'Mencionado';
}

// ---------- Clasificación de cada ficha ----------
// 08/11/2026 (corrida 4): «Perú: el pronóstico del tiempo para Piura este 7 de noviembre» (nota diaria automática)
// ocupaba un lugar en el pronóstico sin ser un aviso del SENAMHI; esas notas genéricas no cuentan como pronóstico.
const PRONOSTICO_GENERICO = /el pronostico del tiempo para/;
const UTILES = new Set(['Emergencias', 'Lluvias y clima', 'Salud', 'Economía y producción', 'Otros']);
const peso = f => { const d = edadDias(f); return d <= 2 ? 3 : d <= 7 ? 1.5 : 0.5; };

const clasificadas = [];
for (const f of fichas) {
  if (!UTILES.has(f.tema)) continue;
  const t = norm(f.titulo);
  if (FUERA_DE_ZONA.test(t)) continue;
  const senales = CONTEXTO.test(t) ? SENALES.filter(s => s.re.test(t) && !(HIPOTETICO.test(t) && s.grupo === 'vida') && !(s.id === 'agua' && OBRA_AGUA.test(t)) && !(s.id === 'huaicos' && PREVENCION_QUEBRADA.test(t)) && !(s.id === 'desborde' && DESBORDE_FIGURADO.test(t)) && !(s.id === 'muertes' && MUERTE_SALUD.test(t))).map(s => s.id) : [];
  const proyectos = ES_PROYECTO.test(t) ? PROYECTOS.filter(p => p.re.test(t)).map(p => p.id) : [];
  clasificadas.push({ f, t, senales, proyectos, respuesta: RESPUESTA.test(t), pronostico: PRONOSTICO.test(t) && !PRONOSTICO_GENERICO.test(t) });
}
const porId = Object.fromEntries(SENALES.map(s => [s.id, s]));
// Dos titulares casi iguales (el mismo hecho en dos medios) se muestran una sola vez.
// 08/11/2026 (corrida 5): decía split(/s+/) (se perdió la barra): partía las palabras en cada «s» y la detección de titulares repetidos fallaba.
const palabras = t => new Set(t.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3));
function sinRepetir(lista) {
  const vistos = [];
  return lista.filter(c => { const p = palabras(c.t); const rep = vistos.some(q => { let n = 0; p.forEach(w => q.has(w) && n++); return n / Math.min(p.size, q.size || 1) >= 0.6; }); if (!rep) vistos.push(p); return !rep; });
}
const resumenFicha = c => ({ id: c.f.id, titulo: c.f.titulo, enlace: c.f.enlace, medio: c.f.medio, fecha: c.f.publicada, senales: c.senales });

// ---------- 1. Prioridad por lugar ----------
// Clave de lugar: distrito si lo hay; si no, provincia; si no, departamento.
const lugares = new Map();
for (const c of clasificadas) {
  const vida = c.senales.filter(s => porId[s].grupo !== 'brecha' || c.senales.length > 1);
  if (!vida.length) continue;
  const lista = c.f.lugares.length ? c.f.lugares : [];
  for (const l of lista) {
    const nivel = l.distrito ? 'distrito' : (l.provincia && l.provincia !== l.departamento ? 'provincia' : 'departamento');
    const nombre = l.distrito || (nivel === 'provincia' ? l.provincia : l.departamento);
    // un distrito capital y su provincia con el mismo nombre (Huancabamba, Zarumilla) se cuentan juntos
    const k = nivel === 'departamento' ? `${l.departamento}|*` : `${l.departamento}|${nombre}`;
    if (!lugares.has(k)) lugares.set(k, { clave: k, nombre, nivel, departamento: l.departamento, provincia: l.provincia, distrito: l.distrito, puntaje: 0, senales: {}, recientes: 0, previas: 0, fichas: [] });
    const L = lugares.get(k);
    if (!l.distrito) L.distrito = null; // si se juntó con la provincia, "Ver fichas" muestra toda la provincia
    const p = vida.reduce((s, id) => s + porId[id].peso, 0) * peso(c.f);
    L.puntaje += Math.min(p, 60);
    vida.forEach(id => L.senales[id] = (L.senales[id] || 0) + 1);
    const d = edadDias(c.f);
    if (d <= 3) L.recientes++; else if (d <= 6) L.previas++;
    L.fichas.push(c);
  }
}
const ranking = [...lugares.values()]
  // un departamento entero solo entra si no hay lugares más precisos con señales; se muestran aparte
  .map(L => {
    const top = Object.entries(L.senales).sort((a, b) => porId[b[0]].peso * b[1] - porId[a[0]].peso * a[1]);
    const fechas = L.fichas.map(c => c.f.publicada).sort(); const ultima = fechas[fechas.length - 1];
    const fichasTop = sinRepetir(L.fichas.slice().sort((a, b) => b.f.publicada.localeCompare(a.f.publicada))).slice(0, 4).map(resumenFicha);
    const tendencia = L.recientes > L.previas ? 'sube' : L.recientes < L.previas ? 'baja' : 'estable';
    return {
      nombre: L.nombre, nivel: L.nivel, departamento: L.departamento, provincia: L.provincia, distrito: L.distrito,
      puntaje: Math.round(L.puntaje), menciones: L.fichas.length, ultima, tendencia,
      senales: top.map(([id, n]) => ({ id, nombre: porId[id].nombre, n })),
      acciones: [...new Set(top.slice(0, 4).map(([id]) => ACCION[id]).filter(Boolean))],
      fichas: fichasTop,
    };
  })
  .sort((a, b) => b.puntaje - a.puntaje);

const precisos = ranking.filter(r => r.nivel !== 'departamento');
const maxP = (precisos[0] ? precisos[0].puntaje : 0) || 1;
// Crítica: los 3 primeros o los que llegan a la mitad del primero; Alta: hasta el puesto 10.
precisos.forEach((r, i) => r.prioridad = (i < 3 || r.puntaje >= maxP * 0.5) && r.puntaje >= 25 ? 'Crítica' : i < 10 && r.puntaje >= 10 ? 'Alta' : 'Media');
const departamentos = ranking.filter(r => r.nivel === 'departamento');

// ---------- 2. Salud ----------
const DEPS = ['Tumbes', 'Piura', 'Lambayeque', 'Cajamarca'];
const salud = DEPS.map(dep => {
  const de = clasificadas.filter(c => c.f.departamentos.includes(dep));
  const enf = id => de.filter(c => c.senales.includes(id));
  const ofic = oficiales.indicadores.filter(i => i.departamento === dep && /dengue|leptospir/.test(i.tema))
    .map(i => ({ indicador: i.indicador, valor: i.valor, corte: i.corte, fuente: i.fuente, url: i.url }));
  return {
    departamento: dep,
    dengue: enf('dengue').length, leptospirosis: enf('leptospirosis').length, agua: enf('agua').length,
    oficiales: ofic,
    fichas: sinRepetir([...enf('dengue'), ...enf('leptospirosis'), ...enf('agua')]
      .filter((c, i, a) => a.indexOf(c) === i).sort((a, b) => b.f.publicada.localeCompare(a.f.publicada))).slice(0, 4).map(resumenFicha),
  };
});

// ---------- 3. Brechas en la atención ----------
const brechas = sinRepetir(clasificadas.filter(c => c.senales.includes('brecha') && edadDias(c.f) <= 14)
  .sort((a, b) => b.f.publicada.localeCompare(a.f.publicada)))
  .slice(0, 14)
  .map(c => ({ ...resumenFicha(c), lugar: c.f.lugares.map(l => l.distrito || l.provincia || l.departamento).join(', ') || c.f.departamentos.join(', ') }));

// ---------- 4. Pronóstico (últimos 3 días) ----------
const pronostico = sinRepetir(clasificadas.filter(c => c.pronostico && edadDias(c.f) <= 3)
  .sort((a, b) => b.f.publicada.localeCompare(a.f.publicada)))
  .slice(0, 8).map(resumenFicha);

// ---------- 5. Proyectos ----------
const proyectos = PROYECTOS.map(p => {
  const cs = clasificadas.filter(c => c.proyectos.includes(p.id));
  if (!cs.length) return null;
  const estados = {};
  cs.forEach(c => { const e = estadoProyecto(c.t); estados[e] = (estados[e] || 0) + 1; });
  const lugaresP = [...new Set(cs.flatMap(c => c.f.lugares.map(l => l.distrito || l.provincia || l.departamento)))];
  return {
    id: p.id, nombre: p.nombre, menciones: cs.length, estados, lugares: lugaresP.slice(0, 8),
    fichas: sinRepetir(cs.sort((a, b) => b.f.publicada.localeCompare(a.f.publicada))).slice(0, 4).map(c => ({ ...resumenFicha(c), estado: estadoProyecto(c.t) })),
  };
}).filter(Boolean).sort((a, b) => ((b.estados['Atrasado'] || 0) + (b.estados['Pedido'] || 0) + (b.estados['En conflicto'] || 0)) - ((a.estados['Atrasado'] || 0) + (a.estados['Pedido'] || 0) + (a.estados['En conflicto'] || 0)) || b.menciones - a.menciones);

// ---------- 6. Calidad de cifras ----------
const calidad = evaluacion ? {
  cuenta: evaluacion.cuenta,
  sinReferencia: evaluacion.sinReferencia.length,
  difieren: evaluacion.resultados.flatMap(r => r.afirmaciones.filter(a => a.estado === 'difiere').map(a => ({ indicador: r.indicador, departamento: r.departamento, oficial: r.valor, prensa: a.cifra, medio: a.medio, fecha: a.fecha, fuente: r.fuente, url: r.url }))),
  vencidas: evaluacion.resultados.filter(r => r.referenciaVencida).map(r => r.indicador + (r.departamento === '*' ? '' : ' – ' + r.departamento)),
} : null;

// ---------- Conclusiones en frases ----------
const minus = t => t[0].toLowerCase() + t.slice(1);
const listaN = a => a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
const frases = [];
const criticos = precisos.filter(r => r.prioridad === 'Crítica').slice(0, 5);
if (criticos.length) frases.push(`Prioridad para salvar vidas: ${listaN(criticos.map(r => `${r.nombre} (${r.departamento})`))}. Señal principal: ${listaN([...new Set(criticos.map(r => minus(r.senales[0].nombre)))])}.`);
const depTop = departamentos.slice(0, 2);
if (depTop.length) frases.push(`Por departamento, las noticias de peligro se concentran en ${listaN(depTop.map(d => d.nombre))}; muchas no nombran el distrito, así que hay que confirmar con el COER dónde está la gente afectada.`);
const aisl = precisos.filter(r => r.senales.some(s => s.id === 'aislamiento')).slice(0, 6);
if (aisl.length) frases.push(`Riesgo de aislamiento en ${listaN(aisl.map(r => r.nombre))}: abastecer antes del corte de vías.`);
const sube = precisos.filter(r => r.tendencia === 'sube' && r.prioridad !== 'Media').slice(0, 5);
if (sube.length) frases.push(`Aumentan las noticias de peligro en los últimos 3 días en ${listaN(sube.map(r => r.nombre))}.`);
const sal = salud.filter(s => s.dengue + s.leptospirosis > 0).sort((a, b) => (b.dengue + b.leptospirosis) - (a.dengue + a.leptospirosis));
if (sal.length) frases.push(`Salud: ${listaN(sal.map(s => `${s.departamento} (${s.dengue} noticias de dengue${s.leptospirosis ? `, ${s.leptospirosis} de leptospirosis` : ''})`))}.`);
if (brechas.length) frases.push(`${brechas.length} noticias recientes señalan brechas en la atención; la más reciente: «${brechas[0].titulo}».`);
const atras = proyectos.filter(p => p.estados['Atrasado'] || p.estados['En conflicto']);
if (atras.length) frases.push(`Proyectos atrasados o en conflicto que agravan el daño: ${listaN(atras.map(p => minus(p.nombre)))}.`);
if (calidad && calidad.difieren.length) frases.push(`${calidad.difieren.length} cifras de prensa difieren de la oficial; usar siempre la cifra oficial.`);

const salida = {
  generado, lecturaFichas: fichas.length, analizadas: clasificadas.length,
  aviso: 'Señales de prensa (nivel D). Sirven para priorizar la atención; las cifras oficiales son las de INDECI, SENAMHI y MINSA.',
  frases, prioridad: precisos.slice(0, 15), departamentos, salud, brechas, pronostico, proyectos, calidad,
};
return salida;
}
// ===== NÚCLEO (fin) =====
