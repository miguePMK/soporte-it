import { state } from '../../state.js';
import { USE_DUMMY, SNMP_VERSIONS, DEPARTAMENTOS_SUGERIDOS, UBICACIONES, SCAN_DEFAULT_CIDR } from '../../config.js';
import { printersRef, db } from '../../firebase.js';
import {
  isAdmin, showToast, openModal, closeModal,
  escapeHtml, escapeAttr, isValidIp, isValidMac,
  dateInputToStored, storedToDateInput, fmtRelative
} from '../../helpers.js';

export function renderAdminPrinters() {
  if (!isAdmin()) return window.navigate("dashboard");

  const printers = Object.entries(state.printers)
    .sort((a, b) => a[1].nombre.localeCompare(b[1].nombre, "es"));

  document.getElementById("mainView").innerHTML = `
    <div class="view active">
      <div class="view-header-row">
        <div>
          <h1 class="view-title">Impresoras · Admin</h1>
          <p class="view-sub">${printers.length} impresora${printers.length !== 1 ? "s" : ""} en el inventario</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="openScanModal()">📡 Escanear red</button>
          <button class="btn btn-primary" onclick="openCreatePrinterModal()">➕ Nueva impresora</button>
        </div>
      </div>

      ${printers.length === 0
        ? `<div class="empty-state">
            <div class="icon">🖨</div>
            <h3>Sin impresoras cargadas</h3>
            <p>Empezá cargando tu primera impresora. El agente se va a encargar de monitorearla por SNMP una vez que esté en el inventario.</p>
          </div>`
        : `<div class="table-wrap"><table class="admin-table">
            <thead><tr>
              <th>Nombre</th><th>IP</th><th>Marca / Modelo</th><th>Departamento</th><th>Estado</th><th>Modificado</th><th>Acciones</th>
            </tr></thead>
            <tbody>${printers.map(([id, p]) => {
              const activo = p.activo !== false;
              const monitor = p.monitorear !== false;
              return `<tr>
                <td>
                  <div style="font-weight:600">${escapeHtml(p.nombre)}</div>
                  ${p.ubicacion ? `<div style="font-size:11px;color:var(--muted)">${escapeHtml(p.ubicacion)}</div>` : ""}
                </td>
                <td style="font-family:'DM Mono',monospace">${escapeHtml(p.ip || "—")}</td>
                <td>${escapeHtml(p.marca || "—")}<br/><span style="font-size:11px;color:var(--muted)">${escapeHtml(p.modelo || "")}</span></td>
                <td>${escapeHtml(p.departamento || "—")}</td>
                <td>
                  <span class="role-tag" style="${activo ? 'background:var(--success-dim);color:var(--success);border-color:var(--success-border)' : ''}">${activo ? "ACTIVA" : "INACTIVA"}</span>
                  ${activo && monitor ? `<div style="font-size:9px;color:var(--accent);margin-top:3px;letter-spacing:.4px">📡 monitoreada</div>` : activo ? `<div style="font-size:9px;color:var(--muted);margin-top:3px;letter-spacing:.4px">sin monitoreo</div>` : ""}
                </td>
                <td style="font-size:11px;color:var(--muted)">
                  ${p.modificado_en ? fmtRelative(p.modificado_en) : (p.creado_en ? fmtRelative(p.creado_en) : "—")}
                  ${p.modificado_por ? `<br/><span style="font-size:10px">por ${escapeHtml(getUserName(p.modificado_por))}</span>` : ""}
                </td>
                <td><div class="actions">
                  <button class="icon-btn" onclick="openEditPrinterModal('${id}')">✏️</button>
                  <button class="icon-btn danger" onclick="deletePrinter('${id}')">🗑</button>
                </div></td>
              </tr>`;
            }).join("")}
            </tbody>
          </table></div>`}
    </div>`;
}

function getUserName(uid) {
  return (state.allUsers[uid] && state.allUsers[uid].nombre) || uid;
}

export function openCreatePrinterModal(prefill = {}) {
  document.getElementById("printerModalTitle").textContent = "Nueva impresora";
  document.getElementById("pmId").value = "";

  document.getElementById("pmNombre").value = prefill.nombre || "";
  document.getElementById("pmMarca").value = prefill.marca || "";
  document.getElementById("pmModelo").value = prefill.modelo || "";
  document.getElementById("pmIp").value = prefill.ip || "";
  document.getElementById("pmMac").value = prefill.mac || "";
  document.getElementById("pmDepartamento").value = "";
  document.getElementById("pmSnmpVersion").value = "2c";
  document.getElementById("pmSnmpCommunity").value = "public";
  document.getElementById("pmFechaAdq").value = "";
  document.getElementById("pmGarantia").value = "";
  document.getElementById("pmNotas").value = "";
  document.getElementById("pmActivo").checked = true;
  document.getElementById("pmMonitorear").checked = true;

  refreshDeptDatalist();
  populateUbicaciones("");
  openModal("modalPrinterEdit");
}

