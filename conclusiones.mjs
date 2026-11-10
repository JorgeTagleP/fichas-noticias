// =====================================================================
// conclusiones.mjs — Conclusiones automáticas para enfrentar la emergencia
// ---------------------------------------------------------------------
// Qué hace, en palabras simples:
//   Lee las fichas (fichas.json) y la evaluación de cifras (evaluacion.json)
//   y arma, en cada lectura, las conclusiones que ayudan a decidir:
//
//   1. PRIORIDAD PARA SALVAR VIDAS: qué lugares tienen más señales de
//      peligro para las personas (aislamiento, desbordes, huaicos,
//      evacuaciones, muertes, enfermedades) y qué hacer en cada uno.
//      Las noticias de los últimos 2 días pesan más que las antiguas.
//   2. SALUD: dengue, leptospirosis, agua y desagüe, con la cifra oficial.
//   3. BRECHAS EN LA ATENCIÓN: albergues sin condiciones, hospitales que
//      fallan, alcaldes que piden ayuda que no llega.
//   4. PRONÓSTICO: lo último que dicen SENAMHI, INDECI o el COEN.
//   5. PROYECTOS PARA EL FUTURO: obras que reducirían el daño de El Niño
//      y en qué estado las muestran las noticias (pedida, en curso,
//      atrasada o en conflicto).
//   6. CALIDAD DE LAS CIFRAS: lo que coincide o difiere con lo oficial.
//
// Escribe conclusiones.json (web), conclusiones.js (para abrir la página
// como archivo) y conclusiones.md (para leer o pegar en un documento).
//
// Importante: son noticias de prensa, tal como las publicó cada medio. Sirven para mirar primero
// donde más urge, no reemplazan los reportes de INDECI, SENAMHI ni MINSA.
//
// Uso:  node conclusiones.mjs   (actualizar-noticias.cmd ya lo ejecuta)
// =====================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const leer = (f, def) => { try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch { return def; } };

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
// 09/11/2026 13:20: se agregan «ibague», «tolima», «quindio» y «las mariposas»: Cajamarca de Colombia
// (vía Cajamarca–Ibagué, túnel Las Mariposas) sumaba heridos y accidentes a Cajamarca del Perú.
const FUERA_DE_ZONA = /nueva cajamarca|calarca|ibague|tolima|quindio|las mariposas|oxapampa|alianza atletico|fc cajamarca|liga 1/;

