// uiController.js
// Único módulo que gestiona las pantallas del juego: eventos, selectores y tema.
// No nombra ningún modo, método, nivel ni tiempo concreto: construye los selectores
// recorriendo los registros (modos, métodos, LEVELS y TIME_LEVELS).
//
// Estado de este archivo (tarea 4B.2): navegación, menú de modos, ajustes, tema,
// pantalla de juego (con repaso y selector de método en la solución), guardado de
// cada intento, pantalla de estadísticas y calculadora.

import { WEEKDAYS, MONTHS, LEVELS, TIME_LEVELS, DEFAULT_SETTINGS } from './config.js';
import * as methodRegistry from './methods/index.js';
import * as engine from './doomsdayEngine.js';
import { render as renderStats } from './statsView.js';
import { render as renderCalculator } from './calculatorView.js';

/**
 * @param {{ root: HTMLElement, storage: object, gameModes: object, stats: object }} deps
 *   root: contenedor de la app (donde están las pantallas)
 *   storage: módulo storageManager · gameModes: módulo gameModes · stats: módulo statsCalculator
 */
export function init({ root, storage, gameModes, stats }) {
  // ---------- Utilidades del DOM ----------

  /** Busca un elemento por id dentro de root; falla con un mensaje claro si falta. */
  function need(id) {
    const node = root.querySelector(`#${id}`);
    if (!node) throw new Error(`uiController: falta el elemento #${id} en index.html`);
    return node;
  }

  /** Vacía un <select> y lo rellena con los elementos de un registro { id, label }. */
  function fillSelect(select, items, currentId) {
    select.replaceChildren();
    for (const item of items) {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.label;
      select.append(option);
    }
    select.value = currentId;
  }

  /** Devuelve `id` si existe en la lista; si no, el valor por defecto o el primero. */
  function validId(list, id, fallbackId) {
    if (list.some((item) => item.id === id)) return id;
    if (list.some((item) => item.id === fallbackId)) return fallbackId;
    return list[0]?.id;
  }

  // ---------- Registros y ajustes ----------

  const modes = gameModes.listModes();
  const methods = methodRegistry.listMethods();
  const THEMES = ['auto', 'light', 'dark'];

  // Los ajustes guardados pueden apuntar a algo que ya no existe (p. ej. un modo
  // borrado del registro): se corrigen y se vuelven a guardar.
  const loaded = storage.loadSettings();
  const settings = {
    theme: THEMES.includes(loaded.theme) ? loaded.theme : DEFAULT_SETTINGS.theme,
    modeId: validId(modes, loaded.modeId, DEFAULT_SETTINGS.modeId),
    levelId: validId(LEVELS, loaded.levelId, DEFAULT_SETTINGS.levelId),
    timeId: validId(TIME_LEVELS, loaded.timeId, DEFAULT_SETTINGS.timeId),
    methodId: validId(methods, loaded.methodId, DEFAULT_SETTINGS.methodId),
  };
  if (Object.keys(settings).some((key) => settings[key] !== loaded[key])) {
    storage.saveSettings(settings);
  }

  /** Actualiza un ajuste en memoria y lo guarda. */
  function updateSetting(partial) {
    Object.assign(settings, partial);
    storage.saveSettings(partial);
  }

  // ---------- Tema ----------

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme; // 'auto' | 'light' | 'dark'
  }

  // ---------- Navegación entre pantallas ----------

  const screens = [...root.querySelectorAll('[data-screen]')];
  let currentScreen = null;

  function showScreen(name) {
    if (!screens.some((s) => s.dataset.screen === name)) {
      throw new Error(`uiController: no existe la pantalla "${name}"`);
    }
    // Al salir de la partida se detiene la sesión (y con ella el temporizador).
    if (currentScreen === 'game' && name !== 'game') stopGame();
    for (const screen of screens) screen.hidden = screen.dataset.screen !== name;
    currentScreen = name;
    window.scrollTo(0, 0);
    // Las estadísticas se calculan cada vez que se abre la pantalla.
    if (name === 'stats') refreshStats();
    // La calculadora se monta la primera vez que se abre.
    if (name === 'calculator') openCalculator();
  }

  // Cualquier elemento con data-goto="<pantalla>" navega a ella.
  root.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-goto]');
    if (trigger && root.contains(trigger)) showScreen(trigger.dataset.goto);
  });

  // ---------- Menú: selector de modos ----------

  const modeList = need('mode-list');
  const modeDescription = need('mode-description');
  const timeField = need('setting-time-field');

  function currentMode() {
    return modes.find((m) => m.id === settings.modeId);
  }

  /** Descripción del modo elegido y, si no tiene temporizador, oculta el tiempo en Ajustes. */
  function refreshModeInfo() {
    const mode = currentMode();
    modeDescription.textContent = mode ? mode.description : '';
    timeField.hidden = !(mode && mode.features.timer);
  }

  function buildModeList() {
    modeList.replaceChildren();
    for (const mode of modes) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'mode';
      input.value = mode.id;
      input.id = `mode-${mode.id}`;
      input.checked = mode.id === settings.modeId;
      label.append(input, document.createTextNode(mode.label));
      modeList.append(label);
    }
  }

  modeList.addEventListener('change', (event) => {
    if (event.target.name !== 'mode') return;
    updateSetting({ modeId: event.target.value });
    refreshModeInfo();
  });

  // ---------- Ajustes ----------

  const themeSelect = need('setting-theme');
  const levelSelect = need('setting-level');
  const timeSelect = need('setting-time');
  const methodSelect = need('setting-method');
  const methodDescription = need('setting-method-description');

  function refreshMethodDescription() {
    const method = methods.find((m) => m.id === settings.methodId);
    methodDescription.textContent = method ? method.description : '';
  }

  themeSelect.value = settings.theme;
  fillSelect(levelSelect, LEVELS, settings.levelId);
  fillSelect(timeSelect, TIME_LEVELS, settings.timeId);
  fillSelect(methodSelect, methods, settings.methodId);

  themeSelect.addEventListener('change', () => {
    updateSetting({ theme: themeSelect.value });
    applyTheme(settings.theme);
  });
  levelSelect.addEventListener('change', () => updateSetting({ levelId: levelSelect.value }));
  timeSelect.addEventListener('change', () => updateSetting({ timeId: timeSelect.value }));
  methodSelect.addEventListener('change', () => {
    updateSetting({ methodId: methodSelect.value });
    refreshMethodDescription();
    syncMethodSwitch(); // mantiene al día el selector del recuadro de solución
  });

  // ---------- Pantalla de juego ----------

  const SOLUTION_LABEL = 'Ver solución'; // durante la pregunta (cuenta como solución pedida)
  const REVIEW_LABEL = 'Ver cómo se calcula'; // tras fallar (es solo un repaso)

  const gameTitle = need('game-title');
  const streakBox = need('game-streak');
  const streakCurrent = need('game-streak-current');
  const streakBest = need('game-streak-best');
  const timerBox = need('game-timer');
  const timerValue = need('game-timer-value');
  const questionBox = need('game-question');
  const answersBox = need('game-answers');
  const feedbackBox = need('game-feedback');
  const hintList = need('game-hints');
  const solutionBox = need('game-solution');
  const solutionSteps = need('game-solution-steps');
  const hintButton = need('btn-hint');
  const solutionButton = need('btn-solution');
  const nextButton = need('btn-next');

  // Un botón por día de la semana, a partir de WEEKDAYS (índice 0 = Domingo).
  const answerButtons = WEEKDAYS.map((name, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    button.dataset.guess = String(index);
    return button;
  });
  answersBox.replaceChildren(...answerButtons);

  // Selector del método con el que se muestra la solución. Se construye desde el
  // registro de métodos y se coloca bajo el título "Solución". Si solo hay un
  // método, se oculta.
  const methodSwitch = document.createElement('div');
  methodSwitch.className = 'choice-list';
  methodSwitch.setAttribute('role', 'radiogroup');
  methodSwitch.setAttribute('aria-label', 'Método de la solución');
  methodSwitch.hidden = methods.length < 2;
  for (const method of methods) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'solution-method';
    input.value = method.id;
    label.append(input, document.createTextNode(method.label));
    methodSwitch.append(label);
  }
  const solutionHeading = solutionBox.querySelector('h3');
  if (solutionHeading) solutionHeading.after(methodSwitch);
  else solutionBox.prepend(methodSwitch);

  /** Marca en el selector de la solución el método de los ajustes. */
  function syncMethodSwitch() {
    for (const input of methodSwitch.querySelectorAll('input')) {
      input.checked = input.value === settings.methodId;
    }
  }
  syncMethodSwitch();

  let session = null; // sesión activa (null si no hay partida)
  let sessionSettings = null; // ajustes con los que se creó la sesión (para el Attempt)
  let questionOpen = false; // true entre 'question' y 'result'
  let currentQuestion = null; // pregunta en pantalla (para calcular la solución)
  let savedBest = 0; // mejor racha ya guardada, para no escribir de más
  // Cadena de guardados pendientes: los intentos se escriben en orden y las
  // estadísticas esperan a que terminen antes de leer el historial.
  let pendingSave = Promise.resolve();

  function setAnswersEnabled(enabled) {
    for (const button of answerButtons) button.disabled = !enabled;
  }

  /** Cierra la pregunta: nada más se puede pulsar salvo "Siguiente". */
  function lockQuestion() {
    questionOpen = false;
    setAnswersEnabled(false);
    hintButton.disabled = true;
    solutionButton.disabled = true;
    nextButton.hidden = false;
  }

  function showQuestion(question) {
    questionOpen = true;
    currentQuestion = question;
    questionBox.textContent = `${question.day} de ${MONTHS[question.month - 1].toLowerCase()} de ${question.year}`;
    for (const button of answerButtons) button.classList.remove('is-correct', 'is-wrong');
    setAnswersEnabled(true);
    feedbackBox.textContent = '';
    feedbackBox.classList.remove('is-correct', 'is-wrong');
    hintList.replaceChildren();
    solutionSteps.replaceChildren();
    solutionBox.hidden = true;
    hintButton.disabled = false;
    solutionButton.disabled = false;
    solutionButton.textContent = SOLUTION_LABEL;
    nextButton.hidden = true;
  }

  function showHint({ index, total, text }) {
    const item = document.createElement('li');
    item.textContent = text;
    hintList.append(item);
    if (index >= total) hintButton.disabled = true; // era la última pista
  }

  /**
   * Dibuja el desglose de la pregunta en pantalla con el método elegido ahora
   * (settings.methodId), que puede diferir del de la sesión. Es una consulta pura
   * al motor: no toca la sesión ni lo que se guarde del intento.
   */
  function renderSolution() {
    if (!currentQuestion) return;
    const steps = engine.getSolution(currentQuestion, settings.methodId);
    solutionSteps.replaceChildren();
    for (const step of steps) {
      const item = document.createElement('li');
      const title = document.createElement('strong');
      title.textContent = step.title;
      item.append(title, document.createTextNode(`: ${step.text}`));
      solutionSteps.append(item);
    }
    syncMethodSwitch();
    solutionBox.hidden = false;
  }

  methodSwitch.addEventListener('change', (event) => {
    if (event.target.name !== 'solution-method') return;
    updateSetting({ methodId: event.target.value });
    methodSelect.value = settings.methodId; // mismo ajuste que en Ajustes
    refreshMethodDescription();
    if (!solutionBox.hidden) renderSolution();
  });

  /** Convierte un Result de la sesión en un Attempt (contrato 5.1) y lo guarda. */
  function saveAttempt(result) {
    const q = result.question;
    const attempt = {
      ts: Date.now(),
      // Ajustes de la sesión, no los actuales: el método de la pantalla de
      // solución puede haber cambiado a mitad de partida.
      modeId: sessionSettings.modeId,
      levelId: sessionSettings.levelId,
      methodId: sessionSettings.methodId,
      year: q.year,
      month: q.month,
      day: q.day,
      century: q.century,
      isLeap: q.isLeap,
      answer: q.answer,
      guess: result.guess,
      correct: result.correct,
      timeMs: result.timeMs,
      hintsUsed: result.hintsUsed,
      solutionShown: result.solutionShown,
      timedOut: result.timedOut,
    };
    pendingSave = pendingSave
      .then(() => storage.addAttempt(attempt))
      .catch((error) => console.error('uiController: no se pudo guardar el intento', error));
  }

  function showResult(result) {
    lockQuestion();
    currentQuestion = result.question;
    const answerName = WEEKDAYS[result.question.answer];
    answerButtons[result.question.answer].classList.add('is-correct');

    let message;
    if (result.correct) {
      message = '¡Correcto!';
    } else if (result.timedOut) {
      message = `Tiempo agotado. Era ${answerName}.`;
    } else if (result.solutionShown) {
      message = `Era ${answerName}.`;
    } else {
      const guessName = Number.isInteger(result.guess) ? WEEKDAYS[result.guess] : null;
      message = guessName
        ? `Incorrecto. Marcaste ${guessName}; era ${answerName}.`
        : `Incorrecto. Era ${answerName}.`;
      if (Number.isInteger(result.guess)) answerButtons[result.guess].classList.add('is-wrong');
    }
    feedbackBox.textContent = message;
    feedbackBox.classList.add(result.correct ? 'is-correct' : 'is-wrong');

    // Tras fallar sin haber visto la solución, se ofrece repasar el desglose.
    // Es solo una consulta: no afecta a la sesión ni al intento que se guarde.
    if (!result.correct && !result.solutionShown) {
      solutionButton.textContent = REVIEW_LABEL;
      solutionButton.disabled = false;
    }
    nextButton.focus();
    saveAttempt(result);
  }

  function showStreak({ current, best }) {
    streakCurrent.textContent = String(current);
    streakBest.textContent = String(best);
    if (best > savedBest) {
      savedBest = best;
      storage.saveBestStreak(settings.modeId, best);
    }
  }

  /** Detiene la sesión activa y deja de atender sus eventos. */
  function stopGame() {
    if (session) session.stop();
    session = null;
    questionOpen = false;
    currentQuestion = null;
  }

  /** Crea la sesión del modo elegido, conecta sus eventos y la arranca. */
  function startGame() {
    stopGame();
    const mode = currentMode();
    const initialBestStreak = storage.getBestStreak(mode.id);
    savedBest = initialBestStreak;
    sessionSettings = { ...settings };

    gameTitle.textContent = mode.label;
    streakBox.hidden = !mode.features.streak;
    timerBox.hidden = !mode.features.timer;
    streakCurrent.textContent = '0';
    streakBest.textContent = String(initialBestStreak);
    timerValue.textContent = '';

    const current = gameModes.createSession(mode.id, { settings: { ...sessionSettings }, initialBestStreak });
    session = current;
    // Cada manejador ignora los eventos de una sesión que ya no es la activa.
    const only = (handler) => (payload) => {
      if (session === current) handler(payload);
    };
    current.on('question', only(showQuestion));
    current.on('tick', only(({ secondsLeft }) => { timerValue.textContent = String(secondsLeft); }));
    current.on('hint', only(showHint));
    // La sesión avisa de que se pidió la solución; el desglose se dibuja aquí con
    // el método elegido en pantalla, no con el que traía la sesión.
    current.on('solution', only(() => renderSolution()));
    current.on('result', only(showResult));
    current.on('streak', only(showStreak));
    current.start();
  }

  answersBox.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-guess]');
    if (!button || !session || !questionOpen) return;
    session.submit(Number(button.dataset.guess));
  });
  hintButton.addEventListener('click', () => { if (session && questionOpen) session.requestHint(); });
  solutionButton.addEventListener('click', () => {
    if (!session) return;
    if (questionOpen) {
      session.showSolution(); // pregunta abierta: cuenta como solución pedida
    } else if (currentQuestion) {
      // Pregunta ya resuelta: repaso del desglose sin tocar la sesión.
      renderSolution();
      solutionButton.disabled = true;
      solutionBox.scrollIntoView({ block: 'nearest' });
    }
  });
  nextButton.addEventListener('click', () => { if (session) session.next(); });

  need('btn-start').addEventListener('click', () => {
    showScreen('game');
    startGame();
  });

  // ---------- Estadísticas ----------

  const statsContainer = need('stats-container');
  const clearStatsButton = need('btn-clear-stats');
  let statsRenderId = 0; // descarta lecturas antiguas si se abre la pantalla varias veces

  /** Lee el historial, calcula todas las métricas y las pinta. */
  async function refreshStats() {
    const renderId = ++statsRenderId;
    statsContainer.textContent = 'Cargando…';
    try {
      await pendingSave; // que el último intento ya esté guardado
      const attempts = await storage.getAttempts();
      if (renderId !== statsRenderId) return;
      renderStats(statsContainer, stats.computeAll(attempts));
    } catch (error) {
      if (renderId !== statsRenderId) return;
      console.error('uiController: no se pudo leer el historial', error);
      statsContainer.textContent = 'No se pudo cargar el historial.';
    }
  }

  clearStatsButton.addEventListener('click', async () => {
    if (!window.confirm('¿Borrar todo el historial de intentos? Esta acción no se puede deshacer.')) return;
    try {
      await pendingSave;
      await storage.clearAttempts();
    } catch (error) {
      console.error('uiController: no se pudo borrar el historial', error);
    }
    refreshStats();
  });

  // ---------- Calculadora ----------

  const calculatorContainer = need('calculator-container');
  let calculatorReady = false;

  /**
   * Monta la calculadora la primera vez que se abre la pantalla. Después se
   * reutiliza, así que conserva lo último consultado mientras la app siga abierta.
   * Es una herramienta de consulta: no guarda intentos ni toca las estadísticas.
   */
  function openCalculator() {
    if (calculatorReady) return;
    try {
      renderCalculator(calculatorContainer, { engine, methods: methodRegistry });
      calculatorReady = true;
    } catch (error) {
      console.error('uiController: no se pudo abrir la calculadora', error);
      calculatorContainer.textContent = 'No se pudo cargar la calculadora.';
    }
  }

  // ---------- Arranque ----------

  applyTheme(settings.theme);
  buildModeList();
  refreshModeInfo();
  refreshMethodDescription();
  showScreen('menu');
}