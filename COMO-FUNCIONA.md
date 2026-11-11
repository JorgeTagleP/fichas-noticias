# Cómo funciona el lector de noticias

Esta guía explica, sin necesidad de saber programar, qué hace el programa `lector.mjs`,
cómo se usa y cómo hacer los cambios más comunes. El propio archivo `lector.mjs` también
trae explicaciones línea por línea (son las líneas que empiezan con `//`).

## La idea en una frase

El programa hace en unos segundos lo que una persona haría en una mañana entera: revisa
unas 46 fuentes de noticias, se queda con las que hablan de Tumbes, Piura, Lambayeque y Cajamarca, y
arma con cada una una **ficha** ordenada que luego se ve en la página web.

## El recorrido de una noticia

```
  INTERNET                         EL PROGRAMA                              RESULTADO
┌──────────────────┐   ┌──────────────────────────────────────────┐   ┌─────────────────┐
│ Google Noticias  │──▶│ 1. Busca en 46 fuentes                    │   │ fichas.json     │
│ (31 búsquedas)   │   │ 2. Copia titular, medio, fecha y enlace   │   │ fichas.js       │──▶ Página web
│                  │   │ 3. Reconoce el lugar (distrito…)          │──▶│ ver-fichas.html │
│ 15 radios y      │──▶│ 4. Le pone un tema                        │   └─────────────────┘
│ canales locales  │   │ 5. Quita repetidas y guarda las fichas    │
└──────────────────┘   └──────────────────────────────────────────┘
```

**Ejemplo real** (lectura del 07/11/2026). Llega este titular de Noticias Piura 3.0:

> *Piura: Lluvias ocasionan cortes de luz en Castilla y Sullana*

| Paso | Lo que hace el programa | Resultado |
| --- | --- | --- |
| 2 | Copia titular, medio, fecha y enlace | Noticias Piura 3.0, 19/10/2026 |
| 3 | Encuentra "Castilla". Como hay otra Castilla en Arequipa, verifica que el titular diga también "Piura": sí lo dice. Encuentra además "Sullana" | Piura › Piura › **Castilla** y Piura › Sullana › **Sullana** |
| 4 | Revisa los temas en orden: no hay palabras de Emergencias, pero "lluvias" coincide con Lluvias y clima | **Lluvias y clima** |
| 5 | Le da un código | `USF-N-261019-0599` |

La ficha aparece en la página tanto al filtrar por Castilla como por Sullana. El número
final del código (0599) es el orden dentro de esa lectura, así que puede cambiar en la
siguiente.

## Palabras que conviene conocer

| Palabra | Qué significa aquí |
| --- | --- |
| **RSS** | Una lista que publican los sitios de noticias para que otros programas la lean. Es como el índice de un periódico: titulares, fechas y enlaces, sin el texto completo. |
| **Fuente** | Cada lugar de donde se leen noticias: una búsqueda de Google Noticias o el RSS de una radio. |
| **Ficha** | El registro ordenado de una noticia: código, fecha, titular, medio, lugar y tema. |
| **Ubigeo** | El código oficial del INEI para cada distrito del Perú (por ejemplo 200104 = Castilla, Piura). |
| **Alias** | Otro nombre con que se reconoce a un distrito, normalmente el de su capital (Talara para Pariñas). |
| **Nombre ambiguo** | Un distrito que se llama como una palabra común, una persona o un lugar de otra región (Jesús, Jorge Chávez, Castilla). Solo cuenta si el titular nombra también su provincia o departamento. |
| **Sin niveles** | Las noticias entran tal como las publicó cada medio, sin calificarlas: es lo que dice la prensa, no un hecho confirmado. Desde el 08/11/2026 no se les pone nivel, para que nadie las baje o suba de nivel con otra intención. |
| **Node** | El programa que permite ejecutar `lector.mjs` en la computadora. |
| **Terminal** | La ventana donde se escriben órdenes (en Windows, PowerShell). |

## Cómo se usa

**Opción fácil:** doble clic en `actualizar-noticias.cmd`, en la carpeta `UNASOLAFUERZA`.
Lee las noticias y abre la página con las fichas.

**Desde la terminal:** hay que estar **dentro** de la carpeta `fichas-noticias`:

```
cd "C:\Users\Jorge Tagle\proyectos\UNASOLAFUERZA\fichas-noticias"
node lector.mjs
```

Al terminar muestra un resumen como este:

```
Fuentes: 46 · Leídas: 1208 · Fichas: 902 (Tumbes: 212 · Piura: 367 · Cajamarca: 211 · Lambayeque: 150)
Con distrito: 376 · Emergencias: 219 · Lluvias y clima: 213
```

- **Leídas:** todas las noticias recibidas, incluidas las repetidas.
- **Fichas:** las que quedaron tras quitar repetidas y las de otros lugares.
- **Con distrito:** las que nombran un distrito concreto; el resto queda a nivel provincia o departamento.

## Cambios comunes (sin saber programar)

