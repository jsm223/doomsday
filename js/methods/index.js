// methods/index.js
// Registro de métodos de cálculo del doomsday del año.
// La interfaz y el motor nunca nombran un método concreto: lo piden por id
// o recorren la lista.
//
// Para AÑADIR un método: crear js/methods/<id>.js con el objeto Method,
// importarlo aquí y añadirlo al array METHODS.
// Para QUITAR un método: borrar su import y su entrada en METHODS.

import { classic12 } from './classic12.js';
import { odd11 } from './odd11.js';

const METHODS = [classic12, odd11];

// Índice por id. Falla al cargar si hay ids repetidos.
const BY_ID = new Map();
for (const method of METHODS) {
  if (BY_ID.has(method.id)) {
    throw new Error(`Método duplicado en el registro: ${method.id}`);
  }
  BY_ID.set(method.id, method);
}

/** @returns {Array} Copia de la lista de métodos registrados. */
export function listMethods() {
  return [...METHODS];
}

/**
 * @param {string} id Identificador del método.
 * @returns {object} El método registrado con ese id.
 * @throws {Error} Si no existe.
 */
export function getMethod(id) {
  const method = BY_ID.get(id);
  if (!method) {
    throw new Error(`Método desconocido: ${id}`);
  }
  return method;
}