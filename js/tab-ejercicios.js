// ============================================================
// THE FORGE — tab-ejercicios.js
// Base de datos de ejercicios: filtrar, buscar, editar, agregar
// ============================================================

const TabEjercicios = (() => {
  let state = {
    ejercicios: [],
    filtroGrupo: "Todos",
    filtroCategoria: "Todas",
    busqueda: ""
  };

  const FILTROS_GRUPO = ["Todos", ...MUSCLE_GROUPS];
  const FILTROS_CATEGORIA = ["Todas", ...MOVE_CATEGORIES];

  async function render() {
    const panel = document.getElementById("tab-ejercicios");
    state.ejercicios = await ForgeStorage.getBaseEjercicios();

    panel.innerHTML = `
      <h1 class="section-title">Base de Ejercicios</h1>
      <p class="section-subtitle">Busca, filtra y administra tu biblioteca de movimientos.</p>

      <div class="field lib-search">
        <input type="text" class="field__input" id="exSearch" placeholder="Buscar ejercicio...">
      </div>

      <div class="lib-filters" id="filtersGrupo"></div>
      <div class="lib-filters" id="filtersCategoria"></div>

      <div id="exerciseList"></div>

      <button class="fab-add" id="btnNuevoEjercicio" aria-label="Nuevo ejercicio">+</button>
    `;

    renderChipsGrupo();
    renderChipsCategoria();
    renderList();

    document.getElementById("exSearch").oninput = (e) => {
      state.busqueda = e.target.value.toLowerCase();
      renderList();
    };
    document.getElementById("btnNuevoEjercicio").onclick = abrirFormularioEjercicio;
  }

  function renderChipsGrupo() {
    const container = document.getElementById("filtersGrupo");
    container.innerHTML = "";
    FILTROS_GRUPO.forEach(g => {
      const chip = document.createElement("button");
      chip.className = "lib-filter-chip" + (state.filtroGrupo === g ? " active" : "");
      chip.textContent = g;
      chip.onclick = () => { state.filtroGrupo = g; renderChipsGrupo(); renderList(); };
      container.appendChild(chip);
    });
  }

  function renderChipsCategoria() {
    const container = document.getElementById("filtersCategoria");
    container.innerHTML = "";
    FILTROS_CATEGORIA.forEach(c => {
      const chip = document.createElement("button");
      chip.className = "lib-filter-chip" + (state.filtroCategoria === c ? " active" : "");
      chip.textContent = c;
      chip.onclick = () => { state.filtroCategoria = c; renderChipsCategoria(); renderList(); };
      container.appendChild(chip);
    });
  }

  function renderList() {
    const container = document.getElementById("exerciseList");
    let filtrados = state.ejercicios.filter(e => {
      const matchGrupo = state.filtroGrupo === "Todos" || e.grupo === state.filtroGrupo;
      const matchCategoria = state.filtroCategoria === "Todas" || e.categoria === state.filtroCategoria;
      const matchBusqueda = !state.busqueda || e.nombre.toLowerCase().includes(state.busqueda);
      return matchGrupo && matchCategoria && matchBusqueda;
    });

    if (filtrados.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🔍</div><p>No se encontraron ejercicios.</p></div>`;
      return;
    }

    container.innerHTML = "";
    filtrados.forEach(ej => {
      const row = document.createElement("div");
      row.className = "lib-exercise-row";
      row.innerHTML = `
        <div class="lib-exercise-row__info">
          <div class="lib-exercise-row__name">${ej.nombre}</div>
          <div class="lib-exercise-row__meta">${ej.grupo} · ${ej.categoria}${ej.url ? " · 🎥" : ""}</div>
        </div>
        <button class="lib-exercise-row__edit" aria-label="Editar">
          <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
        </button>
      `;
      row.querySelector(".lib-exercise-row__edit").onclick = () => abrirFormularioEjercicio(ej);
      container.appendChild(row);
    });
  }

  // ---------------- FORMULARIO AGREGAR/EDITAR ----------------
  function abrirFormularioEjercicio(ejercicioExistente) {
    const esEdicion = !!ejercicioExistente;
    const ej = ejercicioExistente || { id: "", nombre: "", grupo: MUSCLE_GROUPS[0], categoria: MOVE_CATEGORIES[0], url: "" };

    ForgeUI.modal({
      title: esEdicion ? "Editar ejercicio" : "Nuevo ejercicio",
      bodyHTML: `
        <div class="field">
          <label class="field__label">Nombre</label>
          <input type="text" class="field__input" id="fNombre" value="${ej.nombre}" placeholder="Ej: Press inclinado">
        </div>
        <div class="field">
          <label class="field__label">Grupo muscular</label>
          <select class="field__select" id="fGrupo">
            ${MUSCLE_GROUPS.map(g => `<option value="${g}" ${ej.grupo === g ? "selected" : ""}>${g}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label class="field__label">Categoría de movimiento</label>
          <select class="field__select" id="fCategoria">
            ${MOVE_CATEGORIES.map(c => `<option value="${c}" ${ej.categoria === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label class="field__label">URL del video (técnica)</label>
          <input type="url" class="field__input" id="fUrl" value="${ej.url || ""}" placeholder="https://...">
        </div>
      `,
      buttons: [
        { label: "Cancelar", variant: "secondary" },
        { label: esEdicion ? "Guardar cambios" : "Crear ejercicio", variant: "primary", onClick: async () => {
          const nombre = document.getElementById("fNombre").value.trim();
          const grupo = document.getElementById("fGrupo").value;
          const categoria = document.getElementById("fCategoria").value;
          const url = document.getElementById("fUrl").value.trim();
          if (!nombre) { ForgeUI.toast("El nombre no puede estar vacío."); return; }

          const id = esEdicion ? ej.id : "ex_custom_" + Date.now();
          const nuevoEjercicio = { id, nombre, grupo, categoria, url };

          const idx = state.ejercicios.findIndex(e => e.id === id);
          if (idx >= 0) state.ejercicios[idx] = nuevoEjercicio;
          else state.ejercicios.push(nuevoEjercicio);

          await ForgeStorage.guardarBaseEjercicios(state.ejercicios.filter(e => {
            const def = DEFAULT_EXERCISES.find(d => d.id === e.id);
            return !def || JSON.stringify(def) !== JSON.stringify(e);
          }));

          renderList();
          ForgeUI.toast(esEdicion ? "Ejercicio actualizado." : "Ejercicio agregado.");
        }}
      ]
    });
  }

  return { render };
})();
