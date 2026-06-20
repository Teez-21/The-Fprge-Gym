// ============================================================
// THE FORGE — streak.js
// Lógica de racha grupal (2 jugadores), descansos, congelamiento
// ============================================================

/**
 * Determina si un usuario "cumplió" el día (entrenó o era su día de descanso)
 * registro: { fecha, entreno: bool, esDiaDescanso: bool }
 */
function cumplioDia(registro) {
  return registro.entreno === true || registro.esDiaDescanso === true;
}

/**
 * Evalúa el estado de la racha grupal para un día dado.
 * miembros: [{ uid, registro: {entreno, esDiaDescanso} }]
 * congelada: bool (si el día está protegido por congelamiento aceptado)
 * Devuelve: { viva: bool, motivo }
 */
function evaluarRachaDia(miembros, congelada) {
  if (congelada) return { viva: true, motivo: "Racha congelada este día" };

  const incumplidos = miembros.filter(m => !cumplioDia(m.registro));
  if (incumplidos.length === 0) {
    return { viva: true, motivo: "Todos cumplieron" };
  }
  return {
    viva: false,
    motivo: `Racha rota: ${incumplidos.map(m => m.uid).join(", ")} no entrenó y no era día de descanso`
  };
}

/**
 * Valida si se puede solicitar un congelamiento de racha
 * solicitudesHoy: número de solicitudes ya hechas hoy
 */
function puedeSolicitarCongelamiento(solicitudesHoy) {
  return solicitudesHoy < 1;
}

/**
 * Verifica si una solicitud de congelamiento sigue vigente (dentro de 12h)
 * timestampSolicitud: ms epoch
 * ahora: ms epoch
 */
function congelamientoVigente(timestampSolicitud, ahora) {
  const DOCE_HORAS_MS = 12 * 60 * 60 * 1000;
  return (ahora - timestampSolicitud) <= DOCE_HORAS_MS;
}

/**
 * Resultado final del congelamiento: solo se congela si AMBOS aceptan
 * respuestas: { uid1: bool|null, uid2: bool|null }
 */
function resultadoCongelamiento(respuestas) {
  const valores = Object.values(respuestas);
  if (valores.includes(null)) return "pendiente";
  return valores.every(v => v === true) ? "congelada" : "no_congelada";
}

/**
 * Determina puntos de bonus de racha (para mostrar en UI, coincide con legacy.js)
 */
const RACHA_BONUS_DIAS = [3, 7, 14, 30, 60, 100];

function obtieneBonusEnEsteDia(diasRacha) {
  return RACHA_BONUS_DIAS.includes(diasRacha);
}

/**
 * Selecciona un mensaje aleatorio de muerte de racha
 */
function getMensajeMuerteRacha() {
  const idx = Math.floor(Math.random() * STREAK_DEATH_MESSAGES.length);
  return STREAK_DEATH_MESSAGES[idx];
}