// ---------- 1. Señales de peligro para las personas ----------
// peso = cuánto suma al puntaje de prioridad de un lugar.
const SENALES = [
  // 09/11/2026 13:20: se agrega «río/corriente/huaico arrastra…»: «Río arrastra camioneta con una mujer y niños a bordo
  // en Cajamarca» (rescate) no sumaba porque solo se buscaba «arrastrad».
  { id: 'muertes',      grupo: 'vida',  peso: 10, nombre: 'Muertes o personas arrastradas', re: /fallec|muert|ahog|sin vida|arrastrad|(?:rio|corriente|caudal|huaico|quebrada)s? (?:se )?(?:lo |la |los |las |le )?arrastra|cadaver|desaparecid/ },
  // 08/11/2026 05:15: se agrega «aisla»/«aislan» (verbo): «crecida del río Zaña destruye puente y aisla a 4 caseríos» no se detectaba.
  // 09/11/2026 18:xx: «Tumbes: Oficina Regional de Gestión del Riesgo reporta vías afectadas y más de 10 quebradas activadas» no sumaba
  // aislamiento: se agrega «vías/carreteras afectadas» (daño ya ocurrido en las vías).
  { id: 'aislamiento',  grupo: 'vida',  peso: 8,  nombre: 'Aislamiento o vías cortadas', re: /aislad|\baislan?\b|incomunicad|interrump|bloque\w* (la )?(via|carretera|transito)|puente\w* (artesanal )?(\w+ )?(colaps|cae|cay|arras|destru)|colapso de(l)? puente|arrasa con (el )?puente|queda aislado|via cerrada|cerrad\w* (el )?(transito|tunel)|(vias|carreteras) afectadas/ },
  { id: 'desborde',     grupo: 'vida',  peso: 8,  nombre: 'Desborde o crecida de ríos', re: /desbord|crecida|umbral rojo|supera\w* (el )?(umbral|alerta roja)|nivel critico|caudal/ },
  { id: 'huaicos',      grupo: 'vida',  peso: 7,  nombre: 'Huaicos y quebradas activas', re: /huaico|quebrada|deslizamiento|derrumbe/ },
  { id: 'damnificados', grupo: 'vida',  peso: 6,  nombre: 'Damnificados, evacuación o viviendas perdidas', re: /evacu|damnificad|inhabitable|viviendas? (colapsad|destruid|danad)|casas colapsaron|reubica|albergue|(deja\w*|\d|mil|cientos de) (a |mas de )?(\w+ )?(personas|familias) afectadas/ },
  // 08/11/2026 19:10: «Tumbes: lluvias intensas dejan más de mil 600 personas afectadas» no sumaba ninguna señal; se agrega «N personas/familias afectadas» (no «atención de familias afectadas», que es respuesta).
  // 08/11/2026 10:11: «… cerca de 300 viviendas dañadas en Papayal por lluvias» no sumaba damnificados: se agrega «viviendas dañadas».
  { id: 'inundacion',   grupo: 'vida',  peso: 4,  nombre: 'Inundaciones urbanas', re: /inund|aniego|bajo el agua|anegad|sumergid/ },
  { id: 'electrico',    grupo: 'vida',  peso: 3,  nombre: 'Rayos y riesgo eléctrico', re: /rayo|tormenta\w* electric|riesgo electrico|descargas? electric|postes? electric|cortes? de luz/ },
  { id: 'dengue',       grupo: 'salud', peso: 6,  nombre: 'Dengue', re: /dengue|zancudo|aedes/ },
  { id: 'leptospirosis',grupo: 'salud', peso: 6,  nombre: 'Leptospirosis', re: /leptospir/ },
  { id: 'agua',         grupo: 'salud', peso: 4,  nombre: 'Agua potable y desagüe', re: /agua potable|desague|aguas residuales|alcantarillado|colaps\w* (de )?desag/ },
  { id: 'brecha',       grupo: 'brecha',peso: 5,  nombre: 'Brecha en la atención', re: /no cuenta|sin (banos|techo|grupo electrogeno|presupuesto|apoyo|fondos|respuesta|camas)|falta de|no soporto|no estan preparados|denuncia|cuestiona|\bcritica (a|al|la|el|las|los|falta|demora|lentitud)\b|(alcalde|gobernador|congresista|defensoria|poblacion|vecinos|dirigentes?|pobladores) critica|exige|exigen|piden|pide (ayuda|maquinaria)|reclam|sin ejecucion|medio motor|desabastec|no supera|solo hay|solo s\/|obra\w* (\w+ )?pone\w* en (peligro|riesgo)|llevan? \d+ dias sin|fallas? en (la )?obra|obras? (\w+ )?inconclus|abiertas e inconclus/ },
  // 09/11/2026 23:15: «Piura: lluvias inundan viviendas tras fallas en obra de alcantarillado en Ayabaca» y la nota de Exitosa sobre
  // calles «abiertas e inconclusas por una obra» no contaban como brecha: una obra fallida o inconclusa que agrava la inundación es una brecha.
  // 09/11/2026 18:xx: «Piura: Pobladores llevan 5 días sin agua potable» contaba como agua pero no como brecha;
  // varios días sin un servicio básico es una falla de atención: se agrega «llevan N días sin».
  // 09/11/2026 16:20: «Piura: Una obra pone en peligro a la población ante El Niño» (Correo) no sumaba ninguna señal;
  // una obra que pone en riesgo a la población es una brecha. Solo con «obra», para no contar avisos del SENAMHI («… que pone en riesgo a Piura»).
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
// 09/11/2026: «Tumbes: instalan tres albergues para atender a familias que resulten damnificadas…» sumaba damnificados;
// es preparación (familias que podrían resultar damnificadas), no un daño ocurrido.
// 09/11/2026 13:xx: «Video viral de inundaciones en Tumbes corresponde a abril de 2025 y no a la emergencia actual» sumaba
// «Inundaciones urbanas» en Tumbes; es un desmentido de un video antiguo, no un daño actual. No suma señales de vida.
// 09/11/2026 09:11: «Chiclayo: entregan kits educativos y pelotas a niños de albergue en Ferreñafe» sumaba damnificados
// solo por la palabra «albergue»; una donación de juguetes o útiles no es un daño: no suma damnificados
// (salvo que el titular nombre damnificados, evacuados o viviendas perdidas).
const DONACION_ALBERGUE = /kits? educativ|pelotas|juguetes|utiles escolares/;
// 09/11/2026 21:10: «Antiguas culturas del Perú sacrificaban personas tras inundaciones de El Niño…» (nota de
// arqueología) sumaba «Inundaciones urbanas» a Lambayeque; los hechos históricos no suman señales de vida.
const HIPOTETICO = /se veria inundad|no se va a inundar|evitar futura inundac|pondria en riesgo|por riesgo de inundac|simulacro|que resulten damnificad|no a la emergencia actual|video viral\w* .*corresponde a|antiguas culturas|sacrificaban/;
// 08/11/2026 (corrida 7): «Dengue se desborda en Lambayeque» sumaba «Desborde o crecida de ríos»:
// es un uso figurado (aumento de casos). No suma esa señal (sigue contando como dengue).
// 09/11/2026 10:10: «Senamhi alerta sobre … posibles huaicos en Ayabaca» sumaba «Huaicos» y «trabajos de descolmatación evitan desborde del río Tumbes»
// sumaba «Desborde»: son avisos o peligros evitados, no daños ocurridos. No suman huaicos ni desborde.
// 09/11/2026 tarde: «activan "puente terrestre" para evitar que Morropón quede aislada» sumaba «Aislamiento»; es prevención. También excluye aislamiento.
const PELIGRO_NO_OCURRIDO = /posibles? (huaicos?|desbordes?)|evita\w* (el )?desborde|evitar que \w+( \w+)? queden? aislad/;
const DESBORDE_FIGURADO = /(dengue|casos|contagios|epidemia)\w* se desbord/;
// 08/11/2026 (corrida 7): «Lambayeque: 18 fallecidos por dengue…» sumaba «Muertes o personas arrastradas» y
// daba la acción «Señalizar o cercar el peligro (ríos, reservorios…)», que no sirve para el dengue.
// Las muertes por dengue o leptospirosis cuentan en su señal de salud, no en «muertes».
const MUERTE_SALUD = /dengue|leptospir/;
// 10/11/2026 05:20: «El Niño y dengue: Essalud refuerza atención hospitalaria y vacunación en Tumbes y Piura» y
// «Tumbes: Ejército instala hospital de campaña para atender dengue…» sumaban la señal «Dengue» (peligro) y eran
// la ficha más reciente de peligro en Tumbes; son respuesta, no brote. Sin palabras de brote no suman dengue/lepto.
const SALUD_RESPUESTA = /refuerza|instala|vacunacion en|campana contra|fumiga|capacita|prepara a/;
const SALUD_BROTE = /casos|brote|epidemia|muert|fallec|contagi|aument|alerta|solo hay|camas|colaps/;
// 08/11/2026 19:10: «Tumbes: adoptan medidas para evitar colapso de hospitales y desabastecimiento de medicinas» salía como brecha
// por «desabastec»; es una medida preventiva, no una falla. Las «medidas para evitar/prevenir» no suman brecha.
const PREVENCION_BRECHA = /medidas para (evitar|prevenir)/;
// 08/11/2026 (corrida 4): «Inician obra de agua y alcantarillado en Chiclayo con inversión de S/ 12 millones»
// y «… siguen esperando megaproyecto de saneamiento» sumaban la señal de peligro «Agua potable y desagüe»:
// son obras o reclamos de obra, no un daño que esté ocurriendo. No suman esa señal (siguen contando como proyecto).
const OBRA_AGUA = /inician obra|\bobras? de (agua|saneamiento|alcantarillado)|megaproyecto|con inversion de/;
// 09/11/2026: «Jaén: vecinos exigen solución ante constantes colapsos de desagüe en Camal Municipal» ponía a Jaén en
// prioridad Alta (agua + brecha), sobre Papayal (un fallecido y viviendas dañadas). Es un problema crónico del desagüe,
// sin lluvia ni El Niño en el titular. Si el problema es «constante» y el titular no nombra el clima, no suma agua ni brecha.
const CRONICO = /\bconstantes? (colaps|aniego|fuga)/;
const CLIMA = /lluvia|inund|desbord|el nino|huaico|quebrad|precipitac/;
// 09/11/2026 22:10: «Detectan riesgo eléctrico en puestos frente a cementerio en Sullana» sumaba «Rayos y riesgo eléctrico»
// y ponía a Sullana en prioridad Alta: es una inspección de puestos, sin lluvia ni tormenta. El riesgo eléctrico solo
// cuenta si el titular nombra rayos, tormentas o el clima.
const ELECTRICO_CLIMA = /rayo|tormenta/;
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
  // 09/11/2026 19:xx: «Piura frente a El Niño: las intervenciones en el río, drenajes y abastecimiento de agua financiadas con una
  // inversión de S/20 mllns.» no contaba en drenaje (solo «drenaje pluvial» o «drenes»): se agrega «drenaje(s)» como palabra completa.
  { id: 'drenaje',     nombre: 'Drenaje pluvial y alcantarillado', re: /drenaje pluvial|\bdrenajes?\b|alcantarillado|drenes?\b|agua y alcantarillado/ },
  { id: 'rio-piura',   nombre: 'Salida definitiva del río Piura al mar', re: /salida (definitiva )?del rio piura|desvio del rio piura|derivacion del rio piura|chutuque|rio loco|dren 1308|bifurcacion del rio|reventazon/ },
  { id: 'defensas',    nombre: 'Defensas ribereñas y descolmatación', re: /defensas? riberen|descolmat|limpieza de (la )?(quebrada|rio|cauce)|encauzamiento|encauzan?\b|sedimentos|reforzaran defensas|proteger a \d+ localidades/ },
  { id: 'puentes',     nombre: 'Puentes y vías definitivas', re: /puente de concreto|puentes? definitiv|construccion de(l)? puente|via de evitamiento|carretera .*(invertira|mejorar|millones)|estribo|puentes modulares/ },
  // 08/11/2026 06:xx: «presa» como palabra completa; antes coincidía dentro de «empresas»
  // («anula contratación de empresas para la salida del río Piura» caía en presas).
  { id: 'agua',        nombre: 'Presas y reservorios de agua', re: /\bpresas?\b|represa|almacenar agua|\bqochas?\b|cosecha de agua/ },
  // 08/11/2026 17:12: «Cajamarca: Qocha La Florida almacenará 149 137,64 m³ de agua…» no contaba: se agregan «qocha» y «cosecha de agua».
  { id: 'cuencas',     nombre: 'Reforestación y cuidado de cuencas', re: /reforest|arboles plantados|desarrollo forestal|cuenca/ },
  { id: 'reubicacion', nombre: 'Reubicación de familias en zonas de riesgo', re: /reubica/ },
  { id: 'salud',       nombre: 'Hospitales y salud preparada', re: /ampliacion de su hospital|hospital (regional|de especialidades)|centro de salud|grupo electrogeno|control vectorial|vacunacion/ },
  { id: 'colegios',    nombre: 'Colegios seguros', re: /techo de \d+ colegios|colegios? .*(obras por impuestos|mejorar)/ },
  { id: 'alerta',      nombre: 'Alerta temprana e información', re: /alerta temprana|pluviometr|inteligencia geoespacial|sistema de alerta|umbrales de inundacion/ },
  { id: 'patrimonio',  nombre: 'Protección del patrimonio cultural', re: /patrimonio|huacas|arqueolog/ },
  { id: 'mineria',     nombre: 'Control de la minería ilegal y sus relaves', re: /mineria ilegal|relaves|mineros ilegales/ },
];
// 08/11/2026 17:12: «ministro de Cultura supervisa acciones preventivas en sitios arqueológicos de Piura» no contaba
// como proyecto de patrimonio (Piura no aparecía): se agregan «supervisa» y «preventiv»; «supervisa» cuenta como «En curso».
// 10/11/2026 03:30: «El Niño y dengue: Essalud refuerza atención hospitalaria y vacunación en Tumbes y Piura» no contaba en
// «Hospitales y salud preparada» (solo se buscaba «reforz»): se agrega «refuerza(n)» como palabra completa; cuenta «En curso».
const ES_PROYECTO = /\brefuerzan?\b|supervisa|preventiv|obra|proyecto|construc|ejecuc|invert|inversion|destina|millones|ampliacion|buena pro|propuesta|plan\b|estudio|exige|piden|pide|solicita|pendiente|reforz|impulsa|meta|protege|limpieza|\blimpian?\b|descolmat|retira|rechaz|anula|descarta|prioriza|encauza/;
// 09/11/2026 05:xx: «Piura: limpian drenes Sechura y 1308 ante posibles lluvias intensas» no contaba como proyecto
// (solo se buscaba «limpieza»): se agrega el verbo «limpia(n)», que cuenta como «En curso».
// 08/11/2026 12:10: «Encauzan el río Chancay-Lambayeque para reducir riesgos…» no contaba como defensa ribereña
// (solo se buscaba «encauzamiento»), y «Keiko Fujimori descarta salida del río Piura por Sechura y prioriza aliviadero
// de Chutuque» no contaba como proyecto: se agregan «encauza(n)», «descarta» y «prioriza».
// 09/11/2026 17:10: «Colegio de Ingenieros califica de "engaño" afirmar que el río Piura soportará 4000 m³/s tras
// descolmatación» salía «Mencionado» en defensas y como avance del eje de descolmatación: «engaño» cuenta como conflicto.
function estadoProyecto(t) {
  if (/\bengano\b|rechaz|en pie de lucha|no permitiran|conflicto|anula/.test(t)) return 'En conflicto';
  if (/sin ejecucion|pendiente|paraliz|medio motor|atras|10 anos|no estara lista|posterga/.test(t)) return 'Atrasado';
  if (/piden|pide|exige|solicita|reclam|demanda/.test(t)) return 'Pedido';
  if (/inicia|ejecuc|avanza|concluye|encauzan|buena pro|destina|invertira|retira|impulsa|cofinanciara|reforzaran|despliega|supervisa|\blimpian?\b|\brefuerzan?\b/.test(t)) return 'En curso';
  return 'Mencionado';
}

