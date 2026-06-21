// ============================================================
// THE FORGE — data.js
// Datos estáticos: rangos, percentiles, ejercicios base
// ============================================================

// ---------- RANGOS DE LEGADO ----------
const RANKS = [
  { id: 0, name: "Alma Perdida", percentil: 40, poderMin: 0,     color: "#6B6B6B", colorSec: "#1A1A1A", icon: "assets/img/ranks/alma_perdida.png", desc: "Un alma errante, débil y sin rumbo. El viaje apenas comienza." },
  { id: 1, name: "Peregrino",    percentil: 50, poderMin: 1000,  color: "#8B5A2B", colorSec: "#4A4A4A", icon: "assets/img/ranks/peregrino.png", desc: "Un viajero que ha tomado el primer paso en el camino." },
  { id: 2, name: "Portador",     percentil: 60, poderMin: 2500,  color: "#3F7FB6", colorSec: "#7A1E1E", icon: "assets/img/ranks/portador.png", desc: "La llama interna ha sido encendida y protegida." },
  { id: 3, name: "Forjado",      percentil: 70, poderMin: 5000,  color: "#C65A11", colorSec: "#A8A8A8", icon: "assets/img/ranks/forjado.png", desc: "El hierro se trabaja con fuego. Tu cuerpo y mente se fortalecen." },
  { id: 4, name: "Vigilante",    percentil: 80, poderMin: 8500,  color: "#18B7B5", colorSec: "#8C949E", icon: "assets/img/ranks/vigilante.png", desc: "La disciplina te convierte en guardián de tu propio destino." },
  { id: 5, name: "Juramentado",  percentil: 87, poderMin: 13000, color: "#6A3FA0", colorSec: "#A11D2E", icon: "assets/img/ranks/juramentado.png", desc: "Has hecho un juramento contigo mismo. No hay marcha atrás." },
  { id: 6, name: "Campeón",      percentil: 92, poderMin: 20000, color: "#D4AF37", colorSec: "#C1272D", icon: "assets/img/ranks/campeon.png", desc: "Has superado pruebas y rivales. Eres digno de este título." },
  { id: 7, name: "Conquistador", percentil: 96, poderMin: 30000, color: "#B71C1C", colorSec: "#A87C2D", icon: "assets/img/ranks/conquistador.png", desc: "Dominas tu cuerpo y tu mente. Conquistas tus límites." },
  { id: 8, name: "Ascendido",    percentil: 98, poderMin: 45000, color: "#18CFCB", colorSec: "#EAEAEA", icon: "assets/img/ranks/ascendido.png", desc: "Has trascendido tus límites y alcanzado un nuevo plano." },
  { id: 9, name: "Inmortal",     percentil: 99.5, poderMin: 70000, color: "#E83AE8", colorSec: "#FF2A2A", icon: "assets/img/ranks/inmortal.png", desc: "Eres leyenda. Tu nombre perdurará en el tiempo." }
];

// ---------- MENÚ ESPECIAL (onboarding) ----------
const MENU_ESPECIAL = [
  { key: "sentadilla",      nombre: "Sentadilla",        peso: 0.25 },
  { key: "press_banca",     nombre: "Press de Banca",    peso: 0.25 },
  { key: "remo",            nombre: "Remo",              peso: 0.20 },
  { key: "press_pierna",    nombre: "Press de Pierna",   peso: 0.15 },
  { key: "tricep_pushdown", nombre: "Tríceps Pushdown",  peso: 0.10 },
  { key: "curl_bicep",      nombre: "Curl de Bíceps",    peso: 0.05 }
];

