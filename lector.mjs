// =====================================================================================
//  UNA SOLA FUERZA – LECTOR DE NOTICIAS  (versión 0.1)
// =====================================================================================
//
//  ¿QUÉ HACE ESTE PROGRAMA?
//  Hace lo mismo que haría una persona que cada mañana revisa los periódicos y las
//  radios buscando noticias de Tumbes, Piura, Lambayeque y Cajamarca, solo que en segundos:
//
//    1. Visita unas 46 "fuentes" de noticias en internet (Google Noticias y radios).
//    2. Copia de cada noticia solo lo básico: titular, medio, fecha y enlace.
//    3. Lee el titular y reconoce de qué departamento, provincia y distrito habla.
//    4. Le pone un tema (emergencias, lluvias, salud, deportes…).
//    5. Guarda todo como "fichas" en archivos que luego muestra la página web.
//
//  ¿QUÉ ES UN "RSS"?
//  Es una lista que muchos sitios de noticias publican para que otros programas la
//  lean. Es como el índice de un periódico: trae titulares, fechas y enlaces, pero
//  no el texto completo. Este programa lee esos índices; no copia las noticias.
//
//  ¿CÓMO SE USA?
//  En una terminal, dentro de la carpeta "fichas-noticias", se escribe:
//        node lector.mjs
//  (o se hace doble clic en "actualizar-noticias.cmd", en la carpeta de arriba).
//  Necesita tener instalado Node (versión 18 o más nueva) y conexión a internet.
//
//  ¿QUÉ ARCHIVOS PRODUCE?
//    fichas.json      → las fichas, para la página publicada en internet.
//    fichas.js        → las mismas fichas, para abrir index.html desde la computadora.
//    ver-fichas.html  → la página completa con las fichas adentro (se abre con doble clic).
//
//  IMPORTANTE: las noticias entran tal como las publicó cada medio, sin niveles ni
//  calificaciones (08/11/2026: así nadie puede bajarlas o subirlas de nivel con otra
//  intención). Son lo que dice la prensa, no información oficial.
//
//  Nota para quien lea el código: las líneas que empiezan con // son explicaciones;
//  la computadora las ignora. Lo demás son las instrucciones que sí ejecuta.
// =====================================================================================


// -------------------------------------------------------------------------------------
//  PREPARACIÓN: herramientas y datos que el programa necesita antes de empezar
// -------------------------------------------------------------------------------------

// Herramientas que trae Node: "fs" sirve para leer y escribir archivos,
// "path" para armar las rutas de las carpetas, y "url" para saber dónde está este archivo.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// DIR = la carpeta donde está este programa. Así encuentra sus archivos
// sin importar desde dónde se ejecute.
const DIR = path.dirname(fileURLToPath(import.meta.url));

// La lista oficial de los 243 distritos de los cuatro departamentos (del INEI).
// Cada distrito trae su departamento, provincia, código de ubigeo y "alias"
// (el nombre de su capital, que a veces es como lo nombran las noticias).
const DISTRITOS = JSON.parse(fs.readFileSync(path.join(DIR, 'distritos.json'), 'utf8'));

// Los departamentos que vigilamos.
const DEPARTAMENTOS = ['Tumbes', 'Piura', 'Cajamarca', 'Lambayeque'];

// Cuántos días hacia atrás se buscan noticias.
const DIAS = 30;                       // ventana de búsqueda en Google Noticias

