// storageManager.js
// Persistencia de la app: localStorage (ajustes y récord de racha por modo)
// e IndexedDB (historial de intentos).
// No contiene lógica de juego ni toca el DOM. Contrato: PLAN.md, sección 5.6.

import { DEFAULT_SETTINGS } from './config.js';

const SETTINGS_KEY = 'doomsday:settings';
const STREAKS_KEY = 'doomsday:bestStreaks';

const DB_NAME = 'doomsday';
const DB_VERSION = 1;
const STORE = 'attempts';

// ---------------------------------------------------------------------------
// localStorage (con respaldo en memoria si el navegador lo bloquea,
// por ejemplo en modo privado de algunos navegadores)
// ---------------------------------------------------------------------------

const memoryStorage = new Map();

function readRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return memoryStorage.has(key) ? memoryStorage.get(key) : null;
  }
}

function writeRaw(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    memoryStorage.set(key, value);
  }
}

/** Lee un objeto JSON guardado; si no existe o está corrupto devuelve {}. */
function readObject(key) {
  const raw = readRaw(key);
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function writeObject(key, obj) {
  writeRaw(key, JSON.stringify(obj));
}

// ---------------------------------------------------------------------------
// IndexedDB (historial)
// ---------------------------------------------------------------------------

let dbPromise = null;
// Si IndexedDB no está disponible, el historial vive en memoria durante la sesión.
let memoryAttempts = null;

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        // Clave autoincremental externa: el Attempt se guarda tal cual,
        // sin añadirle campos. El orden de clave es el orden de inserción.
        db.createObjectStore(STORE, { autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Devuelve la base de datos abierta, o null si se usa el respaldo en memoria. */
function getDb() {
  if (!dbPromise) {
    dbPromise = openDb().catch((err) => {
      console.warn('storageManager: IndexedDB no disponible, el historial será temporal.', err);
      memoryAttempts = [];
      return null;
    });
  }
  return dbPromise;
}

/** Ejecuta una operación sobre el almacén y espera a que la transacción termine. */
function runTx(db, mode, action) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/** Abre la base de datos. Es seguro llamarla varias veces. */
export async function init() {
  await getDb();
}

/** Ajustes guardados mezclados sobre DEFAULT_SETTINGS. */
export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...readObject(SETTINGS_KEY) };
}

/** Guarda solo las claves indicadas; el resto de ajustes se conserva. */
export function saveSettings(partial) {
  writeObject(SETTINGS_KEY, { ...readObject(SETTINGS_KEY), ...partial });
}

/** Récord de racha del modo indicado (0 si aún no hay ninguno). */
export function getBestStreak(modeId) {
  const value = Number(readObject(STREAKS_KEY)[modeId]);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Guarda el récord de racha del modo indicado. */
export function saveBestStreak(modeId, n) {
  const value = Math.floor(Number(n));
  if (!Number.isFinite(value) || value < 0) return;
  writeObject(STREAKS_KEY, { ...readObject(STREAKS_KEY), [modeId]: value });
}

/** Añade un intento al historial. */
export async function addAttempt(attempt) {
  const db = await getDb();
  if (!db) {
    memoryAttempts.push(structuredClone(attempt));
    return;
  }
  await runTx(db, 'readwrite', (store) => store.add(attempt));
}

/** Todos los intentos, del más antiguo al más reciente. */
export async function getAttempts() {
  const db = await getDb();
  if (!db) return structuredClone(memoryAttempts);
  return runTx(db, 'readonly', (store) => store.getAll());
}

/** Borra el historial. No toca ajustes ni récords de racha. */
export async function clearAttempts() {
  const db = await getDb();
  if (!db) {
    memoryAttempts = [];
    return;
  }
  await runTx(db, 'readwrite', (store) => store.clear());
}