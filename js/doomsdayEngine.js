// doomsdayEngine.js
// Lógica pura del algoritmo Doomsday: fechas, respuesta correcta, pistas y
// solución paso a paso. Sin DOM ni almacenamiento.
//
// Convenciones: días de la semana 0 = Domingo … 6 = Sábado (como
// Date.getUTCDay()); meses 1…12.
//
// doomsdayOfYear() es el cálculo CANÓNICO del motor y no depende de los
// métodos registrados: así se puede quitar un método del registro sin romper
// el motor. Los métodos (methods/*) solo se usan para EXPLICAR el cálculo
// del año en pistas y solución.

import { WEEKDAYS, MONTHS } from './config.js';
import { centuryAnchor } from './methods/anchor.js';
import { getMethod } from './methods/index.js';

// Se reexporta para cumplir el contrato (el motor expone centuryAnchor).
export { centuryAnchor };

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Día del mes que cae en doomsday (enero y febrero se ajustan en bisiestos).
const DOOMSDAY_DAYS = [3, 28, 14, 4, 9, 6, 11, 8, 5, 10, 7, 12];

// Pequeñas reglas memotécnicas por mes (índice 0 = enero).
const MNEMONICS = [
  'enero: el 3 (el 4 si es bisiesto)',
  'febrero: el 28 (el 29 si es bisiesto)',
  'marzo: el 14 (día de Pi)',
  'abril: 4/4, fecha repetida',
  'mayo: el 9 (pareja 9/5 con septiembre 5/9)',
  'junio: 6/6, fecha repetida',
  'julio: el 11 (pareja 7/11 con noviembre 11/7)',
  'agosto: 8/8, fecha repetida',
  'septiembre: el 5 (pareja 5/9 con mayo 9/5)',
  'octubre: 10/10, fecha repetida',
  'noviembre: el 7 (pareja 11/7 con julio 7/11)',
  'diciembre: 12/12, fecha repetida',
];

/** ¿Es bisiesto el año (calendario gregoriano)? */
export function isLeap(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year, month) {
  return month === 2 && isLeap(year) ? 29 : MONTH_DAYS[month - 1];
}

/** ¿Es una fecha real? Años de 1 a 9999. */
export function isValidDate(year, month, day) {
  if (![year, month, day].every(Number.isInteger)) return false;
  if (year < 1 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

/** Doomsday del año (0-6): día de la semana de sus "fechas ancla". */
export function doomsdayOfYear(year) {
  const anchor = centuryAnchor(year); // lanza RangeError si el año no es válido
  const y = year % 100;
  const rest = y % 12;
  return (anchor + Math.floor(y / 12) + rest + Math.floor(rest / 4)) % 7;
}

/** Día del mes (número) que cae en doomsday en ese año y mes. */
export function doomsdayOfMonth(year, month) {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`Mes no válido: ${month}`);
  }
  const leapShift = isLeap(year) && month <= 2 ? 1 : 0;
  return DOOMSDAY_DAYS[month - 1] + leapShift;
}

/** Día de la semana (0-6) de una fecha, calculado con el algoritmo Doomsday. */
export function weekdayOf(year, month, day) {
  if (!isValidDate(year, month, day)) {
    throw new RangeError(`Fecha no válida: ${year}-${month}-${day}`);
  }
  const diff = day - doomsdayOfMonth(year, month);
  return (((doomsdayOfYear(year) + diff) % 7) + 7) % 7;
}

/** Construye una Question para una fecha concreta (sirve para la calculadora). */
export function buildQuestion(year, month, day) {
  if (!isValidDate(year, month, day)) {
    throw new RangeError(`Fecha no válida: ${year}-${month}-${day}`);
  }
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return {
    id: `${year}-${mm}-${dd}`,
    year,
    month,
    day,
    answer: weekdayOf(year, month, day),
    century: Math.floor(year / 100),
    isLeap: isLeap(year),
  };
}

/**
 * Genera una pregunta con una fecha aleatoria dentro del rango de años.
 * @param {{min: number, max: number}} range Años inclusivos.
 * @param {() => number} rng Generador en [0, 1). Inyectable para pruebas.
 */