export function openEditPrinterModal(id) {
  const p = state.printers[id];
  if (!p) return;

  document.getElementById("printerModalTitle").textContent = "Editar impresora";
  document.getElementById("pmId").value = id;

  document.getElementById("pmNombre").value         = p.nombre || "";
  document.getElementById("pmMarca").value          = p.marca || "";
  document.getElementById("pmModelo").value         = p.modelo || "";
  document.getElementById("pmIp").value             = p.ip || "";
  document.getElementById("pmMac").value            = p.mac || "";
  document.getElementById("pmDepartamento").value   = p.departamento || "";
  document.getElementById("pmSnmpVersion").value    = p.snmp_version || "2c";
  document.getElementById("pmSnmpCommunity").value  = p.snmp_community || "public";
  document.getElementById("pmFechaAdq").value       = storedToDateInput(p.fecha_adquisicion);
  document.getElementById("pmGarantia").value       = storedToDateInput(p.garantia_hasta);
  document.getElementById("pmNotas").value          = p.notas || "";
  document.getElementById("pmActivo").checked       = p.activo !== false;
  document.getElementById("pmMonitorear").checked   = p.monitorear !== false;

  refreshDeptDatalist();
  populateUbicaciones(p.ubicacion || "");
  openModal("modalPrinterEdit");
}

function populateUbicaciones(selected) {
  // Si el valor guardado no está en la lista, lo agregamos como opción extra
  // así no perdemos info de impresoras viejas con ubicaciones libres.
  const lista = [...UBICACIONES];
  if (selected && !lista.includes(selected)) lista.unshift(selected);

  document.getElementById("pmUbicacion").innerHTML =
    `<option value="">— Seleccionar —</option>` +
    lista.map(u =>
      `<option value="${escapeAttr(u)}"${u === selected ? " selected" : ""}>${escapeHtml(u)}</option>`
    ).join("");
}

function refreshDeptDatalist() {
  const usados = [...new Set(Object.values(state.printers).map(p => p.departamento).filter(Boolean))];
  const todos = [...new Set([...DEPARTAMENTOS_SUGERIDOS, ...usados])].sort();
  document.getElementById("deptList").innerHTML =
    todos.map(d => `<option value="${escapeAttr(d)}">`).join("");
}

export async function savePrinter() {
  const id = document.getElementById("pmId").value;

  const nombre         = document.getElementById("pmNombre").value.trim();
  const marca          = document.getElementById("pmMarca").value.trim();
  const modelo         = document.getElementById("pmModelo").value.trim();
  const ip             = document.getElementById("pmIp").value.trim();
  const mac            = document.getElementById("pmMac").value.trim().toUpperCase();
  const ubicacion      = document.getElementById("pmUbicacion").value.trim();
  const departamento   = document.getElementById("pmDepartamento").value.trim();
  const snmp_version   = document.getElementById("pmSnmpVersion").value;
  const snmp_community = document.getElementById("pmSnmpCommunity").value.trim();
  const fechaAdq       = document.getElementById("pmFechaAdq").value;
  const garantia       = document.getElementById("pmGarantia").value;
  const notas          = document.getElementById("pmNotas").value.trim();
  const activo         = document.getElementById("pmActivo").checked;
  const monitorear     = document.getElementById("pmMonitorear").checked;

  if (nombre.length < 2)               return showToast("⚠️ Nombre inválido");
  if (!isValidIp(ip))                  return showToast("⚠️ IP inválida (ej: 192.168.1.50)");
  if (mac && !isValidMac(mac))         return showToast("⚠️ MAC inválida (ej: AA:BB:CC:DD:EE:FF)");
  if (!ubicacion)                      return showToast("⚠️ Seleccioná una ubicación");
  if (!SNMP_VERSIONS.includes(snmp_version)) return showToast("⚠️ Versión SNMP inválida");

  const ipDuplicada = Object.entries(state.printers).find(([otherId, p]) =>
    p.ip === ip && otherId !== id
  );
  if (ipDuplicada) return showToast(`⚠️ Esa IP ya la usa "${ipDuplicada[1].nombre}"`);

  const data = {
    nombre, ip,
    marca: marca || null,
    modelo: modelo || null,
    mac: mac || null,
    ubicacion: ubicacion || null,
    departamento: departamento || null,
    snmp_version,
    snmp_community: snmp_community || null,
    fecha_adquisicion: dateInputToStored(fechaAdq),
    garantia_hasta: dateInputToStored(garantia),
    notas: notas || null,
    activo, monitorear,
    modificado_en: Date.now(),
    modificado_por: state.currentUser.id
  };

  try {
    if (id) {
      if (USE_DUMMY) {
        state.printers[id] = { ...state.printers[id], ...data };
      } else {
        await printersRef.child(id).update(data);
      }
      closeModal("modalPrinterEdit");
      window.renderView();
      showToast("✅ Impresora actualizada");
    } else {
      const newId = "p_" + Date.now();
      const fullData = {
        ...data,
        creado_en: Date.now(),
        creado_por: state.currentUser.id
      };
      if (USE_DUMMY) {
        state.printers[newId] = fullData;
      } else {
        await printersRef.child(newId).set(fullData);
      }
      closeModal("modalPrinterEdit");
      window.renderView();
      showToast(`✅ "${nombre}" creada`);
    }
  } catch (err) {
    console.error(err);
    showToast("❌ Error al guardar (revisá la consola)");
  }
}