// -------------------------------------------------------------------------------------
//  NOMBRES QUE SE PRESTAN A CONFUSIÓN
// -------------------------------------------------------------------------------------
// Muchos distritos se llaman como palabras comunes ("Jesús", "La Unión"), como personas
// ("Jorge Chávez") o como lugares de otras regiones ("Castilla" también está en Arequipa).
// Si un titular dice "San Juan", no podemos suponer que habla del distrito San Juan de
// Cajamarca. Por eso, estos nombres solo cuentan si el titular menciona TAMBIÉN su
// provincia o su departamento. Ejemplo: "Lluvias en San Juan, Cajamarca" sí cuenta;
// "Fiesta de San Juan" no.
// (Se escriben sin tildes y en minúsculas porque así compara el programa; ver "norm" más abajo.)
const AMBIGUOS = new Set([
  // palabras comunes, nombres de personas o lugares repetidos en otras regiones
  'jesus', 'san juan', 'la union', 'magdalena', 'asuncion', 'corrales', 'la cruz', 'san luis',
  'san miguel', 'santa cruz', 'bellavista', 'castilla', 'la arena', 'las lomas', 'lagunas',
  'la florida', 'la ramada', 'la esperanza', 'san jose', 'san jacinto', 'sucre', 'santa rosa',
  'santo domingo', 'santo tomas', 'buenos aires', 'el alto', 'el prado', 'frias', 'salitral',
  'vice', 'bernal', 'la brea', 'la huaca', 'tamarindo', 'arenal', 'la matanza', 'jorge chavez',
  'jose galvez', 'pedro galvez', 'jose sabogal', 'miguel iglesias', 'eduardo villanueva',
  'gregorio pita', 'jose manuel quiroz', 'toribio casanova', 'ignacio escudero', 'miguel checa',
  'cristo nos valga', 'cupisnique', 'matapalo', 'casitas', 'aguas verdes', 'llama', 'lajas',
  'choros', 'pucara', 'montero', 'suyo', 'paccha', 'pion', 'san felipe', 'san bernardino',
  'san gregorio', 'sexi', 'utco',
  // alias (capitales de distrito) igualmente ambiguos
  'san martin', 'san marcos', 'trinidad', 'venecia', 'tunal', 'san lucas', 'agua blanca',
  'dos pueblos', 'san cristo', 'la grama', 'catan', 'chalan', 'bigote', 'chirinos', 'montero',
  // Lambayeque
  'la victoria', 'pimentel', 'jose leonardo ortiz', 'manuel antonio mesones muro', 'pueblo nuevo',
  'salas', 'san carlos', 'pacora', 'reque']);

// -------------------------------------------------------------------------------------
//  TEMAS: cómo se decide de qué trata una noticia
// -------------------------------------------------------------------------------------
// Cada tema tiene una lista de palabras clave. El programa revisa los temas EN ESTE ORDEN
// y se queda con el primero cuyo vocabulario aparece en el titular. Por eso "Emergencias"
// va primero: si una noticia habla de lluvias Y de damnificados, la marca como emergencia.
// Si no coincide ningún tema, queda como "Otros".
//
// Cómo leer las listas: el signo | significa "o". Por ejemplo, "huaico|desborde" se lee
// "huaico o desborde". Se usan raíces de palabras para abarcar variantes: "inundaci"
// encuentra "inundación" e "inundaciones"; "damnificad" encuentra "damnificado(s)" y
// "damnificada(s)". Las letras entre corchetes son alternativas: "r[ií]o" acepta "rio" y "río".
// La "i" final indica que no importan mayúsculas ni minúsculas.
// Para agregar una palabra a un tema, se escribe dentro de las barras / /, separada con |.
const TEMAS = [
  ['Emergencias', /huaico|desborde|inundaci|deslizamiento|derrumbe|damnificad|emergencia|\bcoer?\b|indeci|evacua|colaps|aniego|quebrada|activaci[oó]n de quebrada|sismo|temblor|incendio|afectad|rescate|puente|carretera bloqueada|interrumpid/i],
  ['Lluvias y clima', /lluvia|precipitaci|senamhi|el ni[ñn]o|enfen|friaje|granizad|helada|sequ[ií]a|oleaje|temperatura|clima|tormenta|caudal|r[ií]o /i],
  ['Salud', /dengue|leptospir|salud|hospital|minsa|diresa|vacun|epidemi|brote|enfermedad/i],
  ['Deportes', /liga 1|f[uú]tbol|copa per[uú]|partido|goles?\b|torneo|clausura|apertura|selecci[oó]n|atl[eé]tico|deportivo|vs\.?\s/i],
  ['Política y elecciones', /elecci|onpe|jne|candidat|alcald|gobernador|congres|regidor|votos?\b|consejo regional|fiscal[ií]a|corrupci/i],
  ['Seguridad', /polic[ií]a|asesin|crimen|criminal|robo|delincu|extorsi|droga|detenid|sicari|homicid|muerte de/i],
  ['Economía y producción', /miner|agro|export|pesca|comercio|inversi|empleo|cosecha|arroz|mango|lim[oó]n|banano|petr[oó]le|turis/i],
];

