// =====================================================================
// evaluar.mjs — Bucle de evaluación de cifras, una vez por cada lectura
// ---------------------------------------------------------------------
// Qué hace, en palabras simples:
//   1. Lee las fichas de la última lectura (fichas.json).
//   2. Lee las cifras oficiales de referencia (oficiales.json): INDECI,
//      SENAMHI, MINSA, El Peruano. Esas cifras se citan, no se reinterpretan.
//   3. Busca en cada titular un número que hable de lo mismo (por ejemplo
//      "18 fallecidos por dengue" en Lambayeque) y lo compara con la cifra
//      oficial.
//   4. Escribe evaluacion.md (para leer) y evaluacion.json (para la web).
//
// No cambia ni califica ninguna noticia: entran tal como las publicó cada
// medio. Solo avisa qué cifras coinciden, cuáles difieren y
// cuáles no tienen todavía una cifra oficial con qué compararse.
//
// Uso:  node evaluar.mjs      (actualizar-noticias.cmd ya lo ejecuta)
// =====================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const leer = f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));

const { generado, fichas } = leer('fichas.json');
const ofi = leer('oficiales.json');

// Margen de tolerancia: hasta 5 % de diferencia = coincide; hasta 25 % = cercana.
const COINCIDE = 0.05, CERCANA = 0.25;
// Una referencia oficial con más de 7 días respecto a la lectura se marca para actualizar.
const DIAS_VIGENCIA = 7;

// Convierte "15 716", "15.716", "8 mil", "más de 2,500" en un número.
function numero(txt) {
  const t = txt.toLowerCase().replace(/\s+/g, ' ').trim();
  const mil = /\bmil\b/.test(t);
  const limpio = t.replace(/\bmil\b/, '').replace(/[\s.,](?=\d{3}\b)/g, '').replace(',', '.');
  const n = parseFloat(limpio);
  return Number.isFinite(n) ? (mil ? n * 1000 : n) : null;
}

// Busca "<número> [palabras] <clave>", p. ej. "324 damnificados", "18 fallecidos por dengue".
function extraer(titulo, clave) {
  const re = new RegExp(`(\\d{1,3}(?:[ .,]\\d{3})+|\\d+(?:[.,]\\d+)?)(\\s*mil)?\\s+(?:[a-záéíóúñ]+\\s+){0,2}?(?:${clave})`, 'gi');
  const out = [];
  for (const m of titulo.matchAll(re)) {
    const v = numero(m[1] + (m[2] || ''));
    if (v !== null && !(v >= 1900 && v <= 2100 && !m[2])) out.push({ valor: v, texto: m[0], despues: titulo.slice(m.index + m[0].length, m.index + m[0].length + 25) }); // descarta años
  }
  return out;
}

const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const DEP_SIGUE = /^\s*(?:de|en)\s+(?:la region\s+)?(?:piura|tumbes|lambayeque|cajamarca)/;
const PAIS = /\b(peru|pais|nacional|a nivel nacional)\b/;

function delDepartamento(f, dep) {
  const t = norm(f.titulo);
  if (dep === '*') return PAIS.test(t);
  if (!f.departamentos.includes(dep)) return false;
  // 10/11/2026: «Sullana: Más de 7 mil casos de dengue en la Subregión» es una cifra de la subregión
  // o provincia, no del departamento; si el titular no nombra el departamento, no se compara
  if (/\b(subregion|provincia)\b/.test(t) && !t.includes(norm(dep))) return false;
  // el titular debe nombrar el departamento o uno de sus lugares, y no otro departamento con cifras propias
  return t.includes(norm(dep)) || (f.lugares || []).some(l => l.departamento === dep && l.ubigeo.length > 2);
}

const diasEntre = (a, b) => Math.round((new Date(a) - new Date(b)) / 864e5);

const resultados = [];
for (const ind of ofi.indicadores) {
  const tema = new RegExp(ind.tema, 'i');
  const excluir = ind.excluir ? new RegExp(ind.excluir, 'i') : null;
  const afirmaciones = [];
  for (const f of fichas) {
    if (!tema.test(f.titulo) || !delDepartamento(f, ind.departamento)) continue;
    for (const c of extraer(f.titulo, ind.clave)) {
      if (excluir && excluir.test(c.texto)) continue;
      // en un indicador nacional, "65 distritos de Piura" es una cifra regional, no del país
      if (ind.departamento === "*" && DEP_SIGUE.test(norm(c.despues))) continue;
      const dif = (c.valor - ind.valor) / ind.valor;
      const estado = Math.abs(dif) <= COINCIDE ? 'coincide' : Math.abs(dif) <= CERCANA ? 'cercana' : 'difiere';
      afirmaciones.push({ id: f.id, fecha: f.publicada.slice(0, 10), medio: f.medio, titulo: f.titulo, enlace: f.enlace,
        cifra: c.valor, texto: c.texto, diferencia: Math.round(dif * 100), estado });
    }
  }
  const vencida = !ind.corte || diasEntre(generado, ind.corte) > DIAS_VIGENCIA;
  resultados.push({ ...ind, referenciaVencida: vencida, afirmaciones });
}

