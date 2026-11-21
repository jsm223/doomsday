// methods/anchor.js
// Día ancla del siglo. Módulo puro: sin DOM ni almacenamiento.
// Lo usan los métodos de cálculo (classic12, odd11) y lo reexporta
// doomsdayEngine.js. Vive aquí para evitar un import circular
// entre el motor y los métodos.

/**
 * Día ancla del siglo al que pertenece el año (calendario gregoriano).
 * Se repite cada 400 años: 1600→Martes, 1700→Domingo, 1800→Viernes,
 * 1900→Miércoles, 2000→Martes, 2100→Domingo, 2200→Viernes...
 * @param {number} year Año entero positivo (p. ej. 1999).
 * @returns {number} 0-6 (0 = Domingo … 6 = Sábado).
 */
export function centuryAnchor(year) {
  if (!Number.isInteger(year) || year < 1) {
    throw new RangeError(`Año no válido: ${year}`);
  }
  const century = Math.floor(year / 100);
  return (5 * (century % 4) + 2) % 7;
}