// -------------------------------------------------------------------------------------
//  HERRAMIENTAS PARA COMPARAR TEXTOS
// -------------------------------------------------------------------------------------
// "norm" (de "normalizar") deja un texto en su forma más simple para poder comparar:
// todo en minúsculas, sin tildes, sin signos de puntuación y con un solo espacio entre
// palabras. Así "TAMBO GRANDE", "Tambo Grande," y "tambo  grande" se reconocen igual.
//   Ejemplo:  "¡Lluvias en Cura Mori!"  →  "lluvias en cura mori"
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();

// "tiene" responde sí o no: ¿el texto contiene esta frase como palabras completas?
// Busca palabras enteras para evitar confusiones: "Suyo" (distrito de Ayabaca) no debe
// encontrarse dentro de "suyos", ni "Vice" (distrito de Sechura) dentro de "viceministro".
const tiene = (texto, frase) => new RegExp(`(^| )${norm(frase)}( |$)`).test(texto);

// Una "libreta" preparada de antemano: para cada distrito, los nombres con que se le puede
// reconocer (su nombre oficial y sus alias), ya normalizados. Prepararla una sola vez al
// inicio hace que revisar cientos de titulares sea rápido.
const nombres = DISTRITOS.map(d => ({ d, claves: [d.distrito, ...(d.alias || [])].map(norm).filter(Boolean) }));

// =====================================================================================
//  PASO 1 · ¿DÓNDE BUSCAR?  La lista de fuentes
// =====================================================================================

// --- Fuente A: Google Noticias ---
// Google Noticias ofrece un RSS para cualquier búsqueda, como si escribiéramos en su
// buscador y nos llevamos la lista de resultados. Armamos 31 búsquedas:
//   • por cada departamento, una general ("Piura") y otra de emergencias
//     ("Piura (lluvia OR huaico OR …)") → 8 búsquedas;
//   • por cada provincia que no es capital, una con su nombre ("Sullana" Piura) → 23.
// Buscar también por provincia importa: Google entrega como máximo unos 100 resultados
// por búsqueda, y así no se pierden las noticias de provincias pequeñas.
//
// En la dirección de búsqueda:  when:30d = solo los últimos 30 días;
// hl=es-419 = en español;  gl=PE y ceid=PE:es-419 = edición de Perú.
function fuentesGoogle() {
  const provincias = [...new Set(DISTRITOS.map(d => `${d.provincia}|${d.departamento}`))];
  const base = q => `https://news.google.com/rss/search?q=${encodeURIComponent(q + ` when:${DIAS}d`)}&hl=es-419&gl=PE&ceid=PE:es-419`;
  const lista = [];
  for (const dep of DEPARTAMENTOS) {
    lista.push({ medio: null, via: 'Google Noticias', departamento: dep, url: base(dep) });
    lista.push({ medio: null, via: 'Google Noticias', departamento: dep,
      url: base(`${dep} (lluvia OR huaico OR desborde OR inundación OR deslizamiento OR emergencia)`) });
  }
  for (const pd of provincias) {
    const [prov, dep] = pd.split('|');
    if (prov === dep) continue;
    lista.push({ medio: null, via: 'Google Noticias', departamento: dep, url: base(`"${prov}" ${dep}`) });
  }
  return lista;
}

// --- Fuente B: radios y canales locales ---
// Se toman del archivo "radios_candidatas.json", pero SOLO las que tienen un RSS que
// se comprobó que funciona (rss_verificado = true). Hoy son 15.
// Para sumar una radio nueva: agregarla a ese archivo con su dirección de RSS y
// rss_verificado en true. No hace falta tocar este programa.
function fuentesRadios() {
  const f = path.join(DIR, 'radios_candidatas.json');
  if (!fs.existsSync(f)) return [];
  return JSON.parse(fs.readFileSync(f, 'utf8'))
    .filter(r => r.rss && r.rss_verificado)
    .map(r => ({ medio: r.nombre, via: 'RSS de la radio', departamento: r.departamento, url: r.rss, tipo: r.tipo }));
}

// =====================================================================================
//  PASO 2 · CONECTARSE Y LEER cada fuente
// =====================================================================================

// Un RSS por dentro se ve así (simplificado):
//
//     <item>
//       <title>Lluvias inundan calles en Castilla - Diario Correo</title>
//       <link>https://…</link>
//       <pubDate>Fri, 07 Nov 2026 06:48:03 GMT</pubDate>
//       <source>Diario Correo</source>
//     </item>
//
// Cada <item> es una noticia, y cada dato está entre una "etiqueta" de apertura
// <title> y una de cierre </title>.

