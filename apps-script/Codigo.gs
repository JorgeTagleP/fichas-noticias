/**
 * Una Sola Fuerza – Lector de noticias (versión Google Workspace) v0.1
 *
 * Hoja de cálculo con 3 pestañas:
 *   Distritos : ubigeo | departamento | provincia | distrito | alias (separados por ;)   ← importar distritos.csv
 *   Fuentes   : medio | via | departamento | url | tipo | activa (SI/NO)               ← importar fuentes.csv
 *   Fichas    : la llena este script (una fila por noticia)
 *
 * Instalación: Extensiones › Apps Script › pegar este archivo y Pagina.html ›
 *   ejecutar instalar() una vez (pide permisos) ›
 *   Implementar › Nueva implementación › Aplicación web › Ejecutar como: yo ›
 *   Acceso: cualquier persona de la organización (o con cuenta de Google).
 *   Crear también un archivo de script «Conclusiones» y pegar Conclusiones.gs
 *   (lo genera preparar-apps-script.mjs; no se edita a mano).
 *
 * Cómo leer este archivo: las líneas que empiezan con // o con * son
 * explicaciones para personas; el programa las ignora.
 */

// ---------------------------------------------------------------------
// AJUSTES. Lo que se cambia con más frecuencia está aquí arriba.
//   DIAS          : cuántos días hacia atrás se guardan y se muestran noticias.
//   ZONA          : hora de Lima, para fechar las fichas.
//   DEPARTAMENTOS : los cuatro departamentos que se vigilan.
//   COLS          : las columnas de la pestaña Fichas, en este orden. Si se
//                   agrega una columna, se agrega al final para no desordenar
//                   las fichas ya guardadas.
// ---------------------------------------------------------------------
const DIAS = 30;
const ZONA = 'America/Lima';
const DEPARTAMENTOS = ['Tumbes', 'Piura', 'Cajamarca', 'Lambayeque'];
const COLS = ['id', 'capturada', 'publicada', 'titulo', 'medio', 'tipoMedio', 'via', 'enlace', 'tema',
              'departamentos', 'lugares', 'ubicadaPor', 'verificacion', 'nota del curador'];


// NOMBRES AMBIGUOS: distritos que se llaman como una palabra común, una persona
// o un lugar de otra región (Jesús, Castilla, Santa Rosa…). Solo cuentan si el
// titular nombra también su provincia o su departamento. Para agregar uno:
// escribirlo en minúsculas y sin tildes, entre comillas, seguido de una coma.
const AMBIGUOS = new Set(['jesus', 'san juan', 'la union', 'magdalena', 'asuncion', 'corrales', 'la cruz',
  'san luis', 'san miguel', 'santa cruz', 'bellavista', 'castilla', 'la arena', 'las lomas', 'lagunas',
  'la florida', 'la ramada', 'la esperanza', 'san jose', 'san jacinto', 'sucre', 'santa rosa', 'santo domingo',
  'santo tomas', 'buenos aires', 'el alto', 'el prado', 'frias', 'salitral', 'vice', 'bernal', 'la brea',
  'la huaca', 'tamarindo', 'arenal', 'la matanza', 'jorge chavez', 'jose galvez', 'pedro galvez',
  'jose sabogal', 'miguel iglesias', 'eduardo villanueva', 'gregorio pita', 'jose manuel quiroz',
  'toribio casanova', 'ignacio escudero', 'miguel checa', 'cristo nos valga', 'cupisnique', 'matapalo',
  'casitas', 'aguas verdes', 'llama', 'lajas', 'choros', 'pucara', 'montero', 'suyo', 'paccha', 'pion',
  'san felipe', 'san bernardino', 'san gregorio', 'sexi', 'utco', 'san martin', 'san marcos', 'trinidad',
  'venecia', 'tunal', 'san lucas', 'agua blanca', 'dos pueblos', 'san cristo', 'la grama', 'catan',
  'chalan', 'bigote', 'chirinos', 'montero',
  // Lambayeque
  'la victoria', 'pimentel', 'jose leonardo ortiz', 'manuel antonio mesones muro', 'pueblo nuevo',
  'salas', 'san carlos', 'pacora', 'reque']);


// TEMAS: cada noticia recibe el primer tema cuyas palabras aparecen en el titular,
// en este orden (por eso Emergencias va primero). Las palabras van entre las barras
// / … / separadas por | . Ejemplo: para que «socavón» cuente como emergencia,
// agregar |socav[oó]n antes de la barra final de Emergencias.
const TEMAS = [
  ['Emergencias', /huaico|desborde|inundaci|deslizamiento|derrumbe|damnificad|emergencia|\bcoer?\b|indeci|evacua|colaps|aniego|quebrada|sismo|temblor|incendio|afectad|rescate|puente|interrumpid/i],
  ['Lluvias y clima', /lluvia|precipitaci|senamhi|el ni[ñn]o|enfen|friaje|granizad|helada|sequ[ií]a|oleaje|temperatura|clima|tormenta|caudal|r[ií]o /i],
  ['Salud', /dengue|leptospir|salud|hospital|minsa|diresa|vacun|epidemi|brote|enfermedad/i],
  ['Deportes', /liga 1|f[uú]tbol|copa per[uú]|partido|goles?\b|torneo|clausura|apertura|selecci[oó]n|atl[eé]tico|deportivo|vs\.?\s/i],
  ['Política y elecciones', /elecci|onpe|jne|candidat|alcald|gobernador|congres|regidor|votos?\b|consejo regional|fiscal[ií]a|corrupci/i],
  ['Seguridad', /polic[ií]a|asesin|crimen|criminal|robo|delincu|extorsi|droga|detenid|sicari|homicid|muerte de/i],
  ['Economía y producción', /miner|agro|export|pesca|comercio|inversi|empleo|cosecha|arroz|mango|lim[oó]n|banano|petr[oó]le|turis/i],
];


