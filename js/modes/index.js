// modes/index.js
// Registro de modos de juego. Para añadir un modo: crear su archivo en modes/
// e incluirlo en el array MODES. Para quitarlo: borrar su línea.
// Misma forma que methods/index.js (listar y obtener por id).

import { practice } from './practice.js';
import { competition } from './competition.js';

const MODES = [practice, competition];

// Comprobación al cargar: los ids de los modos deben ser únicos.
const ids = MODES.map((m) => m.id);
if (new Set(ids).size !== ids.length) {
  throw new Error(`modes/index.js: hay ids de modo repetidos (${ids.join(', ')})`);
}

/** Todos los modos registrados, en orden. */
export function listModes() {
  return [...MODES];
}

/** Devuelve el modo con ese id; lanza un error si no existe. */
export function getMode(id) {
  const mode = MODES.find((m) => m.id === id);
  if (!mode) throw new Error(`Modo no encontrado: "${id}"`);
  return mode;
}