export async function deletePrinter(id) {
  const p = state.printers[id];
  if (!p) return;
  if (!confirm(`¿Eliminar "${p.nombre}" del inventario?\nEsto no borra su /status (lo hace el agente).`)) return;

  try {
    if (USE_DUMMY) {
      delete state.printers[id];
    } else {
      await printersRef.child(id).remove();
    }
    window.renderView();
    showToast(`✅ "${p.nombre}" eliminada`);
  } catch (err) {
    console.error(err);
    showToast("❌ Error al eliminar");
  }
}

// ════════════════════════════════════════════
// SCANNER DE RED
// ════════════════════════════════════════════
// Estado vivo del listener (para .off() al cerrar el modal)
let _scanListenerRef = null;
let _discoveredListenerRef = null;

// Valida un CIDR IPv4 tipo "192.168.0.0/24"
function isValidCidr(s) {
  const m = (s || "").match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
  if (!m) return false;
  const [, a, b, c, d, mask] = m;
  if ([a, b, c, d].some(n => +n < 0 || +n > 255)) return false;
  if (+mask < 0 || +mask > 32) return false;
  return true;
}

// Abre el modal pidiendo rango
export function openScanModal() {
  if (USE_DUMMY) return showToast("⚠️ Scanner no disponible en modo dummy");

  // Reset al estado inicial del modal
  document.getElementById("scanRange").value = SCAN_DEFAULT_CIDR;
  document.getElementById("scanStepInput").style.display = "";
  document.getElementById("scanStepRunning").style.display = "none";
  document.getElementById("scanStepResults").style.display = "none";
  document.getElementById("scanStepError").style.display = "none";
  document.getElementById("scanFooter").style.display = "";
  detachScanListeners();
  openModal("modalScan");
}

// Cierra y limpia listeners
export function closeScanModal() {
  detachScanListeners();
  closeModal("modalScan");
}

function detachScanListeners() {
  if (_scanListenerRef)       { _scanListenerRef.off(); _scanListenerRef = null; }
  if (_discoveredListenerRef) { _discoveredListenerRef.off(); _discoveredListenerRef = null; }
}

// Lanza el comando de escaneo
export async function startScan() {
  const range = document.getElementById("scanRange").value.trim();
  if (!isValidCidr(range)) return showToast("⚠️ CIDR inválido (ej: 192.168.0.0/24)");

  const commandId = "scan_" + Date.now();
  const payload = {
    status: "pending",
    range,
    requested_by: state.currentUser.id,
    created_at: Date.now()
  };

  try {
    await db.ref("commands/scan/" + commandId).set(payload);
  } catch (err) {
    console.error(err);
    return showToast("❌ No se pudo lanzar el escaneo (revisá reglas /commands)");
  }

  // Pasamos a la pantalla "escaneando"
  document.getElementById("scanStepInput").style.display = "none";
  document.getElementById("scanFooter").style.display = "none";
  document.getElementById("scanStepRunning").style.display = "";
  document.getElementById("scanRunningRange").textContent = range;
  document.getElementById("scanRunningStatus").textContent = "pending";

  // Listener al status
  _scanListenerRef = db.ref("commands/scan/" + commandId);
  _scanListenerRef.on("value", snap => {
    const cmd = snap.val();
    if (!cmd) return;
    document.getElementById("scanRunningStatus").textContent = cmd.status || "—";

    if (cmd.status === "done") {
      // Cargar los discovered
      loadDiscovered(commandId);
    } else if (cmd.status === "error") {
      document.getElementById("scanStepRunning").style.display = "none";
      document.getElementById("scanStepError").style.display = "";
      document.getElementById("scanErrorMsg").textContent = cmd.error_msg || "Error desconocido";
    }
  });
}

