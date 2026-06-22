import { state } from '../state.js';
import {
  getPrintersJoined, statusLabel, tonerLevelClass,
  fmtRelative, fmtDateTime, fmtDate, escapeAttr, openModal, escapeHtml
} from '../helpers.js';

export function renderImpresoras() {
  const all = getPrintersJoined();

  if (all.length === 0) {
    document.getElementById("mainView").innerHTML = `
      <div class="view active">
        <h1 class="view-title">Impresoras</h1>
        <div class="empty-state">
          <div class="icon">🖨</div>
          <h3>Sin impresoras cargadas</h3>
          <p>El admin tiene que cargar las impresoras desde <strong>Admin → Impresoras</strong>.</p>
        </div>
      </div>`;
    return;
  }

  const ubicaciones = [...new Set(all.map(p => p.ubicacion).filter(Boolean))].sort();
  const f = state.filters;

  let list = all;
  if (f.ubicacion) list = list.filter(p => p.ubicacion === f.ubicacion);
  if (f.estado)    list = list.filter(p => p.estado === f.estado);
  if (f.search) {
    const q = f.search.toLowerCase();
    list = list.filter(p =>
      (p.nombre    || "").toLowerCase().includes(q) ||
      (p.ip        || "").toLowerCase().includes(q) ||
      (p.ubicacion || "").toLowerCase().includes(q) ||
      (p.modelo    || "").toLowerCase().includes(q) ||
      (p.marca     || "").toLowerCase().includes(q)
    );
  }

  const orderEstado = { online: 0, warning: 1, unknown: 2, offline: 3 };
  list.sort((a, b) =>
    orderEstado[a.estado] - orderEstado[b.estado] ||
    a.nombre.localeCompare(b.nombre, "es")
  );

  document.getElementById("mainView").innerHTML = `
    <div class="view active">
      <div class="view-header-row">
        <div>
          <h1 class="view-title">Impresoras</h1>
          <p class="view-sub">${list.length} de ${all.length} · actualización en vivo</p>
        </div>
        <input type="text" class="search-input"
          placeholder="🔎 Buscar por nombre, IP, ubicación, marca..."
          value="${escapeAttr(f.search || '')}"
          oninput="setFilter('search', this.value)"/>
      </div>

      <div class="filter-bar">
        <span class="filter-label">Estado:</span>
        <span class="chip${!f.estado ? ' active' : ''}" onclick="setFilter('estado', null)">Todos</span>
        <span class="chip${f.estado === 'online' ? ' active' : ''}" onclick="setFilter('estado','online')">🟢 Online</span>
        <span class="chip${f.estado === 'warning' ? ' active' : ''}" onclick="setFilter('estado','warning')">🟠 Atención</span>
        <span class="chip${f.estado === 'offline' ? ' active' : ''}" onclick="setFilter('estado','offline')">🔴 Offline</span>
      </div>

      ${ubicaciones.length > 1 ? `
      <div class="filter-bar">
        <span class="filter-label">Ubicación:</span>
        <span class="chip${!f.ubicacion ? ' active' : ''}" onclick="setFilter('ubicacion', null)">Todas</span>
        ${ubicaciones.map(u => `
          <span class="chip${f.ubicacion === u ? ' active' : ''}" onclick="setFilter('ubicacion','${escapeAttr(u)}')">${u}</span>
        `).join("")}
      </div>` : ""}

      ${list.length === 0
        ? `<div class="empty-state"><p>No hay impresoras con esos filtros.</p></div>`
        : `<div class="printers-grid">${list.map(renderPrinterCard).join("")}</div>`}
    </div>`;
}