// "decode" limpia el texto de un dato. Los sitios web escriben algunos caracteres en
// código: "&amp;" significa "&", "&#8220;" significa una comilla. También envuelven a
// veces el texto en <![CDATA[ … ]]> o le dejan restos de formato. Aquí se traduce y se
// limpia todo, para que quede texto normal y legible.
const decode = s => (s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n))
  .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// "campo" saca un dato de una noticia: le decimos qué etiqueta queremos (por ejemplo
// "title") y devuelve lo que está entre <title> y </title>, ya limpio.
const campo = (xml, tag) => decode((xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1]);

// "leer" visita UNA fuente y devuelve sus noticias. Es como abrir una página web, pero
// en lugar de mostrarla en pantalla, el programa lee su contenido.
//   • fetch = "ir a buscar": pide la página a internet.
//   • User-Agent = cómo se presenta el programa ante el sitio ("soy el lector de USF").
//   • Si el sitio no responde en 25 segundos, se deja de esperar.
//   • Si el sitio da error o está caído, se devuelve una lista vacía y el programa
//     continúa con las demás fuentes: una radio caída no detiene todo.
// De cada noticia se guarda: titular, enlace, medio, fecha de publicación, y (solo en
// radios) un resumen corto de hasta 280 letras. Google agrega " - Nombre del medio" al
// final de cada titular; esa parte se recorta porque el medio ya se guarda aparte.
//
// Si una noticia trae una fecha imposible de leer, se descarta solo esa noticia;
// las demás de la misma fuente se guardan normalmente (corregido el 08/11/2026).
async function leer(fuente) {
  try {
    const r = await fetch(fuente.url, { headers: { 'User-Agent': 'Mozilla/5.0 (USF lector)' }, signal: AbortSignal.timeout(25000) });
    if (!r.ok) return [];
    const xml = await r.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => {
      let titulo = campo(it, 'title');
      let medio = fuente.medio || campo(it, 'source');
      if (!fuente.medio && medio && titulo.endsWith(' - ' + medio)) titulo = titulo.slice(0, -(medio.length + 3));
      const resumen = fuente.medio ? campo(it, 'description').slice(0, 280) : '';
      const fecha = new Date(campo(it, 'pubDate'));
      if (isNaN(fecha)) return null;   // fecha ilegible: se salta esta noticia, no toda la fuente
      return { titulo, enlace: campo(it, 'link'), medio, publicada: fecha.toISOString(),
               resumen, via: fuente.via, depConsulta: fuente.departamento, tipoMedio: fuente.tipo || null };
    }).filter(x => x && x.titulo);
  } catch { return []; }
}

