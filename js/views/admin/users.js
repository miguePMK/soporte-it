import { state } from '../../state.js';
import { USE_DUMMY } from '../../config.js';
import { isAdmin, showToast, openModal, closeModal, initials, hashPin } from '../../helpers.js';
import { usersRef } from '../../firebase.js';

export function renderAdminUsers() {
  if (!isAdmin()) return window.navigate("dashboard");

  const users = Object.entries(state.allUsers)
    .sort((a, b) => a[1].nombre.localeCompare(b[1].nombre, "es"));

  document.getElementById("mainView").innerHTML = `
    <div class="view active">
      <div class="view-header-row">
        <div>
          <h1 class="view-title">Usuarios</h1>
          <p class="view-sub">${users.length} usuario${users.length !== 1 ? "s" : ""}</p>
        </div>
        <button class="btn btn-primary" onclick="openCreateUserModal()">➕ Nuevo usuario</button>
      </div>

      <div class="table-wrap"><table class="admin-table">
        <thead><tr>
          <th>Nombre</th><th>Rol</th><th>Creado</th><th>Acciones</th>
        </tr></thead>
        <tbody>${users.map(([id, u]) => {
          const date = u.creado_en
            ? new Date(u.creado_en).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
            : "—";
          const isSelf = id === state.currentUser.id;
          const isAdm  = u.rol === "admin";
          return `<tr>
            <td><div style="display:flex;align-items:center;gap:8px">
              <div style="width:26px;height:26px;background:linear-gradient(135deg,var(--accent),var(--accent-2));color:#07111f;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10px">${initials(u.nombre)}</div>
              <strong>${u.nombre}</strong>${isSelf ? ` <span style="font-size:9px;color:var(--accent)">(VOS)</span>` : ""}
            </div></td>
            <td><span class="role-tag${isAdm ? " admin" : ""}">${isAdm ? "ADMIN" : "USUARIO"}</span></td>
            <td style="font-size:11px;color:var(--muted)">${date}</td>
            <td><div class="actions">
              <button class="icon-btn" onclick="openEditUserModal('${id}')">✏️</button>
              <button class="icon-btn warn" onclick="resetUserPin('${id}')">🔑</button>
              ${isSelf ? "" : `<button class="icon-btn danger" onclick="deleteUser('${id}')">🗑</button>`}
            </div></td>
          </tr>`;
        }).join("")}
        </tbody>
      </table></div>
    </div>`;
}

export function openCreateUserModal() {
  document.getElementById("userModalTitle").textContent = "Nuevo Usuario";
  document.getElementById("umUserId").value = "";
  document.getElementById("umNombre").value = "";
  document.getElementById("umRole").value = "usuario";
  document.getElementById("umPin").value = "";
  document.getElementById("umPinGroup").style.display = "";
  openModal("modalUser");
}

export function openEditUserModal(userId) {
  const u = state.allUsers[userId];
  if (!u) return;
  document.getElementById("userModalTitle").textContent = "Editar Usuario";
  document.getElementById("umUserId").value = userId;
  document.getElementById("umNombre").value = u.nombre;
  document.getElementById("umRole").value = u.rol || "usuario";
  document.getElementById("umPin").value = "";
  document.getElementById("umPinGroup").style.display = "none";
  openModal("modalUser");
}

export async function saveUser() {
  const userId = document.getElementById("umUserId").value;
  const nombre = document.getElementById("umNombre").value.trim();
  const rol    = document.getElementById("umRole").value;
  const pin    = document.getElementById("umPin").value;

  if (nombre.length < 2) return showToast("⚠️ Nombre inválido");

  if (userId) {
    // Edición
    try {
      if (USE_DUMMY) {
        Object.assign(state.allUsers[userId], { nombre, rol });
      } else {
        await usersRef.child(userId).update({ nombre, rol });
      }
      closeModal("modalUser");
      window.renderView();
      showToast("✅ Usuario actualizado");
    } catch (err) {
      console.error(err);
      showToast("❌ Error");
    }
  } else {
    // Alta
    if (!/^\d{4}$/.test(pin)) return showToast("⚠️ PIN inválido");
    const pinHash = await hashPin(pin);
    const newUser = { nombre, rol, pin_hash: pinHash, creado_en: Date.now() };
    const newId = "u_" + Date.now();
    try {
      if (USE_DUMMY) {
        state.allUsers[newId] = newUser;
      } else {
        await usersRef.child(newId).set(newUser);
      }
      closeModal("modalUser");
      window.renderView();
      showToast("✅ Usuario creado: " + nombre);
    } catch (err) {
      console.error(err);
      showToast("❌ Error al crear");
    }
  }
}

export async function resetUserPin(userId) {
  const u = state.allUsers[userId];
  if (!u) return;
  const newPin = prompt(`Nuevo PIN de 4 dígitos para ${u.nombre}:`);
  if (!newPin) return;
  if (!/^\d{4}$/.test(newPin)) return showToast("⚠️ PIN inválido");

  const pinHash = await hashPin(newPin);
  try {
    if (USE_DUMMY) {
      state.allUsers[userId].pin_hash = pinHash;
    } else {
      await usersRef.child(userId).child("pin_hash").set(pinHash);
    }
    showToast("✅ PIN reseteado");
  } catch (err) {
    console.error(err);
    showToast("❌ Error");
  }
}

export async function deleteUser(userId) {
  const u = state.allUsers[userId];
  if (!u) return;
  if (!confirm(`¿Eliminar a ${u.nombre}?`)) return;
  try {
    if (USE_DUMMY) {
      delete state.allUsers[userId];
    } else {
      await usersRef.child(userId).remove();
    }
    window.renderView();
    showToast(`✅ ${u.nombre} eliminado`);
  } catch (err) {
    console.error(err);
    showToast("❌ Error");
  }
}
