// gameModes.js
// Fachada de los modos de juego: lista los modos disponibles y crea sesiones.
// No conoce ningún modo concreto; todo lo obtiene del registro modes/index.js.

import { listModes as listRegisteredModes, getMode } from './modes/index.js';

/** Todos los modos registrados, en orden (para construir los selectores de la interfaz). */
export function listModes() {
  return listRegisteredModes();
}

/**
 * Crea una sesión del modo indicado.
 * @param {string} modeId id del modo; lanza un error si no existe.
 * @param {{ settings: object, initialBestStreak: number }} options
 *   settings: ajustes actuales (nivel, tiempo, método...).
 *   initialBestStreak: récord previo de racha de ese modo (storage.getBestStreak).
 * @returns {object} Session (start, next, submit, requestHint, showSolution, stop, on).
 */
export function createSession(modeId, { settings, initialBestStreak } = {}) {
  const mode = getMode(modeId);
  return mode.create({ settings, initialBestStreak });
}