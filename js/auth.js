import { SESSION_KEY, USE_DUMMY, VIEWS_WITH_PRINTERS } from './config.js';
import { state } from './state.js';
import { usersRef, printersRef, statusRef } from './firebase.js';
import { hashPin, showToast, showScreen } from './helpers.js';
import { renderUserBadge, renderNavTabs } from './nav.js';

export async function createFirstAdmin() {
  const nombre = document.getElementById("bsNombre").value.trim();
  const pin    = document.getElementById("bsPin").value;
  const pin2   = document.getElementById("bsPin2").value;

  if (nombre.length < 2)     return showToast("⚠️ Nombre inválido");
  if (!/^\d{4}$/.test(pin))  return showToast("⚠️ El PIN debe tener 4 dígitos");
  if (pin !== pin2)          return showToast("⚠️ Los PINs no coinciden");

  const userId  = "u_" + Date.now();
  const pinHash = await hashPin(pin);
  const newUser = { nombre, pin_hash: pinHash, rol: "admin", creado_en: Date.now() };

  try {
    if (USE_DUMMY) {
      state.allUsers[userId] = newUser;
    } else {
      await usersRef.child(userId).set(newUser);
      state.allUsers[userId] = newUser;
    }
    state.currentUser = { id: userId, ...newUser };
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
    await postLoginSetup();
    showToast("✅ Administrador creado");
  } catch (err) {
    console.error(err);
    showToast("❌ Error al crear admin (revisá reglas de RTDB)");
  }
}

export function populateLoginDropdown() {
  const sel = document.getElementById("loginUser");
  const users = Object.entries(state.allUsers)
    .sort((a, b) => a[1].nombre.localeCompare(b[1].nombre, "es"));
  sel.innerHTML =
    '<option value="">— Seleccioná tu usuario —</option>' +
    users.map(([id, u]) => {
      const tag = u.rol === "admin" ? " · admin" : "";
      return `<option value="${id}">${u.nombre}${tag}</option>`;
    }).join("");
}

export async function doLogin() {
  const userId = document.getElementById("loginUser").value;
  const pin    = document.getElementById("loginPin").value;

  if (!userId)                return showToast("⚠️ Seleccioná un usuario");
  if (!/^\d{4}$/.test(pin))   return showToast("⚠️ Ingresá tu PIN");

  const user = state.allUsers[userId];
  if (!user) return showToast("❌ Usuario no encontrado");

  const pinHash = await hashPin(pin);
  if (pinHash !== user.pin_hash) {
    document.getElementById("loginPin").value = "";
    document.getElementById("loginPin").focus();
    return showToast("❌ PIN incorrecto");
  }

  state.currentUser = { id: userId, ...user };
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
  await postLoginSetup();
  showToast("👋 Bienvenido, " + user.nombre);
}

export function doLogout() {
  if (!confirm("¿Cerrar sesión?")) return;
  if (!USE_DUMMY) {
    usersRef && usersRef.off();
    printersRef && printersRef.off();
    statusRef && statusRef.off();
  }
  localStorage.removeItem(SESSION_KEY);
  state.currentUser = null;
  document.getElementById("loginPin").value = "";
  populateLoginDropdown();
  showScreen("loginScreen");
}

export async function postLoginSetup() {
  renderUserBadge();
  renderNavTabs();

  if (!USE_DUMMY) {
    usersRef.on("value", snap => {
      state.allUsers = snap.val() || {};
      if (state.currentUser && state.allUsers[state.currentUser.id]) {
        state.currentUser = { id: state.currentUser.id, ...state.allUsers[state.currentUser.id] };
        renderUserBadge();
        renderNavTabs();
      }
      if (state.currentUser && !state.allUsers[state.currentUser.id]) {
        showToast("⚠️ Tu usuario fue eliminado");
        setTimeout(() => doLogout(), 1500);
        return;
      }
      if (["admin_users", "dashboard"].includes(state.currentView)) window.renderView();
    });

    printersRef.on("value", snap => {
      state.printers = snap.val() || {};
      if (VIEWS_WITH_PRINTERS.includes(state.currentView)) window.renderView();
    });

    statusRef.on("value", snap => {
      state.status = snap.val() || {};
      if (VIEWS_WITH_PRINTERS.includes(state.currentView)) window.renderView();
    });
  }

  showScreen("appScreen");
  window.navigate("dashboard");
}