export function generateQuestion({ min, max }, rng = Math.random) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min) {
    throw new RangeError(`Rango de años no válido: ${min}-${max}`);
  }
  const year = min + Math.floor(rng() * (max - min + 1));
  const month = 1 + Math.floor(rng() * 12);
  const day = 1 + Math.floor(rng() * daysInMonth(year, month));
  return buildQuestion(year, month, day);
}

/** ¿Coincide la respuesta (0-6) con la correcta? */
export function checkAnswer(question, guess) {
  return Number.isInteger(guess) && guess === question.answer;
}

// --- Pistas y solución -----------------------------------------------------

// Datos intermedios del cálculo de una pregunta.
function breakdown(question) {
  const { year, month, day } = question;
  const dd = doomsdayOfYear(year);
  const ref = doomsdayOfMonth(year, month);
  const diff = day - ref;
  const offset = ((diff % 7) + 7) % 7;
  return { dd, ref, diff, offset };
}

// Pide al método registrado que explique el año y comprueba que coincide
// con el cálculo canónico del motor.
function explainWithMethod(year, methodId) {
  const method = getMethod(methodId);
  const explained = method.explainYear(year);
  if (explained.value !== doomsdayOfYear(year)) {
    throw new Error(
      `El método "${methodId}" no coincide con el motor para el año ${year}.`
    );
  }
  return { method, explained };
}

/**
 * Pistas progresivas, de la más vaga a la más reveladora. Ninguna nombra la
 * respuesta como tal: como mucho dan datos intermedios (ancla, doomsday del
 * año, día doomsday del mes, distancia). Si la fecha cae en doomsday, el
 * doomsday del año coincide con la respuesta.
 * @returns {string[]}
 */
export function getHints(question, methodId) {
  const { year, month, day } = question;
  const { method } = explainWithMethod(year, methodId);
  const { dd, ref, diff } = breakdown(question);
  const monthName = MONTHS[month - 1];
  const centuryStart = Math.floor(year / 100) * 100;

  const distance =
    diff === 0
      ? `El ${day} de ${monthName} es justo el día doomsday de ese mes.`
      : `Del día ${ref} al ${day} hay ${Math.abs(diff)} día${
          Math.abs(diff) === 1 ? '' : 's'
        } ${diff > 0 ? 'después' : 'antes'}: cuenta desde el doomsday.`;

  return [
    `Empieza por el siglo: el ancla de los años ${centuryStart} es ${
      WEEKDAYS[centuryAnchor(year)]
    }.`,
    `Con el método "${method.label}", el doomsday de ${year} es ${WEEKDAYS[dd]}.`,
    `En ${monthName} de ${year}, el doomsday cae el día ${ref}.`,
    distance,
  ];
}

/**
 * Solución completa paso a paso. El último paso es la respuesta.
 * @returns {Array<{title: string, text: string}>}
 */
export function getSolution(question, methodId) {
  const { year, month, day, answer } = question;
  const { explained } = explainWithMethod(year, methodId);
  const { dd, ref, diff, offset } = breakdown(question);
  const monthName = MONTHS[month - 1];
  const centuryStart = Math.floor(year / 100) * 100;

  const monthText =
    month <= 2
      ? `${year} ${isLeap(year) ? 'es' : 'no es'} bisiesto, así que en ${monthName} el doomsday cae el día ${ref}.`
      : `En ${monthName} el doomsday cae el día ${ref} (${MNEMONICS[month - 1]}).`;

  return [
    {
      title: 'Ancla del siglo',
      text: `Los años ${centuryStart} tienen como ancla el ${WEEKDAYS[centuryAnchor(year)]}.`,
    },
    ...explained.steps,
    { title: 'Doomsday del mes', text: monthText },
    {
      title: 'Contar hasta la fecha',
      text:
        `Diferencia con el doomsday: ${day} − ${ref} = ${diff} días. ` +
        `Módulo 7 equivale a avanzar ${offset} día${offset === 1 ? '' : 's'} desde ${WEEKDAYS[dd]}.`,
    },
    {
      title: 'Respuesta',
      text: `El ${day} de ${monthName} de ${year} cae en ${WEEKDAYS[answer]}.`,
    },
  ];
}