// =====================================================================================
//  indeci-tablas.mjs — lectura de los reportes del COEN-INDECI (funciones puras)
// =====================================================================================
//  Aquí están las reglas que convierten el nombre y el texto de cada PDF en filas de
//  personas. No descargan nada ni escriben archivos: así se pueden probar con los PDF
//  guardados en pruebas/indeci (node pruebas/correr.mjs). Las usa afectados.mjs.
//  Regla del proyecto: lo oficial se cita, no se reinterpreta.
// =====================================================================================

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
      // Empieza otra tabla (daños materiales: vías en metros, cultivos…): ya no son personas.
      if (empezo && /DAÑOS MATERIALES|INFRAESTRUCTURA|SERVICIOS B[ÁA]SICOS/.test(l)) break;
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
// Departamento de una fila: si la tabla dice un departamento y el título otro, y el título
// nombra a ese distrito, vale el del título (pasó con Quilahuani, Tacna, anotado «DPTO ÁNCASH»).
function depDeFila(f, titulo) {
  let dep = departamento(f.dep, titulo);
  const depTit = departamento('', titulo);
  if (depTit !== dep && DEPS.includes(depTit) && sinTilde(titulo).includes(sinTilde(f.dist))) dep = depTit;
  return dep;
}

export { SI, TIPOS, MESES, MESES_LARGO, dos, limpiar, nombre, delArchivo, corteDe, leerTabla, leerTexto, DEPS, sinTilde, departamento, depDeFila };