// ---------- Clasificación de cada ficha ----------
// 08/11/2026 (corrida 4): «Perú: el pronóstico del tiempo para Piura este 7 de noviembre» (nota diaria automática)
// ocupaba un lugar en el pronóstico sin ser un aviso del SENAMHI; esas notas genéricas no cuentan como pronóstico.
// 08/11/2026 20:00: «Senamhi: ¿Piura tendrá fuertes lluvias hoy…? Conoce el pronóstico completo» (nota diaria de
// servicio) desplazaba, al juntar titulares repetidos, al aviso real «Senamhi alerta por lluvias fuertes en Piura este 7 y 8».
const PRONOSTICO_GENERICO = /el pronostico del tiempo para|conoce el pronostico completo/;
const UTILES = new Set(['Emergencias', 'Lluvias y clima', 'Salud', 'Economía y producción', 'Otros']);
const peso = f => { const d = edadDias(f); return d <= 2 ? 3 : d <= 7 ? 1.5 : 0.5; };

const clasificadas = [];
for (const f of fichas) {
  if (!UTILES.has(f.tema)) continue;
  const t = norm(f.titulo);
  if (FUERA_DE_ZONA.test(t)) continue;
  const senales = CONTEXTO.test(t) ? SENALES.filter(s => s.re.test(t) && !(HIPOTETICO.test(t) && s.grupo === 'vida') && !(s.id === 'agua' && OBRA_AGUA.test(t)) && !(s.id === 'electrico' && !ELECTRICO_CLIMA.test(t) && !CLIMA.test(t)) && !((s.id === 'agua' || s.id === 'brecha') && CRONICO.test(t) && !CLIMA.test(t)) && !(s.id === 'huaicos' && PREVENCION_QUEBRADA.test(t)) && !(s.id === 'desborde' && DESBORDE_FIGURADO.test(t)) && !((s.id === 'huaicos' || s.id === 'desborde' || s.id === 'aislamiento') && PELIGRO_NO_OCURRIDO.test(t)) && !(s.id === 'muertes' && MUERTE_SALUD.test(t)) && !((s.id === 'dengue' || s.id === 'leptospirosis') && SALUD_RESPUESTA.test(t) && !SALUD_BROTE.test(t)) && !(s.id === 'brecha' && PREVENCION_BRECHA.test(t)) && !(s.id === 'damnificados' && DONACION_ALBERGUE.test(t) && !/evacu|damnificad|inhabitable|colaps|destruid/.test(t))).map(s => s.id) : [];
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
    // 09/11/2026: «Río Tumbes supera umbral de alerta roja…» y «Río Tumbes podría desbordarse y anegar la ciudad»
    // quedaban en «Tumbes» sin distrito; como la provincia se llama igual que el departamento, se contaban como
    // departamento entero y la crecida del río Tumbes no entraba en la tabla. Si el titular nombra el río, cuenta
    // para la provincia de Tumbes (cuenca baja y ciudad).
    const rioProvincia = !l.distrito && l.departamento === 'Tumbes' && l.provincia === 'Tumbes' && /\brio tumbes\b/.test(c.t);
    const nivel = l.distrito ? 'distrito' : (rioProvincia || (l.provincia && l.provincia !== l.departamento) ? 'provincia' : 'departamento');
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

// ---------- 7. Ejes del Gobierno frente a El Niño ----------
// 08/11/2026: el usuario pidió orientar las conclusiones a los ejes de la Presidencia de la República.
// Cada eje cita tal cual lo que anunció el Gobierno (El Peruano, diario oficial, y gob.pe, 15/10/2026)
// y muestra qué dicen las noticias del norte: qué está en marcha y qué tiene problemas.
// Lo oficial se cita, no se reinterpreta; las noticias entran tal como están escritas.
const EP_URL = 'https://elperuano.pe/noticia/306932-presidenta-fujimori-anuncia-importantes-acciones-del-gobierno-frente-al-fenomeno-el-nino';
const GOB_URL = 'https://www.gob.pe/institucion/presidencia/noticias/1457275-presidenta-keiko-fujimori-ante-fenomeno-el-nino-trabajando-unidos-y-con-un-solo-puno-vamos-a-levantarnos-y-salir-mas-fuertes-como-pais';
const EP = 'El Peruano (diario oficial), 15/10/2026';
const LIMPIEZA = /descolmat|limpi|maquinaria|cauce|encauza|dique|defensa/;
const EJES = [
  { id: 'vidas', nombre: 'Prioridad nacional: proteger las vidas',
    cita: '«Lo que tenemos que cuidar y priorizar son las vidas humanas». Se identificaron 1800 puntos de riesgo y se priorizaron 536.', fuente: EP, url: EP_URL,
    re: /evacu|plan de contingencia|mochila|simulacro|puntos? critic|zonas? de (alto )?riesgo|vulnerab|alerta temprana|prevencion/ },
  { id: 'articulacion', nombre: 'Trabajo articulado y unidad («un solo puño»)',
    cita: '«Trabajando unidos y con un solo puño vamos a levantarnos». El Gobierno ofrece «una intervención articulada y simultánea en las regiones más vulnerables» y pide a empresas, instituciones y políticos sumarse.', fuente: 'Presidencia (gob.pe) y El Peruano, 15/10/2026', url: GOB_URL,
    re: /fuerzas armadas|ejercito|marina de guerra|\bfap\b|militares|soldados|gobierno regional|gobernador|municipalidad|alcalde|\bcoer\b|\bcoen\b|sector privado|empresas? privadas?|obras por impuestos|coordina|articula|mesa de trabajo|cooperacion|un solo puno|unidos/ },
  { id: 'prevencion', nombre: 'Obras de prevención y descolmatación',
    cita: '«El río Tumbes está limpiándose a máxima velocidad. El río Piura casi hemos culminado. En Lambayeque […] se está trabajando en los ríos La Leche y Reque». Avance declarado: 70 % de los 536 puntos.', fuente: EP, url: EP_URL,
    re: /descolmat|limpieza de(l| los| las)? (rio|quebrada|cauce|dren)|defensas? riberen|encauza|enrocado|\bdiques?\b|material (fluvial|de rio)|puntos? critic/,
    compromisos: [
      { nombre: 'Limpieza del río Tumbes', re: /rio tumbes/, y: LIMPIEZA },
      { nombre: 'Río Piura', re: /rio piura/, y: LIMPIEZA },
      { nombre: 'Ríos La Leche y Reque (Lambayeque)', re: /la leche|\breque\b/, y: LIMPIEZA },
    ] },
  { id: 'conectividad', nombre: 'Infraestructura y conectividad',
    cita: '«Hemos enviado 20 puentes al norte de nuestro país». Además, 22 helicópteros y cinco buques de la Marina disponibles.', fuente: EP, url: EP_URL,
    re: /puentes? (modular|bailey|metalic|provisional|colaps)|caida (de|del) puente|aislad|\baislan?\b|incomunicad|vias? (interrumpid|bloquead|afectad)|carretera|transitab|helicoptero|puente aereo/,
    compromisos: [{ nombre: 'Puentes modulares en el norte', re: /puentes? (modular|bailey|metalic|provisional)/ }] },
  { id: 'humanitaria', nombre: 'Respuesta humanitaria ágil',
    cita: '«Se van a construir albergues para 30,000 personas». Hospitales de campaña «movilizados en Tumbes, en Piura y en Lambayeque». Reserva de 5600 toneladas de ayuda humanitaria.', fuente: EP, url: EP_URL,
    re: /ayuda humanitaria|bienes de ayuda|viveres|\bkits?\b|albergue|carpas|cisterna|agua segura|hospital(es)? de campana|damnificad|declaratoria|estado de emergencia|motobomba/,
    compromisos: [
      { nombre: 'Albergues temporales', re: /albergue/ },
      { nombre: 'Hospitales de campaña', re: /hospital(es)? de campana/ },
      { nombre: 'Entrega de ayuda humanitaria', re: /ayuda humanitaria|bienes de ayuda|viveres|\bkits?\b/ },
    ] },
  { id: 'economia', nombre: 'Inversión y soporte económico',
    cita: '22 decretos supremos y de urgencia aprobados, 14 de ellos por 2000 millones de soles. Fondo de Contingencia: de 800 millones a 10,000 millones de soles para enero.', fuente: EP, url: EP_URL,
    re: /\bbonos?\b|credito suplementario|presupuest|millones de soles|transferencia|fondo de contingencia|decreto de urgencia|seguro agrario|agricultor|ganader|obras? paralizad|reactiva/ },
];
// 09/11/2026 17:10: «califica de engaño…» (Colegio de Ingenieros sobre el río Piura) cuenta como problema del eje.
const PROBLEMA = /\bengano\b|\bsin\b|falta|no llega|no lleg|demora|retras|paraliz|reclam|exige|piden|\bpide\b|denuncia|abandon|insuficient|aun no|todavia no|olvidad|desatend|colaps|solo \d+ de \d+|siguen? vulnerable/;
// Titulares sobre otra región que solo comparan con el norte («Lima podría sufrir un colapso mayor que Piura…») no cuentan.
const OTRA_REGION = /^lima\b/;
const EN_MARCHA = /inicia|entrega|llega|despliega|instala|avanza|culmina|concluye|ejecuta|trabaja|transfiere|aprueba|destina|habilita|limpia|descolmata|refuerza|moviliza|envia|construye|atiende|distribuy|implementa|lleva|realiza/;
const estadoEje = c => (c.senales.indexOf('brecha') >= 0 || PROBLEMA.test(c.t)) ? 'Con problemas' : EN_MARCHA.test(c.t) ? 'En marcha' : 'Mencionado';
const conContexto = clasificadas.filter(c => CONTEXTO.test(c.t) && !OTRA_REGION.test(c.t));
const ejes = EJES.map(e => {
  const cs = conContexto.filter(c => e.re.test(c.t)).sort((a, b) => b.f.publicada.localeCompare(a.f.publicada));
  const estados = { 'En marcha': 0, 'Con problemas': 0, 'Mencionado': 0 };
  const porDep = {};
  DEPS.forEach(d => { porDep[d] = { total: 0, problemas: 0 }; });
  cs.forEach(c => {
    const est = estadoEje(c); estados[est]++;
    c.f.departamentos.forEach(d => { if (porDep[d]) { porDep[d].total++; if (est === 'Con problemas') porDep[d].problemas++; } });
  });
  const conEstado = c => ({ ...resumenFicha(c), estado: estadoEje(c) });
  const problemas = sinRepetir(cs.filter(c => estadoEje(c) === 'Con problemas')).slice(0, 3).map(conEstado);
  const avances = sinRepetir(cs.filter(c => estadoEje(c) === 'En marcha')).slice(0, 3).map(conEstado);
  const compromisos = (e.compromisos || []).map(k => {
    const ks = cs.filter(c => k.re.test(c.t) && (!k.y || k.y.test(c.t)));
    return { nombre: k.nombre, menciones: ks.length, problemas: ks.filter(c => estadoEje(c) === 'Con problemas').length,
      ultima: ks.length ? conEstado(ks[0]) : null };
  });
  return { id: e.id, nombre: e.nombre, cita: e.cita, fuente: e.fuente, url: e.url, menciones: cs.length,
    recientes: cs.filter(c => edadDias(c.f) <= 7).length, estados, porDep, compromisos, problemas, avances };
});

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
if (sal.length) frases.push(`Salud: ${listaN(sal.map(s => `${s.departamento} (${s.dengue} ${s.dengue === 1 ? 'noticia' : 'noticias'} de dengue${s.leptospirosis ? `, ${s.leptospirosis} de leptospirosis` : ''})`))}.`);
if (brechas.length) frases.push(`${brechas.length} noticias recientes señalan brechas en la atención; la más reciente: «${brechas[0].titulo}».`);
const atras = proyectos.filter(p => p.estados['Atrasado'] || p.estados['En conflicto']);
if (atras.length) frases.push(`Proyectos atrasados o en conflicto que agravan el daño: ${listaN(atras.map(p => minus(p.nombre)))}.`);
const ejeProb = ejes.filter(e => e.estados["Con problemas"]).sort((a, b) => b.estados["Con problemas"] - a.estados["Con problemas"]).slice(0, 2);
if (ejeProb.length) frases.unshift(`Ejes del Gobierno con más noticias de problemas: ${listaN(ejeProb.map(e => `${minus(e.nombre)} (${e.estados["Con problemas"]} de ${e.menciones})`))}.`);
if (calidad && calidad.difieren.length) frases.push(`${calidad.difieren.length} cifras de prensa difieren de la oficial; usar siempre la cifra oficial.`);

const salida = {
  generado, lecturaFichas: fichas.length, analizadas: clasificadas.length,
  aviso: 'Noticias de prensa, tal como las publicó cada medio. Sirven para priorizar la atención; las cifras oficiales son las de INDECI, SENAMHI y MINSA.',
  frases, ejes, prioridad: precisos.slice(0, 15), departamentos, salud, brechas, pronostico, proyectos, calidad,
};
return salida;
}
// ===== NÚCLEO (fin) =====

