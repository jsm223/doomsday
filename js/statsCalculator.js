// statsCalculator.js
// Registro de métricas de estadísticas. Módulo puro: solo recibe el historial
// (Attempt[]) y devuelve datos; no usa DOM, localStorage ni IndexedDB.
// Para añadir una métrica: añadir un objeto al array METRICS. Para quitarla: borrarlo.
//
// Formato de cada métrica: { id, label, type, compute(attempts) → data }
//   number → { value, unit? }
//   table  → { columns: string[], rows: any[][] }
//   bars   → [{ label, value, max? }]
// Cuando no hay datos para calcular un porcentaje o una media, el valor es null
// (la vista decidirá cómo mostrarlo).

import { MONTHS } from './config.js';

// Número de días con actividad que muestra la métrica "Progreso por día".
const DAILY_DAYS = 14;

/** Porcentaje con un decimal; null si no hay intentos. */
function percent(part, total) {
  return total === 0 ? null : Math.round((part / total) * 1000) / 10;
}

/** Agrupa los intentos por una clave y cuenta intentos y aciertos de cada grupo. */
function groupBy(attempts, keyOf) {
  const groups = new Map();
  for (const a of attempts) {
    const key = keyOf(a);
    if (key === null || key === undefined) continue;
    const g = groups.get(key) ?? { total: 0, hits: 0 };
    g.total += 1;
    if (a.correct === true) g.hits += 1;
    groups.set(key, g);
  }
  return groups;
}

/** Clave de día local (AAAA-MM-DD) a partir de ts; null si la fecha no es válida. */
function dayKey(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const METRICS = [
  {
    id: 'total',
    label: 'Total y precisión',
    type: 'table',
    compute(attempts) {
      const hits = attempts.filter((a) => a.correct === true).length;
      return {
        columns: ['Intentos', 'Aciertos', 'Precisión (%)'],
        rows: [[attempts.length, hits, percent(hits, attempts.length)]],
      };
    },
  },
  {
    id: 'avgTime',
    label: 'Tiempo medio por respuesta',
    type: 'number',
    compute(attempts) {
      // Solo cuentan las preguntas realmente respondidas: se excluyen las que
      // agotaron el tiempo o en las que se pidió la solución.
      const times = attempts
        .filter((a) => !a.timedOut && !a.solutionShown && Number.isFinite(a.timeMs))
        .map((a) => a.timeMs);
      if (times.length === 0) return { value: null, unit: 's' };
      const avgMs = times.reduce((sum, t) => sum + t, 0) / times.length;
      return { value: Math.round(avgMs / 100) / 10, unit: 's' };
    },
  },
  {
    id: 'byCentury',
    label: 'Precisión por siglo',
    type: 'bars',
    compute(attempts) {
      const groups = groupBy(attempts, (a) => (Number.isFinite(a.century) ? a.century : null));
      return [...groups.entries()]
        .sort((x, y) => x[0] - y[0])
        .map(([century, g]) => ({
          label: `${century * 100}–${century * 100 + 99}`,
          value: percent(g.hits, g.total),
          max: 100,
        }));
    },
  },
  {
    id: 'errorsByMonth',
    label: 'Errores por mes',
    type: 'bars',
    compute(attempts) {
      const errors = new Array(12).fill(0);
      for (const a of attempts) {
        if (a.correct !== true && Number.isInteger(a.month) && a.month >= 1 && a.month <= 12) {
          errors[a.month - 1] += 1;
        }
      }
      return MONTHS.map((name, i) => ({ label: name, value: errors[i] }));
    },
  },
  {
    id: 'leap',
    label: 'Años bisiestos vs no bisiestos',
    type: 'table',
    compute(attempts) {
      const groups = groupBy(attempts, (a) => (a.isLeap ? 'leap' : 'common'));
      const row = (label, key) => {
        const g = groups.get(key) ?? { total: 0, hits: 0 };
        return [label, g.total, g.hits, percent(g.hits, g.total)];
      };
      return {
        columns: ['Tipo', 'Intentos', 'Aciertos', 'Precisión (%)'],
        rows: [row('Bisiestos', 'leap'), row('No bisiestos', 'common')],
      };
    },
  },
  {
    id: 'dailyProgress',
    label: 'Progreso por día',
    type: 'bars',
    compute(attempts) {
      const groups = groupBy(attempts, (a) => dayKey(a.ts));
      return [...groups.entries()]
        .sort((x, y) => (x[0] < y[0] ? -1 : 1)) // AAAA-MM-DD ordena como texto
        .slice(-DAILY_DAYS)
        .map(([key, g]) => ({
          label: `${key.slice(8, 10)}/${key.slice(5, 7)}`,
          value: percent(g.hits, g.total),
          max: 100,
        }));
    },
  },
];

// Comprobación al cargar: los ids de las métricas deben ser únicos.
const ids = METRICS.map((m) => m.id);
if (new Set(ids).size !== ids.length) {
  throw new Error(`statsCalculator.js: hay ids de métrica repetidos (${ids.join(', ')})`);
}

export { METRICS };

/** Calcula todas las métricas registradas sobre el historial. */
export function computeAll(attempts) {
  const list = Array.isArray(attempts) ? attempts : [];
  return METRICS.map((m) => ({ id: m.id, label: m.label, type: m.type, data: m.compute(list) }));
}