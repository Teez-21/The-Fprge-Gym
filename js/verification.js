// ============================================================
// THE FORGE — verification.js
// Verificación de entreno: ubicación (silenciosa) + foto + aprobación
// ============================================================

const ForgeVerification = (() => {

  const RADIO_GIMNASIO_METROS = 700;

  /** Distancia en metros entre dos coordenadas (fórmula de Haversine) */
  function distanciaMetros(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (deg) => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /** Obtiene la ubicación actual del dispositivo (silencioso, sin pedir nada visible extra) */
  function obtenerUbicacionActual() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null), // si el usuario niega permiso, no bloqueamos nada
        { timeout: 5000, maximumAge: 60000 }
      );
    });
  }

  /**
   * Evalúa si una ubicación está dentro del radio del gimnasio de referencia.
   * gimnasioRef: { lat, lon } | null (si es null, no hay referencia aún)
   * ubicacionActual: { lat, lon } | null
   * Devuelve: { esPrimeraVez, dentroDelRadio, distancia }
   */
  function evaluarUbicacion(gimnasioRef, ubicacionActual) {
    if (!gimnasioRef) {
      return { esPrimeraVez: true, dentroDelRadio: true, distancia: 0 };
    }
    if (!ubicacionActual) {
      // Sin datos de ubicación (permiso denegado, sin GPS) → no penalizamos,
      // dejamos que decida la foto/aprobación humana.
      return { esPrimeraVez: false, dentroDelRadio: null, distancia: null };
    }
    const distancia = distanciaMetros(gimnasioRef.lat, gimnasioRef.lon, ubicacionActual.lat, ubicacionActual.lon);
    return { esPrimeraVez: false, dentroDelRadio: distancia <= RADIO_GIMNASIO_METROS, distancia };
  }

  /**
   * Redimensiona y comprime una imagen (File/Blob) a un dataURL liviano,
   * para no disparar el tamaño de Firestore (límite 1MB por documento).
   */
  function comprimirImagen(file, maxDim = 700, calidad = 0.6) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxDim) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", calidad));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return { RADIO_GIMNASIO_METROS, distanciaMetros, obtenerUbicacionActual, evaluarUbicacion, comprimirImagen };
})();