const datos = leer('fichas.json');
const { generado, fichas } = datos;
const salida = calcularConclusiones(datos, leer('evaluacion.json', null), leer('oficiales.json', { indicadores: [] }));
const { frases, salud, brechas, pronostico, proyectos, calidad } = salida;
const precisos = salida.prioridad;
fs.writeFileSync(path.join(DIR, 'conclusiones.json'), JSON.stringify(salida, null, 1));
fs.writeFileSync(path.join(DIR, 'conclusiones.js'), 'window.CONCL = ' + JSON.stringify(salida) + ';\n');

// Agrega las conclusiones a ver-fichas.html (la página que se abre con doble clic).
const ver = path.join(DIR, 'ver-fichas.html');
if (fs.existsSync(ver)) {
  let h = fs.readFileSync(ver, 'utf8').replace(/<script>window\.CONCL=[\s\S]*?<\/script>\n?/, '');
  const i = h.indexOf('<script>');
  h = h.slice(0, i) + '<script>window.CONCL=' + JSON.stringify(salida).replace(/</g, '\\u003c') + '</script>\n' + h.slice(i);
  fs.writeFileSync(ver, h);
}

// Versión para leer o pegar en un documento.
const fd = iso => iso.slice(8, 10) + '/' + iso.slice(5, 7);
// La fecha del encabezado va en hora de Lima: generado está en UTC y después de las 19:00 mostraba el día siguiente.
const fechaLima = new Date(generado).toLocaleString('sv-SE', { timeZone: 'America/Lima' }).slice(0, 16);
let md = `# Conclusiones para enfrentar la emergencia – lectura del ${fechaLima} (hora de Lima)\n\n${salida.aviso}\n\n`;
md += frases.map(f => `- ${f}`).join('\n') + '\n\n## Ejes del Gobierno frente a El Niño\n\n' + salida.ejes.map(e =>
  `### ${e.nombre}\n\n> ${e.cita} ([${e.fuente}](${e.url}))\n\nNoticias: ${e.menciones} (${e.recientes} en la última semana) · ${Object.entries(e.estados).map(([s, n]) => `${s} ${n}`).join(' · ')}\n`
  + e.compromisos.map(k => `\n- ${k.nombre}: ${k.menciones} noticias${k.problemas ? `, ${k.problemas} con problemas` : ''}`).join('')
  + (e.problemas.length ? '\n\nCon problemas:\n' + e.problemas.map(f => `- ${fd(f.fecha)} · ${f.titulo} (${f.medio})`).join('\n') : '')).join('\n\n')
  + '\n\n## Prioridad para salvar vidas\n\n| Prioridad | Lugar | Señales | Tendencia | Qué hacer |\n| --- | --- | --- | --- | --- |\n';
