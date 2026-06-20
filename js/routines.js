// ============================================================
// THE FORGE — routines.js
// Lógica de rotación de días de rutina
// ============================================================

/**
 * Dado el tipo de rutina y el índice del último día completado,
 * devuelve el siguiente día en la rotación.
 */
function getSiguienteDia(routineTypeId, ultimoDiaIndex) {
  const rutina = ROUTINE_TYPES[routineTypeId];
  if (!rutina) return null;
  const totalDias = rutina.dias.length;
  const siguienteIndex = (ultimoDiaIndex + 1) % totalDias;
  return { index: siguienteIndex, dia: rutina.dias[siguienteIndex] };
}

/**
 * Estado inicial de rutina (antes de cualquier entreno registrado)
 */
function getDiaInicial(routineTypeId) {
  const rutina = ROUTINE_TYPES[routineTypeId];
  if (!rutina) return null;
  return { index: 0, dia: rutina.dias[0] };
}

/**
 * Intercambia manualmente el día actual por otro día de la rutina
 * Devuelve advertencia (solo informativa, no bloquea)
 */
function cambiarDiaManual(routineTypeId, nuevoIndex) {
  const rutina = ROUTINE_TYPES[routineTypeId];
  if (!rutina || nuevoIndex < 0 || nuevoIndex >= rutina.dias.length) return null;
  return {
    index: nuevoIndex,
    dia: rutina.dias[nuevoIndex],
    advertencia: "Puedes hacerlo, pero no se recomienda. Recuerda que tus entrenamientos deben ser ordenados y que debes dejar descansar tus músculos al menos 48 horas para sacar el máximo provecho de tu entrenamiento."
  };
}

/**
 * Valida si un entreno puede finalizarse
 * Regla: al menos 3 ejercicios con peso registrado
 */
function puedeFinalizarEntreno(ejerciciosConPeso) {
  return ejerciciosConPeso.length >= 3;
}

/**
 * Evalúa las primeras 2 series de un ejercicio para sugerencias de peso
 * Devuelve 'bajar', 'subir', o null
 */
function evaluarPrimerasSeries(series) {
  if (series.length < 2) return null;
  const primeras2 = series.slice(0, 2);
  const todasBajoOIgual5 = primeras2.every(s => s.reps <= 5);
  const todasMayor10 = primeras2.every(s => s.reps > 10);
  if (todasBajoOIgual5) return "bajar";
  if (todasMayor10) return "subir";
  return null;
}
