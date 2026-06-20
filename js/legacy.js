// ============================================================
// THE FORGE — legacy.js
// Lógica del sistema LEGADO: percentiles, cálculo de Poder, rangos
// ============================================================

/**
 * Interpola el percentil de un ejercicio dada la relación peso/BW
 */
function interpolatePercentil(tabla, relacion) {
  if (relacion <= tabla[0][0]) return tabla[0][1];
  for (let i = 0; i < tabla.length - 1; i++) {
    const [r1, p1] = tabla[i];
    const [r2, p2] = tabla[i + 1];
    if (relacion >= r1 && relacion <= r2) {
      const t = (relacion - r1) / (r2 - r1);
      return p1 + t * (p2 - p1);
    }
  }
  return tabla[tabla.length - 1][1]; // por encima del máximo
}

/**
 * Calcula el percentil global y por ejercicio del Menú Especial
 * marcas: { sentadilla: 100, press_banca: 80, ... } (kg levantados)
 * pesoCorporal: kg
 * sexo: "hombre" | "mujer"
 */
function calcularPercentilGlobal(marcas, pesoCorporal, sexo) {
  const tablas = PERCENTIL_TABLES[sexo];
  let percentilTotal = 0;
  const detalle = {};

  MENU_ESPECIAL.forEach(ej => {
    const pesoLevantado = marcas[ej.key] || 0;
    const relacion = pesoCorporal > 0 ? pesoLevantado / pesoCorporal : 0;
    const percentil = interpolatePercentil(tablas[ej.key], relacion);
    detalle[ej.key] = { nombre: ej.nombre, relacion, percentil };
    percentilTotal += percentil * ej.peso;
  });

  return { percentilGlobal: percentilTotal, detalle };
}

/**
 * Determina el rango inicial según el percentil global
 */
function rangoPorPercentil(percentilGlobal) {
  let rango = RANKS[0];
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (percentilGlobal >= RANKS[i].percentil) {
      rango = RANKS[i];
      break;
    }
  }
  return rango;
}

/**
 * Determina el rango actual según el Poder acumulado
 */
function rangoPorPoder(poder) {
  let rango = RANKS[0];
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (poder >= RANKS[i].poderMin) {
      rango = RANKS[i];
      break;
    }
  }
  return rango;
}

/**
 * Devuelve el siguiente rango (o null si ya es el máximo)
 */
function siguienteRango(rangoActualId) {
  if (rangoActualId >= RANKS.length - 1) return null;
  return RANKS[rangoActualId + 1];
}

/**
 * Progreso hacia el siguiente rango (0-1)
 */
function progresoHaciaSiguienteRango(poder, rangoActualId) {
  const actual = RANKS[rangoActualId];
  const siguiente = siguienteRango(rangoActualId);
  if (!siguiente) return 1;
  const rango = siguiente.poderMin - actual.poderMin;
  const avance = poder - actual.poderMin;
  return Math.max(0, Math.min(1, avance / rango));
}

// ============================================================
// SISTEMA DE PODER
// ============================================================

/**
 * Calcula el poder ganado por un entreno completo
 * entreno: {
 *   ejercicios: [{ exerciseId, series: [{peso, reps}], esUnico }],
 *   esRegreso: bool (volvió tras 7+ días sin entrenar),
 *   rachaActual: number (días consecutivos tras este entreno)
 * }
 * historialPrevio: para comparar contra el último registro de cada ejercicio
 */
function calcularPoderEntreno(entreno, historialPrevio) {
  const desglose = [];
  let total = 0;

  // Base: entreno completado
  desglose.push({ concepto: "Entreno completado", puntos: 50 });
  total += 50;

  // Por cada ejercicio único
  const numEjercicios = entreno.ejercicios.length;
  const puntosEjercicios = numEjercicios * 15;
  if (numEjercicios > 0) {
    desglose.push({ concepto: `${numEjercicios} ejercicio(s) único(s)`, puntos: puntosEjercicios });
    total += puntosEjercicios;
  }

  // Por cada serie registrada
  let numSeries = 0;
  entreno.ejercicios.forEach(ej => numSeries += ej.series.length);
  const puntosSeries = numSeries * 2;
  if (numSeries > 0) {
    desglose.push({ concepto: `${numSeries} serie(s) registrada(s)`, puntos: puntosSeries });
    total += puntosSeries;
  }

  // Bonus de progreso por ejercicio (comparado con el último registro)
  entreno.ejercicios.forEach(ej => {
    const previo = historialPrevio[ej.exerciseId];
    if (!previo || !previo.series || previo.series.length === 0) return;

    const mejorSerieActual = ej.series.reduce((max, s) => s.peso > max.peso ? s : max, ej.series[0]);
    const mejorSeriePrevia = previo.series.reduce((max, s) => s.peso > max.peso ? s : max, previo.series[0]);

    // Bonus por más peso (manteniendo min 6 reps)
    if (mejorSerieActual.peso > mejorSeriePrevia.peso && mejorSerieActual.reps >= 6) {
      const pctMejora = ((mejorSerieActual.peso - mejorSeriePrevia.peso) / mejorSeriePrevia.peso) * 100;
      let bonus = 0;
      if (pctMejora >= 10) bonus = 100;
      else if (pctMejora >= 5) bonus = 50;
      else if (pctMejora >= 2.5) bonus = 25;
      if (bonus > 0) {
        desglose.push({ concepto: `+${pctMejora.toFixed(1)}% peso en ${ej.nombre || ej.exerciseId}`, puntos: bonus });
        total += bonus;
      }
    }
    // Bonus por más reps (mismo peso)
    else if (mejorSerieActual.peso === mejorSeriePrevia.peso && mejorSerieActual.reps > mejorSeriePrevia.reps) {
      const repsExtra = mejorSerieActual.reps - mejorSeriePrevia.reps;
      let bonus = 0;
      if (repsExtra >= 3) bonus = 40;
      else if (repsExtra === 2) bonus = 20;
      else if (repsExtra === 1) bonus = 10;
      if (bonus > 0) {
        desglose.push({ concepto: `+${repsExtra} rep(s) en ${ej.nombre || ej.exerciseId}`, puntos: bonus });
        total += bonus;
      }
    }
  });

  // Bonus de consistencia (racha)
  const rachaBonusTable = [
    [100, 2500], [60, 1000], [30, 500], [14, 200], [7, 100], [3, 50]
  ];
  if (entreno.rachaActual) {
    for (const [dias, puntos] of rachaBonusTable) {
      if (entreno.rachaActual === dias) {
        desglose.push({ concepto: `Racha de ${dias} días`, puntos });
        total += puntos;
        break;
      }
    }
  }

  // Regreso del abismo
  if (entreno.esRegreso) {
    desglose.push({ concepto: "Regreso del Abismo (7+ días de pausa)", puntos: 300 });
    total += 300;
  }

  return { total, desglose };
}
