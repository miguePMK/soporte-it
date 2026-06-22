import { SALT, STALE_MINUTES, TONER_LOW, TONER_CRITICAL } from './config.js';
import { state } from './state.js';

export async function hashPin(pin) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin + SALT));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export function showToast(msg, opts) {
  const t = document.getElementById("toast");
  t.innerHTML = msg;
  t.className = "toast show" + (opts && opts.cls ? " " + opts.cls : "");
  setTimeout(() => t.classList.remove("show"), (opts && opts.duration) || 2400);
}

export function showScreen(name) {
  ["bootstrapScreen", "loginScreen", "appScreen"].forEach(id => {
    document.getElementById(id).style.display = id === name ? "" : "none";
  });
}

export function openModal(id)  { document.getElementById(id).classList.add("open"); }
export function closeModal(id) { document.getElementById(id).classList.remove("open"); }

export function initials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

export function escapeAttr(s) {
  return String(s || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function isAdmin() {
  return state.currentUser && state.currentUser.rol === "admin";
}

export function fmtRelative(ts) {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 0) return "ahora";
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "hace un instante";
  if (m < 60)  return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

export function fmtDateTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// fmtDate: acepta string "YYYY-MM-DD" (formato actual en Firebase) o number (legacy)
export function fmtDate(ts) {
  if (!ts) return "—";
  // Si viene como "YYYY-MM-DD" lo parseamos a mano para no depender de TZ
  if (typeof ts === "string" && /^\d{4}-\d{2}-\d{2}/.test(ts)) {
    const [y, m, d] = ts.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  const pad = n => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}

// Para input[type=date] mantenemos formato "YYYY-MM-DD" que es lo que pide HTML5.
// Lo guardamos tal cual en Firebase como string.
export function dateInputToStored(str) {
  if (!str) return null;
  // Validamos formato YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  return str;
}

export function storedToDateInput(val) {
  if (!val) return "";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  // Fallback para valores legacy en number
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

export function isValidIp(s) {
  if (!s) return false;
  const m = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  return m.slice(1).every(n => +n >= 0 && +n <= 255);
}

export function isValidMac(s) {
  if (!s) return true;
  return /^([0-9A-Fa-f]{2}([:-])){5}[0-9A-Fa-f]{2}$/.test(s);
}

export function getPrinterStatus(printer, statusItem) {
  if (!printer.activo)         return "unknown";
  if (!printer.monitorear)     return "unknown";
  if (!statusItem || statusItem.online == null) return "unknown";
  if (!statusItem.online)      return "offline";

  if (statusItem.updated_at) {
    const ageMin = (Date.now() - new Date(statusItem.updated_at).getTime()) / 60000;
    if (ageMin > STALE_MINUTES) return "warning";
  }

  const toners = [statusItem.toner_black_pct, statusItem.toner_cyan_pct, statusItem.toner_magenta_pct, statusItem.toner_yellow_pct];
  if (toners.some(t => t != null && t <= TONER_CRITICAL)) return "warning";

  // Si la impresora reporta alertas activas vía prtAlertTable
  if ((statusItem.alert_count || 0) > 0) return "warning";

  return "online";
}

export function statusLabel(s) {
  return {
    online:  "🟢 Online",
    offline: "🔴 Offline",
    warning: "🟠 Atención",
    unknown: "⚪ S/datos"
  }[s] || s;
}

export function tonerLevelClass(pct) {
  if (pct == null) return "";
  if (pct <= TONER_CRITICAL) return "critical";
  if (pct <= TONER_LOW)      return "low";
  return "";
}

export function getPrintersJoined() {
  return Object.entries(state.printers).map(([id, printer]) => {
    const st = state.status[id] || {};
    return {
      id,
      ...printer,
      status: st,
      estado: getPrinterStatus(printer, st)
    };
  });
}
