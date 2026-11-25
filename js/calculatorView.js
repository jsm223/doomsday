// calculatorView.js
// Herramienta de consulta (no es un modo): dado un año, o una fecha completa,
// muestra el doomsday o el día de la semana con su desglose.
// No genera Attempt: no toca el historial ni las estadísticas.
//
// El motor y el registro de métodos llegan por parámetro (contrato 5.9):
//   engine:  doomsdayEngine (isValidDate, buildQuestion, getSolution,
//            doomsdayOfYear, doomsdayOfMonth, centuryAnchor)
//   methods: methods/index.js (listMethods, getMethod)

import { WEEKDAYS, MONTHS } from './config.js';

// Rango de años de la calculadora: siempre el completo que el motor tiene
// comprobado (1600–2500). No depende de los niveles de config.js.
const MIN_YEAR = 1600;
const MAX_YEAR = 2500;

/** Crea un elemento con clase y texto (siempre textContent, nunca innerHTML). */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Campo de formulario: etiqueta + control. */
function field(labelText, control) {
  const wrapper = el('div', 'field');
  const label = el('label', null, labelText);
  label.htmlFor = control.id;
  wrapper.append(label, control);
  return wrapper;
}

/** Texto → entero. Vacío → null; si no es un entero → NaN. */
function parseInteger(text) {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  return /^-?\d+$/.test(trimmed) ? Number(trimmed) : NaN;
}

/** Lista ordenada de pasos { title, text }. */
function stepsList(steps) {
  const list = el('ol');
  for (const step of steps) {
    const item = el('li');
    item.append(el('strong', null, step.title), document.createTextNode(`: ${step.text}`));
    list.append(item);
  }
  return list;
}

/**
 * Pinta la calculadora dentro de `container` (lo vacía antes).
 * @param {HTMLElement} container
 * @param {{ engine: object, methods: object }} deps
 */