function renderPrinterCard(p) {
  const st = p.status || {};
  const dotClass = p.estado === "offline" ? "off" : p.estado === "unknown" ? "dim" : "";

  // Si la impresora es color (campo en /printers) mostramos las 4 barras aunque
  // el agente todavía no haya reportado los % de CMY. Fallback al heurístico anterior.
  const hasColor = p.es_color === true
    || st.toner_cyan_pct != null || st.toner_magenta_pct != null || st.toner_yellow_pct != null;

  const toners = hasColor
    ? [["K", st.toner_black_pct], ["C", st.toner_cyan_pct], ["M", st.toner_magenta_pct], ["Y", st.toner_yellow_pct]]
    : [["K", st.toner_black_pct]];

  const tonerHtml = toners.map(([k, val]) => {
    const cls = tonerLevelClass(val);
    const w = val != null ? Math.max(0, Math.min(100, val)) : 0;
    return `
      <div class="toner-row toner-${k} ${cls}">
        <div class="toner-label">${k}</div>
        <div class="toner-bar-wrap"><div class="toner-bar" style="width:${w}%"></div></div>
        <div class="toner-value">${val != null ? val + "%" : "—"}</div>
      </div>`;
  }).join("");

  const alertCount = st.alert_count || 0;
  const critCount  = st.alert_critical_count || 0;
  let alertBadge = "";
  if (alertCount > 0) {
    const cls = critCount > 0 ? "alert-badge crit" : "alert-badge warn";
    const label = critCount > 0
      ? `${critCount} crít${critCount !== 1 ? "" : "."}${alertCount > critCount ? ` · ${alertCount - critCount} warn` : ""}`
      : `${alertCount} alerta${alertCount !== 1 ? "s" : ""}`;
    alertBadge = `<span class="${cls}" title="${escapeAttr(st.alert_summary || '')}">${label}</span>`;
  }

  let categoryChips = "";
  if (alertCount > 0) {
    let byCat = st.alerts_by_category;
    if (!byCat || typeof byCat !== "object") {
      byCat = {};
      parseAlertSummary(st.alert_summary).forEach(a => {
        byCat[a.category] = (byCat[a.category] || 0) + 1;
      });
    }
    const sevClass = critCount > 0 ? "crit" : "warn";
    categoryChips = `<div class="alert-cat-chips ${sevClass}" title="${escapeAttr(st.alert_summary || st.alert_raw || '')}">
      ${Object.entries(byCat)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, n]) => {
          const meta = getCategoryMeta(cat);
          return `<span class="alert-cat-chip" title="${escapeAttr(meta.label)}">${meta.icon} ${n}</span>`;
        }).join("")}
    </div>`;
  }

  return `
    <div class="printer-card ${p.estado === 'offline' ? 'offline' : ''}" onclick="openPrinterDetail('${p.id}')">
      <div class="printer-card-head">
        <div style="min-width:0;flex:1">
          <div class="printer-name">
            <span class="live-dot ${dotClass}"></span>
            ${escapeHtml(p.nombre)}
          </div>
          <div class="printer-meta">
            <span class="ip">${escapeHtml(p.ip || "—")}</span>
            <span>${escapeHtml(p.ubicacion || "")}</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
          <span class="status-badge ${p.estado}">${statusLabel(p.estado).replace(/^.{2}\s/, '')}</span>
          ${alertBadge}
        </div>
      </div>
      ${categoryChips}
      <div class="printer-body">
        ${tonerHtml || `<div style="font-size:11px;color:var(--muted);font-style:italic">Sin datos de tóner</div>`}
      </div>
      <div class="printer-foot">
        <span class="last-check">${fmtRelative(st.updated_at)}</span>
        ${st.pages_total != null ? `<span class="pages-count">${st.pages_total.toLocaleString("es-AR")} pág.</span>` : ""}
      </div>
    </div>`;
}

