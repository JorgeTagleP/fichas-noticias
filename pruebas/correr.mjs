// =====================================================================================
//  pruebas/correr.mjs — pruebas antes de publicar
// =====================================================================================
//  ¿Qué revisa?
//    1. Reglas que no se tocan: el bloque NÚCLEO de conclusiones.mjs sigue siendo
//       copiable a Apps Script y no hay caracteres de retroceso (0x08) en las reglas.
//    2. Conclusiones: cada titular de casos-conclusiones.json (errores ya corregidos,
//       sacados de MEJORAS.md) se clasifica como se decidió. Si una regla nueva rompe
//       un caso viejo, la prueba falla y no se publica la página.
//    3. Ubicación de noticias (lector.mjs): buques «BAP Paita», nombres ambiguos…
//    4. INDECI: los PDF de pruebas/indeci, ya verificados a mano contra el documento,
//       se leen igual que lo esperado. Solo corre con el pdftotext de Linux (el de
//       GitHub): el de Windows arma las columnas distinto y no es el válido.
//
//  Uso:  node pruebas/correr.mjs        (sale con código 1 si algo falla)
//  Cuando se corrija un error nuevo, se agrega su titular o su PDF como prueba.
// =====================================================================================

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ubicar, tema, norm } from '../lector.mjs';
import { unir, indice, buscar } from '../mapa.mjs';
import { nombre, delArchivo, corteDe, leerTabla, leerTexto, depDeFila } from '../indeci-tablas.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
let ok = 0;
const fallas = [];
const prueba = (nombreP, cond, detalle = '') => { if (cond) ok++; else fallas.push(`${nombreP}${detalle ? ' — ' + detalle : ''}`); };

// ---------- 1. Reglas que no se tocan ----------
const fuente = fs.readFileSync(path.join(RAIZ, 'conclusiones.mjs'), 'utf8');
const i0 = fuente.indexOf('// ===== NÚCLEO (inicio) =====');
const i1 = fuente.indexOf('// ===== NÚCLEO (fin) =====');
prueba('conclusiones.mjs conserva las marcas del NÚCLEO', i0 >= 0 && i1 > i0);
const nucleo = fuente.slice(i0, i1);
for (const [que, re] of [['fs.', /\bfs\./], ['import', /^\s*import\b/m], ['«?.»', /\?\.[a-zA-Z_[(]/], ['«??»', /\?\?/], ['«.at(»', /\.at\(/]]) {
  prueba(`el NÚCLEO no usa ${que} (debe poder copiarse a Apps Script)`, !re.test(nucleo));
}
for (const f of ['conclusiones.mjs', 'lector.mjs', 'indeci-tablas.mjs']) {
  prueba(`${f} no tiene caracteres de retroceso (0x08)`, !fs.readFileSync(path.join(RAIZ, f), 'utf8').includes('\x08'));
}

// ---------- 2. Conclusiones ----------
const calcular = new Function(nucleo + '\nreturn calcularConclusiones;')();
const { casos, ubicar: casosUbicar } = JSON.parse(fs.readFileSync(path.join(AQUI, 'casos-conclusiones.json'), 'utf8'));
const DISTRITOS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'distritos.json'), 'utf8'));
const AHORA = '2026-11-10T15:00:00.000Z';

function lugarDe(c) {
  if (c.dist) {
    const d = DISTRITOS.find(x => x.departamento === c.dep && norm(x.distrito) === norm(c.dist));
    return { departamento: c.dep, provincia: d ? d.provincia : c.dep, distrito: d ? d.distrito : c.dist };
  }
  if (c.prov) return { departamento: c.dep, provincia: c.prov, distrito: null };
  return { departamento: c.dep, provincia: c.dep, distrito: null };
}

