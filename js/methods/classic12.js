// methods/classic12.js
// Método clásico: doomsday del año a partir de sus dos últimas cifras,
// dividiendo entre 12. Módulo puro: sin DOM ni almacenamiento.
//
//   y = dos últimas cifras del año
//   a = ⌊y / 12⌋        b = y mod 12        c = ⌊b / 4⌋
//   doomsday = (a + b + c + ancla del siglo) mod 7

import { WEEKDAYS } from '../config.js';
import { centuryAnchor } from './anchor.js';

export const classic12 = Object.freeze({
  id: 'classic12',
  label: 'Clásico (÷12)',
  description:
    'Divide las dos últimas cifras del año entre 12, suma cociente, resto y ' +
    'cuántos cuatros caben en el resto, y añade el ancla del siglo.',

  /**
   * @param {number} year Año entero positivo.
   * @returns {{ value: number, steps: Array<{ title: string, text: string }> }}
   *   value = doomsday del año (0 = Domingo … 6 = Sábado).
   */
  explainYear(year) {
    const anchor = centuryAnchor(year); // lanza RangeError si el año no es válido
    const y = year % 100;
    const a = Math.floor(y / 12);
    const b = y % 12;
    const c = Math.floor(b / 4);
    const sum = a + b + c;
    const total = sum + anchor;
    const value = total % 7;

    const steps = [
      {
        title: 'Dos últimas cifras',
        text: `Del año ${year} nos quedamos con y = ${y}.`,
      },
      {
        title: 'Docenas',
        text: `¿Cuántas docenas caben en ${y}? a = ⌊${y} / 12⌋ = ${a}.`,
      },
      {
        title: 'Resto',
        text: `Lo que sobra: b = ${y} − ${a} × 12 = ${b}.`,
      },
      {
        title: 'Cuatros en el resto',
        text: `¿Cuántos cuatros caben en ${b}? c = ⌊${b} / 4⌋ = ${c}.`,
      },
      {
        title: 'Doomsday del año',
        text:
          `a + b + c = ${a} + ${b} + ${c} = ${sum}. ` +
          `Sumamos el ancla del siglo: ${sum} + ${anchor} (${WEEKDAYS[anchor]}) = ${total}. ` +
          `Quitando sietes queda ${value}: el doomsday de ${year} es ${WEEKDAYS[value]}.`,
      },
    ];

    return { value, steps };
  },
});