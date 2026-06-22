# Soporte IT — Frontend

Frontend web estático para gestión de tareas de soporte IT de Petromark SRL.
Sigue la arquitectura de Prodemark: HTML/CSS/JS vanilla, sesión por PIN hasheado en localStorage, modular por vistas.

## Estructura

```
index.html
css/
  tokens.css      paleta cyan/blue, radios, sombras
  base.css        reset, body, fuentes, glow, spinner
  layout.css      auth, sidebar, content, mobile-nav
  components.css  botones, forms, modales, toasts, chips
  views.css       stat cards, printer cards, toner bars, admin table
js/
  config.js       FIREBASE_CONFIG, SALT, SESSION_KEY, USE_DUMMY, umbrales toner
  state.js        objeto único `state`
  firebase.js     refs (cuando USE_DUMMY=false)
  helpers.js      hashPin, toast, getPrinterStatus, fmtRelative, etc.
  auth.js         bootstrap + login + logout + postLoginSetup
  nav.js          sidebar + mobile bottom nav
  dummy-data.js   inventario + status de prueba
  app.js          entry point, navigate(), renderView(), window globals
  views/
    dashboard.js
    impresoras.js
    perfil.js
    admin/
      users.js
```

## Cómo correrlo

Es 100% estático. Necesita servirse desde un servidor (no `file://`) porque usa ES modules.

```bash
# desde la raíz del proyecto
python3 -m http.server 8000
# o
npx serve .
```

Abrí `http://localhost:8000` → primer arranque te lleva al bootstrap del admin.

## Estado actual

- ✅ Login PIN + bootstrap + sesión persistente
- ✅ Sidebar + nav inferior móvil
- ✅ Dashboard con stat cards y alertas
- ✅ Módulo Impresoras: grid de cards con barras de tóner color, live dot, filtros, modal de detalle
- ✅ Módulo Perfil + cambio de PIN
- ✅ Módulo Admin/Usuarios (ABM)
- ⚠️ `USE_DUMMY=true` — corre con data en memoria. Para conectar Firebase real:
  1. Pegar `firebaseConfig` en `js/config.js`
  2. Poner `USE_DUMMY = false`
  3. Descomentar los listeners en `js/auth.js` (`postLoginSetup`) y en `js/app.js` (`init`)

## Esquema Firebase esperado

```
/users/{userId}/
  nombre, area, rol (admin|user), pin_hash, creado_en

/inventory/{id}/                    ← alimentado por Power Automate (solo lectura)
  tipo, nombre, ip, ubicacion, departamento,
  modelo, serie, activo, monitorear

/status/{id}/                        ← alimentado por agente Node (solo lectura)
  online, last_seen, updated_at,
  toner_K, toner_C, toner_M, toner_Y,
  pages_total, status_msg, error
```

Para mostrar una impresora se cruza `/inventory/{id}` con `/status/{id}` por el mismo id (función `getPrintersJoined` en `helpers.js`).