// Carga /discovered/{commandId} y muestra la tabla
async function loadDiscovered(commandId) {
  _discoveredListenerRef = db.ref("discovered/" + commandId);

  try {
    const snap = await _discoveredListenerRef.once("value");
    const data = snap.val() || {};
    const devices = Object.entries(data).map(([id, d]) => ({ id, ...d }));

    document.getElementById("scanStepRunning").style.display = "none";
    document.getElementById("scanStepResults").style.display = "";
    renderDiscoveredTable(devices);
  } catch (err) {
    console.error(err);
    document.getElementById("scanStepRunning").style.display = "none";
    document.getElementById("scanStepError").style.display = "";
    document.getElementById("scanErrorMsg").textContent = "No se pudo leer /discovered";
  }
}

function renderDiscoveredTable(devices) {
  const total    = devices.length;
  const printers = devices.filter(d => d.is_printer).length;

  document.getElementById("scanResultsSummary").textContent =
    `${total} dispositivo${total !== 1 ? "s" : ""} encontrado${total !== 1 ? "s" : ""}` +
    (printers ? ` · ${printers} impresora${printers !== 1 ? "s" : ""}` : "");

  if (devices.length === 0) {
    document.getElementById("scanResultsTable").innerHTML =
      `<div class="empty-state" style="padding:30px"><p>No se encontró ningún dispositivo en ese rango.</p></div>`;
    return;
  }

  // Ordenar: impresoras primero, después por IP
  devices.sort((a, b) => {
    if (!!b.is_printer - !!a.is_printer !== 0) return !!b.is_printer - !!a.is_printer;
    return (a.ip || "").localeCompare(b.ip || "", undefined, { numeric: true });
  });

  // IDs ya en inventario (para no permitir doble alta por IP)
  const ipsExistentes = new Set(Object.values(state.printers).map(p => p.ip));

  document.getElementById("scanResultsTable").innerHTML = `
    <div class="table-wrap"><table class="admin-table">
      <thead><tr>
        <th>IP</th><th>sysName</th><th>sysDescr</th><th>Puertos</th><th>Marca / Modelo</th><th>Tipo</th><th></th>
      </tr></thead>
      <tbody>${devices.map(d => {
        const ya = ipsExistentes.has(d.ip);
        const ports = Array.isArray(d.ports_open) ? d.ports_open.join(", ") : (d.ports_open || "—");
        const descrShort = (d.sysDescr || "").length > 50
          ? escapeHtml(d.sysDescr.slice(0, 50) + "…")
          : escapeHtml(d.sysDescr || "—");
        return `<tr>
          <td style="font-family:'DM Mono',monospace;font-weight:600">${escapeHtml(d.ip || "—")}</td>
          <td>${escapeHtml(d.sysName || "—")}</td>
          <td style="font-size:11px;color:var(--muted)" title="${escapeAttr(d.sysDescr || '')}">${descrShort}</td>
          <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted)">${escapeHtml(ports)}</td>
          <td>${escapeHtml(d.guessed_brand || "—")}<br/><span style="font-size:11px;color:var(--muted)">${escapeHtml(d.guessed_model || "")}</span></td>
          <td>${d.is_printer
              ? `<span class="status-badge online">🖨 impresora</span>`
              : `<span class="status-badge unknown">otro</span>`}
          </td>
          <td>
            ${d.is_printer
              ? (ya
                  ? `<span style="font-size:10px;color:var(--muted)">ya en inventario</span>`
                  : `<button class="btn btn-primary btn-sm" onclick="addFromScan('${escapeAttr(d.ip)}','${escapeAttr(d.guessed_brand || '')}','${escapeAttr(d.guessed_model || '')}','${escapeAttr(d.sysName || '')}')">➕ Agregar</button>`)
              : ""}
          </td>
        </tr>`;
      }).join("")}
      </tbody>
    </table></div>`;
}

// Click en "Agregar a impresoras" desde una fila
export function addFromScan(ip, marca, modelo, sysName) {
  closeScanModal();
  openCreatePrinterModal({
    ip,
    marca,
    modelo,
    nombre: sysName || (marca && modelo ? `${marca} ${modelo}` : "")
  });
}
