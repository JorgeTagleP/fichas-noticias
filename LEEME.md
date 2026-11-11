# Fichas de noticias – Tumbes, Piura, Lambayeque, Cajamarca, La Libertad, Áncash y Lima

Lee noticias sobre los siete departamentos, crea una ficha por noticia y las muestra en una web
con filtros por departamento, provincia, distrito, fecha y tema (se pueden combinar), agrupadas por
día, departamento, provincia o distrito.

Las noticias entran **tal como las publicó cada medio**, sin niveles ni calificaciones: así nadie puede
bajarlas o subirlas de nivel con otra intención. Son lo que dice la prensa, no datos oficiales.

Para una explicación sin términos técnicos, ver **[COMO-FUNCIONA.md](COMO-FUNCIONA.md)**.

## Archivos

| Archivo | Para qué |
| --- | --- |
| `lector.mjs` | Lector local (Node 18+): `node lector.mjs` → genera `fichas.json` |
| `distritos.json` | Los 665 distritos de los 7 departamentos (ubigeo INEI, alias = capital del distrito) |
| `fichas.json` | Fichas generadas en la última lectura |
| `ver-fichas.html` | **Para abrir en la computadora con doble clic**: la web con los datos adentro (la regenera `lector.mjs`) |
| `fichas.js` | Copia de los datos para abrir `index.html` como archivo local |
| `index.html` | La web (publicada como artifact: https://claude.ai/artifact/6kj6f4Yu7MSezU37c1DpGc) |
| `oficiales.json` | Cifras oficiales de referencia (INDECI, SENAMHI, MINSA, El Peruano) con fuente y fecha de corte |
| `evaluar.mjs` | Bucle de evaluación: `node evaluar.mjs` compara las cifras de los titulares con las oficiales → `evaluacion.md` y `evaluacion.json` |
| `conclusiones.mjs` | Conclusiones para la emergencia: `node conclusiones.mjs` → `conclusiones.json` (pestaña de la web), `conclusiones.js` y `conclusiones.md` |
| `preparar-apps-script.mjs` | Copia la página y las reglas de las conclusiones a `apps-script/` (`Pagina.html` y `Conclusiones.gs`) |
| `MEJORAS.md` | Registro de los ajustes que la tarea horaria hace a las reglas de las conclusiones |
| `radios_candidatas.json` | Radios y medios locales evaluados (con o sin RSS verificado) |
| `apps-script/` | Versión para Google Workspace: corre sola cada 6 horas |

## Versión Google Workspace (recomendada para operar)

1. Crear una hoja de cálculo «USF – Noticias» en la unidad compartida.
2. Pestaña **Distritos**: Archivo › Importar › `apps-script/distritos.csv`.
3. Pestaña **Fuentes**: importar `apps-script/fuentes.csv` y agregar las radios con RSS verificado
   (columnas: medio, via = «RSS de la radio», departamento, url del feed, tipo, activa = SI).
4. Extensiones › Apps Script: pegar `Codigo.gs`, crear un archivo de script llamado `Conclusiones` con
   `Conclusiones.gs` y un archivo HTML llamado `Pagina` con `Pagina.html`.
5. Ejecutar `instalar()` una vez (autoriza permisos, crea la pestaña Fichas y el activador cada 6 h).
6. Implementar › Nueva implementación › Aplicación web › Ejecutar como «yo» ›
   Acceso «cualquier persona de la organización». Esa URL es la web.

La web tiene las mismas dos pestañas que la versión local: «Conclusiones para la emergencia»
(se calcula en la hoja cada vez que se abre) y «Todas las fichas». La sección «Calidad de las
cifras» solo está en la versión local, porque necesita `evaluar.mjs`.

**Para ponerla al día** después de un cambio en la página o en las reglas: ejecutar
`node preparar-apps-script.mjs` (o `actualizar-noticias.cmd`) y volver a pegar `Pagina.html` y
`Conclusiones.gs` en el editor de Apps Script. `Conclusiones.gs` no se edita a mano.

En la pestaña **Fichas** se puede escribir una nota del curador, que la web muestra debajo del titular.
Las noticias no llevan nivel; la columna 13 (antes `verificacion`) queda vacía.

## Cómo se ubica cada noticia

- Se buscan en el titular los nombres de los 665 distritos y de sus capitales.
- Un nombre que solo aparece dentro de otro más largo no cuenta aparte («San Juan de Lurigancho» no es también Lurigancho).
- Los nombres ambiguos (Jesús, San Juan, La Unión, Santa Cruz, Castilla…) solo cuentan si el titular
  nombra también la provincia o el departamento.
- Si el mismo nombre existe en dos provincias, queda el de la provincia nombrada, la capital provincial
  o, si no, el de Lima Metropolitana («Miraflores» solo es el de Lima, no el de Yauyos).
- «Piura», «Tumbes», «Cajamarca», «Lambayeque», «La Libertad», «Áncash» o «Lima» solos se registran a nivel departamento
  (por eso las noticias de la ciudad de Lambayeque quedan sin distrito; la capital es Chiclayo).
- Si el titular no nombra ningún lugar, la ficha queda con el departamento de la búsqueda
  («por búsqueda») y sin distrito. Lima y La Libertad son la excepción: como en Lima está la prensa
  nacional, y la búsqueda «La Libertad» trae «libertad de prensa» de todo el mundo, una noticia solo
  queda en ellas si el titular las nombra o nombra uno de sus lugares.
- «La Libertad» cuenta como departamento solo con mayúscula y fuera de frases comunes («libertad de
  prensa», «privados de su libertad», «La Libertad Avanza»). Si el titular la nombra como departamento,
  no se marca el distrito La Libertad de Huaraz (Áncash).

## Límites conocidos

- Google Noticias entrega hasta ~100 resultados por búsqueda; por eso se busca también por provincia.
- Se guarda solo titular, enlace y metadatos (derechos de autor); el texto está en el medio.
- Radios sin web o que solo publican en Facebook no entran por esta vía.
