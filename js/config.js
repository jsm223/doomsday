// config.js
// Datos de configuración de la app. Módulo puro: sin DOM ni almacenamiento.
// Para añadir o quitar niveles o dificultades de tiempo, basta con
// añadir o borrar un objeto en el array correspondiente.

// Días de la semana. Índice 0 = Domingo (igual que Date.getUTCDay()).
export const WEEKDAYS = Object.freeze([
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]);

// Meses. Índice 0 = Enero (el mes número 1 se consulta con MONTHS[mes - 1]).
export const MONTHS = Object.freeze([
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]);

// Niveles: rango de años (ambos incluidos) de las preguntas.
export const LEVELS = Object.freeze([
  Object.freeze({ id: 'n1', label: 'Nivel 1 (1900–2099)', min: 1900, max: 2099 }),
  Object.freeze({ id: 'n2', label: 'Nivel 2 (1800–2199)', min: 1800, max: 2199 }),
  Object.freeze({ id: 'n3', label: 'Nivel 3 (1600–2500)', min: 1600, max: 2500 }),
]);

// Dificultades de tiempo: segundos por pregunta (solo modos con temporizador).
export const TIME_LEVELS = Object.freeze([
  Object.freeze({ id: 'relajado', label: 'Relajado (60 s)', seconds: 60 }),
  Object.freeze({ id: 'normal', label: 'Normal (30 s)', seconds: 30 }),
  Object.freeze({ id: 'rapido', label: 'Rápido (15 s)', seconds: 15 }),
  Object.freeze({ id: 'experto', label: 'Experto (8 s)', seconds: 8 }),
]);

// Ajustes iniciales. Los ids deben existir en los registros correspondientes:
// modeId → modes/index.js, methodId → methods/index.js,
// levelId → LEVELS, timeId → TIME_LEVELS.
export const DEFAULT_SETTINGS = Object.freeze({
  theme: 'auto', // 'auto' | 'light' | 'dark'
  modeId: 'practice',
  levelId: 'n1',
  timeId: 'normal',
  methodId: 'classic12',
});