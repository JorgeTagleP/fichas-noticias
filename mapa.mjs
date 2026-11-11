// =====================================================================================
//  mapa.mjs — datos para los mapas de la página (desde el 10/11/2026)
// =====================================================================================
//  Une cada fila del INDECI (afectados.json: departamento + nombre de distrito) con su
//  ubigeo de distritos.json, para pintar el distrito en el mapa. No cambia ninguna cifra:
//  copia las del INDECI tal cual, con su reporte, corte y enlace.
//  También deja el nombre y el punto central de cada distrito, que usa el mapa de noticias
//  (las fichas ya traen el ubigeo del distrito que nombran).
//
//  Uso:  node mapa.mjs        → escribe mapa.json (si falla, la página se publica sin mapa)
//  Límites de los distritos: limites-norte.json (INEI; ver su campo «fuente»).
// =====================================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const NORTE = ['Tumbes', 'Piura', 'Lambayeque', 'Cajamarca'];
export const clave = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

// Índice → ubigeo, con los alias de distritos.json. Dos claves por distrito:
// «departamento|provincia|distrito» y «departamento|distrito». Si dos distritos de un mismo
// departamento se llaman igual (Salitral en Morropón y en Sullana), la segunda queda en null
// y solo vale la que trae la provincia.
export function indice(distritos) {
  const ix = {};
  for (const d of distritos) for (const n of [d.distrito, ...(d.alias || [])]) {
    ix[clave(d.departamento) + '|' + clave(d.provincia) + '|' + clave(n)] = d.ubigeo;
    const k = clave(d.departamento) + '|' + clave(n);
    ix[k] = k in ix && ix[k] !== d.ubigeo ? null : d.ubigeo;
  }
  return ix;
}
export const buscar = (ix, dep, prov, dist) => ix[clave(dep) + '|' + clave(prov) + '|' + clave(dist)] || ix[clave(dep) + '|' + clave(dist)] || null;

// Agrupa las filas del INDECI de los 4 departamentos por ubigeo. Las cifras se copian sin cambio.
export function unir(filas, distritos) {
  const ix = indice(distritos);
  const porUbigeo = {}, sinUbicar = [];
  for (const f of filas) {
    if (!NORTE.includes(f.dep)) continue;
    const u = buscar(ix, f.dep, f.prov, f.dist);
    if (!u) { sinUbicar.push(`${f.dep} – ${f.prov ? f.prov + ' – ' : ''}${f.dist}`); continue; }
    const o = porUbigeo[u] ??= { damnificados: 0, afectados: 0, fallecidos: 0, heridos: 0, filas: [] };
    for (const k of ['damnificados', 'afectados', 'fallecidos', 'heridos']) o[k] += f[k] || 0;
    o.filas.push({ fenomeno: f.fenomeno, damnificados: f.damnificados || 0, afectados: f.afectados || 0,
      fallecidos: f.fallecidos || 0, aprox: !!f.aprox, corte: f.corte, reporte: f.reporte, url: f.url });
  }
  return { porUbigeo, sinUbicar };
}

function main() {
  const RAIZ = path.dirname(fileURLToPath(import.meta.url));
  const leer = a => JSON.parse(fs.readFileSync(path.join(RAIZ, a), 'utf8'));
  const distritos = leer('distritos.json');
  let A = null;
  try { A = leer('afectados.json'); } catch { console.log('Sin afectados.json: el mapa del INDECI queda vacío.'); }
  const { porUbigeo, sinUbicar } = A ? unir(A.filas, distritos) : { porUbigeo: {}, sinUbicar: [] };
  const out = {
    generado: new Date().toISOString(),
    indeci: A ? { generado: A.generado, desde: A.desde, ultimoReporte: A.ultimoReporte, fuente: A.fuente, distritos: porUbigeo, sinUbicar } : null,
    distritos: Object.fromEntries(distritos.map(d => [d.ubigeo, { n: d.distrito, p: d.provincia, d: d.departamento, c: [+d.lat.toFixed(4), +d.lon.toFixed(4)] }])),
  };
  fs.writeFileSync(path.join(RAIZ, 'mapa.json'), JSON.stringify(out));
  console.log(`Mapa: ${Object.keys(porUbigeo).length} distritos con reportes del INDECI${sinUbicar.length ? `; sin ubicar: ${sinUbicar.join(', ')}` : ''}.`);
  if (sinUbicar.length) console.log(`::warning::Mapa: ${sinUbicar.length} filas del INDECI sin distrito en distritos.json (${sinUbicar.join(', ')}). Agregar el alias en distritos.json.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
