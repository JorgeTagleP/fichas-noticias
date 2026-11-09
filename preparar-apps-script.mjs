// =====================================================================
// preparar-apps-script.mjs — Pone al día la versión de Google Workspace
// ---------------------------------------------------------------------
// Qué hace, en palabras simples:
//   La web local (index.html) y las reglas de las conclusiones
//   (conclusiones.mjs) cambian seguido. Este programa copia esos cambios
//   a la carpeta apps-script, para que la versión de Google Workspace
//   muestre lo mismo:
//
//   1. apps-script/Pagina.html: la misma página que index.html, pero
//      pidiendo los datos a la hoja de cálculo (google.script.run) en vez
//      de leer fichas.json y conclusiones.json.
//   2. apps-script/Conclusiones.gs: las reglas de conclusiones.mjs (el
//      bloque «NÚCLEO») más las cifras oficiales de oficiales.json.
//
// Después hay que pegar los dos archivos en el editor de Apps Script
// (reemplazando el contenido anterior) y guardar.
//
// Uso:  node preparar-apps-script.mjs   (actualizar-noticias.cmd ya lo ejecuta)
// =====================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const leer = f => fs.readFileSync(path.join(DIR, f), 'utf8');
const escribir = (f, t) => fs.writeFileSync(path.join(DIR, f), t);

// Reemplaza un trozo que va desde «desde» hasta «hasta» (incluido). Si no lo encuentra,
// se detiene con un aviso: así nunca se genera una página a medias.
function cambiar(texto, desde, hasta, nuevo, nombre) {
  const i = texto.indexOf(desde);
  const j = i < 0 ? -1 : texto.indexOf(hasta, i);
  if (i < 0 || j < 0) throw new Error(`No encontré en index.html el bloque «${nombre}». Revisa si cambió su forma de cargar datos.`);
  return texto.slice(0, i) + nuevo + texto.slice(j + hasta.length);
}

// ---------- 1. Pagina.html ----------
let pag = leer('index.html');
pag = cambiar(pag,
  'const conclPorScript',
  "Mira las fichas en la otra pestaña.</p>'; });",
  `// En Google Workspace las conclusiones se calculan en la hoja (función obtenerConclusiones de Conclusiones.gs).
  new Promise((ok, mal) => google.script.run.withSuccessHandler(s => ok(JSON.parse(s))).withFailureHandler(mal).obtenerConclusiones())
    .then(pintarConcl)
    .catch(() => { $('v-concl').innerHTML = '<p class="vacio">Todavía no hay conclusiones para esta lectura. Mira las fichas en la otra pestaña; si sigue igual, revisa que el archivo Conclusiones.gs esté pegado en Apps Script.</p>'; });`,
  'carga de conclusiones');
pag = cambiar(pag,
  '// En la web se lee fichas.json',
  "document.head.appendChild(s);\n  });",
  '',
  'lectura local de fichas');
pag = cambiar(pag,
  "const cargar = location.protocol",
  ".catch(porScript);",
  `// En Google Workspace los datos se piden a la hoja de cálculo (función obtenerFichas de Codigo.gs).
  const cargar = new Promise((ok, mal) => google.script.run.withSuccessHandler(s => ok(JSON.parse(s))).withFailureHandler(mal).obtenerFichas());`,
  'carga de fichas');
// La actualización automática de la web pregunta al servidor por fichas.json; en Workspace no aplica.
pag = cambiar(pag, '// Actualización automática (sin F5)', "document.addEventListener('visibilitychange', () => { if (!document.hidden) revisar(); });\n  }", '', 'actualización automática');
pag = pag.replace('Se actualiza sola cada hora, sin recargar la página.', 'Se actualiza cada hora.');
pag = pag.replace('si sigue igual, hay que publicar de nuevo fichas.json.', 'si sigue igual, revisa que la pestaña Fichas exista y que instalar() se haya ejecutado.');
if (/fetch\(|fichas\.js|conclusiones\.js/.test(pag)) throw new Error('Pagina.html todavía intenta leer archivos locales.');
escribir('apps-script/Pagina.html', pag);

// ---------- 2. Conclusiones.gs ----------
const fuente = leer('conclusiones.mjs');
const m = fuente.match(/\/\/ ===== NÚCLEO \(inicio\) =====[\s\S]*?\/\/ ===== NÚCLEO \(fin\) =====/);
if (!m) throw new Error('No encontré el bloque NÚCLEO en conclusiones.mjs.');
const oficiales = JSON.parse(leer('oficiales.json'));
const gs = `/**
 * Una Sola Fuerza – Conclusiones para la emergencia (versión Google Workspace)
 *
 * NO EDITAR AQUÍ: este archivo lo genera preparar-apps-script.mjs a partir de
 * conclusiones.mjs y oficiales.json (${new Date().toISOString().slice(0, 10)}).
 * Para cambiar una regla, se cambia conclusiones.mjs y se vuelve a preparar.
 *
 * Qué hace: toma las fichas de la pestaña Fichas y arma la pestaña
 * «Conclusiones para la emergencia» de la web: dónde hay más peligro para las
 * personas, qué hacer, salud, brechas, pronóstico y proyectos.
 * La sección «Calidad de las cifras» solo existe en la versión local
 * (necesita evaluar.mjs); aquí no se muestra.
 */

// Cifras oficiales de referencia (copiadas de oficiales.json; se citan, no se reinterpretan).
const OFICIALES = ${JSON.stringify(oficiales, null, 1)};

/** La web la llama para pintar la pestaña de conclusiones. */
function obtenerConclusiones() {
  const datos = JSON.parse(obtenerFichas());
  return JSON.stringify(calcularConclusiones(datos, null, OFICIALES));
}

${m[0]}
`;
escribir('apps-script/Conclusiones.gs', gs);

console.log('Apps Script preparado: Pagina.html y Conclusiones.gs (pegar ambos en el editor de Apps Script).');
