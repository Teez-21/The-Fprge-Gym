// ============================================================
// THE FORGE — tab-legado.js
// Sistema LEGADO: onboarding, rango, poder, ascensión
// ============================================================

const TabLegado = (() => {
  let state = {
    perfil: null,
    onboardingStep: 0, // 0: sexo+peso, 1: menú especial
    onboardingData: { sexo: null, pesoCorporal: null, marcas: {} }
  };

  async function render() {
    const panel = document.getElementById("tab-legado");
    state.perfil = await ForgeStorage.getPerfil();

    if (!state.perfil?.onboardingCompleto) {
      renderOnboarding(panel);
      return;
    }

    renderPerfilLegado(panel);
  }

  // ================= ONBOARDING =================
  function renderOnboarding(panel) {
    panel.innerHTML = `<div id="onboardingWrap"></div>`;
    renderOnboardingStep();
  }

  function renderOnboardingStep() {
    const wrap = document.getElementById("onboardingWrap");

    if (state.onboardingStep === 0) {
      wrap.innerHTML = `
        <h1 class="section-title">Bienvenido a tu Legado</h1>
        <p class="section-subtitle">Antes de empezar, necesitamos conocerte. Esto define tu rango inicial.</p>
        <div class="onboarding-progress">
          <div class="onboarding-progress__dot done"></div>
          <div class="onboarding-progress__dot"></div>
        </div>
        <div class="field">
          <label class="field__label">Sexo</label>
          <select class="field__select" id="oSexo">
            <option value="">Selecciona...</option>
            <option value="hombre">Hombre</option>
            <option value="mujer">Mujer</option>
          </select>
        </div>
        <div class="picker-group" style="margin-bottom:var(--space-md);">
          <span class="picker-group__label">Peso corporal actual (kg)</span>
          <div class="number-picker-frame" id="pickerPesoOnboardWrap"></div>
        </div>
        <button class="btn btn--primary" id="oContinuar">Continuar</button>
      `;

      const pesoState = { valor: state.onboardingData.pesoCorporal || 70 };
      const picker = ForgeNumberPicker.createWeightPicker({
        min: 30, max: 300, step: 0.5, value: pesoState.valor,
        onChange: (v) => pesoState.valor = v
      });
      document.getElementById("pickerPesoOnboardWrap").appendChild(picker);

      document.getElementById("oContinuar").onclick = () => {
        const sexo = document.getElementById("oSexo").value;
        if (!sexo) { ForgeUI.toast("Selecciona tu sexo para continuar."); return; }
        state.onboardingData.sexo = sexo;
        state.onboardingData.pesoCorporal = pesoState.valor;
        state.onboardingStep = 1;
        renderOnboardingStep();
      };
    } else {
      wrap.innerHTML = `
        <h1 class="section-title">Menú Especial</h1>
        <p class="section-subtitle">Registra tu marca actual en cada movimiento. Solo se hace una vez: define tu rango de entrada al Legado.</p>
        <div class="onboarding-progress">
          <div class="onboarding-progress__dot done"></div>
          <div class="onboarding-progress__dot done"></div>
        </div>
        <div id="menuEspecialList"></div>
        <button class="btn btn--primary" id="oFinalizar" style="margin-top:8px;">Calcular mi rango</button>
      `;

      const list = document.getElementById("menuEspecialList");
      MENU_ESPECIAL.forEach(ej => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <div class="picker-group" style="margin-bottom:8px;">
            <span class="picker-group__label">${ej.nombre} (kg, 1 repetición o tu mejor serie)</span>
            <div class="number-picker-frame" id="pickerMarca_${ej.key}"></div>
          </div>
          <button class="btn btn--secondary btn--sm" data-guardar="${ej.key}">Guardar</button>
        `;
        list.appendChild(card);

        let valorActual = state.onboardingData.marcas[ej.key] || 0;
        const picker = ForgeNumberPicker.createWeightPicker({
          min: 0, max: 400, step: 2.5, value: valorActual,
          onChange: (v) => valorActual = v
        });
        card.querySelector(`#pickerMarca_${ej.key}`).appendChild(picker);

        card.querySelector(`[data-guardar="${ej.key}"]`).onclick = (e) => {
          state.onboardingData.marcas[ej.key] = valorActual;
          e.target.textContent = "✓ Guardado";
          e.target.classList.add("btn--forge");
          ForgeUI.toast(`${ej.nombre} registrado: ${ForgeNumberPicker.formatWeightEs(valorActual)} kg`);
        };
      });

      document.getElementById("oFinalizar").onclick = finalizarOnboarding;
    }
  }

  async function finalizarOnboarding() {
    const { sexo, pesoCorporal, marcas } = state.onboardingData;
    const completos = MENU_ESPECIAL.filter(ej => marcas[ej.key] > 0).length;
    if (completos < MENU_ESPECIAL.length) {
      ForgeUI.confirmar({
        titulo: "Faltan ejercicios",
        mensaje: `Has registrado ${completos} de ${MENU_ESPECIAL.length} ejercicios. Los que falten se calcularán como 0. ¿Quieres continuar igual?`,
        textoConfirmar: "Continuar",
        onConfirm: () => procesarOnboarding(sexo, pesoCorporal, marcas)
      });
      return;
    }
    await procesarOnboarding(sexo, pesoCorporal, marcas);
  }

  async function procesarOnboarding(sexo, pesoCorporal, marcas) {
    const { percentilGlobal, detalle } = calcularPercentilGlobal(marcas, pesoCorporal, sexo);
    const rango = rangoPorPercentil(percentilGlobal);

    await ForgeStorage.guardarOnboardingLegado({
      sexo, pesoCorporal, marcas, percentilGlobal, detalle, rangoId: rango.id
    });
    await ForgeStorage.guardarPesoCorporal(pesoCorporal);

    state.perfil = await ForgeStorage.getPerfil();
    renderPerfilLegado(document.getElementById("tab-legado"));

    setTimeout(() => mostrarAscension(rango, true), 300);
  }

  // ================= PERFIL LEGADO (post-onboarding) =================
  function renderPerfilLegado(panel) {
    const perfil = state.perfil;
    const rango = getRangoActual(perfil);
    const siguiente = siguienteRango(rango.id);
    const progreso = progresoHaciaSiguienteRango(perfil.poder || 0, rango.id);

    panel.innerHTML = `
      <div class="legacy-bg" id="legacyBgRoot" style="--rank-color:${rango.color};--rank-color-sec:${rango.colorSec};">
        <div class="legacy-bg__content">
          <div class="rank-header">
            <img src="${rango.icon}" alt="${rango.name}" class="rank-header__icon">
            <div class="rank-header__name">${rango.name}</div>
            <div class="rank-header__power"><strong>${(perfil.poder || 0).toLocaleString()}</strong> PODER</div>

            ${siguiente ? `
              <div class="rank-progress-bar">
                <div class="rank-progress-bar__fill" style="width:${(progreso * 100).toFixed(0)}%;"></div>
              </div>
              <div class="rank-progress-label">
                <span>${rango.name}</span>
                <span>${siguiente.name}</span>
              </div>
            ` : `<p class="text-forge" style="margin-top:10px;font-size:13px;">Rango máximo alcanzado. Eres leyenda.</p>`}
          </div>

          <div class="percentil-card">
            <div class="percentil-global">
              <div class="percentil-global__value">${(perfil.percentilGlobal || 0).toFixed(1)}%</div>
              <div class="percentil-global__label">Percentil Global (al ingresar)</div>
            </div>
            ${renderFortalezasDebilidades(perfil.percentilDetalle)}
          </div>

          <button class="ranks-info-btn" id="btnQueSonRangos">¿Qué son los rangos?</button>
          <div class="legacy-quote">"${LEGACY_QUOTE}"</div>
        </div>
      </div>
    `;

    document.getElementById("btnQueSonRangos").onclick = abrirTablaRangos;
  }

  function renderFortalezasDebilidades(detalle) {
    if (!detalle) return "";
    const entries = Object.values(detalle).sort((a, b) => b.percentil - a.percentil);
    const fuertes = entries.slice(0, 3);
    const debiles = entries.slice(-2);

    function bar(item, tipo) {
      return `
        <div class="strength-row">
          <span class="strength-row__name">${item.nombre}</span>
          <div class="strength-row__bar"><div class="strength-row__bar-fill ${tipo}" style="width:${Math.min(100, item.percentil)}%;"></div></div>
          <span class="strength-row__pct">${item.percentil.toFixed(0)}</span>
        </div>
      `;
    }

    return `
      <div style="margin-top:var(--space-md);">
        <h4 style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:6px;">Fortalezas</h4>
        <div class="strength-list">${fuertes.map(f => bar(f, "strong")).join("")}</div>
        <h4 style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin:var(--space-md) 0 6px;">A trabajar</h4>
        <div class="strength-list">${debiles.map(d => bar(d, "weak")).join("")}</div>
      </div>
    `;
  }

  // ================= ASCENSIÓN =================
  function mostrarAscension(rango, esInicial = false) {
    ForgeUI.modal({
      title: "",
      className: "ascension-popup",
      bodyHTML: `
        <img src="${rango.icon}" alt="${rango.name}" class="ascension-popup__icon" style="--rank-color:${rango.color};">
        <div class="ascension-popup__title">${esInicial ? "RANGO ASIGNADO" : "ASCENSIÓN COMPLETA"}</div>
        ${!esInicial ? `<p>Has superado tu límite anterior.</p>` : ""}
        <div class="ascension-popup__rank" style="color:${rango.color};">${rango.name}</div>
        <p class="text-muted" style="font-size:13px;">${rango.desc}</p>
      `,
      buttons: [{ label: "Continuar", variant: "forge" }]
    });
  }

  // ================= TABLA DE RANGOS =================
  function abrirTablaRangos() {
    const perfil = state.perfil;
    const rangoActual = getRangoActual(perfil);

    const filas = RANKS.map(r => `
      <div class="ranks-table-row ${r.id === rangoActual.id ? "current" : ""}" style="color:${r.id === rangoActual.id ? r.color : "inherit"};">
        <img src="${r.icon}" alt="${r.name}" class="ranks-table-row__icon">
        <div class="ranks-table-row__info">
          <div class="ranks-table-row__name" style="color:${r.color};">${r.name}</div>
          <div class="ranks-table-row__req">${r.poderMin.toLocaleString()} Poder</div>
        </div>
      </div>
    `).join("");

    ForgeUI.modal({
      title: "Los 10 Rangos del Legado",
      bodyHTML: `<div class="ranks-table">${filas}</div>`,
      buttons: [{ label: "Cerrar", variant: "secondary" }]
    });
  }

  // El rango nunca baja del asignado en el onboarding (rangoId).
  // Solo sube por Poder acumulado, nunca se recalcula por percentil de nuevo.
  function getRangoActual(perfil) {
    const rangoPorPuntos = rangoPorPoder(perfil.poder || 0);
    const rangoBase = RANKS[perfil.rangoId || 0];
    return rangoPorPuntos.id > rangoBase.id ? rangoPorPuntos : rangoBase;
  }

  return { render, mostrarAscension };
})();
