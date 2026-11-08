// resumen-dia.mjs — escribe estado.json: un resumen corto de la última lectura
// (día, fichas, fuentes y lugares en prioridad crítica). Lo usa la lectura en
// GitHub para guardar una línea por día y que GitHub no pause el reloj.
import fs from 'node:fs';
const f = JSON.parse(fs.readFileSync('fichas.json', 'utf8'));
const c = JSON.parse(fs.readFileSync('conclusiones.json', 'utf8'));
const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(f.generado));
fs.writeFileSync('estado.json', JSON.stringify({
  dia, fichas: f.total, fuentes: f.fuentesConsultadas,
  criticos: c.prioridad.filter(r => r.prioridad === 'Crítica').map(r => `${r.nombre} (${r.departamento})`),
}, null, 1) + '\n');
console.log('estado.json:', dia, f.total, 'fichas');