// norm: pasa un texto a minúsculas, sin tildes ni signos, para comparar nombres
// sin que importe cómo se escribieron («Sullana», «SULLANA», «sullaná»).
// tiene: dice si una frase aparece como palabras completas dentro de un texto
// (así «Lagunas» no coincide dentro de «Lagunasas»).
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();
const tiene = (texto, frase) => new RegExp('(^| )' + norm(frase) + '( |$)').test(texto);


// instalar: se ejecuta UNA sola vez. Crea la pestaña Fichas con sus títulos,
// programa la lectura automática cada 6 horas (borrando programaciones viejas
// para que no se dupliquen) y hace la primera lectura.
function instalar() {
  const libro = SpreadsheetApp.getActive();
  let h = libro.getSheetByName('Fichas') || libro.insertSheet('Fichas');
  if (h.getLastRow() === 0) h.appendRow(COLS).setFrozenRows(1);
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('leerNoticias').timeBased().everyHours(6).create();   // 4 lecturas al día
  leerNoticias();
}


// fuentes_: lee la pestaña Fuentes y devuelve las que tienen dirección y no están
// marcadas «NO» en la columna activa. (El _ final indica que es de uso interno.)
function fuentes_() {
  const filas = SpreadsheetApp.getActive().getSheetByName('Fuentes').getDataRange().getValues().slice(1);
  return filas.filter(r => r[3] && String(r[5]).toUpperCase() !== 'NO')
    .map(([medio, via, departamento, url, tipo]) => ({ medio, via, departamento, url, tipo }));
}


// distritos_: lee la pestaña Distritos. Para cada distrito arma la lista de nombres
// con que se le puede reconocer: su nombre y sus alias (por ejemplo, su capital).
function distritos_() {
  return SpreadsheetApp.getActive().getSheetByName('Distritos').getDataRange().getValues().slice(1)
    .filter(r => r[3]).map(([ubigeo, departamento, provincia, distrito, alias]) => ({
      ubigeo: String(ubigeo).padStart(6, '0'), departamento, provincia, distrito,
      claves: [distrito, ...String(alias || '').split(';')].map(norm).filter(Boolean) }));
}


