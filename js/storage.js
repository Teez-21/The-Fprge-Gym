// ============================================================
// THE FORGE — storage.js
// Capa de persistencia. Usa Firebase si está configurado,
// si no, cae a localStorage (modo local, un solo dispositivo).
// ============================================================

const ForgeStorage = (() => {
  let firebaseReady = false;
  let firebaseEnabled = false;
  let currentUser = null; // { uid, email, displayName }

  window.addEventListener("forge:firebase-ready", (e) => {
    firebaseReady = true;
    firebaseEnabled = e.detail.enabled;
    window.dispatchEvent(new CustomEvent("forge:storage-ready", { detail: { enabled: firebaseEnabled } }));
  });

  // ---------------- LOCAL FALLBACK HELPERS ----------------
  function lsGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function lsSet(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  const LOCAL_UID = "local_user";

  /**
   * Espera a que Firebase determine si hay una sesión guardada (Firebase Auth
   * persiste la sesión sola en el dispositivo). Se resuelve con el perfil
   * completo si hay sesión activa, o null si no la hay.
   */
  function esperarSesionPersistida() {
    return new Promise((resolve) => {
      if (!firebaseEnabled) { resolve(null); return; }
      const fb = window.Forge.firebase;
      const unsubscribe = fb.onAuthStateChanged(fb.auth, async (user) => {
        unsubscribe();
        if (!user) { resolve(null); return; }
        try {
          const snap = await fb.getDoc(fb.doc(fb.db, "usuarios", user.uid));
          currentUser = { uid: user.uid, email: user.email, displayName: user.displayName, ...snap.data() };
          resolve(currentUser);
        } catch (e) {
          resolve(null);
        }
      });
    });
  }

  // ---------------- AUTH ----------------
  async function registrarUsuario(email, password, displayName) {
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      const cred = await fb.createUserWithEmailAndPassword(fb.auth, email, password);
      await fb.updateProfile(cred.user, { displayName });
      await fb.setDoc(fb.doc(fb.db, "usuarios", cred.user.uid), {
        displayName, email,
        creadoEn: fb.serverTimestamp(),
        onboardingCompleto: false,
        poder: 0,
        rangoId: 0,
        grupoId: null
      });
      currentUser = { uid: cred.user.uid, email, displayName };
      return currentUser;
    } else {
      const perfil = { uid: LOCAL_UID, email, displayName, onboardingCompleto: false, poder: 0, rangoId: 0, grupoId: null };
      lsSet("forge_perfil", perfil);
      currentUser = perfil;
      return currentUser;
    }
  }

  async function iniciarSesion(email, password) {
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      const cred = await fb.signInWithEmailAndPassword(fb.auth, email, password);
      const snap = await fb.getDoc(fb.doc(fb.db, "usuarios", cred.user.uid));
      currentUser = { uid: cred.user.uid, email, displayName: cred.user.displayName, ...snap.data() };
      return currentUser;
    } else {
      const perfil = lsGet("forge_perfil", null);
      if (!perfil) throw new Error("No hay usuario local registrado.");
      currentUser = perfil;
      return currentUser;
    }
  }

  function cerrarSesion() {
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      fb.signOut(fb.auth);
    }
    currentUser = null;
  }

  function getUsuarioActual() {
    if (currentUser) return currentUser;
    if (!firebaseEnabled) {
      const perfil = lsGet("forge_perfil", null);
      if (perfil) currentUser = perfil;
    }
    return currentUser;
  }

  function getUid() {
    const u = getUsuarioActual();
    return u ? u.uid : LOCAL_UID;
  }

  // ---------------- PERFIL ----------------
  async function actualizarPerfil(datos) {
    const uid = getUid();
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      await fb.updateDoc(fb.doc(fb.db, "usuarios", uid), datos);
    } else {
      const perfil = lsGet("forge_perfil", {});
      Object.assign(perfil, datos);
      lsSet("forge_perfil", perfil);
    }
    if (currentUser) Object.assign(currentUser, datos);
  }

  async function getPerfil() {
    const uid = getUid();
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      const snap = await fb.getDoc(fb.doc(fb.db, "usuarios", uid));
      return snap.exists() ? snap.data() : null;
    } else {
      return lsGet("forge_perfil", null);
    }
  }

  // ---------------- RUTINA (config del usuario) ----------------
  async function guardarConfigRutina(config) {
    const uid = getUid();
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      await fb.setDoc(fb.doc(fb.db, "usuarios", uid, "config", "rutina"), config);
    } else {
      lsSet("forge_rutina_config_" + uid, config);
    }
  }
  async function getConfigRutina() {
    const uid = getUid();
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      const snap = await fb.getDoc(fb.doc(fb.db, "usuarios", uid, "config", "rutina"));
      return snap.exists() ? snap.data() : null;
    } else {
      return lsGet("forge_rutina_config_" + uid, null);
    }
  }

  // ---------------- EJERCICIOS GUARDADOS POR DÍA ----------------
  async function guardarEjerciciosDelDia(diaKey, variante, ejercicioIds) {
    const uid = getUid();
    const key = `${diaKey}__${variante || "default"}`;
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      await fb.setDoc(fb.doc(fb.db, "usuarios", uid, "diasRutina", key), { ejercicioIds });
    } else {
      const all = lsGet("forge_dias_rutina_" + uid, {});
      all[key] = ejercicioIds;
      lsSet("forge_dias_rutina_" + uid, all);
    }
  }
  async function getEjerciciosDelDia(diaKey, variante) {
    const uid = getUid();
    const key = `${diaKey}__${variante || "default"}`;
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      const snap = await fb.getDoc(fb.doc(fb.db, "usuarios", uid, "diasRutina", key));
      return snap.exists() ? snap.data().ejercicioIds : [];
    } else {
      const all = lsGet("forge_dias_rutina_" + uid, {});
      return all[key] || [];
    }
  }

  // ---------------- BASE DE EJERCICIOS (GLOBAL, compartida por todos los usuarios) ----------------
  // Vive en la colección /ejerciciosGlobales, visible y editable por cualquier
  // usuario autenticado. Los DEFAULT_EXERCISES actúan como semilla inicial:
  // la primera vez que alguien la pide y está vacía, se siembra una sola vez.
  async function getBaseEjercicios() {
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      const { getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      const snap = await getDocs(fb.collection(fb.db, "ejerciciosGlobales"));
      if (snap.empty) {
        await sembrarEjerciciosGlobales();
        return DEFAULT_EXERCISES.map(e => ({ ...e }));
      }
      return snap.docs.map(d => d.data());
    } else {
      const custom = lsGet("forge_ejercicios_globales_local", null);
      if (!custom) {
        lsSet("forge_ejercicios_globales_local", DEFAULT_EXERCISES);
        return DEFAULT_EXERCISES.map(e => ({ ...e }));
      }
      return custom;
    }
  }

  async function sembrarEjerciciosGlobales() {
    const fb = window.Forge.firebase;
    const writes = DEFAULT_EXERCISES.map(e =>
      fb.setDoc(fb.doc(fb.db, "ejerciciosGlobales", e.id), e)
    );
    await Promise.all(writes);
  }

  /** Crea o actualiza UN ejercicio en el catálogo global (visible para todos de inmediato) */
  async function guardarEjercicioGlobal(ejercicio) {
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      await fb.setDoc(fb.doc(fb.db, "ejerciciosGlobales", ejercicio.id), ejercicio);
    } else {
      const lista = lsGet("forge_ejercicios_globales_local", DEFAULT_EXERCISES.map(e => ({ ...e })));
      const idx = lista.findIndex(e => e.id === ejercicio.id);
      if (idx >= 0) lista[idx] = ejercicio; else lista.push(ejercicio);
      lsSet("forge_ejercicios_globales_local", lista);
    }
  }

  /** Suscripción en tiempo real al catálogo global de ejercicios */
  function escucharEjerciciosGlobales(callback) {
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      return fb.onSnapshot(fb.collection(fb.db, "ejerciciosGlobales"), (snap) => {
        if (snap.empty) return; // evita parpadeo vacío mientras se siembra
        callback(snap.docs.map(d => d.data()));
      });
    } else {
      const interval = setInterval(() => {
        callback(lsGet("forge_ejercicios_globales_local", DEFAULT_EXERCISES));
      }, 3000);
      return () => clearInterval(interval);
    }
  }

  // ---------------- ENTRENOS (historial) ----------------
  async function guardarEntreno(entreno) {
    const uid = getUid();
    entreno.fecha = entreno.fecha || new Date().toISOString();
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      const ref = await fb.addDoc(fb.collection(fb.db, "usuarios", uid, "entrenos"), {
        ...entreno, creadoEn: fb.serverTimestamp()
      });
      return ref.id;
    } else {
      const all = lsGet("forge_entrenos_" + uid, []);
      const id = "ent_" + Date.now();
      all.push({ ...entreno, id });
      lsSet("forge_entrenos_" + uid, all);
      return id;
    }
  }

  /** Actualiza un entreno ya guardado (ej. al aprobarlo) */
  async function actualizarEntreno(uid, entrenoId, datos) {
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      await fb.updateDoc(fb.doc(fb.db, "usuarios", uid, "entrenos", entrenoId), datos);
    } else {
      const all = lsGet("forge_entrenos_" + uid, []);
      const idx = all.findIndex(e => e.id === entrenoId);
      if (idx >= 0) { Object.assign(all[idx], datos); lsSet("forge_entrenos_" + uid, all); }
    }
  }

  // ---------------- GIMNASIO DE REFERENCIA (ubicación silenciosa) ----------------
  async function getGimnasioReferencia() {
    const perfil = await getPerfil();
    return perfil?.gimnasioRef || null;
  }
  async function guardarGimnasioReferencia(lat, lon) {
    await actualizarPerfil({ gimnasioRef: { lat, lon } });
  }

  async function getHistorialEntrenos(limite) {
    const uid = getUid();
    return getHistorialEntrenosDeUid(uid, limite);
  }

  async function getHistorialEntrenosDeUid(uid, limite) {
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      const q = fb.query(
        fb.collection(fb.db, "usuarios", uid, "entrenos"),
        fb.orderBy("fecha", "desc"),
        fb.limit(limite || 200)
      );
      const { getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      const all = lsGet("forge_entrenos_" + uid, []);
      return all.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, limite || 200);
    }
  }

  /** Último entreno (o cardio) registrado por un compañero de grupo */
  async function getUltimoEntrenoDeUid(uid) {
    const historial = await getHistorialEntrenosDeUid(uid, 1);
    return historial.length ? historial[0] : null;
  }

  /** Devuelve el último registro de cada ejercicio: { exerciseId: {series, fecha} } */
  async function getUltimoRegistroPorEjercicio() {
    const historial = await getHistorialEntrenos(200);
    const resultado = {};
    // Recorremos del más antiguo al más reciente para que el último gane
    historial.slice().reverse().forEach(entreno => {
      (entreno.ejercicios || []).forEach(ej => {
        resultado[ej.exerciseId] = { series: ej.series, fecha: entreno.fecha, nombre: ej.nombre };
      });
    });
    return resultado;
  }

  // ---------------- PESO CORPORAL ----------------
  async function guardarPesoCorporal(peso, fecha) {
    const uid = getUid();
    const registro = { peso, fecha: fecha || new Date().toISOString() };
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      await fb.addDoc(fb.collection(fb.db, "usuarios", uid, "pesoCorporal"), {
        ...registro, creadoEn: fb.serverTimestamp()
      });
    } else {
      const all = lsGet("forge_peso_" + uid, []);
      all.push(registro);
      lsSet("forge_peso_" + uid, all);
    }
  }
  async function getHistorialPeso() {
    const uid = getUid();
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      const { getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      const q = fb.query(fb.collection(fb.db, "usuarios", uid, "pesoCorporal"), fb.orderBy("fecha", "asc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data());
    } else {
      const all = lsGet("forge_peso_" + uid, []);
      return all.slice().sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    }
  }
  async function getUltimoPesoCorporal() {
    const hist = await getHistorialPeso();
    return hist.length ? hist[hist.length - 1].peso : null;
  }

  // ---------------- RECORDATORIO DE PESAJE ----------------
  async function guardarRecordatorioPeso(frecuenciaDias) {
    await actualizarPerfil({ recordatorioPesoFrecuencia: frecuenciaDias, recordatorioPesoUltimaVez: new Date().toISOString() });
  }

  // ---------------- LEGADO ----------------
  async function guardarOnboardingLegado(datos) {
    // datos: { sexo, pesoCorporal, marcas, percentilGlobal, detalle, rangoId }
    await actualizarPerfil({
      onboardingCompleto: true,
      sexo: datos.sexo,
      percentilGlobal: datos.percentilGlobal,
      percentilDetalle: datos.detalle,
      rangoId: datos.rangoId,
      poder: 0
    });
  }

  async function sumarPoder(cantidad) {
    const perfil = await getPerfil();
    const nuevoPoder = (perfil?.poder || 0) + cantidad;
    const rangoPorPuntos = rangoPorPoder(nuevoPoder);
    const rangoBaseActual = RANKS[perfil?.rangoId || 0];
    const rangoFinal = rangoPorPuntos.id > rangoBaseActual.id ? rangoPorPuntos : rangoBaseActual;
    const subioDeRango = rangoFinal.id > rangoBaseActual.id;
    await actualizarPerfil({ poder: nuevoPoder, rangoId: rangoFinal.id });
    return { poder: nuevoPoder, rango: rangoFinal, subioDeRango };
  }

  // ---------------- RACHA / GRUPO ----------------
  async function getGrupo(grupoId) {
    if (!grupoId) return null;
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      const snap = await fb.getDoc(fb.doc(fb.db, "grupos", grupoId));
      return snap.exists() ? { id: grupoId, ...snap.data() } : null;
    } else {
      const data = lsGet("forge_grupo_" + grupoId, null);
      return data ? { id: grupoId, ...data } : null;
    }
  }

  async function crearGrupo(nombre, miembroUid) {
    const grupoId = "grp_" + Date.now();
    const perfil = await getPerfil();
    const data = {
      nombre,
      miembros: [miembroUid],
      nombres: { [miembroUid]: perfil?.displayName || "Guerrero" },
      racha: 0,
      ultimaActividad: {},
      diasDescanso: {},
      congelamientos: [],
      historialNotificaciones: []
    };
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      await fb.setDoc(fb.doc(fb.db, "grupos", grupoId), data);
    } else {
      lsSet("forge_grupo_" + grupoId, data);
    }
    await actualizarPerfil({ grupoId });
    return grupoId;
  }

  async function unirseAGrupo(grupoId, miembroUid) {
    const grupo = await getGrupo(grupoId);
    if (!grupo) throw new Error("Grupo no encontrado");
    const perfil = await getPerfil();
    const nombreUsuario = perfil?.displayName || "Guerrero";
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      await fb.updateDoc(fb.doc(fb.db, "grupos", grupoId), {
        miembros: fb.arrayUnion(miembroUid),
        [`nombres.${miembroUid}`]: nombreUsuario
      });
    } else {
      grupo.miembros = Array.from(new Set([...grupo.miembros, miembroUid]));
      grupo.nombres = { ...(grupo.nombres || {}), [miembroUid]: nombreUsuario };
      const { id, ...resto } = grupo;
      lsSet("forge_grupo_" + grupoId, resto);
    }
    await actualizarPerfil({ grupoId });
  }

  function escucharGrupo(grupoId, callback) {
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      return fb.onSnapshot(fb.doc(fb.db, "grupos", grupoId), (snap) => {
        if (snap.exists()) callback({ id: grupoId, ...snap.data() });
      });
    } else {
      // Modo local: simulamos con polling cada 3s (no hay multi-dispositivo real)
      const interval = setInterval(async () => {
        const grupo = await getGrupo(grupoId);
        if (grupo) callback(grupo);
      }, 3000);
      return () => clearInterval(interval);
    }
  }

  async function actualizarGrupo(grupoId, datos) {
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      await fb.updateDoc(fb.doc(fb.db, "grupos", grupoId), datos);
    } else {
      const grupo = await getGrupo(grupoId);
      if (!grupo) throw new Error("Grupo no encontrado: " + grupoId);
      const { id, ...resto } = grupo;
      Object.assign(resto, datos);
      lsSet("forge_grupo_" + grupoId, resto);
    }
  }

  /** Crea una solicitud de aprobación de entreno visible para el grupo */
  async function crearSolicitudAprobacion(grupoId, solicitud) {
    const grupo = await getGrupo(grupoId);
    if (!grupo) throw new Error("Grupo no encontrado");
    const nueva = {
      id: "apr_" + Date.now(),
      uid: getUid(),
      entrenoId: solicitud.entrenoId,
      fotoDataUrl: solicitud.fotoDataUrl,
      motivo: solicitud.motivo,
      fecha: new Date().toISOString(),
      estado: "pendiente"
    };
    // Mantenemos solo las últimas 15 solicitudes (pendientes siempre se conservan)
    // para no exceder el límite de 1MB por documento de Firestore, ya que cada
    // foto comprimida pesa unos KB.
    const todas = [...(grupo.solicitudesAprobacion || []), nueva];
    const pendientes = todas.filter(s => s.estado === "pendiente");
    const resueltas = todas.filter(s => s.estado !== "pendiente").slice(-10);
    const solicitudes = [...resueltas, ...pendientes];

    const notifs = [...(grupo.historialNotificaciones || []), {
      texto: `${grupo.nombres?.[getUid()] || "Tu compañero"} necesita que apruebes su entreno de hoy.`,
      icono: "📸",
      fecha: new Date().toISOString()
    }].slice(-30);
    await actualizarGrupo(grupoId, { solicitudesAprobacion: solicitudes, historialNotificaciones: notifs });
    return nueva.id;
  }

  /** Aprueba o rechaza una solicitud pendiente */
  async function resolverSolicitudAprobacion(grupoId, solicitudId, aprobado) {
    const grupo = await getGrupo(grupoId);
    if (!grupo) throw new Error("Grupo no encontrado");
    const solicitudes = (grupo.solicitudesAprobacion || []).map(s =>
      s.id === solicitudId ? { ...s, estado: aprobado ? "aprobado" : "rechazado", resueltoPor: getUid() } : s
    );
    const solicitud = solicitudes.find(s => s.id === solicitudId);
    const notifs = [...(grupo.historialNotificaciones || []), {
      texto: aprobado ? "Tu entreno fue aprobado por tu compañero. ¡Cuenta para tu racha!" : "Tu entreno no pudo ser aprobado por tu compañero.",
      icono: aprobado ? "✅" : "❌",
      fecha: new Date().toISOString()
    }].slice(-30);
    await actualizarGrupo(grupoId, { solicitudesAprobacion: solicitudes, historialNotificaciones: notifs });
    return solicitud;
  }

  return {
    isFirebaseEnabled: () => firebaseEnabled,
    registrarUsuario, iniciarSesion, cerrarSesion, getUsuarioActual, getUid, esperarSesionPersistida,
    actualizarPerfil, getPerfil,
    guardarConfigRutina, getConfigRutina,
    guardarEjerciciosDelDia, getEjerciciosDelDia,
    getBaseEjercicios, guardarEjercicioGlobal, escucharEjerciciosGlobales,
    guardarEntreno, actualizarEntreno, getHistorialEntrenos, getUltimoRegistroPorEjercicio, getUltimoEntrenoDeUid,
    guardarPesoCorporal, getHistorialPeso, getUltimoPesoCorporal, guardarRecordatorioPeso,
    guardarOnboardingLegado, sumarPoder,
    getGimnasioReferencia, guardarGimnasioReferencia,
    getGrupo, crearGrupo, unirseAGrupo, escucharGrupo, actualizarGrupo,
    crearSolicitudAprobacion, resolverSolicitudAprobacion
  };
})();