// =====================================================================================
//  PASO 3 · ¿DE QUÉ LUGAR HABLA?  Ubicar la noticia
// =====================================================================================
// El programa lee el titular y busca en él los nombres de los 243 distritos, siguiendo
// estas reglas (en orden):
//
//   a) Busca cada nombre de distrito (y sus alias) como palabras completas.
//   b) "Piura", "Tumbes", "Cajamarca" o "Lambayeque" solos se entienden como el
//      DEPARTAMENTO entero, no como el distrito del mismo nombre, porque casi siempre las
//      noticias hablan de la región. Ojo: en Lambayeque la capital es Chiclayo, así que una
//      noticia de la ciudad de Lambayeque también queda a nivel departamento.
//   c) El distrito debe pertenecer a un departamento nombrado en el titular, o al
//      departamento de la búsqueda que trajo la noticia.
//   d) Los nombres que se prestan a confusión (lista AMBIGUOS) solo cuentan si el titular
//      nombra también su provincia o su departamento.
//   e) Si un mismo nombre existe en dos provincias (hay dos "Santa Cruz" en Cajamarca),
//      se elige el de la provincia que menciona el titular; si no menciona ninguna, el
//      que es capital de provincia.
//   f) Si dice "provincia de Hualgayoc", se registra la PROVINCIA, no el distrito del
//      mismo nombre.
//   g) Si el titular no nombra ningún lugar, la noticia queda solo con el departamento
//      de la búsqueda, y la página la marca como "por búsqueda".
//
// Solo se lee el titular (no el resumen), porque los resúmenes de las radios suelen
// incluir el nombre y la ciudad de la emisora, y eso confundiría la ubicación.
//
// Resultado: la lista de lugares (departamento › provincia › distrito) de la noticia.
function ubicar(item) {
  const texto = norm(item.titulo);   // solo el titular: los resúmenes de radio traen el nombre de la emisora y su ciudad
  const deps = DEPARTAMENTOS.filter(d => tiene(texto, d));
  const encontrados = [];
  for (const { d, claves } of nombres) {
    const hallada = claves.filter(c => tiene(texto, c));
    if (!hallada.length) continue;
    if (norm(d.distrito) === norm(d.departamento)) continue;          // "Piura" sola = nivel departamento
    const dentro = deps.includes(d.departamento) || item.depConsulta === d.departamento;
    if (!dentro) continue;
    const soloAmbiguas = hallada.every(c => AMBIGUOS.has(c));
    if (soloAmbiguas && !tiene(texto, d.provincia) && !tiene(texto, d.departamento)) continue;
    encontrados.push(d);
  }
  // Un mismo nombre puede existir en dos provincias (Santa Cruz, Salitral, San Juan…):
  // queda el de la provincia nombrada; si no se nombra ninguna, el que es capital de provincia.
  const porNombre = new Map();
  for (const d of encontrados) {
    const k = norm(d.distrito);
    porNombre.set(k, [...(porNombre.get(k) || []), d]);
  }
  const elegidos = [];
  for (const grupo of porNombre.values()) {
    if (grupo.length === 1) { elegidos.push(grupo[0]); continue; }
    const conProv = grupo.filter(d => norm(d.provincia) !== norm(d.distrito) && tiene(texto, d.provincia));
    const capital = grupo.filter(d => norm(d.provincia) === norm(d.distrito));
    elegidos.push(...(conProv.length ? conProv : capital.length ? capital : grupo));
  }
  // "provincia de Hualgayoc" → nivel provincia, no el distrito del mismo nombre.
  const lugares = elegidos.map(d => {
    const esProvincia = norm(d.provincia) === norm(d.distrito) && new RegExp(`provincia (de )?${norm(d.provincia)}`).test(texto);
    return { departamento: d.departamento, provincia: d.provincia, distrito: esProvincia ? null : d.distrito,
             ubigeo: esProvincia ? d.ubigeo.slice(0, 4) : d.ubigeo };
  }).filter((l, i, a) => a.findIndex(o => o.ubigeo === l.ubigeo) === i);
  const departamentos = [...new Set([...lugares.map(l => l.departamento), ...deps])];
  if (!departamentos.length && item.depConsulta) departamentos.push(item.depConsulta);
  // Las capitales departamentales nombradas solas se registran como distrito capital (nivel "departamento")
  for (const dep of deps) {
    if (!lugares.some(l => l.departamento === dep)) {
      const cap = DISTRITOS.find(d => d.departamento === dep && d.provincia === dep && norm(d.distrito) === norm(dep));
      lugares.push({ departamento: dep, provincia: dep, distrito: null, ubigeo: cap ? cap.ubigeo.slice(0, 2) : null });
    }
  }
  return { departamentos, lugares };
}

// =====================================================================================
//  PASO 4 · ¿DE QUÉ TRATA?  Ponerle tema
// =====================================================================================
// Recorre la lista TEMAS (definida arriba) y devuelve el primer tema cuyas palabras
// aparezcan; si ninguna aparece, devuelve "Otros".
const tema = t => (TEMAS.find(([, re]) => re.test(t)) || ['Otros'])[0];

