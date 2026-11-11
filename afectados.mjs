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
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 (fichas-noticias)', 'Accept': 'text/html,application/pdf,*/*', 'Accept-Language': 'es-PE,es;q=0.9' };

// Las reglas de lectura de los PDF (fenómenos, tablas, departamentos) están en indeci-tablas.mjs.
import { MESES, dos, nombre, delArchivo, corteDe, leerTabla, leerTexto, DEPS, sinTilde, depDeFila } from './indeci-tablas.mjs';

// ---------- 3. Recorrer el portal ----------
let ultimoError = '';
async function traer(url, binario = false) {
  for (let intento = 0; intento < 3; intento++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60000) });
      if (r.ok) return binario ? Buffer.from(await r.arrayBuffer()) : await r.text();
      ultimoError = `HTTP ${r.status}`;
      if (r.status === 404) return null;
    } catch (e) { ultimoError = String(e.cause?.code || e.cause?.message || e.message); /* se reintenta */ }
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
const VERSION_LECTOR = 3;
if (cache.version !== VERSION_LECTOR) { cache.reportes = {}; cache.completo = false; cache.version = VERSION_LECTOR; }
const nuevos = [];
let paginas = 0, masAntigua = '9999', llegoAlInicio = false;
for (let n = 1; n <= MAX_PAGINAS; n++) {
  const html = await traer(n === 1 ? PORTAL : `${PORTAL}page/${n}/`);
  if (!html && n === 1) {
    // El portal no respondió: se deja la página con los datos de la lectura anterior.
    console.log(`INDECI: el portal no respondió (${ultimoError}); se mantienen los datos de la lectura anterior.`);
    process.exit(0);
  }
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
const personas = f => (f.damnificados || 0) + (f.afectados || 0) + (f.fallecidos || 0) + (f.heridos || 0) + (f.desaparecidos || 0);
const elegido = new Map(), provDe = new Map(), cuantos = new Map();
const todasLasFilas = [];
for (const r of Object.values(cache.reportes)) {
  if (r.fecha < DESDE) continue;
  for (const f of r.filas) {
    if (f.nivel !== 'DIST' || !Object.keys(f.p).length) continue;   // solo distritos (los totales se calculan aquí)
    // Si la tabla dice un departamento y el título otro, y el título nombra a ese distrito,
    // vale el del título (pasó con Quilahuani, Tacna, anotado «DPTO ÁNCASH» en la tabla).
    const dep = depDeFila(f, r.titulo);
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