for (const c of casos) {
  const ficha = { id: 'PRUEBA', titulo: c.titulo, medio: 'prueba', enlace: '', publicada: AHORA, tema: tema(c.titulo),
    departamentos: [c.dep], lugares: [lugarDe(c)] };
  const s = calcular({ generado: AHORA, fichas: [ficha] }, null, { indicadores: [] });
  const senales = new Set();
  for (const r of [...s.prioridad, ...s.departamentos]) r.senales.forEach(x => senales.add(x.id));
  if (s.brechas.length) senales.add('brecha');
  for (const d of s.salud) for (const id of ['dengue', 'leptospirosis', 'agua']) if (d[id]) senales.add(id);
  const quien = `«${c.titulo.slice(0, 70)}${c.titulo.length > 70 ? '…' : ''}» (${c.origen})`;
  const vistas = [...senales].join(', ') || 'ninguna';
  for (const id of c.tiene || []) prueba(`${quien} suma «${id}»`, senales.has(id), `señales: ${vistas}`);
  for (const id of c.no_tiene || []) prueba(`${quien} no suma «${id}»`, !senales.has(id), `señales: ${vistas}`);
  if (c.fuera) prueba(`${quien} queda fuera de las conclusiones`, !senales.size && !s.proyectos.length && s.ejes.every(e => !e.menciones),
    `señales: ${vistas}; proyectos: ${s.proyectos.map(p => p.id).join(', ') || 'ninguno'}; ejes: ${s.ejes.filter(e => e.menciones).map(e => e.id).join(', ') || 'ninguno'}`);
  if (c.proyecto) {
    const p = s.proyectos.find(x => x.id === c.proyecto.id);
    prueba(`${quien} cuenta en el proyecto «${c.proyecto.id}»${c.proyecto.estado ? ` como «${c.proyecto.estado}»` : ''}`,
      p && (!c.proyecto.estado || p.estados[c.proyecto.estado]), p ? `estados: ${JSON.stringify(p.estados)}` : `proyectos: ${s.proyectos.map(x => x.id).join(', ') || 'ninguno'}`);
  }
  if (c.eje) {
    const e = s.ejes.find(x => x.id === c.eje.id);
    prueba(`${quien} cuenta en el eje «${c.eje.id}»${c.eje.estado ? ` como «${c.eje.estado}»` : ''}`,
      e && e.menciones && (!c.eje.estado || e.estados[c.eje.estado]), e ? `estados: ${JSON.stringify(e.estados)}` : 'eje inexistente');
  }
  if (c.pronostico !== undefined) prueba(`${quien} ${c.pronostico ? 'figura' : 'no figura'} en el pronóstico`, !!s.pronostico.length === c.pronostico);
  if (c.frase) prueba(`${quien} genera la frase «${c.frase}…»`, s.frases.some(f => f.includes(c.frase)), s.frases.join(' | '));
}

// ---------- 3. Ubicación de las noticias ----------
for (const c of casosUbicar) {
  const u = ubicar({ titulo: c.titulo, depConsulta: c.depConsulta });
  const dists = u.lugares.map(l => l.distrito).filter(Boolean);
  if (c.sin_distrito) prueba(`«${c.titulo.slice(0, 60)}» no se ubica en el distrito ${c.sin_distrito}`, !dists.some(d => norm(d) === norm(c.sin_distrito)), `distritos: ${dists.join(', ')}`);
  if (c.con_distrito) prueba(`«${c.titulo.slice(0, 60)}» se ubica en el distrito ${c.con_distrito}`, dists.some(d => norm(d) === norm(c.con_distrito)), `distritos: ${dists.join(', ') || 'ninguno'}`);
}