export function render(container, { engine, methods }) {
  container.replaceChildren();

  const methodList = methods.listMethods();

  // ---------- Formulario ----------

  const form = el('form');
  form.noValidate = true; // las comprobaciones y sus mensajes los gestiona este módulo

  const yearInput = el('input');
  yearInput.type = 'text';
  yearInput.inputMode = 'numeric';
  yearInput.autocomplete = 'off';
  yearInput.id = 'calc-year';
  yearInput.placeholder = `${MIN_YEAR}–${MAX_YEAR}`;

  const monthSelect = el('select');
  monthSelect.id = 'calc-month';
  monthSelect.append(new Option('— (solo el año)', ''));
  MONTHS.forEach((name, index) => monthSelect.append(new Option(name, String(index + 1))));

  const dayInput = el('input');
  dayInput.type = 'text';
  dayInput.inputMode = 'numeric';
  dayInput.autocomplete = 'off';
  dayInput.id = 'calc-day';
  dayInput.placeholder = '1–31';

  const methodSelect = el('select');
  methodSelect.id = 'calc-method';
  for (const method of methodList) methodSelect.append(new Option(method.label, method.id));
  const methodDescription = el('p', 'hint');

  const methodField = field('Método de cálculo', methodSelect);
  methodField.append(methodDescription);

  const submit = el('button', 'primary', 'Calcular');
  submit.type = 'submit';
  const actions = el('div', 'actions');
  actions.append(submit);

  const yearField = field('Año (obligatorio)', yearInput);
  yearField.append(el('p', 'hint', `Entre ${MIN_YEAR} y ${MAX_YEAR}.`));
  form.append(
    yearField,
    field('Mes (opcional)', monthSelect),
    field('Día (opcional)', dayInput),
    methodField,
    actions
  );

  const resultBox = el('div');
  resultBox.setAttribute('aria-live', 'polite');
  container.append(form, resultBox);

  // ---------- Resultados ----------

  let hasResult = false; // true si lo que se ve es un resultado (no un error ni vacío)

  function showError(message) {
    hasResult = false;
    resultBox.replaceChildren(el('p', 'feedback is-wrong', message));
  }

  function showResultCard(...nodes) {
    hasResult = true;
    const card = el('section');
    card.style.cssText =
      'margin-top:1rem;padding:.75rem 1rem;background:var(--surface);' +
      'border:1px solid var(--border);border-radius:.75rem';
    card.append(...nodes);
    resultBox.replaceChildren(card);
  }

  /** Solo año: doomsday del año y día doomsday de cada mes. */
  function showYear(year, methodId) {
    const explained = methods.getMethod(methodId).explainYear(year);
    const doomsday = engine.doomsdayOfYear(year);

    const summary = el('p');
    summary.append(
      'Doomsday del año: ',
      el('strong', null, WEEKDAYS[doomsday]),
      ` · Ancla del siglo: ${WEEKDAYS[engine.centuryAnchor(year)]}`,
      ` · Bisiesto: ${engine.isLeap(year) ? 'sí' : 'no'}`
    );

    const table = el('table');
    const head = el('thead');
    const headRow = el('tr');
    headRow.append(el('th', null, 'Mes'), el('th', null, `Día que cae en ${WEEKDAYS[doomsday]}`));
    head.append(headRow);
    const body = el('tbody');
    MONTHS.forEach((name, index) => {
      const row = el('tr');
      row.append(el('td', null, name), el('td', null, String(engine.doomsdayOfMonth(year, index + 1))));
      body.append(row);
    });
    table.append(head, body);

    showResultCard(
      el('h3', null, `Año ${year}`),
      summary,
      stepsList(explained.steps),
      el('h3', null, 'Días doomsday de cada mes'),
      table
    );
  }

  /** Fecha completa: día de la semana con el desglose paso a paso. */
  function showDate(year, month, day, methodId) {
    const question = engine.buildQuestion(year, month, day);
    const steps = engine.getSolution(question, methodId);

    const answer = el('p');
    answer.append('Día de la semana: ', el('strong', null, WEEKDAYS[question.answer]));

    showResultCard(
      el('h3', null, `${day} de ${MONTHS[month - 1].toLowerCase()} de ${year}`),
      answer,
      stepsList(steps)
    );
  }

  /** Lee el formulario, valida y pinta el resultado que corresponda. */
  function calculate() {
    const year = parseInteger(yearInput.value);
    const day = parseInteger(dayInput.value);
    const month = monthSelect.value === '' ? null : Number(monthSelect.value);
    const methodId = methodSelect.value;

    if (year === null) return showError('Indica un año.');
    if (Number.isNaN(year) || year < MIN_YEAR || year > MAX_YEAR) {
      return showError(`El año debe ser un número entero entre ${MIN_YEAR} y ${MAX_YEAR}.`);
    }
    if (Number.isNaN(day)) return showError('El día debe ser un número entero.');
    if (!methodId) return showError('No hay ningún método de cálculo disponible.');

    try {
      if (month === null && day === null) return showYear(year, methodId);
      if (month === null || day === null) {
        return showError('Para consultar una fecha indica mes y día. Si solo quieres el año, deja ambos en blanco.');
      }
      if (!engine.isValidDate(year, month, day)) {
        return showError(`El ${day} de ${MONTHS[month - 1].toLowerCase()} de ${year} no existe en el calendario.`);
      }
      return showDate(year, month, day, methodId);
    } catch (error) {
      console.error('calculatorView: no se pudo calcular', error);
      return showError('No se pudo calcular. Revisa los datos e inténtalo de nuevo.');
    }
  }

  // ---------- Eventos ----------

  function refreshMethodDescription() {
    const method = methodList.find((m) => m.id === methodSelect.value);
    methodDescription.textContent = method ? method.description : '';
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    calculate();
  });

  // Al cambiar de método se redibuja el resultado que ya se estaba viendo.
  methodSelect.addEventListener('change', () => {
    refreshMethodDescription();
    if (hasResult) calculate();
  });

  refreshMethodDescription();
}