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
| 5 | Le da un código y el nivel de verificación | `USF-N-261019-0599` · D – Sin verificar |

La ficha aparece en la página tanto al filtrar por Castilla como por Sullana. El número
final del código (0599) es el orden dentro de esa lectura, así que puede cambiar en la
siguiente.

## Palabras que conviene conocer

| Palabra | Qué significa aquí |
| --- | --- |
| **RSS** | Una lista que publican los sitios de noticias para que otros programas la lean. Es como el índice de un periódico: titulares, fechas y enlaces, sin el texto completo. |
| **Fuente** | Cada lugar de donde se leen noticias: una búsqueda de Google Noticias o el RSS de una radio. |
| **Ficha** | El registro ordenado de una noticia: código, fecha, titular, medio, lugar, tema y nivel de verificación. |
| **Ubigeo** | El código oficial del INEI para cada distrito del Perú (por ejemplo 200104 = Castilla, Piura). |
| **Alias** | Otro nombre con que se reconoce a un distrito, normalmente el de su capital (Talara para Pariñas). |
| **Nombre ambiguo** | Un distrito que se llama como una palabra común, una persona o un lugar de otra región (Jesús, Jorge Chávez, Castilla). Solo cuenta si el titular nombra también su provincia o departamento. |
| **Nivel D – Sin verificar** | Todas las fichas nacen así: es lo que dice un medio, no un hecho confirmado. |
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

La evaluación **no** cambia el nivel de las fichas: siguen en D hasta que una persona las revise.

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

## Lo que el programa NO hace

- **No verifica si la noticia es verdadera.** Eso lo hace una persona del equipo.
- **No copia el texto de las noticias,** solo titular y enlace, por respeto a los derechos de autor.
- **No lee radios que solo transmiten al aire o publican solo en Facebook.**
- **No publica nada por sí solo.** La página en internet se actualiza solo cuando se pide.

## Fechas ilegibles

Si una noticia trae una fecha que no se puede leer, el programa descarta solo esa noticia y
guarda las demás de la misma fuente. (Hasta el 08/11/2026 descartaba la fuente entera.)

## Versión Google Workspace

La carpeta `apps-script` tiene la misma página para usar desde una hoja de cálculo de Google.
`preparar-apps-script.mjs` le copia los cambios de la página y de las reglas de las conclusiones;
`actualizar-noticias.cmd` lo ejecuta solo. Después hay que pegar `Pagina.html` y
`Conclusiones.gs` en el editor de Apps Script (ver LEEME.md).
