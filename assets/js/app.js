/* =========================================================================
   Petromark SRL · Catálogo de herramientas IT
   Todo el contenido viene de manifest.json. Este archivo no se edita
   para agregar herramientas.
   ========================================================================= */

(function () {
  "use strict";

  const state = {
    tools: [],
    search: "",
    category: "all",
  };

  const el = {
    grid: document.getElementById("grid"),
    filters: document.getElementById("filters"),
    search: document.getElementById("search"),
    empty: document.getElementById("empty"),
    loadError: document.getElementById("load-error"),
    resultsInfo: document.getElementById("results-info"),
    total: document.querySelector("[data-total-count]"),
    modal: document.getElementById("modal"),
    modalBody: document.getElementById("modal-body"),
    themeToggle: document.getElementById("theme-toggle"),
  };

  /* ---------- Tema claro/oscuro ---------- */
  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem("pm-theme"); } catch (e) { /* storage no disponible */ }
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    setTheme(theme);
    el.themeToggle.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      setTheme(next);
    });
  }
  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    el.themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    try { localStorage.setItem("pm-theme", theme); } catch (e) { /* noop */ }
  }

  /* ---------- Utilidades ---------- */
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function isImageIcon(icon) {
    return typeof icon === "string" && /(\/|\.(png|jpe?g|svg|webp|gif))$/i.test(icon);
  }

  function iconMarkup(icon) {
    if (isImageIcon(icon)) return '<img src="' + esc(icon) + '" alt="" />';
    return esc(icon || "🛠️");
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
    if (isNaN(d)) return esc(iso);
    return d.toLocaleDateString("es-AR", { year: "numeric", month: "short", day: "numeric" });
  }

  /* ---------- Filtros de categoría ---------- */
  function buildFilters() {
    const cats = Array.from(new Set(state.tools.map(t => t.category).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "es")
    );
    const all = [{ key: "all", label: "Todas" }].concat(cats.map(c => ({ key: c, label: c })));
    el.filters.innerHTML = all.map(c =>
      '<button class="chip" type="button" data-cat="' + esc(c.key) + '" aria-pressed="' +
      (c.key === state.category ? "true" : "false") + '">' + esc(c.label) + "</button>"
    ).join("");
    el.filters.querySelectorAll(".chip").forEach(btn => {
      btn.addEventListener("click", () => {
        state.category = btn.getAttribute("data-cat");
        el.filters.querySelectorAll(".chip").forEach(b =>
          b.setAttribute("aria-pressed", b === btn ? "true" : "false")
        );
        render();
      });
    });
  }

  /* ---------- Render de tarjetas ---------- */
  function matches(tool) {
    if (state.category !== "all" && tool.category !== state.category) return false;
    const q = state.search.trim().toLowerCase();
    if (!q) return true;
    const hay = [tool.name, tool.shortDescription, tool.longDescription, tool.category]
      .filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  }

  function render() {
    const list = state.tools
      .filter(matches)
      .sort((a, b) => String(b.updated || "").localeCompare(String(a.updated || "")));

    el.grid.innerHTML = list.map(cardMarkup).join("");
    el.empty.hidden = list.length !== 0;

    // Info de resultados
    const total = state.tools.length;
    if (list.length === total) {
      el.resultsInfo.textContent = "";
    } else {
      el.resultsInfo.textContent = "Mostrando " + list.length + " de " + total + " herramientas";
    }

    // Interacción de cada tarjeta
    el.grid.querySelectorAll(".card").forEach(card => {
      const id = card.getAttribute("data-id");
      const open = () => openModal(id);
      card.addEventListener("click", ev => {
        if (ev.target.closest("a")) return; // enlaces directos (descargar/abrir) no abren el modal
        open();
      });
      card.addEventListener("keydown", ev => {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); open(); }
      });
    });
  }

  function cardMarkup(t) {
    const files = Array.isArray(t.files) ? t.files : [];
    const links = Array.isArray(t.links) ? t.links : [];
    const single = files.length === 1;
    let action;
    if (links.length) {
      const l = links[0];
      action = '<a class="btn btn-primary" href="' + esc(l.url) + '" target="_blank" rel="noopener">' +
        openIcon() + "Abrir</a>";
    } else if (single) {
      action = '<a class="btn btn-primary" href="' + esc(files[0].path) + '" download>' +
        downloadIcon() + "Descargar</a>";
    } else if (files.length > 1) {
      action = '<button class="btn btn-primary" type="button">' + filesIcon() +
        "Ver " + files.length + " archivos</button>";
    } else {
      action = '<button class="btn btn-ghost" type="button">Detalles</button>';
    }

    return '' +
      '<article class="card" data-id="' + esc(t.id) + '" tabindex="0" role="button" aria-label="Ver detalle de ' + esc(t.name) + '">' +
        '<div class="card-top">' +
          '<div class="card-icon">' + iconMarkup(t.icon) + "</div>" +
          '<div class="card-head">' +
            '<div class="card-name">' + esc(t.name) + "</div>" +
            (t.category ? '<span class="tag">' + esc(t.category) + "</span>" : "") +
          "</div>" +
        "</div>" +
        '<p class="card-desc">' + esc(t.shortDescription) + "</p>" +
        '<div class="card-foot">' +
          '<span class="meta"><span class="ver">v' + esc(t.version || "—") + "</span> · " + fmtDate(t.updated) + "</span>" +
          action +
        "</div>" +
      "</article>";
  }

  /* ---------- Modal de detalle ---------- */
  let lastFocused = null;

  function openModal(id) {
    const t = state.tools.find(x => x.id === id);
    if (!t) return;
    lastFocused = document.activeElement;
    el.modalBody.innerHTML = modalMarkup(t);
    el.modal.hidden = false;
    document.body.style.overflow = "hidden";
    const closeBtn = el.modal.querySelector(".modal-close");
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    el.modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function modalMarkup(t) {
    const files = Array.isArray(t.files) ? t.files : [];
    const links = Array.isArray(t.links) ? t.links : [];
    const changelog = Array.isArray(t.changelog) ? t.changelog : [];

    const linksHtml = links.length
      ? '<div class="m-section"><h3>Acceso</h3><div class="files">' +
          links.map(l => {
            const ext = /^https?:\/\//i.test(l.url);
            return '<div class="file-row">' +
                '<div class="file-info">' +
                  '<div class="file-name">' + esc(l.label || "Abrir herramienta") + "</div>" +
                  (ext ? '<div class="file-size">Enlace externo</div>' : "") +
                "</div>" +
                '<a class="btn btn-primary" href="' + esc(l.url) + '" target="_blank" rel="noopener">' +
                  openIcon() + "Abrir</a>" +
              "</div>";
          }).join("") +
        "</div></div>"
      : "";

    const filesHtml = files.length
      ? files.map(f =>
          '<div class="file-row">' +
            '<div class="file-info">' +
              '<div class="file-name">' + esc(f.name) + "</div>" +
              (f.size ? '<div class="file-size">' + esc(f.size) + "</div>" : "") +
            "</div>" +
            '<a class="btn btn-primary" href="' + esc(f.path) + '" download>' + downloadIcon() + "Descargar</a>" +
          "</div>"
        ).join("")
      : '<p class="m-desc">No hay archivos cargados para esta herramienta.</p>';

    const changelogHtml = changelog.length
      ? '<div class="m-section"><h3>Novedades</h3><ul class="changelog">' +
          changelog.map(c =>
            "<li>" +
              '<div class="cl-head"><span class="cl-ver">v' + esc(c.version) + '</span>' +
              (c.date ? '<span class="cl-date">' + fmtDate(c.date) + "</span>" : "") + "</div>" +
              (c.notes ? '<p class="cl-notes">' + esc(c.notes) + "</p>" : "") +
            "</li>"
          ).join("") +
        "</ul></div>"
      : "";

    return '' +
      '<div class="m-head">' +
        '<div class="m-icon">' + iconMarkup(t.icon) + "</div>" +
        "<div>" +
          '<h2 class="m-title" id="modal-title">' + esc(t.name) + "</h2>" +
          '<div class="m-sub">' +
            (t.category ? '<span class="tag">' + esc(t.category) + "</span>" : "") +
            '<span class="ver">v' + esc(t.version || "—") + "</span>" +
            "<span>Actualizado " + fmtDate(t.updated) + "</span>" +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div class="m-section"><h3>Descripción</h3>' +
        '<p class="m-desc">' + esc(t.longDescription || t.shortDescription) + "</p></div>" +
      changelogHtml +
      linksHtml +
      (files.length
        ? '<div class="m-section"><h3>Archivos</h3><div class="files">' + filesHtml + "</div></div>"
        : "");
  }

  /* ---------- Iconos inline ---------- */
  function downloadIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>';
  }
  function filesIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7l2 3h7v11H4z"/></svg>';
  }
  function openIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7m0-7L10 14M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/></svg>';
  }

  /* ---------- Carga del manifest ---------- */
  async function load() {
    try {
      const res = await fetch("manifest.json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();

      // Metadatos del sitio
      const site = data.site || {};
      if (site.name) {
        document.querySelectorAll("[data-site-name]").forEach(n => (n.textContent = site.name));
        document.title = site.name + " · Catálogo de herramientas IT";
      }
      if (site.subtitle) {
        document.querySelectorAll("[data-site-subtitle]").forEach(n => (n.textContent = site.subtitle));
      }
      const upd = document.querySelector("[data-site-updated]");
      if (upd) upd.textContent = fmtDate(site.updated);

      state.tools = Array.isArray(data.tools) ? data.tools : [];
      el.total.textContent = state.tools.length;

      buildFilters();
      render();
    } catch (err) {
      console.error("No se pudo cargar manifest.json:", err);
      el.loadError.hidden = false;
      el.grid.hidden = true;
      el.total.textContent = "0";
    }
  }

  /* ---------- Eventos globales ---------- */
  el.search.addEventListener("input", e => {
    state.search = e.target.value;
    render();
  });

  el.modal.addEventListener("click", e => {
    if (e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !el.modal.hidden) closeModal();
  });

  initTheme();
  load();
})();