export function openPrinterDetail(id) {
  const p  = state.printers[id];
  const st = state.status[id] || {};
  if (!p) return;

  const dotClass = !st.online ? "off" : "";
  const hasColor = p.es_color === true
    || st.toner_cyan_pct != null || st.toner_magenta_pct != null || st.toner_yellow_pct != null;

  const toners = hasColor
    ? [["K", st.toner_black_pct], ["C", st.toner_cyan_pct], ["M", st.toner_magenta_pct], ["Y", st.toner_yellow_pct]]
    : [["K", st.toner_black_pct]];

  const alerts = parseAlertSummary(st.alert_summary);
  const alertCount = st.alert_count || 0;
  const critCount  = st.alert_critical_count || 0;

  const ipCell = p.ip
    ? `<a href="http://${escapeAttr(p.ip)}" target="_blank" rel="noopener noreferrer"
         class="ip-link" title="Abrir panel web de la impresora">
         ${escapeHtml(p.ip)} <span style="font-size:10px;opacity:.7">↗</span>
       </a>`
    : "—";

  // Sección "Datos técnicos / Repuestos"
  const tieneAlgunRepuesto =
    p.toner_model_black || p.toner_model_cyan || p.toner_model_magenta ||
    p.toner_model_yellow || p.drum_model || p.numero_serie || p.proveedor_servicio;

  const repuestosHtml = `
    <h4>
      Datos técnicos / Repuestos
      <button class="btn btn-secondary btn-sm" style="float:right;margin-top:-4px" onclick="openPurchaseModal('${p.id}')">🛒 Datos para compras</button>
    </h4>
    <div class="detail-grid">
      <div class="detail-item"><div class="dl">Tipo</div><div class="dv">${p.es_color ? "🎨 Color" : "⚫ Blanco y negro"}</div></div>
      <div class="detail-item"><div class="dl">Número de serie</div><div class="dv mono">${escapeHtml(p.numero_serie || "—")}</div></div>

      <div class="detail-item"><div class="dl">Tóner negro (K)</div><div class="dv mono">${escapeHtml(p.toner_model_black || "—")}</div></div>
      ${p.es_color ? `
        <div class="detail-item"><div class="dl">Tóner cian (C)</div><div class="dv mono">${escapeHtml(p.toner_model_cyan || "—")}</div></div>
        <div class="detail-item"><div class="dl">Tóner magenta (M)</div><div class="dv mono">${escapeHtml(p.toner_model_magenta || "—")}</div></div>
        <div class="detail-item"><div class="dl">Tóner amarillo (Y)</div><div class="dv mono">${escapeHtml(p.toner_model_yellow || "—")}</div></div>
      ` : ""}

      <div class="detail-item"><div class="dl">Tambor / Drum</div><div class="dv mono">${escapeHtml(p.drum_model || "—")}</div></div>
      <div class="detail-item"><div class="dl">Proveedor de servicio</div><div class="dv">${escapeHtml(p.proveedor_servicio || "—")}</div></div>
    </div>
    ${!tieneAlgunRepuesto ? `
      <div style="font-size:11px;color:var(--muted);margin-top:6px;font-style:italic">
        Esta impresora todavía no tiene cargados sus datos de repuesto. Editala desde Admin → Impresoras para completarlos.
      </div>` : ""}
  `;

  document.getElementById("prModalTitle").innerHTML =
    `<span class="live-dot ${dotClass}" style="margin-right:8px"></span>${escapeHtml(p.nombre)}`;

  document.getElementById("prModalBody").innerHTML = `
    <h4>Información del equipo</h4>
    <div class="detail-grid">
      <div class="detail-item"><div class="dl">IP</div><div class="dv mono">${ipCell}</div></div>
      <div class="detail-item"><div class="dl">MAC</div><div class="dv mono">${escapeHtml(p.mac || "—")}</div></div>
      <div class="detail-item"><div class="dl">Marca</div><div class="dv">${escapeHtml(p.marca || "—")}</div></div>
      <div class="detail-item"><div class="dl">Modelo</div><div class="dv">${escapeHtml(p.modelo || "—")}</div></div>
      <div class="detail-item"><div class="dl">Departamento</div><div class="dv">${escapeHtml(p.departamento || "—")}</div></div>
      <div class="detail-item"><div class="dl">SNMP</div><div class="dv">${p.snmp_version ? "v" + escapeHtml(p.snmp_version) : "—"} ${p.snmp_community ? `· ${escapeHtml(p.snmp_community)}` : ""}</div></div>
      <div class="detail-item" style="grid-column:1/-1"><div class="dl">Ubicación</div><div class="dv">${escapeHtml(p.ubicacion || "—")}</div></div>
      ${p.fecha_adquisicion ? `<div class="detail-item"><div class="dl">Adquirida</div><div class="dv">${fmtDate(p.fecha_adquisicion)}</div></div>` : ""}
      ${p.garantia_hasta ? `<div class="detail-item"><div class="dl">Garantía hasta</div><div class="dv">${fmtDate(p.garantia_hasta)}</div></div>` : ""}
      ${p.notas ? `<div class="detail-item" style="grid-column:1/-1"><div class="dl">Notas</div><div class="dv">${escapeHtml(p.notas)}</div></div>` : ""}
    </div>

    ${repuestosHtml}

    <h4>Estado actual</h4>
    <div class="detail-grid">
      <div class="detail-item"><div class="dl">Conexión</div><div class="dv">${st.online ? "🟢 Online" : st.online === false ? "🔴 Offline" : "⚪ S/datos"}</div></div>
      <div class="detail-item"><div class="dl">Última actualización</div><div class="dv">${fmtDateTime(st.updated_at)}</div></div>
      <div class="detail-item"><div class="dl">Mensaje</div><div class="dv">${escapeHtml(st.status_msg || "—")}</div></div>
      <div class="detail-item"><div class="dl">Páginas totales</div><div class="dv mono">${st.pages_total != null ? st.pages_total.toLocaleString("es-AR") : "—"}</div></div>
      ${st.error ? `<div class="detail-item" style="grid-column:1/-1;border-color:var(--danger-border);background:var(--danger-dim)"><div class="dl" style="color:var(--danger)">Error</div><div class="dv">${escapeHtml(st.error)}</div></div>` : ""}
    </div>

    ${alertCount > 0 ? `
      <h4>
        Alertas activas
        <span style="float:right;font-size:11px;color:${critCount > 0 ? 'var(--danger)' : 'var(--warn)'};font-weight:600;letter-spacing:.3px">
          ${alertCount} total${critCount > 0 ? ` · ${critCount} crítica${critCount !== 1 ? 's' : ''}` : ''}
        </span>
      </h4>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${alerts.map(a => {
          const meta = getCategoryMeta(a.category);
          return `
          <div class="alert-row ${a.severity}">
            <span class="alert-row-sev">${a.severity === 'crit' ? '🔴 CRIT' : '🟠 WARN'}</span>
            <span class="alert-row-cat" title="${escapeAttr(meta.label)}">${meta.icon} ${escapeHtml(meta.label)}</span>
            <span class="alert-row-msg">${escapeHtml(a.text)}</span>
          </div>`;
        }).join("")}
      </div>
      ${st.alert_raw ? `
        <details class="alert-raw-details">
          <summary>Ver texto crudo del fabricante</summary>
          <pre class="alert-raw">${escapeHtml(st.alert_raw)}</pre>
        </details>
      ` : ""}
    ` : ""}

    <h4>Niveles de tóner</h4>
    <div style="display:flex;flex-direction:column;gap:10px;background:rgba(255,255,255,.03);padding:14px;border:1px solid var(--border);border-radius:var(--radius-sm)">
      ${toners.map(([k, val]) => {
        const cls = tonerLevelClass(val);
        const w = val != null ? Math.max(0, Math.min(100, val)) : 0;
        return `
          <div class="toner-row toner-${k} ${cls}">
            <div class="toner-label">${k}</div>
            <div class="toner-bar-wrap"><div class="toner-bar" style="width:${w}%"></div></div>
            <div class="toner-value">${val != null ? val + "%" : "—"}</div>
          </div>`;
      }).join("")}
    </div>
  `;

  openModal("modalPrinter");
}

