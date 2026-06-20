// ============================================================
// THE FORGE — tab-progreso.js
// Gráficas de progreso: por ejercicio, grupo muscular, peso, legado
// ============================================================

const TabProgreso = (() => {
  let state = {
    vista: "ejercicio", // ejercicio | grupo | peso | legado
    historial: [],
    historialPeso: [],
    perfil: null,
    ejercicioSeleccionado: null
  };

  const VISTAS = [
    { id: "ejercicio", label: "Por Ejercicio" },
    { id: "grupo", label: "Por Grupo Muscular" },
    { id: "peso", label: "Peso Corporal" },
    { id: "legado", label: "Legado" }
  ];

  async function render() {
    const panel = document.getElementById("tab-progreso");
    state.historial = await ForgeStorage.getHistorialEntrenos(200);
    state.historialPeso = await ForgeStorage.getHistorialPeso();
    state.perfil = await ForgeStorage.getPerfil();

    panel.innerHTML = `
      <h1 class="section-title">Progreso</h1>
      <p class="section-subtitle">Tu evolución, medida y forjada con datos.</p>
      <div class="progress-tabs" id="progressTabs"></div>
      <div id="progressContent"></div>
    `;

    const tabsContainer = document.getElementById("progressTabs");
    VISTAS.forEach(v => {
      const btn = document.createElement("button");
      btn.className = "progress-tab-btn" + (state.vista === v.id ? " active" : "");
      btn.textContent = v.label;
      btn.onclick = () => { state.vista = v.id; renderTabs(); renderContent(); };
      tabsContainer.appendChild(btn);
    });

    renderContent();
  }

  function renderTabs() {
    document.querySelectorAll(".progress-tab-btn").forEach((btn, i) => {
      btn.classList.toggle("active", VISTAS[i].id === state.vista);
    });
  }

  function renderContent() {
    const container = document.getElementById("progressContent");
    if (state.historial.length === 0 && state.vista !== "peso" && state.vista !== "legado") {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">📊</div><p>Aún no hay entrenos registrados.<br>Completa tu primer entreno para ver tu progreso.</p></div>`;
      return;
    }
    if (state.vista === "ejercicio") renderPorEjercicio(container);
    else if (state.vista === "grupo") renderPorGrupoMuscular(container);
    else if (state.vista === "peso") renderPeso(container);
    else if (state.vista === "legado") renderLegado(container);
  }

  // ---------------- POR EJERCICIO ----------------
  function renderPorEjercicio(container) {
    const ejerciciosVistos = new Map();
    state.historial.forEach(entreno => {
      (entreno.ejercicios || []).forEach(ej => {
        if (!ejerciciosVistos.has(ej.exerciseId)) ejerciciosVistos.set(ej.exerciseId, ej.nombre);
      });
    });

    if (ejerciciosVistos.size === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">📊</div><p>Registra ejercicios con peso para ver su evolución.</p></div>`;
      return;
    }

    const opciones = Array.from(ejerciciosVistos.entries());
    if (!state.ejercicioSeleccionado) state.ejercicioSeleccionado = opciones[0][0];

    container.innerHTML = `
      <div class="field">
        <select class="field__select" id="selectEjercicio">
          ${opciones.map(([id, nombre]) => `<option value="${id}" ${id === state.ejercicioSeleccionado ? "selected" : ""}>${nombre}</option>`).join("")}
        </select>
      </div>
      <div id="chartEjercicioWrap"></div>
    `;

    document.getElementById("selectEjercicio").onchange = (e) => {
      state.ejercicioSeleccionado = e.target.value;
      renderGraficaEjercicio();
    };

    renderGraficaEjercicio();
  }

  function renderGraficaEjercicio() {
    const wrap = document.getElementById("chartEjercicioWrap");
    const puntos = [];
    state.historial.slice().reverse().forEach(entreno => {
      const ej = (entreno.ejercicios || []).find(e => e.exerciseId === state.ejercicioSeleccionado);
      if (ej && ej.series.length) {
        const maxPeso = Math.max(...ej.series.map(s => s.peso || 0));
        if (maxPeso > 0) puntos.push({ fecha: entreno.fecha, valor: maxPeso });
      }
    });

    if (puntos.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><p>Sin datos de peso para este ejercicio.</p></div>`;
      return;
    }

    const primero = puntos[0].valor;
    const ultimo = puntos[puntos.length - 1].valor;
    const cambio = ultimo - primero;
    const pctCambio = primero > 0 ? (cambio / primero * 100) : 0;
    const estado = cambio > 0 ? "up" : cambio < 0 ? "down" : "flat";
    const estadoTexto = cambio > 0 ? `↑ +${pctCambio.toFixed(1)}% desde el inicio` :
                          cambio < 0 ? `↓ ${pctCambio.toFixed(1)}% desde el inicio` :
                          "→ Estancado, sin cambios";

    wrap.innerHTML = `
      <div class="chart-card">
        <div class="chart-card__title">Peso máximo por sesión</div>
        <div class="chart-card__subtitle">${puntos.length} registro(s)</div>
        ${buildLineChart(puntos.map(p => p.valor), puntos.map(p => ForgeUI.formatFecha(p.fecha)), "kg")}
        <div class="chart-card__trend trend--${estado}">${estadoTexto}</div>
      </div>
    `;
  }

  // ---------------- POR GRUPO MUSCULAR ----------------
  function renderPorGrupoMuscular(container) {
    container.innerHTML = `<div id="grupoChartsWrap"></div>`;
    const wrap = document.getElementById("grupoChartsWrap");

    const gruposConDatos = new Set();
    state.historial.forEach(entreno => {
      (entreno.ejercicios || []).forEach(ej => {
        const base = DEFAULT_EXERCISES.find(d => d.id === ej.exerciseId);
        if (base) gruposConDatos.add(base.grupo);
      });
    });

    if (gruposConDatos.size === 0) {
      wrap.innerHTML = `<div class="empty-state"><p>Sin datos suficientes por grupo muscular todavía.</p></div>`;
      return;
    }

    gruposConDatos.forEach(grupo => {
      const card = document.createElement("div");
      card.className = "chart-card";

      // Para cada ejercicio del grupo, tomamos primer y último peso registrado
      const ejerciciosGrupo = new Map();
      state.historial.slice().reverse().forEach(entreno => {
        (entreno.ejercicios || []).forEach(ej => {
          const base = DEFAULT_EXERCISES.find(d => d.id === ej.exerciseId);
          if (base?.grupo !== grupo || !ej.series.length) return;
          const maxPeso = Math.max(...ej.series.map(s => s.peso || 0));
          if (maxPeso <= 0) return;
          if (!ejerciciosGrupo.has(ej.exerciseId)) ejerciciosGrupo.set(ej.exerciseId, { primero: maxPeso, ultimo: maxPeso });
          else ejerciciosGrupo.get(ej.exerciseId).ultimo = maxPeso;
        });
      });

      let sumaPct = 0, count = 0;
      ejerciciosGrupo.forEach(({ primero, ultimo }) => {
        if (primero > 0) {
          sumaPct += ((ultimo - primero) / primero) * 100;
          count++;
        }
      });
      const promedioPct = count > 0 ? sumaPct / count : 0;
      const estado = promedioPct > 0.5 ? "up" : promedioPct < -0.5 ? "down" : "flat";

      card.innerHTML = `
        <div class="chart-card__title">${grupo}</div>
        <div class="chart-card__subtitle">Progreso porcentual promedio (${count} ejercicio${count !== 1 ? "s" : ""})</div>
        <div style="display:flex;align-items:baseline;gap:8px;">
          <span style="font-family:var(--font-display);font-size:30px;" class="trend--${estado}">${promedioPct >= 0 ? "+" : ""}${promedioPct.toFixed(1)}%</span>
        </div>
      `;
      wrap.appendChild(card);
    });
  }

  // ---------------- PESO CORPORAL ----------------
  function renderPeso(container) {
    if (state.historialPeso.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">⚖️</div><p>Aún no registras tu peso corporal.<br>Ve a la pestaña Peso para empezar.</p></div>`;
      return;
    }
    const valores = state.historialPeso.map(p => p.peso);
    const fechas = state.historialPeso.map(p => ForgeUI.formatFecha(p.fecha));
    const primero = valores[0];
    const ultimo = valores[valores.length - 1];
    const cambio = ultimo - primero;
    const estado = cambio > 0 ? "up" : cambio < 0 ? "down" : "flat";

    container.innerHTML = `
      <div class="chart-card">
        <div class="chart-card__title">Evolución de peso corporal</div>
        <div class="chart-card__subtitle">${valores.length} registro(s)</div>
        ${buildLineChart(valores, fechas, "kg")}
        <div class="chart-card__trend trend--${estado}">${cambio > 0 ? "↑" : cambio < 0 ? "↓" : "→"} ${Math.abs(cambio).toFixed(1)} kg desde el primer registro</div>
      </div>
    `;
  }

  // ---------------- LEGADO (evolución de Poder) ----------------
  function renderLegado(container) {
    // Reconstruimos poder acumulado aproximado a partir del historial de entrenos
    // (cada entreno no guarda snapshot de poder histórico, así que mostramos poder actual + proyección simple)
    const poderActual = state.perfil?.poder || 0;
    const rangoActual = rangoPorPoder(poderActual);
    const siguiente = siguienteRango(rangoActual.id);
    const progreso = progresoHaciaSiguienteRango(poderActual, rangoActual.id);

    // Construir serie acumulada simple: contamos entrenos en el tiempo como proxy
    const entrenosOrdenados = state.historial.slice().reverse();
    let acumulado = 0;
    const puntos = entrenosOrdenados.map(e => {
      acumulado += 50; // aproximación visual (base por entreno)
      return acumulado;
    });

    container.innerHTML = `
      <div class="chart-card">
        <div class="chart-card__title">Poder Total</div>
        <div class="chart-card__subtitle">Rango actual: <strong style="color:${rangoActual.color}">${rangoActual.name}</strong></div>
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:10px;">
          <span style="font-family:var(--font-display);font-size:34px;color:${rangoActual.color};">${poderActual.toLocaleString()}</span>
          <span class="text-muted" style="font-size:12px;">PODER</span>
        </div>
        ${siguiente ? `
          <div class="rank-progress-bar" style="--rank-color:${rangoActual.color};--rank-color-sec:${rangoActual.colorSec};">
            <div class="rank-progress-bar__fill" style="width:${(progreso * 100).toFixed(0)}%;"></div>
          </div>
          <div class="rank-progress-label">
            <span>${rangoActual.name}</span>
            <span>${siguiente.name} (${siguiente.poderMin.toLocaleString()})</span>
          </div>
        ` : `<p class="text-forge" style="margin-top:8px;">Has alcanzado el rango máximo. Eres leyenda.</p>`}
        ${puntos.length > 1 ? buildLineChart(puntos, entrenosOrdenados.map(e => ForgeUI.formatFecha(e.fecha)), "pts") : ""}
      </div>
    `;
  }

  // ---------------- SVG LINE CHART (sin dependencias) ----------------
  function buildLineChart(valores, labels, unidad) {
    if (valores.length === 1) {
      return `<div style="text-align:center;padding:20px 0;"><span style="font-family:var(--font-display);font-size:28px;">${valores[0]} ${unidad}</span></div>`;
    }
    const w = 300, h = 120, pad = 10;
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const range = max - min || 1;

    const pts = valores.map((v, i) => {
      const x = pad + (i / (valores.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return [x, y];
    });

    const pathD = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const areaD = pathD + ` L${pts[pts.length - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`;

    const dots = pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="#C1272D"/>`).join("");

    return `
      <svg class="svg-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#C1272D" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#C1272D" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${areaD}" fill="url(#areaGrad)" stroke="none"/>
        <path d="${pathD}" fill="none" stroke="#C1272D" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}
      </svg>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-muted);margin-top:4px;">
        <span>${labels[0]}</span><span>${labels[labels.length - 1]}</span>
      </div>
    `;
  }

  return { render };
})();
