import { state } from './state.js';
import { USE_DUMMY, SESSION_KEY } from './config.js';
import { showToast, showScreen, openModal, closeModal } from './helpers.js';
import { usersRef, printersRef, statusRef } from './firebase.js';
import { renderUserBadge, renderNavTabs } from './nav.js';
import { createFirstAdmin, populateLoginDropdown, doLogin, doLogout, postLoginSetup } from './auth.js';
import { DUMMY_PRINTERS, DUMMY_STATUS } from './dummy-data.js';

import { renderDashboard } from './views/dashboard.js';
import { renderImpresoras, openPrinterDetail } from './views/impresoras.js';
import { renderPerfil, openChangePinModal, changePin } from './views/perfil.js';
import {
  renderAdminUsers,
  openCreateUserModal, openEditUserModal,
  saveUser, resetUserPin, deleteUser
} from './views/admin/users.js';
import {
  renderAdminPrinters,
  openCreatePrinterModal, openEditPrinterModal,
  savePrinter, deletePrinter,
  openScanModal, closeScanModal, startScan, addFromScan
} from './views/admin/printers.js';

export function navigate(view) {
  state.currentView = view;
  state.filters = { search: "", ubicacion: null, estado: null };
  renderNavTabs();
  renderView();
  document.querySelector(".content")?.scrollTo({ top: 0, behavior: "smooth" });
}

export function setFilter(key, val) {
  state.filters[key] = val;
  renderView();
}

export function renderView() {
  const map = {
    dashboard:      renderDashboard,
    impresoras:     renderImpresoras,
    perfil:         renderPerfil,
    admin_users:    renderAdminUsers,
    admin_printers: renderAdminPrinters
  };
  (map[state.currentView] || renderDashboard)();
}

async function init() {
  try {
    if (USE_DUMMY) {
      state.allUsers = {};
      state.printers = { ...DUMMY_PRINTERS };
      state.status   = { ...DUMMY_STATUS };
    } else {
      const [uSnap, pSnap, sSnap] = await Promise.all([
        usersRef.once("value"),
        printersRef.once("value"),
        statusRef.once("value")
      ]);
      state.allUsers = uSnap.val() || {};
      state.printers = pSnap.val() || {};
      state.status   = sSnap.val() || {};
    }

    document.getElementById("loading").style.display = "none";

    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const sess = JSON.parse(saved);
        if (sess && sess.userId && state.allUsers[sess.userId]) {
          state.currentUser = { id: sess.userId, ...state.allUsers[sess.userId] };
          await postLoginSetup();
          return;
        }
      } catch {}
      localStorage.removeItem(SESSION_KEY);
    }

    if (Object.keys(state.allUsers).length === 0) {
      showScreen("bootstrapScreen");
      document.getElementById("bsNombre").focus();
    } else {
      populateLoginDropdown();
      showScreen("loginScreen");
    }
  } catch (err) {
    console.error("Init error:", err);
    document.getElementById("loading").innerHTML =
      '<p style="color:var(--danger);text-align:center;padding:24px;max-width:380px">❌ Error de conexión con Firebase.<br/><span style="font-size:11px;color:var(--muted)">Revisá la consola y las reglas de la RTDB.</span></p>';
  }
}

Object.assign(window, {
  createFirstAdmin, doLogin, doLogout,
  navigate, setFilter, openModal, closeModal,
  renderView,
  openChangePinModal, changePin,
  openPrinterDetail,
  openCreateUserModal, openEditUserModal, saveUser, resetUserPin, deleteUser,
  openCreatePrinterModal, openEditPrinterModal, savePrinter, deletePrinter,
  openScanModal, closeScanModal, startScan, addFromScan
});

document.addEventListener("input", e => {
  if (e.target.classList.contains("pin"))
    e.target.value = e.target.value.replace(/\D/g, "");
});

document.addEventListener("keypress", e => {
  if (e.key !== "Enter") return;
  if (document.getElementById("bootstrapScreen").style.display !== "none") createFirstAdmin();
  else if (document.getElementById("loginScreen").style.display !== "none") doLogin();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape")
    document.querySelectorAll(".overlay.open").forEach(o => o.classList.remove("open"));
});

document.querySelectorAll(".overlay").forEach(o => {
  o.addEventListener("click", e => {
    if (e.target === o) o.classList.remove("open");
  });
});

init();
