// modes/practice.js
// Modo Práctica: sin temporizador ni racha, pistas ilimitadas (hasta agotar las
// que da el motor). Contrato: PLAN.md, sección 5.5.

import { LEVELS } from '../config.js';
import { generateQuestion, checkAnswer, getHints, getSolution } from '../doomsdayEngine.js';

/** Crea una sesión de práctica con los ajustes indicados. */
function createSession({ settings }) {
  const level = LEVELS.find((l) => l.id === settings.levelId) ?? LEVELS[0];
  const methodId = settings.methodId;

  const listeners = new Map(); // evento → [handler]

  // Estado de la pregunta actual
  let question = null;     // Question en curso (null si no hay sesión activa)
  let hints = [];          // pistas de la pregunta actual
  let hintsUsed = 0;
  let startedAt = 0;
  let closed = true;       // true = esperando next() (o sesión parada)

  function emit(event, payload) {
    for (const handler of listeners.get(event) ?? []) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`practice: error en el manejador de '${event}'`, err);
      }
    }
  }

  function elapsed() {
    return Math.round(performance.now() - startedAt);
  }

  /** Hay una pregunta abierta que admite respuesta, pista o solución. */
  function isOpen() {
    return question !== null && !closed;
  }

  function next() {
    question = generateQuestion({ min: level.min, max: level.max });
    hints = getHints(question, methodId);
    hintsUsed = 0;
    closed = false;
    startedAt = performance.now();
    emit('question', question);
  }

  return {
    // Reinicia el estado y emite el primer 'question'.
    start() {
      question = null;
      hints = [];
      hintsUsed = 0;
      closed = true;
      next();
    },

    next,

    submit(guess) {
      if (!isOpen()) return;                                  // repetido o sin pregunta
      if (!Number.isInteger(guess) || guess < 0 || guess > 6) return; // respuesta no válida
      closed = true;
      emit('result', {
        question,
        guess,
        correct: checkAnswer(question, guess),
        timeMs: elapsed(),
        hintsUsed,
        solutionShown: false,
        timedOut: false,
      });
    },

    // 'index' va de 1 a 'total' (número de pista mostrada).
    requestHint() {
      if (!isOpen()) return;
      if (hintsUsed >= hints.length) return;                  // sin más pistas: no emite nada
      hintsUsed += 1;
      emit('hint', { index: hintsUsed, total: hints.length, text: hints[hintsUsed - 1] });
    },

    // Emite 'solution' y después 'result' como fallo.
    showSolution() {
      if (!isOpen()) return;
      closed = true;
      emit('solution', getSolution(question, methodId));
      emit('result', {
        question,
        guess: null,
        correct: false,
        timeMs: elapsed(),
        hintsUsed,
        solutionShown: true,
        timedOut: false,
      });
    },

    // Termina la sesión: ya no responde hasta un nuevo start().
    stop() {
      question = null;
      hints = [];
      closed = true;
    },

    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(handler);
    },
  };
}

export const practice = {
  id: 'practice',
  label: 'Práctica',
  description: 'Sin tiempo ni racha. Pide todas las pistas que quieras.',
  features: { timer: false, streak: false },
  create: createSession,
};