# Petromark SRL · Catálogo de herramientas IT

Sitio estático (HTML + CSS + JS, sin backend) para publicar y descargar
herramientas internas de soporte. Todo el contenido se maneja desde
`manifest.json`; la página no se toca para sumar herramientas.

## Estructura

```
.
├── index.html          # página (fija)
├── manifest.json       # ← acá se agregan/editan las herramientas
├── assets/
│   ├── logo.png        # logo: header + favicon + footer
│   ├── css/styles.css  # estilos (fijo)
│   └── js/app.js       # lógica (fijo)
└── files/              # descargables, una carpeta por herramienta
    └── <id>/...
```

> Si además tenés herramientas que son **páginas web** (se abren en vez de
> descargarse), agregá una carpeta `tools/<id>/` con la página y enlazala
> desde el manifest con `links` (ver más abajo).

## Cargar herramientas con el editor visual (recomendado)

En lugar de editar `manifest.json` a mano, abrí **`admin.html`** (por ejemplo
`https://<usuario>.github.io/<repo>/admin.html`). Es una página con formularios
que arma el manifest por vos:

1. Abrí `admin.html`. Carga solo las herramientas que ya están publicadas.
2. Tocá **Nueva herramienta**, completá los campos (el ID se autogenera del
   nombre; la ruta de cada archivo se arma sola como `files/<id>/<archivo>`).
3. **Guardar herramienta.** Se suma al borrador (queda guardado en tu navegador
   por si cerrás la pestaña).
4. Cuando terminaste, **Descargar manifest.json** y reemplazá el que está en la
   raíz del repo.
5. Subí los archivos de los programas a `files/<id>/` (y, si es una página web,
   a `tools/<id>/`) y hacé commit.

El editor no toca el repo directamente (es un sitio estático, no tiene permisos
para eso): genera el archivo y vos lo subís. Por eso solo los **programas** se
suben a mano; la **info** ya no se escribe en JSON.

> El botón **Recargar desde el publicado** descarta el borrador local y vuelve a
> leer el `manifest.json` que está online. Útil si editás desde otra máquina.

## Cargar herramientas a mano (alternativa)

Si preferís editar el `manifest.json` directamente:

1. **Subí el archivo** descargable a `files/<id>/` (creá la carpeta con el
   mismo `id` que vas a usar en el manifest). Ej.: `files/mi-tool/mi-tool.ps1`.
2. **Agregá una entrada** al array `tools` de `manifest.json`:

   ```json
   {
     "id": "mi-tool",
     "name": "Mi herramienta",
     "shortDescription": "Qué hace, en una línea.",
     "longDescription": "Explicación más larga para el detalle.",
     "category": "Windows",
     "version": "1.0.0",
     "updated": "2026-07-13",
     "icon": "🛠️",
     "changelog": [
       { "version": "1.0.0", "date": "2026-07-13", "notes": "Versión inicial." }
     ],
     "files": [
       { "name": "mi-tool.ps1", "path": "files/mi-tool/mi-tool.ps1", "size": "2 KB" }
     ]
   }
   ```
3. **Commit y push.** Listo: la tarjeta, el filtro de categoría y el buscador
   se actualizan solos.

### Campos

| Campo              | Obligatorio | Notas |
|--------------------|:-----------:|-------|
| `id`               | sí          | Único, sin espacios. |
| `name`             | sí          | Nombre visible. |
| `shortDescription` | sí          | Texto de la tarjeta. |
| `longDescription`  | no          | Detalle; si falta, usa el corto. |
| `category`         | sí          | Genera el filtro automáticamente. |
| `version`          | sí          | Ej. `1.2.0`. |
| `updated`          | sí          | Fecha `AAAA-MM-DD`. |
| `icon`             | no          | Emoji **o** ruta a imagen (`assets/iconos/x.svg`). |
| `changelog`        | no          | Lista de `{version, date, notes}`. |
| `files`            | sí          | Lista de `{name, path, size?}`. `size` es manual. |

- Podés cargar **varios archivos** en `files`: cada uno tiene su botón de descarga.
- Una **categoría nueva** aparece sola como chip de filtro. No hay lista fija.

### Herramientas que son páginas web (no descargables)

Si la herramienta es una página que se abre y se usa (no un archivo para bajar),
usá `links` en lugar de (o además de) `files`:

```json
{
  "id": "mi-app",
  "name": "Mi herramienta web",
  "shortDescription": "Se abre en el navegador.",
  "category": "Utilidades",
  "version": "1.0.0",
  "updated": "2026-07-13",
  "icon": "🔁",
  "links": [
    { "label": "Abrir herramienta", "url": "tools/mi-app/index.html" }
  ]
}
```

- **Página en el mismo repo:** poné los archivos en `tools/<id>/` y usá una ruta
  relativa como `tools/mi-app/index.html`. Se publica junto al catálogo.
- **Página externa (otra URL):** usá la URL completa `https://...`. El sitio la
  detecta como externa y la abre en una pestaña nueva.
- Una entrada puede tener `files` **y** `links` a la vez (por ejemplo, abrir la
  app y además descargar un manual). El botón de la tarjeta prioriza **Abrir**;
  en el detalle aparecen ambas secciones.

## Publicar en GitHub Pages

1. Subí todo el contenido a un repositorio.
2. *Settings → Pages → Build and deployment → Source: Deploy from a branch.*
3. Elegí la rama (`main`) y carpeta `/ (root)`. Guardá.
4. La URL queda como `https://<usuario>.github.io/<repo>/`.

## Probar localmente

Abrir `index.html` con doble clic **no funciona**: el navegador bloquea la
carga de `manifest.json` bajo `file://`. Serví la carpeta:

```bash
python -m http.server 8000
# abrir http://localhost:8000
```

## Seguridad

El repo puede ser público. No pongas en los scripts ni en el manifest
información sensible (IPs internas, usuarios, contraseñas, rutas privadas).
Eso queda fuera del sitio.
