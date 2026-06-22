import { state } from './state.js';
import { initials, isAdmin } from './helpers.js';

export function renderUserBadge() {
  const u = state.currentUser;
  document.getElementById("sidebarFooter").innerHTML = `
    <div class="sidebar-user" onclick="navigate('perfil')">
      <div class="s-avatar">${initials(u.nombre)}</div>
      <div class="s-info">
        <div class="s-uname">${u.nombre}</div>
        <div class="s-urole">${u.rol === "admin" ? "Administrador" : "Usuario"}</div>
      </div>
      ${u.rol === "admin" ? `<div><span class="s-admin-tag">ADMIN</span></div>` : ""}
    </div>`;
}

export function renderNavTabs() {
  const tabsAdmin = [
    { id: "dashboard",      icon: "📊", label: "Dashboard"  },
    { id: "impresoras",     icon: "🖨", label: "Impresoras" },
    { section: "Admin" },
    { id: "admin_printers", icon: "🛠", label: "Impresoras" },
    { id: "admin_users",    icon: "👥", label: "Usuarios"   }
  ];
  const tabsUser = [
    { id: "dashboard",   icon: "📊", label: "Dashboard"  },
    { id: "impresoras",  icon: "🖨", label: "Impresoras" }
  ];

  const cv   = state.currentView;
  const tabs = isAdmin() ? tabsAdmin : tabsUser;

  document.getElementById("sidebarNav").innerHTML =
    tabs.map(t => {
      if (t.section) return `<div class="nav-section-label">${t.section}</div>`;
      return `
        <button class="nav-item${t.id === cv ? " active" : ""}" onclick="navigate('${t.id}')">
          <span class="nav-icon">${t.icon}</span>
          <span>${t.label}</span>
        </button>`;
    }).join("") +
    `<div class="nav-section-label">Cuenta</div>
     <button class="nav-item${cv === "perfil" ? " active" : ""}" onclick="navigate('perfil')">
       <span class="nav-icon">⚙️</span><span>Perfil</span>
     </button>
     <button class="nav-item" onclick="doLogout()">
       <span class="nav-icon">🚪</span><span>Salir</span>
     </button>`;

  const mobileTabs = isAdmin()
    ? [
        { id: "dashboard",      icon: "📊", label: "Inicio" },
        { id: "impresoras",     icon: "🖨", label: "Imp." },
        { id: "admin_printers", icon: "🛠", label: "ABM" },
        { id: "admin_users",    icon: "👥", label: "Users" },
        { id: "perfil",         icon: "⚙️", label: "Perfil" }
      ]
    : [
        { id: "dashboard",   icon: "📊", label: "Inicio" },
        { id: "impresoras",  icon: "🖨", label: "Imp." },
        { id: "perfil",      icon: "⚙️", label: "Perfil" }
      ];

  document.getElementById("mobileNav").innerHTML = mobileTabs.map(t => `
    <button class="${t.id === cv ? "active" : ""}" onclick="navigate('${t.id}')">
      <span class="mn-icon">${t.icon}</span>${t.label}
    </button>`).join("");
}
