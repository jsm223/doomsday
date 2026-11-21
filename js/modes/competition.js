// modes/competition.js
// Modo Competición: temporizador por pregunta (según TIME_LEVELS), racha actual
// y récord. Pedir pista o solución rompe la racha; agotar el tiempo cuenta como
// fallo (timedOut: true). Contrato: PLAN.md, sección 5.5.

import { LEVELS, TIME_LEVELS } from '../config.js';
import { generateQuestion, checkAnswer, getHints, getSolution } from '../doomsdayEngine.js';

// Cada cuánto se revisa el reloj (ms). El tiempo restante se calcula con una
// hora límite, así que no se desvía aunque el navegador retrase los avisos.
const CHECK_INTERVAL_MS = 250;

/** Crea una sesión de competición con los ajustes indicados. */
function createSession({ settings, initialBestStreak }) {
  const level = LEVELS.find((l) => l.id === settings.levelId) ?? LEVELS[0];
  const timeLevel = TIME_LEVELS.find((t) => t.id === settings.timeId) ?? TIME_LEVELS[0];
  const limitMs = timeLevel.seconds * 1000;
  const methodId = settings.methodId;

  const listeners = new Map(); // evento → [handler]

  // Racha. El récord se conserva aunque se llame de nuevo a start().
  let bestStreak =
    Number.isFinite(initialBestStreak) && initialBestStreak > 0 ? Math.floor(initialBestStreak) : 0;
  let currentStreak = 0;
  let streakBroken = false; // true si en esta pregunta se pidió pista o solución

  // Estado de la pregunta actual
  let question = null;
  let hints = [];
  let hintsUsed = 0;
  let startedAt = 0;
  let deadline = 0;
  let lastSecondsLeft = 0;
  let timerId = null;
  let closed = true; // true = esperando next() (o sesión parada)

  function emit(event, payload) {
    for (const handler of listeners.get(event) ?? []) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`competition: error en el manejador de '${event}'`, err);
      }
    }
  }

  function elapsed() {
    return Math.round(performance.now() - startedAt);
  }

  function isOpen() {
    return question !== null && !closed;
  }

  function clearTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  /** Cambia la racha y emite 'streak' solo si algo ha cambiado. */
  function setStreak(current) {
    const best = Math.max(bestStreak, current);
    const changed = current !== currentStreak || best !== bestStreak;
    currentStreak = current;
    bestStreak = best;
    if (changed) emit('streak', { current, best });
  }

  function onTick() {
    if (!isOpen()) {
      clearTimer();
      return;
    }
    const current = question;
    const remaining = deadline - performance.now();
    const secondsLeft = Math.max(0, Math.ceil(remaining / 1000));
    if (secondsLeft !== lastSecondsLeft) {
      lastSecondsLeft = secondsLeft;
      emit('tick', { secondsLeft });
    }
    // Un manejador de 'tick' podría haber cerrado o cambiado la pregunta.
    if (remaining <= 0 && question === current && isOpen()) timeout();
  }

  function timeout() {
    closed = true;
    clearTimer();
    emit('result', {
      question,
      guess: null,
      correct: false,
      timeMs: elapsed(),
      hintsUsed,
      solutionShown: false,
      timedOut: true,
    });
    setStreak(0);
  }

  function next() {
    clearTimer();
    question = generateQuestion({ min: level.min, max: level.max });
    hints = getHints(question, methodId);
    hintsUsed = 0;
    streakBroken = false;
    closed = false;
    startedAt = performance.now();
    deadline = startedAt + limitMs;
    lastSecondsLeft = timeLevel.seconds;
    timerId = setInterval(onTick, CHECK_INTERVAL_MS);
    emit('question', question);
    emit('tick', { secondsLeft: timeLevel.seconds });
  }

  return {
    // Reinicia la racha actual (el récord se mantiene) y emite el primer 'question'.
    start() {
      clearTimer();
      question = null;
      hints = [];
      hintsUsed = 0;
      closed = true;
      currentStreak = 0;
      streakBroken = false;
      next();
      emit('streak', { current: currentStreak, best: bestStreak });
    },

    next,

    submit(guess) {
      if (!isOpen()) return;                                  // repetido o sin pregunta
      if (!Number.isInteger(guess) || guess < 0 || guess > 6) return; // respuesta no válida
      closed = true;
      clearTimer();
      const correct = checkAnswer(question, guess);
      emit('result', {
        question,
        guess,
        correct,
        timeMs: elapsed(),
        hintsUsed,
        solutionShown: false,
        timedOut: false,
      });
      // Acertar solo suma racha si no se pidió ayuda en esta pregunta.
      setStreak(correct && !streakBroken ? currentStreak + 1 : 0);
    },

    // 'index' va de 1 a 'total'. Pedir una pista rompe la racha.
    requestHint() {
      if (!isOpen()) return;
      if (hintsUsed >= hints.length) return;                  // sin más pistas: no emite nada
      hintsUsed += 1;
      emit('hint', { index: hintsUsed, total: hints.length, text: hints[hintsUsed - 1] });
      streakBroken = true;
      setStreak(0);
    },

    // Emite 'solution' y después 'result' como fallo. Rompe la racha.
    showSolution() {
      if (!isOpen()) return;
      closed = true;
      clearTimer();
      streakBroken = true;
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
      setStreak(0);
    },

    // Termina la sesión y detiene el temporizador hasta un nuevo start().
    stop() {
      clearTimer();
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

export const competition = {
  id: 'competition',
  label: 'Competición',
  description: 'Contrarreloj con racha. Pedir pista o solución rompe la racha.',
  features: { timer: true, streak: true },
  create: createSession,
};