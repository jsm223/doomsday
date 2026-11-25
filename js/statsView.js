// statsView.js
// Dibuja el panel de estadísticas a partir de la salida de computeAll().
// Solo toca el contenedor que recibe. No conoce ninguna métrica concreta: dibuja
// según el tipo ('number' | 'table' | 'bars'). Para soportar un tipo nuevo, basta
// con añadir una función al objeto RENDERERS.
// Los estilos definitivos irán en styles.css (clases stats-*); aquí solo hay los
// mínimos en línea para que las barras se vean aunque no haya CSS todavía.

const EMPTY = '—'; // valor mostrado cuando no hay datos (null)
const numberFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

/** Crea un elemento con clase y texto (siempre textContent, nunca innerHTML). */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Formatea un valor para mostrarlo: null/NaN → "—", números con coma decimal. */
function fmt(value) {
  if (value === null || value === undefined) return EMPTY;
  if (typeof value === 'number') return Number.isFinite(value) ? numberFormat.format(value) : EMPTY;
  return String(value);
}

function renderNumber(data) {
  const box = el('p', 'stats-number');
  const value = data?.value;
  box.append(el('span', 'stats-number-value', fmt(value)));
  if (data?.unit && value !== null && value !== undefined) {
    box.append(' ', el('span', 'stats-number-unit', data.unit));
  }
  return box;
}

function renderTable(data) {
  const table = el('table', 'stats-table');
  const columns = Array.isArray(data?.columns) ? data.columns : [];
  const rows = Array.isArray(data?.rows) ? data.rows : [];

  const head = el('thead');
  const headRow = el('tr');
  for (const col of columns) headRow.append(el('th', null, col));
  head.append(headRow);

  const body = el('tbody');
  for (const row of rows) {
    const tr = el('tr');
    for (const cell of row) tr.append(el('td', null, fmt(cell)));
    body.append(tr);
  }

  table.append(head, body);
  return table;
}

function renderBars(data) {
  const items = Array.isArray(data) ? data : [];
  if (items.length === 0) return el('p', 'stats-empty', 'Sin datos todavía.');

  // Si una barra no trae "max", se escala con el mayor valor del grupo.
  const values = items.map((i) => i.value).filter((v) => Number.isFinite(v));
  const groupMax = Math.max(...values, 0) || 1;

  const list = el('div', 'stats-bars');
  for (const item of items) {
    const max = Number.isFinite(item.max) && item.max > 0 ? item.max : groupMax;
    const ratio = Number.isFinite(item.value) ? Math.min(Math.max(item.value / max, 0), 1) : 0;

    const row = el('div', 'stats-bar-row');
    row.style.cssText = 'display:grid;grid-template-columns:7rem 1fr 3.5rem;gap:.5rem;align-items:center;margin:.25rem 0';
    const track = el('div', 'stats-bar-track');
    track.style.cssText = 'height:.6rem;border-radius:.3rem;background:var(--stats-track,rgba(128,128,128,.25))';
    const fill = el('div', 'stats-bar-fill');
    fill.style.cssText = `height:100%;border-radius:.3rem;background:var(--stats-fill,#3b82f6);width:${ratio * 100}%`;
    track.append(fill);

    row.append(el('span', 'stats-bar-label', item.label), track, el('span', 'stats-bar-value', fmt(item.value)));
    list.append(row);
  }
  return list;
}

// Un dibujante por tipo de métrica (el contrato define number, table y bars).
const RENDERERS = { number: renderNumber, table: renderTable, bars: renderBars };

/**
 * Pinta el panel de estadísticas dentro de `container` (lo vacía antes).
 * @param {HTMLElement} container
 * @param {Array<{id, label, type, data}>} results salida de computeAll()
 */
export function render(container, results) {
  container.replaceChildren();
  if (!Array.isArray(results) || results.length === 0) {
    container.append(el('p', 'stats-empty', 'No hay estadísticas que mostrar.'));
    return;
  }
  for (const result of results) {
    const section = el('section', 'stats-metric');
    section.dataset.metric = result.id;
    section.append(el('h3', 'stats-title', result.label));
    const draw = RENDERERS[result.type];
    section.append(draw ? draw(result.data) : el('p', 'stats-empty', 'Tipo de métrica no soportado.'));
    container.append(section);
  }
}