// ---------- 4. Reportes del INDECI ----------
const esperado = JSON.parse(fs.readFileSync(path.join(AQUI, 'indeci', 'esperado.json'), 'utf8'));
let indeci = 'omitidas (no es Linux: el pdftotext válido es el de GitHub)';
const conPdftotext = (() => { try { execFileSync('pdftotext', ['-v'], { stdio: 'ignore' }); return true; } catch { return false; } })();
if (os.platform() === 'linux' && conPdftotext) {
  indeci = `${esperado.length} reportes`;
  for (const r of esperado) {
    const texto = execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', path.join(AQUI, 'indeci', r.archivo), '-'], { maxBuffer: 50e6 }).toString('utf8');
    // Igual que afectados.mjs: tabla; si no trae cifras, la evaluación escrita en texto.
    let filas = leerTabla(texto);
    if (!filas.some(f => Object.keys(f.p).length)) filas = filas.concat(leerTexto(texto, nombre(r.titulo.split(' ').pop())));
    filas = filas.filter(f => Object.keys(f.p).length || f.nivel === 'DIST');
    const quien = `INDECI ${r.tipo} N.º ${r.num} (${r.archivo})`;
    prueba(`${quien}: personas por lugar`, JSON.stringify(filas) === JSON.stringify(r.filas),
      `leído ${JSON.stringify(filas.map(f => [f.dist || f.prov || f.dep, f.p]))} · esperado ${JSON.stringify(r.filas.map(f => [f.dist || f.prov || f.dep, f.p]))}`);
    prueba(`${quien}: fecha de corte`, corteDe(texto, r.fecha) === r.corte, `${corteDe(texto, r.fecha)} ≠ ${r.corte}`);
    const d = delArchivo(r.url);
    prueba(`${quien}: datos del nombre del archivo`, d && d.num === r.num && d.tipo === r.tipo && d.fecha === r.fecha && d.fenomeno === r.fenomeno);
  }
} else if (os.platform() === 'linux') indeci = 'omitidas: falta pdftotext (sudo apt-get install poppler-utils)';
// El departamento del título manda cuando la tabla trae otro (Quilahuani es de Tacna, no de Áncash).
const quila = esperado.find(r => r.num === 2437);
prueba('INDECI: Quilahuani queda en Tacna aunque la tabla diga «DPTO ÁNCASH»', quila && depDeFila(quila.filas.find(f => f.nivel === 'DIST'), quila.titulo) === 'Tacna');

// ---------- 5. Mapas (mapa.mjs) ----------
// Cada distrito de distritos.json se encuentra por su nombre y tiene límite en el mapa
// (salvo los dos que faltan en la copia del INEI), y los nombres que el INDECI escribe
// distinto (sin tilde, «Tambo Grande», «San Miguel de el Faique»…) caen en su distrito.
{
  const distritos = JSON.parse(fs.readFileSync(path.join(RAIZ, 'distritos.json'), 'utf8'));
  const lim = JSON.parse(fs.readFileSync(path.join(RAIZ, 'limites-norte.json'), 'utf8'));
  const ix = indice(distritos);
  const conLimite = new Set(lim.features.filter(f => f.geometry).map(f => f.properties.ubigeo));
  const sinLimite = ['200115', '200602'];
  for (const d of distritos) {
    prueba(`mapa: «${d.distrito}» (${d.provincia}, ${d.departamento}) se encuentra por su nombre`, buscar(ix, d.departamento, d.provincia, d.distrito) === d.ubigeo);
    if (!sinLimite.includes(d.ubigeo)) prueba(`mapa: ${d.distrito} (${d.ubigeo}) tiene límite`, conLimite.has(d.ubigeo));
  }
  const filas = [
    ['Cajamarca', 'Celendín', 'Celendin', '060301'], ['Piura', 'Piura', 'Tambo Grande', '200114'], ['Piura', 'Huancabamba', 'San Miguel de el Faique', '200306'],
    ['Tumbes', 'Contralmirante Villar', 'Canoas de Punta Sal', '240203'], ['Piura', 'Talara', 'Máncora', '200706'], ['Lambayeque', 'Ferreñafe', 'Cañaris', '140202'],
    ['Piura', 'Morropón', 'Salitral', '200406'], ['Piura', 'Sullana', 'Salitral', '200608'],
  ].map(([dep, prov, dist, u]) => ({ dep, prov, dist, u, afectados: 5, damnificados: 1, fenomeno: 'Lluvias Intensas', url: 'https://portal.indeci.gob.pe/x.pdf' }));
  const r = unir([...filas, { dep: 'Cusco', dist: 'Cusco', afectados: 9 }], distritos);
  for (const f of filas) prueba(`mapa: el INDECI «${f.dist}» (${f.prov}) cae en ${f.u}`, r.porUbigeo[f.u] && r.porUbigeo[f.u].afectados === 5, JSON.stringify(Object.keys(r.porUbigeo)));
  prueba('mapa: fuera del norte no entra y nada queda sin ubicar', !Object.values(r.porUbigeo).some(o => o.afectados === 9) && r.sinUbicar.length === 0, r.sinUbicar.join(', '));
}

// ---------- Resultado ----------
console.log(`Pruebas: ${ok} correctas, ${fallas.length} con falla · ${casos.length} titulares · ${casosUbicar.length} ubicaciones · INDECI: ${indeci}.`);
if (fallas.length) {
  console.log('\nFallas:');
  fallas.forEach(f => console.log('  ✘ ' + f));
  process.exit(1);
}
