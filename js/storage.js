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

  // ---------------- BASE DE EJERCICIOS (custom) ----------------
  async function getBaseEjercicios() {
    const uid = getUid();
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      const snap = await fb.getDoc(fb.doc(fb.db, "usuarios", uid, "config", "ejerciciosCustom"));
      const custom = snap.exists() ? snap.data().lista : [];
      return mergeEjercicios(custom);
    } else {
      const custom = lsGet("forge_ejercicios_custom_" + uid, []);
      return mergeEjercicios(custom);
    }
  }
  function mergeEjercicios(custom) {
    // Custom puede sobreescribir defaults por id, o agregar nuevos
    const map = new Map(DEFAULT_EXERCISES.map(e => [e.id, { ...e }]));
    custom.forEach(c => map.set(c.id, c));
    return Array.from(map.values());
  }
  async function guardarBaseEjercicios(lista) {
    const uid = getUid();
    // Guardamos solo lo que difiere o se agregó (simplificado: guardamos todo custom)
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      await fb.setDoc(fb.doc(fb.db, "usuarios", uid, "config", "ejerciciosCustom"), { lista });
    } else {
      lsSet("forge_ejercicios_custom_" + uid, lista);
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

  async function getHistorialEntrenos(limite) {
    const uid = getUid();
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      const q = fb.query(
        fb.collection(fb.db, "usuarios", uid, "entrenos"),
        fb.orderBy("fecha", "desc"),
        fb.limit(limite || 200)
      );
      // onSnapshot no usado aquí para mantener simple; usar get
      const { getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      const all = lsGet("forge_entrenos_" + uid, []);
      return all.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, limite || 200);
    }
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
    const nuevoRango = rangoPorPoder(nuevoPoder);
    await actualizarPerfil({ poder: nuevoPoder, rangoId: nuevoRango.id });
    return { poder: nuevoPoder, rango: nuevoRango, subioDeRango: nuevoRango.id > (perfil?.rangoId || 0) };
  }

  // ---------------- RACHA / GRUPO ----------------
  async function getGrupo(grupoId) {
    if (!grupoId) return null;
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      const snap = await fb.getDoc(fb.doc(fb.db, "grupos", grupoId));
      return snap.exists() ? { id: grupoId, ...snap.data() } : null;
    } else {
      return lsGet("forge_grupo_" + grupoId, null);
    }
  }

  async function crearGrupo(nombre, miembroUid) {
    const grupoId = "grp_" + Date.now();
    const data = {
      nombre,
      miembros: [miembroUid],
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
    if (firebaseEnabled) {
      const fb = window.Forge.firebase;
      await fb.updateDoc(fb.doc(fb.db, "grupos", grupoId), {
        miembros: fb.arrayUnion(miembroUid)
      });
    } else {
      grupo.miembros = Array.from(new Set([...grupo.miembros, miembroUid]));
      lsSet("forge_grupo_" + grupoId, grupo);
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
      Object.assign(grupo, datos);
      lsSet("forge_grupo_" + grupoId, grupo);
    }
  }

  return {
    isFirebaseEnabled: () => firebaseEnabled,
    registrarUsuario, iniciarSesion, cerrarSesion, getUsuarioActual, getUid,
    actualizarPerfil, getPerfil,
    guardarConfigRutina, getConfigRutina,
    guardarEjerciciosDelDia, getEjerciciosDelDia,
    getBaseEjercicios, guardarBaseEjercicios,
    guardarEntreno, getHistorialEntrenos, getUltimoRegistroPorEjercicio,
    guardarPesoCorporal, getHistorialPeso, getUltimoPesoCorporal, guardarRecordatorioPeso,
    guardarOnboardingLegado, sumarPoder,
    getGrupo, crearGrupo, unirseAGrupo, escucharGrupo, actualizarGrupo
  };
})();
