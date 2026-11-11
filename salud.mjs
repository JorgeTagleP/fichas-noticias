// =====================================================================================
//  salud.mjs — control de salud de cada lectura
// =====================================================================================
//  Corre en GitHub después de leer noticias e INDECI y antes de publicar. Compara esta
//  lectura con la anterior (guardada en la rama «datos», que el flujo deja en prev/):
//
//    • Si fichas.json o afectados.json salieron vacíos, dañados, con una cifra que cayó
//      más de 50 % de golpe, o rompen una regla del proyecto (noticias con niveles,
//      cifras de personas que no vienen del INDECI), se vuelve a poner la versión
//      anterior y se publica esa: nunca se reemplaza un dato bueno por uno malo.
//    • Si el portal del INDECI falló 3 lecturas seguidas, se avisa (puede haber cambiado
//      el nombre de su cortafuegos o su dirección).
//
//  Escribe salud.json, que la página muestra al pie («datos al…» y las alertas), y
//  escribe las alertas en el registro de GitHub Actions.
//  Uso: node salud.mjs [carpeta de la lectura anterior, por defecto prev]
// =====================================================================================

import fs from 'node:fs';
import path from 'node:path';

const PREV = process.argv[2] || 'prev';
const AHORA = new Date();
const INICIO = process.env.INICIO_LECTURA ? new Date(process.env.INICIO_LECTURA) : new Date(AHORA - 30 * 60e3);
const alertas = [];
const avisos = [];

const leer = (f) => { try { const j = JSON.parse(fs.readFileSync(f, 'utf8')); return j && typeof j === 'object' ? j : null; } catch { return null; } };
const restaurar = (archivo, motivo) => {
  const anterior = path.join(PREV, archivo);
  if (fs.existsSync(anterior) && leer(anterior)) {
    fs.copyFileSync(anterior, archivo);
    alertas.push(`${motivo} Se publica la versión anterior de ${archivo}.`);
    return true;
  }
  alertas.push(`${motivo} No hay versión anterior de ${archivo} para reponer.`);
  return false;
};
const cayo = (ahora, antes) => antes > 0 && ahora < antes * 0.5;

const saludPrev = leer(path.join(PREV, 'salud.json')) || {};

// ---------- Noticias ----------
let fichas = leer('fichas.json');
const fichasPrev = leer(path.join(PREV, 'fichas.json'));
let noticiasOk = true;
if (!fichas || !Array.isArray(fichas.fichas) || !fichas.fichas.length) {
  noticiasOk = false;
  if (restaurar('fichas.json', 'Las noticias salieron vacías o dañadas.')) { restaurar('conclusiones.json', 'Las conclusiones dependen de esas noticias.'); fichas = leer('fichas.json'); }
} else if (fichasPrev && cayo(fichas.fichas.length, fichasPrev.fichas.length)) {
  noticiasOk = false;
  if (restaurar('fichas.json', `Las noticias cayeron de ${fichasPrev.fichas.length} a ${fichas.fichas.length} (más de 50 %).`)) { restaurar('conclusiones.json', 'Las conclusiones dependen de esas noticias.'); fichas = leer('fichas.json'); }
} else {
  // Regla del proyecto: las noticias entran tal como las publicó cada medio, sin niveles.
  const conNivel = fichas.fichas.filter(f => ['nivel', 'calificacion', 'calificación', 'confiabilidad', 'verificacion'].some(k => k in f));
  if (conNivel.length) {
    noticiasOk = false;
    if (restaurar('fichas.json', `${conNivel.length} noticias traen un nivel o calificación, y las noticias entran sin niveles.`)) { restaurar('conclusiones.json', 'Las conclusiones dependen de esas noticias.'); fichas = leer('fichas.json'); }
  }
}
if (!leer('conclusiones.json')) restaurar('conclusiones.json', 'Las conclusiones salieron vacías o dañadas.');