md += precisos.slice(0, 15).map(r => `| ${r.prioridad} | ${r.nombre} (${r.provincia && r.provincia !== r.nombre ? r.provincia + ', ' : ''}${r.departamento}) | ${r.senales.slice(0, 3).map(s => `${s.nombre} (${s.n})`).join('; ')} | ${r.tendencia} | ${r.acciones.slice(0, 2).join(' ')} |`).join('\n');
md += '\n\n## Salud\n\n' + salud.map(s => `- **${s.departamento}:** ${s.dengue} ${s.dengue === 1 ? 'noticia' : 'noticias'} de dengue, ${s.leptospirosis} de leptospirosis, ${s.agua} de agua y desagüe.${s.oficiales.length ? ' Oficial: ' + s.oficiales.map(o => `${o.indicador} ${o.valor.toLocaleString('es-PE')} (${o.fuente}, ${o.corte || 's/f'})`).join('; ') + '.' : ''}`).join('\n');
md += '\n\n## Brechas en la atención\n\n' + (brechas.map(b => `- ${fd(b.fecha)} · ${b.lugar} · ${b.titulo} (${b.medio})`).join('\n') || 'Ninguna en los últimos 14 días.');
md += '\n\n## Pronóstico (últimos 3 días)\n\n' + (pronostico.map(p => `- ${fd(p.fecha)} · ${p.titulo} (${p.medio})`).join('\n') || 'Sin avisos recientes en las noticias.');
md += '\n\n## Proyectos para que El Niño afecte menos\n\n| Proyecto | Menciones | Estado en las noticias | Lugares |\n| --- | --- | --- | --- |\n';
md += proyectos.map(p => `| ${p.nombre} | ${p.menciones} | ${Object.entries(p.estados).map(([e, n]) => `${e} ${n}`).join(', ')} | ${p.lugares.join(', ')} |`).join('\n');
if (calidad) md += `\n\n## Calidad de las cifras\n\n${calidad.cuenta.coincide} coinciden, ${calidad.cuenta.cercana} cercanas y ${calidad.cuenta.difiere} difieren de la cifra oficial; ${calidad.sinReferencia} sin referencia oficial.\n` + calidad.difieren.map(d => `- ${d.indicador} (${d.departamento}): prensa ${d.prensa} (${d.medio}, ${fd(d.fecha)}), oficial ${d.oficial} – ${d.fuente}`).join('\n');
fs.writeFileSync(path.join(DIR, 'conclusiones.md'), md + '\n');

console.log(`Conclusiones: ${precisos.filter(r => r.prioridad === 'Crítica').length} lugares en prioridad crítica · ${brechas.length} brechas · ${proyectos.length} tipos de proyecto`);
