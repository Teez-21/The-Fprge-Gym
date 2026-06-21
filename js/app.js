// ============================================================
// THE FORGE — app.js
// Arranque de la aplicación, navegación, autenticación
// ============================================================

(function () {

  const TABS = {
    rutina: TabRutina,
    ejercicios: TabEjercicios,
    progreso: TabProgreso,
    peso: TabPeso,
    legado: TabLegado,
    grupo: TabGrupo
  };

  let storageReady = false;

  window.addEventListener("forge:storage-ready", () => {
    storageReady = true;
  });

  // ---------------- NAVEGACIÓN ----------------
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      ForgeUI.showTab(target);
    });
  });

  window.addEventListener("forge:tab-shown", (e) => {
    const tab = TABS[e.detail.tab];
    if (tab && tab.render) tab.render();
  });

  // ---------------- AUTENTICACIÓN INICIAL ----------------
  async function init() {
    let usuario = ForgeStorage.getUsuarioActual();

    if (!usuario) {
      // En modo local, intentamos auto-crear un usuario "invitado" para no bloquear
      // la experiencia mientras Firebase no esté configurado.
      if (!ForgeStorage.isFirebaseEnabled()) {
        usuario = await autoLoginLocal();
      } else {
        mostrarCargando();
        usuario = await ForgeStorage.esperarSesionPersistida();
        if (!usuario) {
          mostrarPantallaLogin();
          return;
        }
      }
    }

    arrancarApp();
  }

  async function autoLoginLocal() {
    let perfil = await ForgeStorage.getPerfil();
    if (!perfil) {
      perfil = await ForgeStorage.registrarUsuario("local@theforge.app", "local", "Guerrero");
    } else {
      await ForgeStorage.iniciarSesion(perfil.email || "local@theforge.app", "local");
    }
    return perfil;
  }

  function traducirErrorAuth(e) {
    const code = e?.code || "";
    const mapa = {
      "auth/email-already-in-use": "Ese email ya tiene una cuenta. Usa 'Ya tengo cuenta'.",
      "auth/invalid-email": "El email no es válido.",
      "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
      "auth/user-not-found": "No existe una cuenta con ese email.",
      "auth/wrong-password": "Contraseña incorrecta.",
      "auth/invalid-credential": "Email o contraseña incorrectos.",
      "auth/network-request-failed": "Sin conexión. Revisa tu internet."
    };
    return mapa[code] || e.message;
  }

  function mostrarCargando() {
    const panel = document.getElementById("tab-rutina");
    ForgeUI.showTab("rutina");
    panel.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding-top:35vh;gap:14px;">
        <img src="assets/img/logo.png" style="width:64px;opacity:0.8;">
        <div class="spinner"></div>
      </div>
    `;
  }

  function mostrarPantallaLogin() {
    const panel = document.getElementById("tab-rutina");
    ForgeUI.showTab("rutina");
    panel.innerHTML = `
      <div style="padding-top:40px;text-align:center;">
        <img src="assets/img/logo.png" style="width:90px;margin-bottom:16px;">
        <h1 class="section-title" style="text-align:center;">THE FORGE</h1>
        <p class="section-subtitle" style="text-align:center;">Rendirse es para las perras.</p>
      </div>
      <div class="field">
        <label class="field__label">Nombre</label>
        <input type="text" class="field__input" id="authNombre" placeholder="Tu nombre">
      </div>
      <div class="field">
        <label class="field__label">Email</label>
        <input type="email" class="field__input" id="authEmail" placeholder="tu@email.com">
      </div>
      <div class="field">
        <label class="field__label">Contraseña</label>
        <input type="password" class="field__input" id="authPassword" placeholder="••••••••">
      </div>
      <button class="btn btn--primary" id="btnRegistrar" style="margin-bottom:8px;">Crear cuenta</button>
      <button class="btn btn--secondary" id="btnIniciarSesion">Ya tengo cuenta</button>
    `;

    document.getElementById("btnRegistrar").onclick = async () => {
      const nombre = document.getElementById("authNombre").value.trim();
      const email = document.getElementById("authEmail").value.trim();
      const password = document.getElementById("authPassword").value;
      if (!nombre || !email || !password) { ForgeUI.toast("Completa todos los campos."); return; }
      try {
        await ForgeStorage.registrarUsuario(email, password, nombre);
        arrancarApp();
      } catch (e) {
        ForgeUI.toast(traducirErrorAuth(e));
      }
    };

    document.getElementById("btnIniciarSesion").onclick = async () => {
      const email = document.getElementById("authEmail").value.trim();
      const password = document.getElementById("authPassword").value;
      if (!email || !password) { ForgeUI.toast("Ingresa tu email y contraseña."); return; }
      try {
        await ForgeStorage.iniciarSesion(email, password);
        arrancarApp();
      } catch (e) {
        ForgeUI.toast(traducirErrorAuth(e));
      }
    };
  }

  function arrancarApp() {
    ForgeUI.showTab("rutina");
    TabRutina.render();
  }

  // ---------------- ARRANQUE ----------------
  if (window.Forge?.firebase) {
    init();
  } else {
    window.addEventListener("forge:firebase-ready", init, { once: true });
  }

  // Fallback: si Firebase tarda en responder (ej. red lenta), esperamos más
  // tiempo antes de asumir que no está disponible, para no romper el login real.
  setTimeout(() => {
    if (!storageReady) {
      console.warn("Firebase no respondió a tiempo, reintentando en modo local.");
      window.dispatchEvent(new CustomEvent("forge:firebase-ready", { detail: { enabled: false } }));
    }
  }, 6000);

})();