// ---------- INDECI ----------
let afect = leer('afectados.json');
const afectPrev = leer(path.join(PREV, 'afectados.json'));
const personas = a => a && a.peru ? (a.peru.damnificados || 0) + (a.peru.afectados || 0) + (a.peru.fallecidos || 0) + (a.peru.heridos || 0) : 0;
const log = fs.existsSync('indeci.log') ? fs.readFileSync('indeci.log', 'utf8').trim().split('\n').pop() : '';
const frescoIndeci = !!(afect && afect.generado && new Date(afect.generado) >= INICIO);
let indeciOk = frescoIndeci;
if (afect && (!Array.isArray(afect.filas) || !afect.peru)) {
  indeciOk = false; restaurar('afectados.json', 'Las cifras del INDECI salieron dañadas.'); afect = leer('afectados.json');
} else if (frescoIndeci && afectPrev && (cayo(afect.filas.length, afectPrev.filas.length) || cayo(personas(afect), personas(afectPrev)))) {
  indeciOk = false;
  restaurar('afectados.json', `Las cifras del INDECI cayeron de golpe (filas ${afectPrev.filas.length} → ${afect.filas.length}; personas ${personas(afectPrev)} → ${personas(afect)}).`);
  afect = leer('afectados.json');
} else if (afect && afect.filas.some(f => !/^https:\/\/portal\.indeci\.gob\.pe\//.test(f.url || ''))) {
  // Regla del proyecto: la pestaña de personas afectadas solo usa reportes del INDECI.
  indeciOk = false; restaurar('afectados.json', 'Hay cifras de personas que no citan un reporte del INDECI.'); afect = leer('afectados.json');
}
const fallasIndeci = indeciOk ? 0 : (saludPrev.indeci?.fallasSeguidas || 0) + 1;
if (!indeciOk && fallasIndeci >= 3) {
  alertas.push(`La lectura del INDECI falló ${fallasIndeci} veces seguidas (${frescoIndeci ? 'cifras rechazadas por el control' : log || 'sin detalle'}). Revisar si cambió el nombre de su cortafuegos (portal.indeci.gob.pe.P8853039083.fortiwebcloud.net) o su dirección.`);
} else if (!frescoIndeci) avisos.push(`El INDECI no respondió en esta lectura (${log || 'sin detalle'}); se muestran sus datos anteriores.`);

// ---------- salud.json ----------
const nf = fichas && Array.isArray(fichas.fichas) ? fichas.fichas.length : 0;
const salud = {
  generado: AHORA.toISOString(),
  estado: alertas.length ? 'alerta' : 'bien',
  alertas, avisos,
  noticias: {
    ok: noticiasOk,
    ultimaBuena: noticiasOk && fichas ? fichas.generado : (saludPrev.noticias?.ultimaBuena || null),
    datosAl: fichas?.generado || null,
    fichas: nf, anterior: fichasPrev?.fichas?.length ?? null,
    fuentes: fichas?.fuentesConsultadas ?? null,
  },
  indeci: {
    ok: indeciOk,
    ultimaBuena: indeciOk ? afect.generado : (saludPrev.indeci?.ultimaBuena || null),
    datosAl: afect?.generado || null,
    reportes: afect?.reportesLeidos ?? null, anterior: afectPrev?.reportesLeidos ?? null,
    distritos: afect?.peru?.distritos ?? null,
    fallasSeguidas: fallasIndeci,
    ultimoMensaje: log,
  },
};
fs.writeFileSync('salud.json', JSON.stringify(salud, null, 1) + '\n');

console.log(`Salud: ${salud.estado} · noticias ${nf} (antes ${salud.noticias.anterior ?? '—'}) · INDECI ${indeciOk ? 'al día' : 'sin respuesta'}, ${salud.indeci.reportes ?? '—'} reportes, ${salud.indeci.distritos ?? '—'} distritos.`);
for (const a of alertas) console.log(`::warning title=Alerta de la lectura::${a}`);
for (const a of avisos) console.log(`::notice title=Aviso de la lectura::${a}`);
