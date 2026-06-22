import { state } from '../state.js';
import { USE_DUMMY } from '../config.js';
import { isAdmin, showToast, openModal, closeModal, initials, hashPin } from '../helpers.js';
import { usersRef } from '../firebase.js';

export function renderPerfil() {
  document.getElementById("mainView").innerHTML = `
    <div class="view active">
      <div>
        <h1 class="view-title">Mi Perfil</h1>
        <p class="view-sub">Datos de cuenta y seguridad</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">
        <div class="card">
          <div class="card-title">Datos</div>
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
            <div style="width:56px;height:56px;background:linear-gradient(135deg,var(--accent),var(--accent-2));color:#07111f;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px">${initials(state.currentUser.nombre)}</div>
            <div>
              <div style="font-weight:600;font-size:16px;color:var(--text)">${state.currentUser.nombre}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:2px">${isAdmin() ? "Administrador" : "Usuario"}</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Seguridad</div>
          <p style="font-size:13px;color:var(--muted);margin-bottom:14px;line-height:1.6">Tu PIN es la única forma de acceder a tu cuenta. Si lo cambiás, anotalo bien.</p>
          <button class="btn btn-primary" onclick="openChangePinModal()">🔐 Cambiar PIN</button>
        </div>

        <div class="card">
          <div class="card-title">Sesión</div>
          <p style="font-size:13px;color:var(--muted);margin-bottom:14px;line-height:1.6">Cerrá sesión para que otro usuario pueda ingresar desde este dispositivo.</p>
          <button class="btn btn-danger" onclick="doLogout()">🚪 Cerrar sesión</button>
        </div>
      </div>
    </div>`;
}

export function openChangePinModal() {
  document.getElementById("pmOld").value = "";
  document.getElementById("pmNew").value = "";
  document.getElementById("pmNew2").value = "";
  openModal("modalPin");
}

export async function changePin() {
  const oldP  = document.getElementById("pmOld").value;
  const newP  = document.getElementById("pmNew").value;
  const newP2 = document.getElementById("pmNew2").value;

  if (!/^\d{4}$/.test(oldP))  return showToast("⚠️ PIN actual inválido");
  if (!/^\d{4}$/.test(newP))  return showToast("⚠️ El nuevo PIN debe tener 4 dígitos");
  if (newP !== newP2)         return showToast("⚠️ Los PINs nuevos no coinciden");
  if (oldP === newP)          return showToast("⚠️ El PIN nuevo es igual al actual");

  const oldHash = await hashPin(oldP);
  if (oldHash !== state.currentUser.pin_hash) return showToast("❌ PIN actual incorrecto");

  const newHash = await hashPin(newP);
  try {
    if (USE_DUMMY) {
      state.currentUser.pin_hash = newHash;
      state.allUsers[state.currentUser.id].pin_hash = newHash;
    } else {
      await usersRef.child(state.currentUser.id).child("pin_hash").set(newHash);
      state.currentUser.pin_hash = newHash;
    }
    closeModal("modalPin");
    showToast("✅ PIN cambiado");
  } catch (err) {
    console.error(err);
    showToast("❌ Error");
  }
}
