// ============================================================
// THE FORGE — tab-peso.js
// Registro de peso corporal + recordatorio de pesaje
// ============================================================

const TabPeso = (() => {
  let state = { historial: [], perfil: null };

  async function render() {
    const panel = document.getElementById("tab-peso");
    state.historial = await ForgeStorage.getHistorialPeso();
    state.perfil = await ForgeStorage.getPerfil();

    const ultimo = state.historial.length ? state.historial[state.historial.length - 1] : null;

    panel.innerHTML = `
      <h1 class="section-title">Peso Corporal</h1>
      <p class="section-subtitle">Tu cuerpo cambia con el tiempo. Aquí lo registramos, sin juicios.</p>

      <div class="body-positive-card">${BODY_POSITIVE_MESSAGE}</div>

      <div class="card" style="text-align:center;">
        ${ultimo ? `
          <div class="weight-current">
            <span class="weight-current__value">${ultimo.peso}</span>
            <span class="weight-current__unit">kg</span>
            <div class="weight-current__date">Último registro: ${ForgeUI.formatFecha(ultimo.fecha)}</div>
          </div>
        ` : `<p class="text-muted" style="padding:20px 0;">Aún no tienes registros.</p>`}
        <button class="btn btn--primary" id="btnRegistrarPeso">Registrar peso de hoy</button>
      </div>

      <div class="card reminder-card">
        <div>
          <div style="font-size:13px;font-weight:600;">Recordatorio de pesaje</div>
          <div class="text-muted" style="font-size:12px;margin-top:2px;">
            ${state.perfil?.recordatorioPesoFrecuencia ? `Cada ${state.perfil.recordatorioPesoFrecuencia} días` : "No configurado"}
          </div>
        </div>
        <button class="btn btn--ghost btn--sm" id="btnConfigRecordatorio">Configurar</button>
      </div>

      <div id="pesoListWrap"></div>
    `;

    document.getElementById("btnRegistrarPeso").onclick = abrirRegistroPeso;
    document.getElementById("btnConfigRecordatorio").onclick = abrirConfigRecordatorio;

    renderHistorialList();
    verificarRecordatorioPendiente();
  }

  function renderHistorialList() {
    const wrap = document.getElementById("pesoListWrap");
    if (state.historial.length === 0) return;
    const recientes = state.historial.slice().reverse().slice(0, 10);
    wrap.innerHTML = `
      <h3 style="font-size:14px;margin:var(--space-lg) 0 var(--space-sm);color:var(--text-secondary);">Historial reciente</h3>
      ${recientes.map(r => `
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;margin-bottom:6px;">
          <span style="font-weight:600;">${r.peso} kg</span>
          <span class="text-muted" style="font-size:12px;">${ForgeUI.formatFecha(r.fecha)}</span>
        </div>
      `).join("")}
    `;
  }

  function abrirRegistroPeso() {
    ForgeUI.modal({
      title: "Registrar peso",
      bodyHTML: `
        <div class="field">
          <label class="field__label">Peso (kg)</label>
          <input type="number" inputmode="decimal" class="field__input" id="pesoInput" placeholder="Ej: 75.5">
        </div>
        <p style="font-size:12px;color:var(--text-muted);font-style:italic;">No estás aquí porque haya algo malo en ti. Tómate tu tiempo, sin presión.</p>
      `,
      buttons: [
        { label: "Cancelar", variant: "secondary" },
        { label: "Guardar", variant: "primary", onClick: async () => {
          const peso = parseFloat(document.getElementById("pesoInput").value);
          if (!peso || peso <= 0) { ForgeUI.toast("Ingresa un peso válido."); return; }
          await ForgeStorage.guardarPesoCorporal(peso);
          await ForgeStorage.actualizarPerfil({ recordatorioPesoUltimaVez: new Date().toISOString() });
          ForgeUI.toast("Peso registrado. Sigue avanzando. 💪");
          render();
        }}
      ]
    });
  }

  function abrirConfigRecordatorio() {
    ForgeUI.modal({
      title: "Recordatorio de pesaje",
      bodyHTML: `
        <p style="margin-bottom:14px;">¿Cada cuánto quieres que te recuerde pesarte?</p>
        <div class="field">
          <select class="field__select" id="frecuenciaSelect">
            <option value="14" ${state.perfil?.recordatorioPesoFrecuencia === 14 ? "selected" : ""}>Cada 2 semanas</option>
            <option value="30" ${state.perfil?.recordatorioPesoFrecuencia === 30 ? "selected" : ""}>Cada mes</option>
            <option value="7" ${state.perfil?.recordatorioPesoFrecuencia === 7 ? "selected" : ""}>Cada semana</option>
          </select>
        </div>
      `,
      buttons: [
        { label: "Cancelar", variant: "secondary" },
        { label: "Guardar", variant: "primary", onClick: async () => {
          const dias = parseInt(document.getElementById("frecuenciaSelect").value);
          await ForgeStorage.guardarRecordatorioPeso(dias);
          ForgeUI.toast("Recordatorio configurado.");
          render();
        }}
      ]
    });
  }

  async function verificarRecordatorioPendiente() {
    const perfil = state.perfil;
    if (!perfil?.recordatorioPesoFrecuencia || !perfil?.recordatorioPesoUltimaVez) return;
    const diasTranscurridos = (Date.now() - new Date(perfil.recordatorioPesoUltimaVez).getTime()) / (24 * 3600 * 1000);
    if (diasTranscurridos >= perfil.recordatorioPesoFrecuencia) {
      ForgeUI.toast("⏰ Es hora de registrar tu peso de seguimiento.", 5000);
    }
  }

  return { render };
})();
