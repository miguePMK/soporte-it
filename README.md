# Petromark · Catálogo de herramientas IT

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

## Cómo agregar una herramienta nueva

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