// ════════════════════════════════════════════
// COMPRAS / PEDIDO DE INSUMOS
// ════════════════════════════════════════════

// Genera el texto plano que se muestra/copia/manda por mail.
function buildPurchaseText(p, st) {
  const lineas = [];
  lineas.push(`Pedido de insumos para impresora`);
  lineas.push(`─────────────────────────────────────`);
  lineas.push(`Equipo:        ${p.nombre}`);
  if (p.marca || p.modelo) lineas.push(`Marca/modelo:  ${[p.marca, p.modelo].filter(Boolean).join(" ")}`);
  if (p.numero_serie)      lineas.push(`N° de serie:   ${p.numero_serie}`);
  if (p.ubicacion)         lineas.push(`Ubicación:     ${p.ubicacion}`);
  if (p.departamento)      lineas.push(`Departamento:  ${p.departamento}`);
  if (p.ip)                lineas.push(`IP:            ${p.ip}`);
  lineas.push(`Tipo:          ${p.es_color ? "Color (CMYK)" : "Blanco y negro"}`);
  lineas.push("");
  lineas.push(`Repuestos / consumibles a pedir:`);

  const items = [];
  items.push({ label: "Tóner negro (K)", value: p.toner_model_black, pct: st.toner_black_pct });
  if (p.es_color) {
    items.push({ label: "Tóner cian (C)",    value: p.toner_model_cyan,    pct: st.toner_cyan_pct });
    items.push({ label: "Tóner magenta (M)", value: p.toner_model_magenta, pct: st.toner_magenta_pct });
    items.push({ label: "Tóner amarillo (Y)",value: p.toner_model_yellow,  pct: st.toner_yellow_pct });
  }
  if (p.drum_model) items.push({ label: "Tambor / Drum", value: p.drum_model, pct: null });

  items.forEach(it => {
    const nivel = it.pct != null ? ` (nivel actual: ${it.pct}%)` : "";
    lineas.push(`  • ${it.label.padEnd(20)} ${it.value || "— sin cargar —"}${nivel}`);
  });

  if (p.proveedor_servicio) {
    lineas.push("");
    lineas.push(`Proveedor de servicio: ${p.proveedor_servicio}`);
  }

  lineas.push("");
  lineas.push(`— Generado desde Soporte IT · Petromark SRL`);
  return lineas.join("\n");
}