// leerFeed_: descarga el RSS de una fuente y saca de cada noticia su titular,
// enlace, medio y fecha. Si la fuente no responde o da error, devuelve una lista
// vacía y la lectura sigue con las demás. Google agrega « - Medio» al final del
// titular; se recorta porque el medio se guarda aparte. Una noticia con fecha
// ilegible se descarta sola, sin afectar a las demás.
function leerFeed_(f) {
  let xml;
  try {
    const r = UrlFetchApp.fetch(f.url, { muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0 (USF lector)' } });
    if (r.getResponseCode() !== 200) return [];
    xml = XmlService.parse(r.getContentText()).getRootElement();
  } catch (e) { return []; }
  const canal = xml.getChild('channel');
  if (!canal) return [];
  return canal.getChildren('item').map(it => {
    let titulo = it.getChildText('title') || '';
    const fuente = it.getChild('source');
    const medio = f.medio || (fuente ? fuente.getText() : '');
    if (!f.medio && medio && titulo.endsWith(' - ' + medio)) titulo = titulo.slice(0, -(medio.length + 3));
    return { titulo, enlace: it.getChildText('link'), medio, publicada: new Date(it.getChildText('pubDate')),
             via: f.via, depConsulta: f.departamento, tipoMedio: f.tipo || '' };
  }).filter(x => x.titulo && !isNaN(x.publicada));
}


// ubicar_: decide de qué lugar habla una noticia, solo mirando el titular.
//   1. Busca los nombres de los departamentos y de los distritos (y sus alias).
//   2. Un distrito solo cuenta si su departamento aparece en el titular o fue el
//      de la búsqueda; si es ambiguo, debe aparecer también su provincia o departamento.
//   3. Si un mismo nombre existe en varias provincias, se queda con la provincia
//      nombrada en el titular o, si no, con la capital de provincia.
//   4. «Provincia de X» se guarda como provincia, sin distrito.
//   5. Un departamento nombrado sin ningún distrito queda a nivel departamento.
// Devuelve los lugares encontrados y la lista de departamentos de la noticia.
function ubicar_(item, DIST) {
  const texto = norm(item.titulo);
  const deps = DEPARTAMENTOS.filter(d => tiene(texto, d));
  const hall = DIST.filter(d => {
    const h = d.claves.filter(c => tiene(texto, c));
    if (!h.length || norm(d.distrito) === norm(d.departamento)) return false;
    if (!(deps.includes(d.departamento) || item.depConsulta === d.departamento)) return false;
    return !(h.every(c => AMBIGUOS.has(c)) && !tiene(texto, d.provincia) && !tiene(texto, d.departamento));
  });
  const grupos = {};
  hall.forEach(d => (grupos[norm(d.distrito)] = grupos[norm(d.distrito)] || []).push(d));
  const elegidos = [];
  Object.values(grupos).forEach(g => {
    if (g.length === 1) return elegidos.push(g[0]);
    const conProv = g.filter(d => norm(d.provincia) !== norm(d.distrito) && tiene(texto, d.provincia));
    const capital = g.filter(d => norm(d.provincia) === norm(d.distrito));
    elegidos.push(...(conProv.length ? conProv : capital.length ? capital : g));
  });
  const lugares = elegidos.map(d => {
    const esProv = norm(d.provincia) === norm(d.distrito) && new RegExp('provincia (de )?' + norm(d.provincia)).test(texto);
    return { departamento: d.departamento, provincia: d.provincia, distrito: esProv ? null : d.distrito };
  });
  deps.forEach(dep => { if (!lugares.some(l => l.departamento === dep)) lugares.push({ departamento: dep, provincia: dep, distrito: null }); });
  const departamentos = [...new Set(lugares.map(l => l.departamento))];
  if (!departamentos.length && item.depConsulta) departamentos.push(item.depConsulta);
  return { lugares, departamentos };
}


// leerNoticias: la lectura completa (la ejecuta el reloj cada 6 horas).
// Para cada noticia nueva de los últimos DIAS días: la ubica, le pone tema,
// le da un código USF-N-AAMMDD-NNNN y la agrega como fila en la pestaña Fichas,
// siempre en nivel «D – Sin verificar». Las repetidas (mismo titular) se saltan,
// así que las notas y niveles que ya puso el curador no se pierden.
function leerNoticias() {
  const hoja = SpreadsheetApp.getActive().getSheetByName('Fichas');
  const DIST = distritos_();
  const existentes = hoja.getLastRow() > 1 ? hoja.getRange(2, 1, hoja.getLastRow() - 1, COLS.length).getValues() : [];
  const vistos = new Set(existentes.map(r => norm(r[3]).slice(0, 90)));
  const corte = Date.now() - DIAS * 864e5;
  const ahora = new Date();
  let n = existentes.length;
  const nuevas = [];
  fuentes_().forEach(f => leerFeed_(f).forEach(it => {
    const clave = norm(it.titulo).slice(0, 90);
    if (vistos.has(clave) || it.publicada.getTime() < corte) return;
    vistos.add(clave);
    const u = ubicar_(it, DIST);
    if (!u.departamentos.length) return;
    const tema = (TEMAS.find(([, re]) => re.test(it.titulo)) || ['Otros'])[0];
    n++;
    nuevas.push([`USF-N-${Utilities.formatDate(it.publicada, ZONA, 'yyMMdd')}-${String(n).padStart(4, '0')}`,
      ahora, it.publicada, it.titulo, it.medio, it.tipoMedio, it.via, it.enlace, tema,
      u.departamentos.join(', '), JSON.stringify(u.lugares), u.lugares.length ? 'titular' : 'búsqueda',
      'D – Sin verificar', '']);
  }));
  if (nuevas.length) hoja.getRange(hoja.getLastRow() + 1, 1, nuevas.length, COLS.length).setValues(nuevas);
  console.log(`Fichas nuevas: ${nuevas.length}`);
}

/** Web: sirve la página y le entrega las fichas de los últimos DIAS días. */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Pagina').setTitle('Fichas de Noticias del Norte')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}


// obtenerFichas: la web la llama para pedir los datos. Devuelve las fichas de los
// últimos DIAS días en el mismo formato que fichas.json de la versión local.
// La nota del curador (columna 14) se muestra debajo del titular.
function obtenerFichas() {
  const hoja = SpreadsheetApp.getActive().getSheetByName('Fichas');
  const corte = Date.now() - DIAS * 864e5;
  const filas = hoja.getLastRow() > 1 ? hoja.getRange(2, 1, hoja.getLastRow() - 1, COLS.length).getValues() : [];
  const fichas = filas.filter(r => new Date(r[2]).getTime() >= corte).map(r => ({
    id: r[0], publicada: new Date(r[2]).toISOString(), titulo: r[3], medio: r[4], tipoMedio: r[5] || null,
    via: r[6], enlace: r[7], tema: r[8], departamentos: String(r[9]).split(', ').filter(String),
    lugares: JSON.parse(r[10] || '[]'), ubicadaPor: r[11], verificacion: r[12], resumen: r[13] ? 'Nota del curador: ' + r[13] : '' }));
  return JSON.stringify({ generado: new Date().toISOString(), ventanaDias: DIAS, fuentesConsultadas: fuentes_().length,
                          total: fichas.length, fichas });
}
