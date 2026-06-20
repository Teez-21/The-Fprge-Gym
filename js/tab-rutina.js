// ============================================================
// THE FORGE — tab-rutina.js
// Pestaña principal: día actual, ejercicios, series, cardio
// ============================================================

const TabRutina = (() => {
  let state = {
    routineConfig: null,   // { routineTypeId, currentDayIndex, variantes: {diaKey: 'rutina1'|'rutina2'} }
    diaActual: null,       // { index, dia }
    ejerciciosDelDia: [],  // [{ exerciseId, nombre, grupo, series: [{peso, reps}] }]
    baseEjercicios: [],
    modoCardio: false
  };

  async function render() {
    const panel = document.getElementById("tab-rutina");
    state.baseEjercicios = await ForgeStorage.getBaseEjercicios();
    state.routineConfig = await ForgeStorage.getConfigRutina();

    if (!state.routineConfig) {
      renderSeleccionRutina(panel);
      return;
    }

    await cargarDiaActual();
    renderDiaActual(panel);
  }

  // ---------------- SELECCIÓN DE TIPO DE RUTINA ----------------
  function renderSeleccionRutina(panel) {
    panel.innerHTML = `
      <h1 class="section-title">Elige tu rutina</h1>
      <p class="section-subtitle">Selecciona el sistema de entrenamiento que vas a seguir.</p>
      <div id="routineOptions"></div>
    `;
    const container = document.getElementById("routineOptions");
    Object.values(ROUTINE_TYPES).forEach(rt => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.cursor = "pointer";
      card.innerHTML = `
        <div class="exercise-card__name" style="margin-bottom:6px;">${rt.nombre}</div>
        <div class="text-muted" style="font-size:12px;">${rt.dias.map(d => d.nombre).join(" → ")}</div>
      `;
      card.onclick = () => seleccionarRutina(rt.id);
      container.appendChild(card);
    });
  }

  async function seleccionarRutina(routineTypeId) {
    const rt = ROUTINE_TYPES[routineTypeId];
    const continuar = async () => {
      state.routineConfig = {
        routineTypeId,
        currentDayIndex: 0,
        variantes: {}
      };
      await ForgeStorage.guardarConfigRutina(state.routineConfig);
      await cargarDiaActual();
      renderDiaActual(document.getElementById("tab-rutina"));
    };

    if (rt.requiereAdvertencia) {
      ForgeUI.modal({
        title: "Recomendación",
        bodyHTML: `<p>Esta rutina divide los grupos musculares en 5 días. Se recomienda más usar <strong>PPL</strong> o <strong>Upper-Lower</strong> para mejor frecuencia de entrenamiento por músculo.</p><p style="margin-top:10px;">¿Quieres continuar de todas formas?</p>`,
        buttons: [
          { label: "Elegir otra", variant: "secondary" },
          { label: "Continuar igual", variant: "primary", onClick: continuar }
        ]
      });
    } else {
      continuar();
    }
  }

  // ---------------- CARGA DE DÍA ACTUAL ----------------
  async function cargarDiaActual() {
    const rt = ROUTINE_TYPES[state.routineConfig.routineTypeId];
    const idx = state.routineConfig.currentDayIndex || 0;
    state.diaActual = { index: idx, dia: rt.dias[idx] };

    const variante = state.routineConfig.variantes?.[state.diaActual.dia.key];
    const ejercicioIds = await ForgeStorage.getEjerciciosDelDia(state.diaActual.dia.key, variante);
    state.ejerciciosDelDia = ejercicioIds.map(id => {
      const base = state.baseEjercicios.find(e => e.id === id);
      return {
        exerciseId: id,
        nombre: base?.nombre || "Ejercicio",
        grupo: base?.grupo || "",
        url: base?.url || "",
        series: []
      };
    });
  }

  // ---------------- RENDER DÍA ACTUAL ----------------
  function renderDiaActual(panel) {
    const rt = ROUTINE_TYPES[state.routineConfig.routineTypeId];
    const dia = state.diaActual.dia;
    const variante = state.routineConfig.variantes?.[dia.key];

    panel.innerHTML = `
      <div class="day-hero">
        <div class="day-hero__eyebrow">${rt.nombre}${variante ? ` · ${variante}` : ""}</div>
        <h1 class="day-hero__title">${dia.nombre}</h1>
        <div class="day-hero__groups">${dia.grupos.join(" · ")}</div>
        <div class="day-hero__actions">
          <button class="btn btn--ghost btn--sm" id="btnCambiarDia">Cambiar día</button>
          <button class="btn btn--ghost btn--sm" id="btnVariante">Rutina alternativa</button>
          <button class="btn btn--ghost btn--sm" id="btnCardio">Día de cardio</button>
        </div>
      </div>

      <div id="ejerciciosContainer"></div>

      <button class="btn btn--secondary" id="btnAgregarEjercicio" style="margin-bottom: 12px;">+ Agregar ejercicio</button>
      <button class="btn btn--primary" id="btnFinalizarEntreno">Finalizar entreno</button>
    `;

    renderEjercicios();

    document.getElementById("btnCambiarDia").onclick = abrirCambiarDia;
    document.getElementById("btnVariante").onclick = abrirVariante;
    document.getElementById("btnCardio").onclick = abrirDiaCardio;
    document.getElementById("btnAgregarEjercicio").onclick = abrirAgregarEjercicio;
    document.getElementById("btnFinalizarEntreno").onclick = finalizarEntreno;
  }

  function renderEjercicios() {
    const container = document.getElementById("ejerciciosContainer");
    if (state.ejerciciosDelDia.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">⚔️</div>
          <p>Aún no agregas ejercicios a este día.</p>
        </div>
      `;
      return;
    }
    container.innerHTML = "";
    state.ejerciciosDelDia.forEach((ej, idx) => {
      container.appendChild(renderExerciseCard(ej, idx));
    });
  }

  function renderExerciseCard(ej, exIdx) {
    const card = document.createElement("div");
    card.className = "exercise-card";

    const groupBadgeClass = ej.grupo === "Pierna" ? "badge--leg" :
      ["Espalda", "Bíceps"].includes(ej.grupo) ? "badge--pull" : "badge--push";

    card.innerHTML = `
      <div class="exercise-card__header">
        <div>
          <div class="exercise-card__name">${ej.nombre}</div>
          <span class="badge ${groupBadgeClass}">${ej.grupo}</span>
        </div>
        <button class="exercise-card__remove" data-idx="${exIdx}" aria-label="Quitar ejercicio">
          <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      ${ej.url ? `<a href="${ej.url}" target="_blank" rel="noopener" class="exercise-card__video">▶ Ver técnica</a>` : ""}
      <table class="series-table">
        <thead>
          <tr><th>#</th><th>Kg</th><th>Reps</th><th></th></tr>
        </thead>
        <tbody data-series-body="${exIdx}"></tbody>
      </table>
      <button class="add-series-btn" data-add-series="${exIdx}">+ Agregar serie</button>
    `;

    card.querySelector(`[data-add-series="${exIdx}"]`).onclick = () => {
      ej.series.push({ peso: "", reps: "" });
      renderSeriesBody(card, ej, exIdx);
    };
    card.querySelector(".exercise-card__remove").onclick = () => {
      state.ejerciciosDelDia.splice(exIdx, 1);
      renderEjercicios();
    };

    renderSeriesBody(card, ej, exIdx);
    return card;
  }

  function renderSeriesBody(card, ej, exIdx) {
    const tbody = card.querySelector(`[data-series-body="${exIdx}"]`);
    tbody.innerHTML = "";
    ej.series.forEach((serie, sIdx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${sIdx + 1}</td>
        <td><input type="number" inputmode="decimal" class="series-row__input" value="${serie.peso}" placeholder="0"></td>
        <td><input type="number" inputmode="numeric" class="series-row__input" value="${serie.reps}" placeholder="0"></td>
        <td><button class="series-row__delete" aria-label="Eliminar serie">×</button></td>
      `;
      const [pesoInput, repsInput] = tr.querySelectorAll("input");
      pesoInput.oninput = (e) => { serie.peso = parseFloat(e.target.value) || 0; };
      repsInput.oninput = (e) => {
        serie.reps = parseInt(e.target.value) || 0;
        evaluarPopupRepsSiAplica(ej);
      };
      tr.querySelector(".series-row__delete").onclick = () => {
        ej.series.splice(sIdx, 1);
        renderSeriesBody(card, ej, exIdx);
      };
      tbody.appendChild(tr);
    });
  }

  function evaluarPopupRepsSiAplica(ej) {
    if (ej.series.length < 2) return;
    const ultimasDos = ej.series.slice(-2);
    if (ultimasDos.some(s => !s.reps)) return;
    const resultado = evaluarPrimerasSeries(ej.series.slice(0, 2));
    if (ej._avisoMostrado) return;
    if (resultado === "bajar") {
      ej._avisoMostrado = true;
      ForgeUI.alerta("Te recomiendo que le bajes el peso.", "💡 Ajuste sugerido");
    } else if (resultado === "subir") {
      ej._avisoMostrado = true;
      ForgeUI.alerta("Eres demasiado fuerte para ese peso, súbele campeón.", "💪 Ajuste sugerido");
    }
  }

  // ---------------- CAMBIAR DÍA MANUAL ----------------
  function abrirCambiarDia() {
    const rt = ROUTINE_TYPES[state.routineConfig.routineTypeId];
    const opciones = rt.dias.map((d, i) =>
      `<button class="btn btn--secondary" data-day-idx="${i}" style="margin-bottom:8px;">${d.nombre}</button>`
    ).join("");

    ForgeUI.modal({
      title: "Cambiar día",
      bodyHTML: `<div style="display:flex;flex-direction:column;">${opciones}</div>`,
      buttons: [{ label: "Cancelar", variant: "secondary" }]
    });

    document.querySelectorAll("[data-day-idx]").forEach(btn => {
      btn.onclick = async () => {
        const nuevoIndex = parseInt(btn.dataset.dayIdx);
        ForgeUI.closeModal();
        const resultado = cambiarDiaManual(state.routineConfig.routineTypeId, nuevoIndex);
        state.routineConfig.currentDayIndex = nuevoIndex;
        await ForgeStorage.guardarConfigRutina(state.routineConfig);
        await cargarDiaActual();
        renderDiaActual(document.getElementById("tab-rutina"));
        ForgeUI.alerta(resultado.advertencia, "⚠️ Atención");
      };
    });
  }

  // ---------------- RUTINA ALTERNATIVA ----------------
  function abrirVariante() {
    const diaKey = state.diaActual.dia.key;
    ForgeUI.modal({
      title: "Rutina alternativa",
      bodyHTML: `
        <p style="margin-bottom:12px;">Elige qué variante de ${state.diaActual.dia.nombre} quieres usar hoy.</p>
        <div class="field">
          <input type="text" class="field__input" id="varianteInput" placeholder="Ej: Rutina 1, Rutina 2...">
        </div>
      `,
      buttons: [
        { label: "Cancelar", variant: "secondary" },
        { label: "Usar variante", variant: "primary", onClick: async () => {
          const val = document.getElementById("varianteInput").value.trim();
          if (!val) return;
          state.routineConfig.variantes = state.routineConfig.variantes || {};
          state.routineConfig.variantes[diaKey] = val;
          await ForgeStorage.guardarConfigRutina(state.routineConfig);
          await cargarDiaActual();
          renderDiaActual(document.getElementById("tab-rutina"));
        }}
      ]
    });
  }

  // ---------------- DÍA DE CARDIO ----------------
  function abrirDiaCardio() {
    ForgeUI.modal({
      title: "Día de Cardio",
      bodyHTML: `
        <div class="cardio-form">
          <div class="field">
            <label class="field__label">¿Qué hiciste?</label>
            <input type="text" class="field__input" id="cardioTipo" placeholder="Ej: Trote, bicicleta, natación...">
          </div>
          <div class="field">
            <label class="field__label">Duración (minutos)</label>
            <input type="number" class="field__input" id="cardioDuracion" placeholder="30">
          </div>
          <div class="field">
            <label class="field__label">¿Cómo sentiste la dificultad?</label>
            <select class="field__select" id="cardioDificultad">
              <option value="Fácil">Fácil</option>
              <option value="Moderada">Moderada</option>
              <option value="Difícil">Difícil</option>
              <option value="Muy difícil">Muy difícil</option>
            </select>
          </div>
        </div>
      `,
      buttons: [
        { label: "Cancelar", variant: "secondary" },
        { label: "Registrar cardio", variant: "primary", onClick: async () => {
          const tipo = document.getElementById("cardioTipo").value.trim();
          const duracion = document.getElementById("cardioDuracion").value;
          const dificultad = document.getElementById("cardioDificultad").value;
          if (!tipo || !duracion) {
            ForgeUI.toast("Completa el tipo y la duración del cardio.");
            return;
          }
          await ForgeStorage.guardarEntreno({
            tipo: "cardio",
            cardio: { tipo, duracion, dificultad },
            ejercicios: []
          });
          if (window.TabGrupo) window.TabGrupo.registrarActividadHoy();
          ForgeUI.toast("Cardio registrado. ¡Sigue así! 🔥");
        }}
      ]
    });
  }

  // ---------------- AGREGAR EJERCICIO ----------------
  function abrirAgregarEjercicio() {
    const dia = state.diaActual.dia;
    const disponibles = state.baseEjercicios.filter(e => dia.grupos.includes(e.grupo));
    const yaAgregados = new Set(state.ejerciciosDelDia.map(e => e.exerciseId));

    const listaHTML = disponibles.map(e => `
      <label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-default);">
        <input type="checkbox" data-ex-id="${e.id}" ${yaAgregados.has(e.id) ? "checked disabled" : ""} style="width:18px;height:18px;">
        <span style="font-size:14px;">${e.nombre} <span class="text-muted" style="font-size:11px;">(${e.grupo})</span></span>
      </label>
    `).join("") || `<p class="text-muted">No hay ejercicios disponibles para este día. Agrégalos primero en la pestaña Ejercicios.</p>`;

    ForgeUI.modal({
      title: "Agregar ejercicio",
      bodyHTML: `<div style="max-height:50vh;overflow-y:auto;">${listaHTML}</div>`,
      buttons: [
        { label: "Cancelar", variant: "secondary" },
        { label: "Agregar", variant: "primary", onClick: async () => {
          const checks = document.querySelectorAll("[data-ex-id]:checked:not(:disabled)");
          checks.forEach(chk => {
            const exData = disponibles.find(e => e.id === chk.dataset.exId);
            state.ejerciciosDelDia.push({ exerciseId: exData.id, nombre: exData.nombre, grupo: exData.grupo, url: exData.url, series: [] });
          });
          const variante = state.routineConfig.variantes?.[dia.key];
          await ForgeStorage.guardarEjerciciosDelDia(dia.key, variante, state.ejerciciosDelDia.map(e => e.exerciseId));
          renderEjercicios();
        }}
      ]
    });
  }

  // ---------------- FINALIZAR ENTRENO ----------------
  async function finalizarEntreno() {
    const ejerciciosConPeso = state.ejerciciosDelDia.filter(ej =>
      ej.series.length > 0 && ej.series.some(s => s.peso > 0)
    );

    if (ejerciciosConPeso.length < 3) {
      if (ejerciciosConPeso.length === 2) {
        ForgeUI.alerta("Dos manoseadas no son una paja.<br><br>Dale wacho, solo 2 ejercicios no son entreno.", "🚫 Entreno incompleto");
      } else {
        ForgeUI.alerta(`Necesitas registrar peso en al menos 3 ejercicios para finalizar. Llevas ${ejerciciosConPeso.length}.`, "🚫 Entreno incompleto");
      }
      return;
    }

    // Guardar día actual + avanzar rotación
    const variante = state.routineConfig.variantes?.[state.diaActual.dia.key];
    await ForgeStorage.guardarEjerciciosDelDia(state.diaActual.dia.key, variante, state.ejerciciosDelDia.map(e => e.exerciseId));

    const historialPrevio = await ForgeStorage.getUltimoRegistroPorEjercicio();
    const ultimoEntreno = (await ForgeStorage.getHistorialEntrenos(1))[0];
    const esRegreso = ultimoEntreno ? (Date.now() - new Date(ultimoEntreno.fecha).getTime()) > 7 * 24 * 3600 * 1000 : false;

    const entreno = {
      tipo: "entreno",
      diaKey: state.diaActual.dia.key,
      diaNombre: state.diaActual.dia.nombre,
      ejercicios: state.ejerciciosDelDia.map(ej => ({
        exerciseId: ej.exerciseId,
        nombre: ej.nombre,
        series: ej.series.filter(s => s.peso > 0 || s.reps > 0)
      })),
      esRegreso
    };

    await ForgeStorage.guardarEntreno(entreno);

    // Avanzar al siguiente día de la rotación
    const siguiente = getSiguienteDia(state.routineConfig.routineTypeId, state.diaActual.index);
    state.routineConfig.currentDayIndex = siguiente.index;
    await ForgeStorage.guardarConfigRutina(state.routineConfig);

    // Notificar a grupo (racha)
    let rachaActual = 0;
    if (window.TabGrupo) {
      rachaActual = await window.TabGrupo.registrarActividadHoy();
    }
    entreno.rachaActual = rachaActual;

    // Calcular poder
    const { total, desglose } = calcularPoderEntreno(entreno, historialPrevio);
    const resultado = await ForgeStorage.sumarPoder(total);

    mostrarPopupFelicitacion(() => {
      mostrarDesglosePoder(desglose, total, resultado);
    });

    // Recargar UI
    await cargarDiaActual();
    renderDiaActual(document.getElementById("tab-rutina"));
  }

  const MENSAJES_FELICITACION = [
    "¡Entreno completado! La forja no se detiene.",
    "Otro día, otra batalla ganada. ¡Sigue forjando tu leyenda!",
    "Disciplina pura. Tu cuerpo lo agradece, tu mente lo recordará.",
    "¡Lo lograste! Cada repetición te acerca a tu mejor versión."
  ];

  function mostrarPopupFelicitacion(onClose) {
    const msg = MENSAJES_FELICITACION[Math.floor(Math.random() * MENSAJES_FELICITACION.length)];
    ForgeUI.modal({
      title: "🔥 ¡Entreno Finalizado!",
      bodyHTML: `<p>${msg}</p>`,
      buttons: [{ label: "Ver mi progreso", variant: "primary", onClick: onClose }]
    });
  }

  function mostrarDesglosePoder(desglose, total, resultado) {
    const filas = desglose.map(d => `
      <div class="power-breakdown__row">
        <span class="power-breakdown__concept">${d.concepto}</span>
        <span class="power-breakdown__points">+${d.puntos}</span>
      </div>
    `).join("");

    ForgeUI.modal({
      title: "⚔️ Poder Ganado",
      bodyHTML: `
        <div class="power-breakdown">
          ${filas}
          <div class="power-breakdown__total">
            <span>Total</span>
            <span class="power-breakdown__points">+${total}</span>
          </div>
        </div>
      `,
      buttons: [{ label: "Continuar", variant: "forge", onClick: () => {
        if (resultado.subioDeRango && window.TabLegado) {
          window.TabLegado.mostrarAscension(resultado.rango);
        }
      }}]
    });
  }

  return { render };
})();
