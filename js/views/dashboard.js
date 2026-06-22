import { state } from '../state.js';
import { isAdmin, getPrintersJoined, fmtRelative } from '../helpers.js';

export function renderDashboard() {
  const printers = getPrintersJoined();
  const total    = printers.length;
  const online   = printers.filter(p => p.estado === "online").length;
  const offline  = printers.filter(p => p.estado === "offline").length;
  const warn     = printers.filter(p => p.estado === "warning").length;
  const unknown  = printers.filter(p => p.estado === "unknown").length;

  // Top alertas (offline + warning) ordenadas por last_seen más viejo primero
  const alertas = printers
    .filter(p => p.estado === "offline" || p.estado === "warning")
    .sort((a, b) => {
      const ta = a.status.updated_at ? new Date(a.status.updated_at).getTime() : 0;
      const tb = b.status.updated_at ? new Date(b.status.updated_at).getTime() : 0;
      return ta - tb;
    })
    .slice(0, 6);

  document.getElementById("mainView").innerHTML = `
    <div class="view active">
      <div>
        <h1 class="view-title">Hola, ${state.currentUser.nombre.split(" ")[0]}</h1>
        <p class="view-sub">Resumen de soporte IT · Petromark SRL</p>
      </div>

      <div class="dash-grid">
        <div class="stat-card cyan">
          <div class="lbl">Impresoras</div>
          <div class="val">${total}</div>
          <div class="desc">monitoreadas</div>
        </div>
        <div class="stat-card success">
          <div class="lbl">Online</div>
          <div class="val">${online}</div>
          <div class="desc">funcionando OK</div>
        </div>
        <div class="stat-card warn">
          <div class="lbl">Atención</div>
          <div class="val">${warn}</div>
          <div class="desc">tóner bajo / desactualizadas</div>
        </div>
        <div class="stat-card danger">
          <div class="lbl">Offline</div>
          <div class="val">${offline}</div>
          <div class="desc">sin respuesta</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">🚨 Alertas activas</div>
        ${alertas.length === 0
          ? `<div class="empty-state" style="padding:20px">
              <div class="icon">✅</div>
              <p>Todo en orden. No hay impresoras con problemas.</p>
            </div>`
          : `<div style="display:flex;flex-direction:column;gap:8px">
              ${alertas.map(p => `
                <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer"
                     onclick="openPrinterDetail('${p.id}')">
                  <span class="live-dot ${p.estado === 'offline' ? 'off' : ''}"></span>
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:13px;color:var(--text)">${p.nombre}</div>
                    <div style="font-size:11px;color:var(--muted)">${p.ubicacion || "—"} · ${p.ip || ""}</div>
                  </div>
                  <span class="status-badge ${p.estado}">${p.estado.toUpperCase()}</span>
                  <span style="font-size:10px;color:var(--muted);font-family:'DM Mono',monospace;min-width:80px;text-align:right">
                    ${fmtRelative(p.status.updated_at)}
                  </span>
                </div>`).join("")}
            </div>`}
      </div>

      <div class="card">
        <div class="card-title">📈 Estado general</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <span style="color:var(--muted)">Online</span>
            <span style="color:var(--success);font-weight:700;font-family:'DM Mono',monospace">${online} / ${total}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <span style="color:var(--muted)">Con alerta</span>
            <span style="color:var(--warn);font-weight:700;font-family:'DM Mono',monospace">${warn} / ${total}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <span style="color:var(--muted)">Offline</span>
            <span style="color:var(--danger);font-weight:700;font-family:'DM Mono',monospace">${offline} / ${total}</span>
          </div>
          ${unknown > 0 ? `
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <span style="color:var(--muted)">Sin datos</span>
            <span style="color:var(--muted);font-weight:700;font-family:'DM Mono',monospace">${unknown} / ${total}</span>
          </div>` : ""}
        </div>
      </div>
    </div>`;
}