// Cifras de los titulares de emergencia y salud que no tienen referencia oficial todavía.
const CLAVES_LIBRES = 'damnificad|afectad|fallecid|muert|casos|viviendas|familias|distritos|albergues|personas|litros|mm';
const cubiertas = new Set(resultados.flatMap(r => r.afirmaciones.map(a => a.id + '|' + a.cifra)));
const sinReferencia = [];
for (const f of fichas) {
  if (!['Emergencias', 'Lluvias y clima', 'Salud'].includes(f.tema)) continue;
  for (const c of extraer(f.titulo, CLAVES_LIBRES)) {
    if (cubiertas.has(f.id + '|' + c.valor) || c.valor < 2) continue;
    sinReferencia.push({ id: f.id, fecha: f.publicada.slice(0, 10), departamentos: f.departamentos, medio: f.medio, texto: c.texto, titulo: f.titulo });
  }
}

// ---------- Salida ----------
const cuenta = { coincide: 0, cercana: 0, difiere: 0 };
resultados.forEach(r => r.afirmaciones.forEach(a => cuenta[a.estado]++));
const vencidas = resultados.filter(r => r.referenciaVencida);

fs.writeFileSync(path.join(DIR, 'evaluacion.json'), JSON.stringify({ lectura: generado, referencias: ofi.actualizado, cuenta, resultados, sinReferencia }, null, 1));

const fmt = n => n.toLocaleString('es-PE');
const icono = { coincide: 'Coincide', cercana: 'Cercana', difiere: 'Difiere' };
let md = `# Evaluación de cifras – lectura del ${generado.slice(0, 10)}\n\n`;
md += `Referencias oficiales al ${ofi.actualizado}. Cifras en titulares comparadas: ${cuenta.coincide} coinciden (±5 %), ${cuenta.cercana} cercanas (±25 %), ${cuenta.difiere} difieren. `;
md += `${sinReferencia.length} cifras sin referencia oficial.\n\n`;
if (vencidas.length) md += `**Referencias para actualizar** (más de ${DIAS_VIGENCIA} días o sin fecha de corte): ${vencidas.map(v => v.id).join(', ')}.\n\n`;
md += `| Indicador | Departamento | Cifra oficial | Corte | Fuente | En titulares |\n| --- | --- | --- | --- | --- | --- |\n`;
for (const r of resultados) {
  const t = r.afirmaciones.length
    ? r.afirmaciones.map(a => `${fmt(a.cifra)} (${icono[a.estado]}${a.estado === 'coincide' ? '' : `, ${a.diferencia > 0 ? '+' : ''}${a.diferencia} %`}; ${a.medio}, ${a.fecha})`).join('<br>')
    : 'sin menciones';
  md += `| ${r.indicador} | ${r.departamento === '*' ? 'Perú' : r.departamento} | ${fmt(r.valor)} | ${r.corte || 's/f'} | [${r.fuente}](${r.url}) | ${t} |\n`;
}
md += `\n## Cifras sin referencia oficial\n\n`;
md += sinReferencia.length ? sinReferencia.map(s => `- ${s.fecha} · ${s.departamentos.join('/')} · «${s.texto}» – ${s.titulo} (${s.medio})`).join('\n') : 'Ninguna.';
md += `\n\nRegla: lo oficial se cita, no se reinterpreta. Esta evaluación no cambia ni califica las noticias: entran tal como las publicó cada medio.\n`;
fs.writeFileSync(path.join(DIR, 'evaluacion.md'), md);

console.log(`Evaluación: ${cuenta.coincide} coinciden · ${cuenta.cercana} cercanas · ${cuenta.difiere} difieren · ${sinReferencia.length} sin referencia oficial`);
if (vencidas.length) console.log(`Referencias oficiales para actualizar: ${vencidas.length} (ver evaluacion.md)`);
