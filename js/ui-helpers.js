// ============================================================
// THE FORGE — ui-helpers.js
// Toasts, modales y popups reutilizables
// ============================================================

const ForgeUI = (() => {

  function toast(mensaje, duracion = 3500) {
    const container = document.getElementById("toastContainer");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = mensaje;
    container.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity 0.3s";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 300);
    }, duracion);
  }

  function closeModal() {
    const overlay = document.getElementById("modalRoot");
    overlay.classList.remove("show");
  }

  /**
   * Modal genérico simple: título, cuerpo (html), botones [{label, onClick, variant}]
   */
  function modal({ title, bodyHTML, buttons = [], className = "" }) {
    const overlay = document.getElementById("modalRoot");
    const box = document.getElementById("modalBox");
    box.className = "modal-box " + className;
    box.innerHTML = `
      ${title ? `<div class="modal-box__title">${title}</div>` : ""}
      <div class="modal-box__body">${bodyHTML}</div>
      <div class="modal-box__actions"></div>
    `;
    const actions = box.querySelector(".modal-box__actions");
    buttons.forEach(btn => {
      const b = document.createElement("button");
      b.className = "btn " + (btn.variant === "primary" ? "btn--primary" : btn.variant === "forge" ? "btn--forge" : "btn--secondary");
      b.textContent = btn.label;
      b.onclick = () => {
        if (btn.closeOnClick !== false) {
          closeModal();
          if (btn.onClick) setTimeout(btn.onClick, 320);
        } else if (btn.onClick) {
          btn.onClick();
        }
      };
      actions.appendChild(b);
    });
    overlay.classList.add("show");
    overlay.onclick = (e) => {
      if (e.target === overlay && buttons.length === 0) closeModal();
    };
  }

  /** Popup de alerta simple, un solo botón "Entendido" */
  function alerta(mensaje, titulo = "") {
    modal({
      title: titulo,
      bodyHTML: `<p>${mensaje}</p>`,
      buttons: [{ label: "Entendido", variant: "primary" }]
    });
  }

  /** Popup de confirmación con dos botones */
  function confirmar({ titulo, mensaje, textoConfirmar = "Confirmar", textoCancelar = "Cancelar", onConfirm }) {
    modal({
      title: titulo,
      bodyHTML: `<p>${mensaje}</p>`,
      buttons: [
        { label: textoCancelar, variant: "secondary" },
        { label: textoConfirmar, variant: "primary", onClick: onConfirm }
      ]
    });
  }

  function showTab(tabName) {
    document.querySelectorAll(".tab-panel").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
    const panel = document.getElementById("tab-" + tabName);
    const navItem = document.querySelector(`.nav-item[data-target="${tabName}"]`);
    if (panel) panel.classList.add("active");
    if (navItem) navItem.classList.add("active");
    window.scrollTo(0, 0);
    document.querySelector(".app-main").scrollTo(0, 0);
    window.dispatchEvent(new CustomEvent("forge:tab-shown", { detail: { tab: tabName } }));
  }

  function formatFecha(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatFechaHora(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" }) + " · " +
           d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  }

  return { toast, modal, alerta, confirmar, closeModal, showTab, formatFecha, formatFechaHora };
})();
