# Fichas de noticias del norte: indicación permanente de mejora continua

Esta indicación vale para cualquier sesión o rutina que trabaje en este repositorio
(la rutina diaria en la nube incluida). Página: https://jorgetaglep.github.io/fichas-noticias/

## 1. Reglas que no se tocan
- Lo oficial se cita, no se reinterpreta: fuente, fecha y enlace en cada cifra.
- Las noticias entran sin niveles ni calificaciones, tal como las publicó cada medio.
- La pestaña «Personas afectadas» solo usa cifras del INDECI-COEN; nunca se mezcla con la prensa.
- Nunca se usan contraseñas ni se publican correos personales. Commits como JorgeTagleP
  (199572888+JorgeTagleP@users.noreply.github.com).
- Si una mejora choca con una de estas reglas, no se hace y se anota en MEJORAS.md el porqué.

## 2. Control de salud en cada lectura
- `salud.json`, visible al pie de la página: hora de la última lectura buena de noticias y del INDECI;
  cantidad de noticias, reportes del INDECI y distritos, comparada con la lectura anterior.
- Alerta si: no hubo lectura en 3 horas; el INDECI falló 3 veces seguidas (ENOTFOUND, HTTP o el
  nombre del cortafuegos `portal.indeci.gob.pe.P8853039083.fortiwebcloud.net` cambió); alguna cifra
  cayó más de 50 % de golpe; o un JSON salió vacío o inválido.
- Con alerta se conservan los datos anteriores y la página dice «datos al <hora>».

## 3. Pruebas antes de publicar (carpeta `pruebas/`)
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
- Los domingos se genera un `git bundle` de `main` y `datos` y se guarda como Release del
  repositorio, conservando las últimas 8 semanas.

## 6. Informe
- Al final de cada día, un resumen en MEJORAS.md: qué se cambió, qué alertas hubo, qué cifras
  oficiales coincidieron o difirieron, cuántas visitas hubo y qué queda pendiente para una persona.

## 7. Visitas a la página
- La página lleva el contador de GoatCounter (sin cookies, sin datos personales, sin IP guardadas).
  No se usa Google Analytics ni nada que rastree a las personas.
- Tablero: https://fichas-norte.goatcounter.com (acceso público de solo lectura, si el dueño lo activó).
  Muestra visitas por día, país, celular o computadora, de dónde llegaron y qué pestañas abren.
- Al pie de la página: enlace «¿Quién la consulta? Ver las visitas» y el total de visitas.
- Cada cambio de pestaña se cuenta como evento (`pestaña-concl`, `pestaña-afect`, `pestaña-fichas`),
  no como visita; la actualización automática de cada 5 minutos no cuenta visitas.
- Si una pestaña casi no se consulta, se anota como pista para mejorarla, no para quitarla.
- Nunca se intenta identificar a una persona concreta que visita la página.
