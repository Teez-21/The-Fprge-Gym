// ============================================================
// THE FORGE — firebase-init.js
// Configuración de Firebase. Auth + Firestore.
// ============================================================
//
// ⚠️ PASO PENDIENTE: reemplaza el objeto de abajo con tu propio
// firebaseConfig cuando creemos tu proyecto en Firebase Console.
// Mientras tanto, la app funciona en MODO LOCAL (localStorage)
// y todo el resto del código ya está listo para conectarse aquí.
//
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, addDoc, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, arrayUnion, increment,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// -------------------------------------------------------------
// CONFIGURACIÓN — se reemplaza cuando creemos el proyecto Firebase
// -------------------------------------------------------------
const firebaseConfig = {
  apiKey: "PENDIENTE",
  authDomain: "PENDIENTE",
  projectId: "PENDIENTE",
  storageBucket: "PENDIENTE",
  messagingSenderId: "PENDIENTE",
  appId: "PENDIENTE"
};

const FIREBASE_ENABLED = firebaseConfig.apiKey !== "PENDIENTE";

let app = null;
let auth = null;
let db = null;

if (FIREBASE_ENABLED) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

// Exponemos todo en window.Forge.firebase para que los scripts
// no-módulo (data.js, app.js, etc.) puedan usarlo.
window.Forge = window.Forge || {};
window.Forge.firebase = {
  enabled: FIREBASE_ENABLED,
  app, auth, db,
  // Auth
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, updateProfile,
  // Firestore
  doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, addDoc, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, arrayUnion, increment, Timestamp
};

// Avisamos al resto de la app que Firebase ya está listo (o no)
window.dispatchEvent(new CustomEvent("forge:firebase-ready", {
  detail: { enabled: FIREBASE_ENABLED }
}));
