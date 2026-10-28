# Catálogo de vinos del local

Página para clientes: cada columna de la estantería tiene un código QR. Al escanearlo se ven los vinos de esa columna, cada uno con su botella en 3D, notas de cata, maridajes e información de la bodega.

## Cómo se usa en el día a día

Todo el contenido sale de dos tablas:

- **columnas**: una fila por columna de la estantería (`id`, `nombre`, `titulo`, `orden`).
- **vinos**: una fila por vino.

Mientras no esté conectada la planilla de Google, las tablas son los archivos `data/columnas.csv` y `data/vinos.csv`. Una vez conectada (ver abajo), se edita la planilla y la página se actualiza sola.

### Columnas de la tabla de vinos

| Columna | Qué va |
|---|---|
| `id` | Nombre corto sin espacios ni tildes, único (ej. `nayara-malbec`) |
| `en_stock` | `si` para mostrarlo, `no` para ocultarlo sin borrarlo |
| `columna` | `id` de la columna donde está (ej. `a`) |
| `fila` | Fila horizontal de la columna, de arriba hacia abajo (1 a 4). Conviene una bodega por fila |
| `orden` | Orden dentro de la fila, de izquierda a derecha |
| `nombre`, `varietal`, `cosecha`, `region`, `altitud`, `crianza`, `alcohol`, `servir_a`, `precio` | Ficha del vino (las vacías no se muestran) |
| `descripcion` | Párrafo corto de presentación |
| `vista`, `nariz`, `boca` | Notas de cata |
| `maridaje` | Comidas separadas por punto y coma: `Asado; Pastas; Quesos` |
| `bodega`, `bodega_ubicacion`, `bodega_desde`, `bodega_especialidad`, `bodega_historia`, `bodega_web` | Información de la bodega |
| `foto_etiqueta` | Foto de frente de la etiqueta, ej. `img/etiquetas/nayara.jpg`. Si está vacía se dibuja una etiqueta simple |
| `etiqueta_alto`, `etiqueta_centro` | Opcional: alto de la etiqueta y altura de su centro, en la escala de la botella (que mide 3,06). Vacío = valor estándar de la forma |
| `forma_botella` | `bordelesa` (hombros marcados), `borgoña` (hombros caídos) o `alsaciana` (alta y fina) |
| `color_vidrio`, `color_capsula` | Colores en formato `#rrggbb` |
| `ejemplo` | `si` muestra el aviso "Contenido de ejemplo" |

### Fotos de etiquetas

Recortar la foto justo al borde de la etiqueta, de frente y con buena luz. Guardarla en `img/etiquetas/` como `.jpg` de unos 800 px de ancho.

## Planilla de Google

1. Crear una planilla con dos pestañas, `columnas` y `vinos`, e importar los CSV de `data/`.
2. Archivo → Compartir → Publicar en la web → elegir cada pestaña → formato CSV → Publicar.
3. Pegar las dos direcciones en `js/config.js` (`planillaColumnas` y `planillaVinos`).

Para preparar una etiqueta desde una foto de la botella de frente: `herramientas/desenrollar_etiqueta.py`.

## Códigos QR

Abrir `/qr.html` en el sitio publicado e imprimir. Hay una tarjeta por columna.

## Publicación

Sitio estático (sin compilación), publicado en Vercel desde este repositorio. Cada cambio en la rama `main` se publica solo.

Archivos: `index.html` (catálogo), `qr.html` (QR para imprimir), `js/` (código), `css/`, `data/`, `img/`, `vendor/` (three.js r128 y qrcode-generator).
