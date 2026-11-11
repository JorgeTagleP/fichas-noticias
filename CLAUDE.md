# Fichas de noticias del norte: indicación permanente de mejora continua

Esta indicación vale para cualquier sesión o rutina que trabaje en este repositorio
(la rutina diaria en la nube incluida). Página: https://jorgetaglep.github.io/fichas-noticias/

## 1. Reglas que no se tocan
- Lo oficial se cita, no se reinterpreta: fuente, fecha y enlace en cada cifra.
- Las noticias entran sin niveles ni calificaciones, tal como las publicó cada medio.
- La pestaña «Personas afectadas» solo usa cifras del INDECI-COEN; nunca se mezcla con la prensa.
- Nunca se usan contraseñas ni se publican correos personales. Commits como JorgeTagleP
  (199572888+JorgeTagleP@users.noreply.github.com).
- Los mapas usan OpenStreetMap (sin Google Maps, sin claves ni cookies). En el mapa del INDECI,
  afectados y damnificados se muestran por separado, nunca sumados; el mapa de noticias es prensa
  y va separado del INDECI (`mapa.mjs`, `limites-norte.json`; ver COMO-FUNCIONA.md, «Mapas»).
- Si una mejora choca con una de estas reglas, no se hace y se anota en MEJORAS.md el porqué.

## 2. Control de salud en cada lectura
Hecho en `salud.mjs` (paso «Control de salud» de `lectura.yml`). La página lo muestra al pie y,
si hay alertas o la última lectura tiene más de 3 horas, en un recuadro arriba con «Datos al…».
Con alerta se abre un solo issue «Alerta de la lectura de noticias» (GitHub avisa por correo) y se
cierra solo cuando una lectura sale bien.
- `salud.json`, visible al pie de la página: hora de la última lectura buena de noticias y del INDECI;
  cantidad de noticias, reportes del INDECI y distritos, comparada con la lectura anterior.
- Alerta si: no hubo lectura en 3 horas; el INDECI falló 3 veces seguidas (ENOTFOUND, HTTP o el
  nombre del cortafuegos `portal.indeci.gob.pe.P8853039083.fortiwebcloud.net` cambió); alguna cifra
  cayó más de 50 % de golpe; o un JSON salió vacío o inválido.
- Con alerta se conservan los datos anteriores y la página dice «datos al <hora>».

## 3. Pruebas antes de publicar (carpeta `pruebas/`)
Hecho: `node pruebas/correr.mjs` corre en cada lectura antes de leer; si falla, no se publica.
- `pruebas/casos-conclusiones.json`: titulares ya corregidos (de MEJORAS.md) y lo que se espera de cada uno.
- `pruebas/indeci/`: 7 PDF del INDECI verificados a mano y `esperado.json`. Solo se comparan en Linux.
- Las reglas de lectura del INDECI están en `indeci-tablas.mjs` (funciones puras, sin red).
- Mapas: cada distrito de `distritos.json` se encuentra por su nombre y tiene límite, y los nombres
  que el INDECI escribe distinto caen en su distrito (incluidos los homónimos, como Salitral).
- Un juego de PDF del INDECI y de noticias ya verificados a mano, con su resultado esperado.
- Toda modificación de `afectados.mjs`, `lector.mjs` o `conclusiones.mjs` debe pasar esas pruebas;
  si falla una, no se publica y queda la versión anterior.
- Cada error nuevo que se encuentre se convierte en una prueba más.
- Las cifras válidas del INDECI son las del pdftotext de Ubuntu (GitHub Actions), no las de Windows.

## 4. Mejora diaria con evidencia
- Como máximo una o dos mejoras pequeñas por día, cada una con: qué problema real resuelve,
  qué dato lo demuestra y cómo se revierte.
- Prioridad: 1) que no se pierdan datos oficiales, 2) que la cifra sea correcta y citada,
  3) que se lea bien en el celular, 4) lo demás.

## 5. Respaldo semanal
Hecho en `.github/workflows/respaldo.yml` (domingos 08:00 de Lima, o «Run workflow»).
- Los domingos se genera un `git bundle` de `main` y `datos` y se guarda como Release del
  repositorio, conservando las últimas 8 semanas.

## 6. Informe
- Al final de cada día, un resumen en MEJORAS.md: qué se cambió, qué alertas hubo, qué cifras
  oficiales coincidieron o difirieron, cuántas visitas hubo y qué queda pendiente para una persona.

## 7. Visitas a la página
Hecho: contador en `index.html`. El tablero y el total al pie necesitan que el dueño active en
GoatCounter «Allow public access to the dashboard» y «Allow adding visitor counts on your website».
- La página lleva el contador de GoatCounter (sin cookies, sin datos personales, sin IP guardadas).
  No se usa Google Analytics ni nada que rastree a las personas.
- Tablero: https://fichas-norte.goatcounter.com (acceso público de solo lectura, si el dueño lo activó).
  Muestra visitas por día, país, celular o computadora, de dónde llegaron y qué pestañas abren.
- Al pie de la página: enlace «¿Quién la consulta? Ver las visitas» y el total de visitas.
- Cada cambio de pestaña se cuenta como evento (`pestaña-concl`, `pestaña-afect`, `pestaña-fichas`),
  no como visita; la actualización automática de cada 5 minutos no cuenta visitas.
- Si una pestaña casi no se consulta, se anota como pista para mejorarla, no para quitarla.
- Nunca se intenta identificar a una persona concreta que visita la página.