// Tablas de percentil por relación peso_levantado / peso_corporal (BW)
// Interpolación lineal entre puntos. Hombres y mujeres por separado.
const PERCENTIL_TABLES = {
  hombre: {
    sentadilla:       [[0,0],[0.5,20],[0.75,35],[1.0,50],[1.25,65],[1.5,80],[1.75,90],[2.0,95],[2.5,99]],
    press_banca:      [[0,0],[0.5,20],[0.75,40],[1.0,60],[1.25,80],[1.5,90],[1.75,95],[2.0,99]],
    remo:             [[0,0],[0.4,20],[0.6,40],[0.8,60],[1.0,80],[1.25,90],[1.5,95],[1.75,99]],
    press_pierna:     [[0,0],[1.0,20],[1.5,40],[2.0,60],[2.5,80],[3.0,90],[3.5,95],[4.0,99]],
    tricep_pushdown:  [[0,0],[0.2,20],[0.3,40],[0.4,60],[0.5,80],[0.65,90],[0.8,95],[1.0,99]],
    curl_bicep:       [[0,0],[0.15,20],[0.25,40],[0.35,60],[0.45,80],[0.55,90],[0.65,95],[0.8,99]]
  },
  mujer: {
    sentadilla:       [[0,0],[0.4,20],[0.6,40],[0.8,60],[1.0,80],[1.2,90],[1.4,95],[1.7,99]],
    press_banca:      [[0,0],[0.3,20],[0.5,40],[0.75,60],[1.0,80],[1.25,95],[1.5,99]],
    remo:             [[0,0],[0.3,20],[0.45,40],[0.6,60],[0.8,80],[1.0,90],[1.2,95],[1.4,99]],
    press_pierna:     [[0,0],[0.8,20],[1.2,40],[1.6,60],[2.0,80],[2.5,90],[3.0,95],[3.5,99]],
    tricep_pushdown:  [[0,0],[0.15,20],[0.22,40],[0.3,60],[0.4,80],[0.5,90],[0.6,95],[0.75,99]],
    curl_bicep:       [[0,0],[0.1,20],[0.18,40],[0.25,60],[0.35,80],[0.45,90],[0.55,95],[0.65,99]]
  }
};

// ---------- RUTINAS ----------
const ROUTINE_TYPES = {
  ppl: {
    id: "ppl",
    nombre: "PPL (Push Pull Leg)",
    dias: [
      { key: "push", nombre: "Push", grupos: ["Pecho", "Tríceps", "Hombro"] },
      { key: "pull", nombre: "Pull", grupos: ["Espalda", "Bíceps"] },
      { key: "leg",  nombre: "Leg",  grupos: ["Pierna"] }
    ]
  },
  upper_lower: {
    id: "upper_lower",
    nombre: "Upper - Lower",
    dias: [
      { key: "upper", nombre: "Upper", grupos: ["Hombro", "Espalda", "Pecho", "Tríceps", "Bíceps", "Antebrazo"] },
      { key: "lower", nombre: "Lower", grupos: ["Pierna"] }
    ]
  },
  bro_split: {
    id: "bro_split",
    nombre: "Pecho-Brazo-Pierna-Espalda-Abs",
    requiereAdvertencia: true,
    dias: [
      { key: "pecho",   nombre: "Pecho",   grupos: ["Pecho"] },
      { key: "brazo",   nombre: "Brazo",   grupos: ["Bíceps", "Tríceps", "Antebrazo"] },
      { key: "pierna",  nombre: "Pierna",  grupos: ["Pierna"] },
      { key: "espalda", nombre: "Espalda", grupos: ["Espalda"] },
      { key: "abs",     nombre: "Abs",     grupos: ["Abs"] }
    ]
  },
  ppl4: {
    id: "ppl4",
    nombre: "Push - Pierna - Pull - Pierna",
    dias: [
      { key: "push1",  nombre: "Push",   grupos: ["Pecho", "Tríceps", "Hombro"] },
      { key: "pierna1",nombre: "Pierna", grupos: ["Pierna"] },
      { key: "pull1",  nombre: "Pull",   grupos: ["Espalda", "Bíceps"] },
      { key: "pierna2",nombre: "Pierna", grupos: ["Pierna"] }
    ]
  }
};