**Agregar una radio.** Abrir `radios_candidatas.json` y copiar el bloque de otra radio,
cambiando nombre, departamento y la dirección de su RSS (suele ser el sitio + `/feed/`).
Poner `"rss_verificado": true` solo después de abrir esa dirección en el navegador y ver
que muestra noticias recientes.

**Agregar una palabra a un tema.** En `lector.mjs`, buscar la lista `TEMAS` y escribir la
palabra dentro de las barras `/ … /` del tema, separada con `|`. Por ejemplo, para que
"socavón" cuente como emergencia: `…|interrumpid|socav[oó]n/i`.

**Marcar un nombre como ambiguo.** Si aparecen fichas mal ubicadas (por ejemplo una
noticia de una persona apellidada como un distrito), agregar el nombre a la lista
`AMBIGUOS`, en minúsculas y sin tildes: `'nombre del distrito',`.

**Cambiar cuántos días hacia atrás se busca.** En `lector.mjs`, cambiar `const DIAS = 30;`.

Después de cualquier cambio, ejecutar de nuevo el lector. Si muestra un error rojo,
probablemente falta una coma o una comilla en lo que se editó.

## Problemas frecuentes

| Mensaje o síntoma | Causa | Solución |
| --- | --- | --- |
| `Cannot find module … lector.mjs` / `MODULE_NOT_FOUND` | Se ejecutó desde otra carpeta | Entrar primero a `fichas-noticias` (ver arriba) o usar `actualizar-noticias.cmd` |
| `node` no se reconoce como comando | Node no está instalado | Instalarlo desde nodejs.org (versión LTS) |
| Fichas: 0 | Sin internet, o Google bloqueó temporalmente | Revisar la conexión y probar más tarde |
| Una radio deja de aparecer | Su sitio está caído o cambió la dirección del RSS | Abrir su RSS en el navegador; si no funciona, poner `rss_verificado` en `false` |
| La página abierta desde la computadora sale vacía | Se abrió `index.html` sin `fichas.js` al lado | Abrir `ver-fichas.html`, que trae los datos adentro |

## Bucle de evaluación (en cada lectura)

Después de leer las noticias, `evaluar.mjs` busca en los titulares cifras como «324 damnificados»
o «18 fallecidos por dengue» y las compara con las cifras oficiales guardadas en `oficiales.json`
(INDECI, SENAMHI, MINSA, El Peruano). El resultado queda en `evaluacion.md`:

| Resultado | Qué significa |
| --- | --- |
| **Coincide** | La cifra del titular está a menos de 5 % de la oficial |
| **Cercana** | Entre 5 % y 25 % de diferencia (puede ser otra fecha de corte) |
| **Difiere** | Más de 25 %: revisar antes de difundir |
| **Sin referencia oficial** | No hay todavía una cifra oficial con qué compararla |

Cada vez que se actualizan las noticias, también hay que revisar `oficiales.json`: el informe avisa
qué referencias tienen más de 7 días o no tienen fecha. Para cambiar una, se edita su `valor`,
`corte` (fecha) y `url`. Las cifras oficiales se copian tal como las publica la entidad.

La evaluación **no** cambia ni califica las noticias: entran tal como están escritas.

## Conclusiones para la emergencia (en cada lectura)

`conclusiones.mjs` lee todas las fichas y arma la pestaña **«Conclusiones para la emergencia»**
de la página, y también el archivo `conclusiones.md`:

| Sección | Qué responde |
| --- | --- |
| Lo más importante ahora | Frases cortas: dónde está el mayor peligro, quién puede quedar aislado, qué enfermedad sube |
| Prioridad para salvar vidas | Lugares ordenados por señales de peligro (aislamiento, desborde, huaicos, damnificados, muertes, inundación, rayos), con qué hacer en cada uno |
| Brechas en la atención | Albergues sin condiciones, hospitales que fallan, ayuda que no llega |
| Salud | Noticias de dengue, leptospirosis y agua, junto a la cifra oficial |
| Pronóstico | Lo último de SENAMHI, INDECI y COEN en las noticias |
| Proyectos para el futuro | Obras que reducirían el daño y su estado: pedida, en curso, atrasada o en conflicto |
| Calidad de las cifras | Lo que coincide o difiere con lo oficial |

**Cómo se calcula la prioridad.** Cada señal tiene un peso: una muerte pesa 10, un aislamiento
o un desborde 8 y una inundación urbana 4. Las noticias de los últimos 2 días cuentan el doble
que las de la semana y seis veces más que las antiguas. Una señal solo cuenta si el titular
habla de lluvias, ríos, salud o la emergencia; así no se cuentan crímenes ni accidentes.

**Mejora permanente.** La tarea que corre cada hora revisa las conclusiones y, si encuentra
un error, ajusta las reglas de `conclusiones.mjs`. Por ejemplo, un lugar de otra región con el
mismo nombre o una señal que no se detectó. Cada ajuste queda anotado en `MEJORAS.md`.

Para corregirlo a mano:
- **Una noticia que no es de la zona:** agregar la palabra a `FUERA_DE_ZONA`, en minúsculas y sin tildes.
- **Una palabra de peligro que falta:** agregarla al `re` de la señal que corresponda en `SENALES`.

