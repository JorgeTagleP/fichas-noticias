// =====================================================================================
//  UNA SOLA FUERZA – PERSONAS AFECTADAS SEGÚN EL INDECI  (versión 0.1)
// =====================================================================================
//
//  ¿QUÉ HACE ESTE PROGRAMA?
//  Lee los reportes oficiales del COEN-INDECI, que se publican cada día en
//  https://portal.indeci.gob.pe/emergencias/, y arma el cuadro de personas
//  damnificadas, afectadas, fallecidas y heridas por distrito, con sus totales por
//  provincia, por departamento y para todo el Perú.
//
//    1. Recorre el listado del portal y anota los reportes nuevos (PDF).
//    2. Se queda con los de fenómenos de la temporada de lluvias y El Niño: lluvias,
//       huaicos, inundaciones, desbordes, deslizamientos, derrumbes, vientos, etc.
//    3. Descarga cada PDF nuevo, lo convierte a texto (pdftotext) y copia la tabla
//       «Vida y salud (persona)» tal como viene: no corrige ni estima nada.
//    4. Si un mismo distrito y fenómeno aparece en varios reportes (el INDECI los va
//       actualizando y además publica consolidados), usa el que registra más personas
//       y lo cita completo.
//    5. Suma por provincia, departamento y país. Esas sumas son un cálculo propio
//       sobre cifras oficiales, y la página lo dice.
//
//  Para no descargar todo cada hora, guarda lo ya leído en indeci-cache.json (el
//  flujo de GitHub lo conserva en la rama «datos»).
//
//  ¿CÓMO SE USA?   node afectados.mjs        (necesita pdftotext: paquete poppler-utils)
//  ¿QUÉ PRODUCE?   afectados.json (para la página) e indeci-cache.json (memoria).
//
//  Regla del proyecto: lo oficial se cita, no se reinterpreta.
// =====================================================================================

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(DIR, 'indeci-cache.json');
const PORTAL = 'https://portal.indeci.gob.pe/emergencias/';
const DESDE = '2026-10-01';              // inicio del periodo que se cuenta (temporada de El Niño 2026-2027)
const MAX_PAGINAS = 200;                 // tope de páginas del listado por ejecución
const MAX_DESCARGAS = +process.env.INDECI_MAX || 600;   // tope de PDF nuevos por ejecución (el resto, en la siguiente)
const UA = { 'User-Agent': 'Mozilla/5.0 (fichas-noticias; lectura de reportes publicos)' };

// Fenómenos que se cuentan (palabras del título del reporte) y los que no.
const SI = /LLUVIA|HUAICO|INUNDACI|DESBORDE|CRECIDA|EROSI|DESLIZAMIENTO|DERRUMBE|MOVIMIENTO-EN-MASA|ALUD|AVALANCHA|VIENTO|GRANIZ|TORMENTA|ACTIVACI|COLAPSO-DE-ESTRUCTURA-POR-AGENTE-CLIM|PRECIPITACI|NEVADA|OLEAJE/i;
const TIPOS = /^(REPORTE-PRELIMINAR|REPORTE-COMPLEMENTARIO|INFORME-DE-EMERGENCIA)/i;
const MESES = { ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, SET: 9, SEP: 9, OCT: 10, NOV: 11, DIC: 12 };
const MESES_LARGO = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };

const dos = n => String(n).padStart(2, '0');
const limpiar = s => s.normalize('NFC').replace(/\s+/g, ' ').trim();
const nombre = s => limpiar(s).toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\b(De|Del|La|Las|Los|El|Y)\b/g, w => w.toLowerCase()).replace(/^./, c => c.toUpperCase());

// ---------- 1. Datos del nombre del archivo ----------
function delArchivo(url) {
  const f = decodeURIComponent(url.split('/').pop()).normalize('NFC');
  if (!TIPOS.test(f)) return null;
  const m = f.match(/N\.?[º°o]?-?(\d+)-(\d{1,2})([A-Z]{3})T?(\d{4})-(.+?)(?:-\d+)*\.pdf$/i);
  if (!m) return null;
  const [, num, d, mes, a, resto] = m;
  if (!SI.test(resto)) return null;
  const fecha = `${a}-${dos(MESES[mes.toUpperCase()] || 0)}-${dos(d)}`;
  const tipo = f.match(TIPOS)[1].toUpperCase();
  const fen = resto.split(/-EN-(EL|LA|LOS|LAS)-/i)[0].replace(/-/g, ' ');
  return { url, num: +num, tipo, fecha, titulo: resto.replace(/-/g, ' '), fenomeno: nombre(fen) };
}