// Estado vivo para los handlers del modal de compras
let _purchaseCurrent = { id: null, text: "", printer: null };

export function openPurchaseModal(id) {
  const p = state.printers[id];
  const st = state.status[id] || {};
  if (!p) return;

  const text = buildPurchaseText(p, st);
  _purchaseCurrent = { id, text, printer: p };

  document.getElementById("purchaseModalBody").innerHTML = `
    <p style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.5">
      Resumen listo para mandar a compras. Podés copiarlo o abrirlo directamente como mail.
    </p>
    <pre class="purchase-text" id="purchaseText">${escapeHtml(text)}</pre>
  `;

  openModal("modalPurchase");
}

export async function copyPurchaseText() {
  if (!_purchaseCurrent.text) return;
  try {
    await navigator.clipboard.writeText(_purchaseCurrent.text);
    showToastCopied();
  } catch {
    // Fallback para navegadores viejos
    const ta = document.createElement("textarea");
    ta.value = _purchaseCurrent.text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); showToastCopied(); }
    catch { /* nada */ }
    document.body.removeChild(ta);
  }
}

function showToastCopied() {
  // Importado vía helpers? Acá usamos directo el dom para no romper imports.
  const t = document.getElementById("toast");
  t.innerHTML = "📋 Copiado al portapapeles";
  t.className = "toast show";
  setTimeout(() => t.classList.remove("show"), 1800);
}

export function sendPurchaseEmail() {
  const p = _purchaseCurrent.printer;
  if (!p) return;
  const subject = `Pedido de insumos · ${p.nombre}${p.ubicacion ? " (" + p.ubicacion + ")" : ""}`;
  const body = _purchaseCurrent.text;
  const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
}

// ════════════════════════════════════════════
// Parser de alertas y categorías
// ════════════════════════════════════════════
function parseAlertSummary(summary) {
  if (!summary || typeof summary !== "string") return [];
  return summary
    .split(";")
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const mNew = s.match(/^\[(CRIT|WARN)\/([a-z]+)\]\s*(.*)$/i);
      if (mNew) return {
        severity: mNew[1].toLowerCase() === "crit" ? "crit" : "warn",
        category: mNew[2].toLowerCase(),
        text: mNew[3].trim()
      };
      const mOld = s.match(/^\[(CRIT|WARN)\]\s*(.*)$/i);
      if (mOld) return {
        severity: mOld[1].toLowerCase() === "crit" ? "crit" : "warn",
        category: "other",
        text: mOld[2].trim()
      };
      return { severity: "warn", category: "other", text: s };
    });
}

const CATEGORY_META = {
  paper:      { icon: "📄", label: "Papel" },
  jam:        { icon: "🔧", label: "Atasco" },
  toner:      { icon: "🎨", label: "Tóner" },
  cover:      { icon: "🚪", label: "Tapa/puerta" },
  output:     { icon: "📤", label: "Bandeja salida" },
  consumable: { icon: "🧰", label: "Consumible" },
  hardware:   { icon: "⚙️", label: "Hardware" },
  offline:    { icon: "📴", label: "Offline" },
  other:      { icon: "ℹ️", label: "Otro" }
};

function getCategoryMeta(cat) {
  return CATEGORY_META[cat] || CATEGORY_META.other;
}