// =====================================================================================
//  EL PROGRAMA PRINCIPAL: junta todos los pasos, en orden
// =====================================================================================
async function main() {
  // 1) Arma la lista completa de fuentes: Google Noticias + radios (hoy, 46 en total).
  const fuentes = [...fuentesGoogle(), ...fuentesRadios()];

  // 2) Lee las fuentes de 6 en 6 al mismo tiempo, como seis personas revisando
  //    periódicos en paralelo. Así termina en segundos sin saturar a ningún sitio.
  const lotes = [];
  for (let i = 0; i < fuentes.length; i += 6) {
    lotes.push(...(await Promise.all(fuentes.slice(i, i + 6).map(leer))).flat());
  }
  // 3) Elimina repetidas. La misma noticia suele llegar por varias búsquedas; se
  //    reconocen por su titular. Si una copia vino directo de la radio, se prefiere esa,
  //    porque su enlace lleva directo al medio y no pasa por Google.
  const vistos = new Map();
  for (const it of lotes) {
    const clave = norm(it.titulo).slice(0, 90);
    if (!vistos.has(clave)) vistos.set(clave, it);
    else if (it.via === 'RSS de la radio') vistos.set(clave, it);   // preferimos el enlace directo
  }
  // 4) Convierte cada noticia en una FICHA, aplicando en orden:
  //    • deja solo las de los últimos 30 días (864e5 = milisegundos que tiene un día);
  //    • la ubica (Paso 3) y le pone tema (Paso 4);
  //    • descarta las que no son de Tumbes, Piura, Lambayeque o Cajamarca;
  //    • de las radios, descarta las que no nombran ningún lugar (suelen ser nacionales);
  //    • las ordena de la más reciente a la más antigua;
  //    • les da un código único, por ejemplo USF-N-261107-0001
  //      (USF-N = Una Sola Fuerza, Noticia; 261107 = fecha 2026-11-07; 0001 = número).
  //    Ninguna ficha lleva nivel ni calificación: entra tal como está escrita.
  const corte = Date.now() - DIAS * 864e5;
  const fichas = [...vistos.values()]
    .filter(it => new Date(it.publicada).getTime() >= corte)
    .map(it => ({ ...it, ...ubicar(it), tema: tema(it.titulo + ' ' + it.resumen) }))
    .filter(f => f.departamentos.some(d => DEPARTAMENTOS.includes(d)))
    // Las radios también publican noticias nacionales: de ellas solo quedan las que nombran un lugar.
    .filter(f => f.via !== 'RSS de la radio' || f.lugares.length)
    .sort((a, b) => b.publicada.localeCompare(a.publicada))
    .map((f, i) => ({
      id: `USF-N-${f.publicada.slice(2, 10).replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`,
      titulo: f.titulo, medio: f.medio, tipoMedio: f.tipoMedio, via: f.via, enlace: f.enlace,
      publicada: f.publicada, resumen: f.resumen, tema: f.tema,
      departamentos: f.departamentos, lugares: f.lugares,
      ubicadaPor: f.lugares.length ? 'titular' : 'búsqueda',   // 'búsqueda' = el titular no nombra el lugar
      capturada: new Date().toISOString(),
    }));
  // =====================================================================================
  //  PASO 5 · GUARDAR las fichas en archivos
  // =====================================================================================
  // Se guarda un paquete con la fecha de esta lectura, cuántas fuentes se consultaron
  // y todas las fichas. Se escribe en tres formatos, uno para cada forma de verlas.
  const salida = { generado: new Date().toISOString(), ventanaDias: DIAS, fuentesConsultadas: fuentes.length, total: fichas.length, fichas };
  fs.writeFileSync(path.join(DIR, 'fichas.json'), JSON.stringify(salida, null, 1));
  // Copia para abrir index.html directamente desde la carpeta (file://), donde fetch() está bloqueado.
  fs.writeFileSync(path.join(DIR, 'fichas.js'), 'window.FICHAS = ' + JSON.stringify(salida) + ';\n');
  // Página autónoma con los datos dentro: se abre con doble clic, se copia o se envía sin otros archivos.
  const pagina = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  const datos = '<script>window.FICHAS = ' + JSON.stringify(salida).replace(/</g, '\\u003c') + ';</script>\n<script>';
  fs.writeFileSync(path.join(DIR, 'ver-fichas.html'),
    '<!DOCTYPE html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + pagina.replace('<script>', datos) + '\n</html>\n');
  // 6) Muestra en la pantalla un resumen de lo que se hizo, por ejemplo:
  //    Fuentes: 46 · Leídas: 1208 · Fichas: 902 (Tumbes: 212 · Piura: 367 · Cajamarca: 211 · Lambayeque: 150)
  //    "Leídas" son todas las noticias recibidas, con repetidas; "Fichas", las que quedaron.
  //    Una noticia que nombra dos departamentos cuenta en ambos.
  const porDep = DEPARTAMENTOS.map(d => `${d}: ${fichas.filter(f => f.departamentos.includes(d)).length}`).join(' · ');
  console.log(`Fuentes: ${fuentes.length} · Leídas: ${lotes.length} · Fichas: ${fichas.length} (${porDep})`);
  console.log(`Con distrito: ${fichas.filter(f => f.lugares.some(l => l.distrito)).length} · Emergencias: ${fichas.filter(f => f.tema === 'Emergencias').length} · Lluvias y clima: ${fichas.filter(f => f.tema === 'Lluvias y clima').length}`);
}

// Aquí empieza realmente todo: se ejecuta el programa principal.
main();