// ---------- 2. Lectura de la tabla de personas del PDF ----------
const PERSONA = /^(DAMNIFICAD|AFECTAD|FALLECID|HERID|LESIONAD|DESAPARECID)/;
const CAMPO = { DAMNIFICAD: 'damnificados', AFECTAD: 'afectados', FALLECID: 'fallecidos', HERID: 'heridos', LESIONAD: 'heridos', DESAPARECID: 'desaparecidos' };

function corteDe(texto, fecha) {
  const m = texto.match(/Actualizado al (\d{1,2}) de ([a-záéíóú]+)(?: del?)? (\d{4})(?:,? a las (\d{1,2}):(\d{2}))?/i);
  if (m && MESES_LARGO[m[2].toLowerCase()]) return `${m[3]}-${dos(MESES_LARGO[m[2].toLowerCase()])}-${dos(m[1])}T${dos(m[4] || 0)}:${m[5] || '00'}`;
  return fecha + 'T00:00';
}

function leerTabla(texto) {
  const L = texto.split(/\r?\n/);
  const filas = [];
  for (let h = 0; h < L.length; h++) {
    const tokens = [...L[h].matchAll(/[A-ZÁÉÍÓÚÑ]{4,}/g)].map(m => ({ w: m[0], x: m.index + m[0].length / 2, ini: m.index }));
    if (!tokens.some(t => PERSONA.test(t.w))) continue;
    // ¿Dónde empieza la columna «VIVIENDA»? (en las líneas de arriba del encabezado)
    let xViv = null, xVida = null;
    for (let k = Math.max(0, h - 10); k < h; k++) {
      const v = L[k].search(/\bVIVIENDA\b/); if (v >= 0) xViv = v;
      const s = L[k].search(/VIDA Y SALUD/); if (s >= 0) xVida = s;
    }
    if (xViv === null && xVida === null && !/DAMNIFICAD|FALLECID|HERID/.test(L[h])) continue;
    let cols = tokens.filter(t => PERSONA.test(t.w) && (xViv === null || t.ini < xViv - 1));
    if (xViv === null) { // sin rótulo «VIVIENDA»: personas = hasta el primer término de vivienda o el 2.º «AFECTAD»
      cols = []; const vistos = new Set();
      for (const t of tokens) { const c = t.w.match(PERSONA); if (!c || vistos.has(c[1]) || /DESTRUID|INHABIT/.test(t.w)) break; vistos.add(c[1]); cols.push(t); }
    }
    if (!cols.length) continue;
    // Filas: DPTO. / PROV. / DIST. hasta que termina la tabla. Primero se juntan los
    // números de cada fila con su posición en la línea.
    const crudas = [];
    let dep = '', prov = '', empezo = false;
    for (let i = h + 1; i < L.length && i < h + 80; i++) {
      const l = L[i];
      if (empezo && /^\s*(Nota|Fuente|\d\.\d|[IVX]+\.)/.test(l)) break;
      const m = l.match(/^\s*(DPTO|PROV|DIST)\.*\s*(.+?)(?:\s{2,}(.*))?\s*$/);
      if (!m) continue;
      empezo = true;
      const nivel = m[1], lugar = nombre(m[2].replace(/\d.*$/, ''));
      if (nivel === 'DPTO') { dep = lugar; prov = ''; } else if (nivel === 'PROV') prov = lugar;
      const resto = m[3] || '', off = resto ? l.indexOf(resto, l.indexOf(m[2]) + m[2].length) : 0;
      const nums = [...resto.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map(q => ({ v: q[0], x: off + q.index + q[0].length / 2 }));
      crudas.push({ nivel, dep, prov: nivel === 'DPTO' ? '' : prov, dist: nivel === 'DIST' ? lugar : '', nums });
    }
    // Columnas: en algunos PDF los números no quedan debajo de su título. Si alguna fila
    // tiene todas las columnas llenas, su posición sirve de guía para las demás; si no,
    // se usa la posición de los títulos.
    const todas = tokens.filter(t => !/^(VIDA|SALUD|PERSONA|DAÑOS|UBICACI)/.test(t.w));
    const guia = crudas.find(r => r.nums.length === todas.length);
    const anclas = guia ? guia.nums.map((n, k) => ({ x: n.x, t: todas[k] })) : todas.map(t => ({ x: t.x, t }));
    const esPersona = new Set(cols), vistos = new Set();
    for (const r of crudas) {
      // Si el mismo lugar aparece dos veces es una segunda tabla (agro, vías…): se ignora.
      const k = r.nivel + r.dep + r.prov + r.dist; if (vistos.has(k)) continue; vistos.add(k);
      const p = {};
      for (const n of r.nums) {
        if (n.v.includes('.')) continue;
        let best = null, bd = 1e9;
        for (const a of anclas) { const d = Math.abs(a.x - n.x); if (d < bd) { bd = d; best = a; } }
        if (!best || bd > 9 || !esPersona.has(best.t)) continue;
        const campo = CAMPO[best.t.w.match(PERSONA)[1]];
        if (p[campo] === undefined) p[campo] = +n.v.replace(/,/g, '');
      }
      filas.push({ nivel: r.nivel, dep: r.dep, prov: r.prov, dist: r.dist, p });
    }
    if (filas.length) break;
  }
  // Algunas tablas traen las cifras solo en la fila del departamento: si hay un solo
  // distrito debajo, se le asignan a ese distrito.
  const conDatos = filas.filter(f => Object.keys(f.p).length);
  const dists = filas.filter(f => f.nivel === 'DIST');
  if (dists.length === 1 && !Object.keys(dists[0].p).length && conDatos.length) Object.assign(dists[0].p, conDatos[conDatos.length - 1].p);
  return filas;
}

// Reportes sin tabla, con la evaluación en texto: «Personas afectadas: aproximadamente
// doscientas (200) personas en el distrito de Yamango».
function leerTexto(texto, depTitulo) {
  const out = [];
  for (const m of texto.matchAll(/Personas (afectadas|damnificadas):\s*([^\n]*(?:\n(?!\s*-)[^\n]*)?)/gi)) {
    for (const q of m[2].matchAll(/\((\d+)\)\s*personas?\s*en el distrito de\s*([A-ZÁÉÍÓÚÑa-záéíóúñ ]+?)(?:[.,;]|\s*$)/g)) {
      out.push({ nivel: 'DIST', dep: depTitulo, prov: '', dist: nombre(q[2]), p: { [/damnific/i.test(m[1]) ? 'damnificados' : 'afectados']: +q[1] }, aprox: /aproximadamente/i.test(m[2]) });
    }
  }
  return out;
}

// ---------- 3. Recorrer el portal ----------
async function traer(url, binario = false) {
  for (let intento = 0; intento < 3; intento++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60000) });
      if (r.ok) return binario ? Buffer.from(await r.arrayBuffer()) : await r.text();
      if (r.status === 404) return null;
    } catch { /* se reintenta */ }
    await new Promise(r => setTimeout(r, 2000 * (intento + 1)));
  }
  return null;
}