## Mejora continua (desde el 10/11/2026)

El sistema se vigila a sí mismo. Los criterios completos están en [CLAUDE.md](CLAUDE.md) y en el
documento Word (capítulo 3.7, fase 7 y secciones 5.10 a 5.14 del manual).

- **Pruebas antes de publicar** (`node pruebas/correr.mjs`): antes de cada lectura se revisan los
  titulares que ya se corrigieron (de esta misma lista de mejoras) y 7 reportes del INDECI
  verificados a mano. Si una regla nueva rompe uno de ellos, la lectura se detiene y la página sigue
  como estaba. Cada vez que se corrige un error, su titular se agrega a
  `pruebas/casos-conclusiones.json`. Si una prueba falla, se corrige la regla, no la prueba.
- **Control de salud** (`salud.mjs`): después de leer, compara con la lectura anterior. Si algo
  salió vacío, dañado, cayó más de 50 % de golpe o rompe una regla del proyecto, publica la versión
  anterior. Al pie de la página se ve el estado de la lectura; si hay un problema, aparece arriba un
  recuadro rojo «Datos al…».
- **Aviso por correo:** con una alerta, GitHub abre el aviso «Alerta de la lectura de noticias» y
  manda un correo al dueño del repositorio. Se cierra solo cuando una lectura sale bien.
- **Respaldo semanal:** cada domingo a las 08:00 se guarda una copia completa en la pestaña
  Releases del repositorio (últimas 8 semanas).
- **Visitas:** se cuentan con GoatCounter, sin cookies ni datos personales
  (https://fichas-norte.goatcounter.com).

## Mapas (desde el 10/11/2026)

La página tiene tres mapas. Usan Leaflet con el mapa libre de OpenStreetMap, no Google Maps: no
necesitan clave ni cuenta, no ponen cookies y no rastrean a quien visita la página.

- **Mapa del norte (pestaña «Personas afectadas»):** cada distrito de Tumbes, Piura, Lambayeque y
  Cajamarca se colorea con los afectados del INDECI. Los damnificados (grupo distinto, nunca
  se suman) aparecen en el rótulo al pasar el cursor y en el detalle. Al tocar un distrito se ve cada reporte con su fenómeno, corte y enlace.
- **Imagen para Word:** el botón «Descargar como imagen (para Word)» baja ese mismo mapa como PNG,
  con título, leyenda, los distritos con más personas, la fuente y la fecha de la lectura.
- **Mapa de las noticias (pestaña «Todas las fichas», enlace «Ver en el mapa»):** un círculo por
  distrito, más grande cuantas más fichas lo nombran. Respeta los filtros de arriba (tema, fechas,
  departamento…): por ejemplo, con el tema «Lluvias y clima» se ven solo esas noticias. Es prensa,
  no cifras oficiales, y va separado del INDECI.

De dónde salen los datos:
- `mapa.mjs` corre en cada lectura, después del control de salud. Une cada fila del INDECI con su
  distrito de `distritos.json` (por departamento, provincia y nombre, aunque venga sin tilde) y
  escribe `mapa.json`. Si una fila no se puede ubicar, la lectura muestra un aviso en GitHub y el
  pie del mapa la nombra; se corrige agregando el alias en `distritos.json`.
- `limites-norte.json`: límites de los 243 distritos (INEI, copia simplificada). Faltan
  Veintiséis de Octubre (Piura, creado después) y Bellavista (Sullana); esos dos no se colorean.
- `rios-norte.json`: 24 ríos principales (Tumbes, Zarumilla, Chira, Piura, La Leche, Chancay, Zaña,
  Jequetepeque, Marañón, Chinchipe, Huancabamba…), tomados de OpenStreetMap el 11/11/2026,
  recortados a los 4 departamentos y simplificados. Se ven en los dos mapas y en la imagen para Word;
  en el mapa del INDECI se pueden ocultar con «Mostrar los ríos» y su nombre aparece al pasar el cursor.
- Las pruebas revisan que cada distrito se encuentre por su nombre y tenga su límite.

## Lo que el programa NO hace

- **No verifica si la noticia es verdadera.** Eso lo hace una persona del equipo.
- **No copia el texto de las noticias,** solo titular y enlace, por respeto a los derechos de autor.
- **No lee radios que solo transmiten al aire o publican solo en Facebook.**
- **No publica datos que no pasaron las pruebas y el control de salud.** Si algo falla, queda la versión anterior.

## Fechas ilegibles

Si una noticia trae una fecha que no se puede leer, el programa descarta solo esa noticia y
guarda las demás de la misma fuente. (Hasta el 08/11/2026 descartaba la fuente entera.)

## Versión Google Workspace

La carpeta `apps-script` tiene la misma página para usar desde una hoja de cálculo de Google.
`preparar-apps-script.mjs` le copia los cambios de la página y de las reglas de las conclusiones;
`actualizar-noticias.cmd` lo ejecuta solo. Después hay que pegar `Pagina.html` y
`Conclusiones.gs` en el editor de Apps Script (ver LEEME.md).
