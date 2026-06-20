// ============================================================
// THE FORGE — tab-grupo.js
// Grupos, racha compartida, congelamiento, notificaciones in-app
// ============================================================

const TabGrupo = (() => {
  let state = {
    perfil: null,
    grupo: null,
    unsubscribe: null,
    diasDescansoLocal: []
  };

  async function render() {
    const panel = document.getElementById("tab-grupo");
    state.perfil = await ForgeStorage.getPerfil();

    if (!state.perfil?.grupoId) {
      renderSinGrupo(panel);
      return;
    }

    state.grupo = await ForgeStorage.getGrupo(state.perfil.grupoId);
    if (!state.grupo) {
      renderSinGrupo(panel);
      return;
    }

    renderGrupo(panel);

    // Suscripción en tiempo real (o polling en modo local)
    if (state.unsubscribe) state.unsubscribe();
    state.unsubscribe = ForgeStorage.escucharGrupo(state.perfil.grupoId, (grupoActualizado) => {
      const rachaAnterior = state.grupo?.racha || 0;
      state.grupo = grupoActualizado;
      // Refresco parcial: no reconstruimos todo el panel para no interrumpir
      // al usuario mientras interactúa (ej. seleccionando días de descanso).
      if (document.getElementById("membersWrap")) renderMiembros();
      if (document.getElementById("notifFeedWrap")) renderNotifFeed();
      const streakCount = panel.querySelector(".streak-hero__count");
      if (streakCount) streakCount.textContent = state.grupo.racha || 0;
      revisarNotificacionesNuevas(rachaAnterior);
    });
  }

  // ---------------- SIN GRUPO ----------------
  function renderSinGrupo(panel) {
    panel.innerHTML = `
      <h1 class="section-title">Grupo</h1>
      <p class="section-subtitle">Entrena en equipo. Mantengan la racha vivos.</p>
      <div class="no-group-cta">
        <div class="no-group-cta__icon">⚔️</div>
        <p style="margin-bottom:var(--space-lg);color:var(--text-secondary);">Aún no perteneces a ningún grupo.</p>
        <button class="btn btn--primary" id="btnCrearGrupo" style="margin-bottom:10px;">Crear grupo</button>
        <button class="btn btn--secondary" id="btnUnirseGrupo">Unirme a un grupo</button>
      </div>
    `;
    document.getElementById("btnCrearGrupo").onclick = abrirCrearGrupo;
    document.getElementById("btnUnirseGrupo").onclick = abrirUnirseGrupo;
  }

  function abrirCrearGrupo() {
    ForgeUI.modal({
      title: "Crear grupo",
      bodyHTML: `
        <div class="field">
          <label class="field__label">Nombre del grupo</label>
          <input type="text" class="field__input" id="gNombre" placeholder="Ej: Los Forjados">
        </div>
      `,
      buttons: [
        { label: "Cancelar", variant: "secondary" },
        { label: "Crear", variant: "primary", onClick: async () => {
          const nombre = document.getElementById("gNombre").value.trim();
          if (!nombre) { ForgeUI.toast("Ponle un nombre a tu grupo."); return; }
          const uid = ForgeStorage.getUid();
          const grupoId = await ForgeStorage.crearGrupo(nombre, uid);
          ForgeUI.modal({
            title: "¡Grupo creado!",
            bodyHTML: `<p>Comparte este código con tu compañero de entreno:</p><div class="group-code">${grupoId.replace("grp_", "")}</div>`,
            buttons: [{ label: "Listo", variant: "primary", onClick: () => render() }]
          });
        }}
      ]
    });
  }

  function abrirUnirseGrupo() {
    ForgeUI.modal({
      title: "Unirme a un grupo",
      bodyHTML: `
        <div class="field">
          <label class="field__label">Código del grupo</label>
          <input type="text" class="field__input" id="gCodigo" placeholder="Código compartido">
        </div>
      `,
      buttons: [
        { label: "Cancelar", variant: "secondary" },
        { label: "Unirme", variant: "primary", onClick: async () => {
          const codigo = document.getElementById("gCodigo").value.trim();
          if (!codigo) return;
          const grupoId = "grp_" + codigo;
          const uid = ForgeStorage.getUid();
          try {
            await ForgeStorage.unirseAGrupo(grupoId, uid);
            ForgeUI.toast("Te uniste al grupo.");
            render();
          } catch (e) {
            ForgeUI.toast("No se encontró ese grupo.");
          }
        }}
      ]
    });
  }

  // ---------------- CON GRUPO ----------------
  function renderGrupo(panel) {
    const grupo = state.grupo;
    const codigoVisible = (grupo.id || "").replace("grp_", "");

    panel.innerHTML = `
      <h1 class="section-title">${grupo.nombre}</h1>
      <p class="section-subtitle">${grupo.miembros.length} miembro(s)</p>

      <div class="group-code-persistent">
        <span class="group-code-persistent__value">${codigoVisible}</span>
        <button class="group-code-persistent__copy" id="btnCopiarCodigo">Copiar código</button>
      </div>

      <div class="streak-hero">
        <div class="streak-hero__flame">🔥</div>
        <div class="streak-hero__count">${grupo.racha || 0}</div>
        <div class="streak-hero__label">Días de racha</div>
      </div>

      <div class="card">
        <h3 style="font-size:13px;margin-bottom:10px;color:var(--text-secondary);">Hoy</h3>
        <div id="membersWrap"></div>
      </div>

      <button class="freeze-btn" id="btnCongelar">
        ❄️ ¿Te vas de viaje? Congela tu racha aquí.
      </button>

      <div class="card" style="margin-top:var(--space-md);">
        <h3 style="font-size:13px;margin-bottom:10px;color:var(--text-secondary);">Mis días de descanso (máx. 3/semana)</h3>
        <div id="diasDescansoWrap"></div>
      </div>

      <div class="card">
        <h3 style="font-size:13px;margin-bottom:6px;color:var(--text-secondary);">Notificaciones</h3>
        <div id="notifFeedWrap"></div>
      </div>
    `;

    document.getElementById("btnCopiarCodigo").onclick = () => {
      navigator.clipboard?.writeText(codigoVisible).catch(() => {});
      ForgeUI.toast("Código copiado.");
    };

    renderMiembros();
    renderDiasDescanso();
    renderNotifFeed();

    document.getElementById("btnCongelar").onclick = abrirCongelarRacha;
  }

  function renderMiembros() {
    const wrap = document.getElementById("membersWrap");
    const grupo = state.grupo;
    const hoy = new Date().toISOString().slice(0, 10);
    wrap.innerHTML = "";
    grupo.miembros.forEach(uid => {
      const actividad = grupo.ultimaActividad?.[uid];
      const entrenoHoy = actividad === hoy;
      const diasDescanso = grupo.diasDescanso?.[uid] || [];
      const diaSemana = new Date().toLocaleDateString("es-CO", { weekday: "long" });
      const esDescansoHoy = diasDescanso.includes(diaSemana.toLowerCase());

      let estadoClass = "pending", estadoTexto = "Pendiente hoy", icono = "⏳";
      if (entrenoHoy) { estadoClass = "done"; estadoTexto = "Entrenó hoy"; icono = "✓"; }
      else if (esDescansoHoy) { estadoClass = "rest"; estadoTexto = "Día de descanso"; icono = "💤"; }

      const nombreMostrar = uid === ForgeStorage.getUid() ? "Tú" : (grupo.nombres?.[uid] || "Compañero");
      const iniciales = (grupo.nombres?.[uid] || "??").slice(0, 2).toUpperCase();

      const memberBlock = document.createElement("div");
      memberBlock.innerHTML = `
        <div class="member-row" style="cursor:pointer;" data-member-uid="${uid}">
          <div class="member-avatar">${iniciales}</div>
          <div class="member-row__info">
            <div class="member-row__name">${nombreMostrar}</div>
            <div class="member-row__status">${estadoTexto} · <span style="text-decoration:underline;">ver último entreno</span></div>
          </div>
          <div class="member-row__check ${estadoClass}">${icono}</div>
        </div>
        <div data-last-workout="${uid}"></div>
      `;
      wrap.appendChild(memberBlock);

      memberBlock.querySelector(".member-row").onclick = () => toggleUltimoEntreno(uid);
    });
  }

  async function toggleUltimoEntreno(uid) {
    const target = document.querySelector(`[data-last-workout="${uid}"]`);
    if (!target) return;
    if (target.dataset.open === "true") {
      target.innerHTML = "";
      target.dataset.open = "false";
      return;
    }
    target.innerHTML = `<div class="last-workout-card"><span class="text-muted">Cargando...</span></div>`;
    const entreno = await ForgeStorage.getUltimoEntrenoDeUid(uid);
    target.dataset.open = "true";
    if (!entreno) {
      target.innerHTML = `<div class="last-workout-card text-muted">Sin entrenos registrados todavía.</div>`;
      return;
    }
    if (entreno.tipo === "cardio") {
      target.innerHTML = `
        <div class="last-workout-card">
          <div class="last-workout-card__title">Cardio · ${ForgeUI.formatFecha(entreno.fecha)}</div>
          <div class="last-workout-card__row"><span>${entreno.cardio?.tipo || ""}</span><span>${entreno.cardio?.duracion || "?"} min</span></div>
          <div class="last-workout-card__row"><span>Dificultad</span><span>${entreno.cardio?.dificultad || "—"}</span></div>
        </div>
      `;
      return;
    }
    const filas = (entreno.ejercicios || []).map(ej => {
      const maxPeso = ej.series?.length ? Math.max(...ej.series.map(s => s.peso || 0)) : 0;
      return `<div class="last-workout-card__row"><span>${ej.nombre}</span><span>${ForgeNumberPicker.formatWeightEs(maxPeso)} kg</span></div>`;
    }).join("");
    target.innerHTML = `
      <div class="last-workout-card">
        <div class="last-workout-card__title">${entreno.diaNombre || "Entreno"} · ${ForgeUI.formatFecha(entreno.fecha)}</div>
        ${filas || `<span class="text-muted">Sin detalle de ejercicios.</span>`}
      </div>
    `;
  }

  const DIAS_SEMANA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

  function renderDiasDescanso() {
    const wrap = document.getElementById("diasDescansoWrap");
    const uid = ForgeStorage.getUid();
    const seleccionados = state.grupo.diasDescanso?.[uid] || [];

    wrap.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${DIAS_SEMANA.map(d => `
          <button class="lib-filter-chip ${seleccionados.includes(d) ? "active" : ""}" data-dia="${d}">${d.slice(0, 3)}</button>
        `).join("")}
      </div>
    `;

    wrap.querySelectorAll("[data-dia]").forEach(btn => {
      btn.onclick = async () => {
        const dia = btn.dataset.dia;
        let actuales = state.grupo.diasDescanso?.[uid] || [];
        if (actuales.includes(dia)) {
          actuales = actuales.filter(d => d !== dia);
        } else {
          if (actuales.length >= 3) {
            ForgeUI.toast("Máximo 3 días de descanso por semana.");
            return;
          }
          actuales = [...actuales, dia];
        }
        const nuevoDiasDescanso = { ...(state.grupo.diasDescanso || {}), [uid]: actuales };
        await ForgeStorage.actualizarGrupo(state.grupo.id, { diasDescanso: nuevoDiasDescanso });
        state.grupo.diasDescanso = nuevoDiasDescanso;
        renderDiasDescanso();
      };
    });
  }

  function renderNotifFeed() {
    const wrap = document.getElementById("notifFeedWrap");
    const historial = (state.grupo.historialNotificaciones || []).slice().reverse().slice(0, 15);
    if (historial.length === 0) {
      wrap.innerHTML = `<p class="text-muted" style="font-size:12px;">Sin actividad reciente.</p>`;
      return;
    }
    wrap.innerHTML = historial.map(n => `
      <div class="notif-feed-item">
        <div class="notif-feed-item__icon">${n.icono || "🔥"}</div>
        <div style="flex:1;">
          <div class="notif-feed-item__text">${n.texto}</div>
          <div class="notif-feed-item__time">${ForgeUI.formatFechaHora(n.fecha)}</div>
        </div>
      </div>
    `).join("");
  }

  // ---------------- REGISTRAR ACTIVIDAD DE HOY (llamado desde tab-rutina) ----------------
  async function registrarActividadHoy() {
    const perfil = await ForgeStorage.getPerfil();
    if (!perfil?.grupoId) return 0;

    const grupo = await ForgeStorage.getGrupo(perfil.grupoId);
    if (!grupo) return 0;

    const uid = ForgeStorage.getUid();
    const hoy = new Date().toISOString().slice(0, 10);
    const yaRegistradoHoy = grupo.ultimaActividad?.[uid] === hoy;
    if (yaRegistradoHoy) return grupo.racha || 0;

    const nuevaActividad = { ...(grupo.ultimaActividad || {}), [uid]: hoy };

    // Notificar al grupo
    const miNombre = perfil.displayName || "Tu compañero";
    const nuevaNotif = {
      texto: `${miNombre} completó su entreno. ¡Entrena para conservar la racha!`,
      icono: "🔥",
      fecha: new Date().toISOString()
    };
    const historial = [...(grupo.historialNotificaciones || []), nuevaNotif];

    // Evaluar si todos cumplieron hoy → sumar racha
    const diaSemana = new Date().toLocaleDateString("es-CO", { weekday: "long" }).toLowerCase();
    const miembrosEstado = grupo.miembros.map(m => {
      const cumplioEntreno = nuevaActividad[m] === hoy;
      const esDescanso = (grupo.diasDescanso?.[m] || []).includes(diaSemana);
      return { uid: m, registro: { entreno: cumplioEntreno, esDiaDescanso: esDescanso } };
    });

    const congeladaHoy = (grupo.congelamientos || []).some(c => c.fecha === hoy && c.estado === "congelada");
    const evaluacion = evaluarRachaDia(miembrosEstado, congeladaHoy);

    let nuevaRacha = grupo.racha || 0;
    if (evaluacion.viva && evaluacion.motivo === "Todos cumplieron") {
      nuevaRacha = (grupo.racha || 0) + 1;
    }

    await ForgeStorage.actualizarGrupo(perfil.grupoId, {
      ultimaActividad: nuevaActividad,
      historialNotificaciones: historial,
      racha: nuevaRacha
    });

    return nuevaRacha;
  }

  // ---------------- CONGELAR RACHA ----------------
  function abrirCongelarRacha() {
    ForgeUI.confirmar({
      titulo: "❄️ Congelar racha",
      mensaje: "Esto enviará una solicitud a tu compañero de grupo. Ambos deben aceptar dentro de las próximas 12 horas para que la racha quede protegida hoy.",
      textoConfirmar: "Enviar solicitud",
      onConfirm: enviarSolicitudCongelamiento
    });
  }

  async function enviarSolicitudCongelamiento() {
    const grupo = state.grupo;
    const hoy = new Date().toISOString().slice(0, 10);
    const uid = ForgeStorage.getUid();

    const solicitudesHoy = (grupo.congelamientos || []).filter(c => c.fecha === hoy && c.solicitante === uid).length;
    if (!puedeSolicitarCongelamiento(solicitudesHoy)) {
      ForgeUI.toast("Ya enviaste una solicitud de congelamiento hoy.");
      return;
    }

    const respuestas = {};
    grupo.miembros.forEach(m => { respuestas[m] = m === uid ? true : null; });

    const nuevaSolicitud = {
      fecha: hoy,
      solicitante: uid,
      timestamp: Date.now(),
      respuestas,
      estado: "pendiente"
    };

    const nuevasNotifs = [...(grupo.historialNotificaciones || []), {
      texto: `Se solicitó congelar la racha de hoy. Esperando respuesta del grupo.`,
      icono: "❄️",
      fecha: new Date().toISOString()
    }];

    await ForgeStorage.actualizarGrupo(grupo.id, {
      congelamientos: [...(grupo.congelamientos || []), nuevaSolicitud],
      historialNotificaciones: nuevasNotifs
    });

    ForgeUI.toast("Solicitud enviada. Esperando que tu compañero acepte.");
    render();
  }

  // ---------------- DETECCIÓN DE RACHA ROTA (pantalla de muerte) ----------------
  function revisarNotificacionesNuevas(rachaAnterior) {
    if (rachaAnterior > 0 && state.grupo.racha === 0) {
      mostrarPantallaMuerte();
    }
  }

  function mostrarPantallaMuerte() {
    const msg = getMensajeMuerteRacha();
    const overlay = document.createElement("div");
    overlay.className = "death-screen-overlay";
    overlay.innerHTML = `
      <div class="death-screen">
        <svg class="death-screen__icon" viewBox="0 0 24 24" fill="none" stroke="#6B6660" stroke-width="1.2">
          <path d="M12 2L4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4z"/>
          <path d="M9 9l6 6M15 9l-6 6"/>
        </svg>
        <div class="death-screen__title">${msg.titulo}</div>
        <div class="death-screen__text">${msg.texto}</div>
        <div class="death-screen__source">${msg.fuente}</div>
        <button class="death-screen__dismiss">Levántate</button>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));
    overlay.querySelector(".death-screen__dismiss").onclick = () => {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 1100);
    };
  }

  return { render, registrarActividadHoy };
})();