// ---------- GRUPOS MUSCULARES Y CATEGORÍAS ----------
const MUSCLE_GROUPS = ["Pecho", "Espalda", "Hombro", "Bíceps", "Tríceps", "Antebrazo", "Pierna", "Abs"];
const MOVE_CATEGORIES = ["Push", "Pull", "Leg"];

// ---------- BASE DE EJERCICIOS POPULARES (seed inicial) ----------
const DEFAULT_EXERCISES = [
  // PECHO
  { id: "ex_press_banca", nombre: "Press de Banca", grupo: "Pecho", categoria: "Push", url: "" },
  { id: "ex_press_inclinado", nombre: "Press Inclinado con Barra", grupo: "Pecho", categoria: "Push", url: "" },
  { id: "ex_press_mancuernas", nombre: "Press de Banca con Mancuernas", grupo: "Pecho", categoria: "Push", url: "" },
  { id: "ex_aperturas", nombre: "Aperturas con Mancuernas", grupo: "Pecho", categoria: "Push", url: "" },
  { id: "ex_fondos", nombre: "Fondos en Paralelas", grupo: "Pecho", categoria: "Push", url: "" },
  { id: "ex_cruces_polea", nombre: "Cruces en Polea", grupo: "Pecho", categoria: "Push", url: "" },
  // ESPALDA
  { id: "ex_remo", nombre: "Remo con Barra", grupo: "Espalda", categoria: "Pull", url: "" },
  { id: "ex_jalon", nombre: "Jalón al Pecho", grupo: "Espalda", categoria: "Pull", url: "" },
  { id: "ex_dominadas", nombre: "Dominadas", grupo: "Espalda", categoria: "Pull", url: "" },
  { id: "ex_remo_mancuerna", nombre: "Remo con Mancuerna", grupo: "Espalda", categoria: "Pull", url: "" },
  { id: "ex_peso_muerto", nombre: "Peso Muerto", grupo: "Espalda", categoria: "Pull", url: "" },
  { id: "ex_remo_polea", nombre: "Remo en Polea Baja", grupo: "Espalda", categoria: "Pull", url: "" },
  // HOMBRO
  { id: "ex_press_militar", nombre: "Press Militar", grupo: "Hombro", categoria: "Push", url: "" },
  { id: "ex_elevaciones_laterales", nombre: "Elevaciones Laterales", grupo: "Hombro", categoria: "Push", url: "" },
  { id: "ex_press_arnold", nombre: "Press Arnold", grupo: "Hombro", categoria: "Push", url: "" },
  { id: "ex_pajaros", nombre: "Pájaros (Posterior)", grupo: "Hombro", categoria: "Pull", url: "" },
  { id: "ex_elevaciones_frontales", nombre: "Elevaciones Frontales", grupo: "Hombro", categoria: "Push", url: "" },
  // BÍCEPS
  { id: "ex_curl_barra", nombre: "Curl con Barra", grupo: "Bíceps", categoria: "Pull", url: "" },
  { id: "ex_curl_mancuerna", nombre: "Curl con Mancuernas", grupo: "Bíceps", categoria: "Pull", url: "" },
  { id: "ex_curl_martillo", nombre: "Curl Martillo", grupo: "Bíceps", categoria: "Pull", url: "" },
  { id: "ex_curl_predicador", nombre: "Curl Predicador", grupo: "Bíceps", categoria: "Pull", url: "" },
  // TRÍCEPS
  { id: "ex_tricep_pushdown", nombre: "Tríceps Pushdown", grupo: "Tríceps", categoria: "Push", url: "" },
  { id: "ex_press_frances", nombre: "Press Francés", grupo: "Tríceps", categoria: "Push", url: "" },
  { id: "ex_extension_pulley", nombre: "Extensión en Polea Alta", grupo: "Tríceps", categoria: "Push", url: "" },
  { id: "ex_fondos_banca", nombre: "Fondos en Banca", grupo: "Tríceps", categoria: "Push", url: "" },
  // ANTEBRAZO
  { id: "ex_curl_muneca", nombre: "Curl de Muñeca", grupo: "Antebrazo", categoria: "Pull", url: "" },
  { id: "ex_curl_muneca_inv", nombre: "Curl de Muñeca Invertido", grupo: "Antebrazo", categoria: "Push", url: "" },
  // PIERNA
  { id: "ex_sentadilla", nombre: "Sentadilla", grupo: "Pierna", categoria: "Leg", url: "" },
  { id: "ex_press_pierna", nombre: "Press de Pierna", grupo: "Pierna", categoria: "Leg", url: "" },
  { id: "ex_peso_muerto_rumano", nombre: "Peso Muerto Rumano", grupo: "Pierna", categoria: "Leg", url: "" },
  { id: "ex_extension_cuadriceps", nombre: "Extensión de Cuádriceps", grupo: "Pierna", categoria: "Leg", url: "" },
  { id: "ex_curl_femoral", nombre: "Curl Femoral", grupo: "Pierna", categoria: "Leg", url: "" },
  { id: "ex_zancadas", nombre: "Zancadas", grupo: "Pierna", categoria: "Leg", url: "" },
  { id: "ex_gemelos", nombre: "Elevación de Gemelos", grupo: "Pierna", categoria: "Leg", url: "" },
  { id: "ex_hip_thrust", nombre: "Hip Thrust", grupo: "Pierna", categoria: "Leg", url: "" },
  // ABS
  { id: "ex_crunch", nombre: "Crunch", grupo: "Abs", categoria: "Leg", url: "" },
  { id: "ex_plancha", nombre: "Plancha", grupo: "Abs", categoria: "Leg", url: "" },
  { id: "ex_elevacion_piernas", nombre: "Elevación de Piernas", grupo: "Abs", categoria: "Leg", url: "" },
  { id: "ex_rueda_abdominal", nombre: "Rueda Abdominal", grupo: "Abs", categoria: "Leg", url: "" }
];