// Si la memoria no existe, está vacía o dañada, se empieza de cero (no se detiene la lectura).
let cache;
try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch { cache = null; }
if (!cache || typeof cache !== 'object') cache = {};
cache.reportes ||= {}; cache.descartados ||= {};
// Si cambia la forma de leer las tablas, se vuelven a leer todos los reportes.
const VERSION_LECTOR = 2;
if (cache.version !== VERSION_LECTOR) { cache.reportes = {}; cache.completo = false; cache.version = VERSION_LECTOR; }
const nuevos = [];
let paginas = 0, masAntigua = '9999', llegoAlInicio = false;
for (let n = 1; n <= MAX_PAGINAS; n++) {
  const html = await traer(n === 1 ? PORTAL : `${PORTAL}page/${n}/`);
  if (!html) break;
  paginas = n;
  const links = [...new Set([...html.matchAll(/href="([^"]+\.pdf)"/g)].map(m => m[1]))];
  let conocidos = 0, enPeriodo = 0, fechados = 0, viejos = 0;
  for (const u of links) {
    const fm = decodeURIComponent(u).match(/-(\d{1,2})([A-Z]{3})T?(\d{4})-/);
    const f = fm ? `${fm[3]}-${dos(MESES[fm[2]] || 0)}-${dos(fm[1])}` : '';
    if (f) { fechados++; if (f < masAntigua) masAntigua = f; }
    if (f && f < DESDE) { viejos++; continue; }
    enPeriodo++;
    if (cache.reportes[u] || cache.descartados[u]) { conocidos++; continue; }
    const d = delArchivo(u);
    if (!d) { cache.descartados[u] = 1; conocidos++; continue; }
    nuevos.push(d);
  }
  // Ya se llegó al inicio del periodo cuando la mayoría de la página es anterior a DESDE
  // (a veces se cuela un documento viejo entre los nuevos).
  if (fechados && viejos / fechados > 0.6) { llegoAlInicio = true; break; }
  if (n > 3 && enPeriodo && conocidos === enPeriodo && cache.completo) break;   // página ya conocida
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'indeci-'));
let leidos = 0, fallas = 0;
for (const d of nuevos.slice(0, MAX_DESCARGAS)) {
  const pdf = await traer(encodeURI(decodeURI(d.url)), true);
  if (!pdf || pdf.subarray(0, 5).toString() !== '%PDF-') { fallas++; continue; }
  const f = path.join(tmp, 'r.pdf');
  fs.writeFileSync(f, pdf);
  let texto = '';
  try { texto = execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', f, '-'], { maxBuffer: 50e6 }).toString('utf8'); } catch { fallas++; continue; }
  const depTitulo = nombre(d.titulo.split(' ').pop());
  let filas = leerTabla(texto);
  if (!filas.some(r => Object.keys(r.p).length)) filas = filas.concat(leerTexto(texto, depTitulo));
  cache.reportes[d.url] = { ...d, corte: corteDe(texto, d.fecha), filas: filas.filter(r => Object.keys(r.p).length || r.nivel === 'DIST') };
  leidos++;
}
fs.rmSync(tmp, { recursive: true, force: true });
if (nuevos.length <= MAX_DESCARGAS && llegoAlInicio) cache.completo = true;
fs.writeFileSync(CACHE, JSON.stringify(cache));

// ---------- 4. Combinar: un reporte por distrito y fenómeno ----------
// El INDECI va actualizando cada emergencia en reportes sucesivos, y a veces publica
// además un consolidado departamental. Si un distrito tiene varios reportes del mismo
// fenómeno, se usa el que registra más personas (damnificados + afectados + fallecidos +
// heridos), y se cita completo: nunca se mezclan cifras de dos reportes en una fila.
const CAMPOS = ['damnificados', 'afectados', 'fallecidos', 'heridos', 'desaparecidos'];
const DEPS = ['Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali'];
const sinTilde = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
function departamento(dep, titulo) {
  for (const t of [dep, titulo]) {
    if (!t) continue;
    const s = ' ' + sinTilde(t) + ' ';
    const d = DEPS.filter(x => s.endsWith(' ' + sinTilde(x) + ' ') || s === ' ' + sinTilde(x) + ' ').sort((a, b) => b.length - a.length)[0];
    if (d) return d;
  }
  return dep || '(sin departamento)';
}
const personas = f => (f.damnificados || 0) + (f.afectados || 0) + (f.fallecidos || 0) + (f.heridos || 0) + (f.desaparecidos || 0);
const elegido = new Map(), provDe = new Map(), cuantos = new Map();
const todasLasFilas = [];
for (const r of Object.values(cache.reportes)) {
  if (r.fecha < DESDE) continue;
  for (const f of r.filas) {
    if (f.nivel !== 'DIST' || !Object.keys(f.p).length) continue;   // solo distritos (los totales se calculan aquí)
    const dep = departamento(f.dep, r.titulo);
    const fila = { dep, prov: f.prov, dist: f.dist, fenomeno: r.fenomeno, ...f.p, aprox: !!f.aprox, corte: r.corte, num: r.num, reporte: `${r.tipo === 'INFORME-DE-EMERGENCIA' ? 'Informe' : r.tipo === 'REPORTE-PRELIMINAR' ? 'Preliminar' : 'Complementario'} N.º ${r.num}`, url: r.url };
    todasLasFilas.push(fila);
    if (f.prov) provDe.set(sinTilde(dep) + '|' + sinTilde(f.dist), f.prov);
  }
}
// Provincia que falta (reportes con la evaluación en texto): se toma de otros reportes.
let distritosRef = {};
try { distritosRef = JSON.parse(fs.readFileSync(path.join(DIR, 'distritos.json'), 'utf8')); } catch { /* opcional */ }
for (const f of todasLasFilas) {
  if (f.prov) continue;
  f.prov = provDe.get(sinTilde(f.dep) + '|' + sinTilde(f.dist)) || '';
  if (!f.prov && Array.isArray(distritosRef)) {
    const d = distritosRef.find(x => sinTilde(x.departamento || '') === sinTilde(f.dep) && sinTilde(x.distrito || '') === sinTilde(f.dist));
    if (d) f.prov = d.provincia || '';
  }
}
for (const f of todasLasFilas) {
  const clave = [sinTilde(f.dep), sinTilde(f.dist), f.fenomeno].join('|');
  cuantos.set(clave, (cuantos.get(clave) || 0) + 1);
  const previo = elegido.get(clave);
  if (!previo || personas(f) > personas(previo) || (personas(f) === personas(previo) && f.corte > previo.corte)) elegido.set(clave, f);
}
const filas = [...elegido.entries()].map(([clave, { num, ...f }]) => ({ ...f, reportes: cuantos.get(clave) }))
  .filter(f => CAMPOS.some(c => f[c] > 0))
  .sort((a, b) => a.dep.localeCompare(b.dep, 'es') || a.prov.localeCompare(b.prov, 'es') || a.dist.localeCompare(b.dist, 'es') || a.fenomeno.localeCompare(b.fenomeno, 'es'));

function sumar(grupo) {
  const m = new Map();
  for (const f of filas) {
    const k = grupo(f); if (!m.has(k)) m.set(k, { clave: k, eventos: 0, distritos: new Set(), ...Object.fromEntries(CAMPOS.map(c => [c, 0])) });
    const t = m.get(k); t.eventos++; t.distritos.add(f.dep + '|' + f.dist);
    for (const c of CAMPOS) t[c] += f[c] || 0;
  }
  return [...m.values()].map(t => ({ ...t, distritos: t.distritos.size })).sort((a, b) => b.damnificados - a.damnificados || b.afectados - a.afectados);
}
const departamentos = sumar(f => f.dep).map(t => ({ departamento: t.clave, ...t, clave: undefined }));
const provincias = sumar(f => f.dep + '|' + f.prov).map(t => ({ departamento: t.clave.split('|')[0], provincia: t.clave.split('|')[1], ...t, clave: undefined }));
const peru = sumar(() => 'Perú')[0] || { eventos: 0, distritos: 0, ...Object.fromEntries(CAMPOS.map(c => [c, 0])) };
delete peru.clave;

// Salud: se citan las cifras oficiales registradas en oficiales.json.
let salud = [];
try {
  const of = JSON.parse(fs.readFileSync(path.join(DIR, 'oficiales.json'), 'utf8'));
  salud = (of.indicadores || []).filter(i => /dengue|leptospir/.test(i.tema)).map(i => ({ departamento: i.departamento === '*' ? 'Perú' : i.departamento, tema: i.tema === 'dengue' ? 'Dengue' : 'Leptospirosis', indicador: i.indicador, valor: i.valor, corte: i.corte, fuente: i.fuente, via: i.via, url: i.url }));
} catch { /* sin datos de salud */ }

const reportesPeriodo = Object.values(cache.reportes).filter(r => r.fecha >= DESDE);
const salida = {
  generado: new Date().toISOString(),
  desde: DESDE,
  fuente: PORTAL,
  reportesLeidos: reportesPeriodo.length,
  ultimoReporte: reportesPeriodo.map(r => r.fecha).sort().pop() || null,
  completo: !!cache.completo,
  peru, departamentos, provincias, filas, salud,
};
fs.writeFileSync(path.join(DIR, 'afectados.json'), JSON.stringify(salida));
console.log(`INDECI: ${paginas} páginas, ${nuevos.length} reportes nuevos (${leidos} leídos, ${fallas} con falla); ${reportesPeriodo.length} en el periodo; ${filas.length} filas; Perú: ${peru.damnificados} damnificados, ${peru.afectados} afectados, ${peru.fallecidos} fallecidos.`);
