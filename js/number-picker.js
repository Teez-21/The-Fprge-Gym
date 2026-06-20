// ============================================================
// THE FORGE — number-picker.js
// Selector numérico estilo "rueda" (scroll-snap), soporta decimales con coma
// ============================================================

const ForgeNumberPicker = (() => {

  /**
   * Crea un picker de números enteros (para reps, series, etc.)
   * options: { min, max, value, onChange }
   * Devuelve el elemento DOM
   */
  function createIntPicker({ min = 0, max = 50, value = 0, onChange }) {
    const wrap = document.createElement("div");
    wrap.className = "number-picker";
    const track = document.createElement("div");
    track.className = "number-picker__track";
    wrap.appendChild(track);

    for (let i = min; i <= max; i++) {
      const item = document.createElement("div");
      item.className = "number-picker__item";
      item.textContent = i;
      item.dataset.value = i;
      track.appendChild(item);
    }

    const itemHeight = 36;
    wrap.style.setProperty("--item-h", itemHeight + "px");

    function scrollToValue(val, smooth = false) {
      const idx = Math.max(0, Math.min(max - min, val - min));
      track.scrollTo({ top: idx * itemHeight, behavior: smooth ? "smooth" : "instant" });
    }

    let scrollTimeout;
    track.addEventListener("scroll", () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const idx = Math.round(track.scrollTop / itemHeight);
        const val = min + idx;
        highlightCenter(val);
        if (onChange) onChange(val);
      }, 80);
    });

    function highlightCenter(val) {
      track.querySelectorAll(".number-picker__item").forEach(el => {
        el.classList.toggle("center", parseInt(el.dataset.value) === val);
      });
    }

    setTimeout(() => { scrollToValue(value); highlightCenter(value); }, 0);

    wrap.setValue = (val) => scrollToValue(val, true);
    return wrap;
  }

  /**
   * Crea un picker de peso con decimales (coma como separador, ej 75,5)
   * options: { min, max, step, value, onChange }
   * Internamente trabaja en "décimas" para permitir scroll suave con 1 decimal.
   */
  function createWeightPicker({ min = 0, max = 400, step = 0.5, value = 0, onChange }) {
    const wrap = document.createElement("div");
    wrap.className = "number-picker number-picker--weight";
    const track = document.createElement("div");
    track.className = "number-picker__track";
    wrap.appendChild(track);

    const steps = Math.round((max - min) / step);
    for (let i = 0; i <= steps; i++) {
      const val = +(min + i * step).toFixed(1);
      const item = document.createElement("div");
      item.className = "number-picker__item";
      item.textContent = formatWeightEs(val);
      item.dataset.value = val;
      track.appendChild(item);
    }

    const itemHeight = 36;

    function valueToIndex(val) {
      return Math.round((val - min) / step);
    }

    function scrollToValue(val, smooth = false) {
      const idx = Math.max(0, Math.min(steps, valueToIndex(val)));
      track.scrollTo({ top: idx * itemHeight, behavior: smooth ? "smooth" : "instant" });
    }

    let scrollTimeout;
    track.addEventListener("scroll", () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const idx = Math.round(track.scrollTop / itemHeight);
        const val = +(min + idx * step).toFixed(1);
        highlightCenter(val);
        if (onChange) onChange(val);
      }, 80);
    });

    function highlightCenter(val) {
      track.querySelectorAll(".number-picker__item").forEach(el => {
        el.classList.toggle("center", parseFloat(el.dataset.value) === val);
      });
    }

    setTimeout(() => { scrollToValue(value); highlightCenter(value); }, 0);

    wrap.setValue = (val) => scrollToValue(val, true);
    return wrap;
  }

  /** Formatea un número con coma decimal estilo es-CO: 75.5 -> "75,5" */
  function formatWeightEs(val) {
    return val.toFixed(1).replace(".", ",").replace(",0", "");
  }

  return { createIntPicker, createWeightPicker, formatWeightEs };
})();