// ---------- MENSAJES MUERTE DE RACHA (estilo pantalla de muerte) ----------
const STREAK_DEATH_MESSAGES = [
  {
    titulo: "JURAMENTO QUEBRANTADO",
    texto: "Prometiste avanzar. Prometiste resistir. Hoy ese juramento yace roto entre los escombros de tu disciplina. El destino te ofrece una elección: aceptar la derrota o forjar una voluntad tan fuerte que ni el tiempo pueda volver a quebrarla.",
    fuente: "— God of War"
  },
  {
    titulo: "LLAMA EXTINGUIDA",
    texto: "El fuego que alimentaba tu avance se ha apagado. La oscuridad se cierne sobre los logros que acumulaste y los ecos de la victoria se desvanecen en el viento. Pero incluso la más pequeña chispa puede convertirse en un incendio capaz de desafiar a los dioses.",
    fuente: "— Dark Souls"
  },
  {
    titulo: "RACHA DESTROZADA",
    texto: "Las campanas del fracaso resuenan una vez más. El sendero que construiste día tras día se ha derrumbado bajo tus propios pasos. Sin embargo, las leyendas no son recordadas por nunca caer, sino por levantarse cuando todos esperaban que permanecieran en el suelo.",
    fuente: "— Elden Ring"
  }
];

// ---------- MENSAJE BODY POSITIVITY (registro de peso) ----------
const BODY_POSITIVE_MESSAGE = "No estás aquí porque haya algo malo en ti. Estás aquí porque decidiste crecer. Tu cuerpo no necesita ser castigado ni avergonzado; merece cuidado, respeto y paciencia. Toma tu fotografía, registra tu peso y continúa tu viaje. La victoria no pertenece al más perfecto, sino al que nunca deja de avanzar.";

// ---------- FRASE LEGADO ----------
const LEGACY_QUOTE = "La fuerza te convierte en un guerrero. La disciplina te convierte en una leyenda.";
