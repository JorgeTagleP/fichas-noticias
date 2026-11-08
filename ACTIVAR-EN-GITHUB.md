# Activar la lectura en GitHub (sin depender de una computadora)

Una vez activado, GitHub lee las noticias **cada hora**, arma las conclusiones y publica la página,
aunque todas las computadoras del equipo estén apagadas. Es gratis con un repositorio público.

Todo se hace desde el navegador. Toma unos 20 minutos, una sola vez.

## 1. Ver tu nombre de usuario
Entra a github.com, haz clic en tu foto (arriba a la derecha): el nombre que aparece en negrita
es tu usuario. La página quedará en `https://USUARIO.github.io/fichas-noticias/`.

## 2. Crear el repositorio vacío
1. Abre https://github.com/new
2. Repository name: `fichas-noticias`
3. Elige **Public**.
4. No marques «Add a README» ni otras opciones.
5. **Create repository**.

## 3. Subir los archivos
Lo más simple: pedirle a Claude que los suba. Se abrirá una ventana de GitHub en el navegador
para que inicies sesión tú (Claude no ve tu contraseña).

(Otra forma: en la página del repositorio, «uploading an existing file», arrastrar todo el
contenido de la carpeta `fichas-noticias`, incluida la carpeta `.github`, y «Commit changes».)

## 4. Encender la página
1. En el repositorio: **Settings › Pages**.
2. En «Build and deployment › Source» elige **GitHub Actions**.

## 5. Dar permiso para guardar el resumen diario
1. **Settings › Actions › General**.
2. En «Workflow permissions» elige **Read and write permissions** y **Save**.

## 6. Hacer la primera lectura
1. Pestaña **Actions** › «Lectura de noticias» › **Run workflow** › **Run workflow**.
2. Espera unos 3 minutos hasta que aparezca un visto verde.
3. Abre `https://USUARIO.github.io/fichas-noticias/`.

Desde ahí corre sola cada hora, al minuto 41. Hay dos relojes: el propio de GitHub, que en repositorios nuevos puede tardar días en arrancar, y el **Reloj de respaldo** (`reloj.yml`), que espera hasta el minuto 41, lanza la lectura si no hubo una en los últimos 15 minutos y se vuelve a programar solo.

## Si algo falla
| Síntoma | Qué hacer |
| --- | --- |
| Cruz roja en Actions | Abrir la ejecución y leer el paso en rojo. Si dice «Fichas: 0», Google Noticias frenó a GitHub esa hora; la página conserva la lectura anterior |
| La página da error 404 | Revisar el paso 4 (Source = GitHub Actions) y que haya al menos una lectura con visto verde |
| «No se pudo guardar estado.json» | Revisar el paso 5. La página se publica igual |
| La página no se actualiza hace más de dos horas | Actions › «Reloj de respaldo»: si no hay uno en curso (círculo amarillo), pulsar **Run workflow** para reiniciarlo. También se reinicia solo al subir cualquier cambio y cada 6 horas |
| Dejó de leer después de meses | GitHub pausa el reloj si el repositorio no tiene cambios en 60 días. Actions › «Lectura de noticias» › **Enable workflow** |

## Lo que sigue
- **Mejoras diarias con Claude en la nube:** buscar cifras oficiales nuevas, ajustar las reglas
  y actualizar el documento de conclusiones, una vez al día, sin usar tu computadora.
- **Apagar la tarea horaria de la computadora**, cuando la página de GitHub ya funcione, para que
  no haya dos publicaciones distintas.
