// methods/odd11.js
// Método "Odd + 11": doomsday del año a partir de sus dos últimas cifras,
// sin dividir entre 12. Módulo puro: sin DOM ni almacenamiento.
//
//   T = dos últimas cifras
//   si T es impar, T += 11
//   T = T / 2
//   si T es impar, T += 11
//   T = 7 − (T mod 7)
//   doomsday = (ancla del siglo + T) mod 7

import { WEEKDAYS } from '../config.js';
import { centuryAnchor } from './anchor.js';

export const odd11 = Object.freeze({
  id: 'odd11',
  label: 'Odd + 11',
  description:
    'Toma las dos últimas cifras, suma 11 si es impar, divide entre 2, ' +
    'vuelve a sumar 11 si es impar, resta de 7 el resto módulo 7 y añade el ancla del siglo.',

  /**
   * @param {number} year Año entero positivo.
   * @returns {{ value: number, steps: Array<{ title: string, text: string }> }}
   *   value = doomsday del año (0 = Domingo … 6 = Sábado).
   */
  explainYear(year) {
    const anchor = centuryAnchor(year); // lanza RangeError si el año no es válido
    const y = year % 100;

    // Primera comprobación: ¿es impar? Entonces sumamos 11.
    const firstOdd = y % 2 !== 0;
    const t1 = firstOdd ? y + 11 : y;

    // Dividimos entre 2 (t1 siempre es par en este punto).
    const t2 = t1 / 2;

    // Segunda comprobación: ¿es impar? Entonces sumamos 11.
    const secondOdd = t2 % 2 !== 0;
    const t3 = secondOdd ? t2 + 11 : t2;

    // Resto módulo 7 y resta de 7.
    const rest = t3 % 7;
    const t4 = 7 - rest;

    // Suma con el ancla del siglo.
    const total = anchor + t4;
    const value = total % 7;

    const steps = [
      {
        title: 'Dos últimas cifras',
        text: `Del año ${year} nos quedamos con ${y}.`,
      },
      {
        title: 'Primer "Odd + 11"',
        text: firstOdd
          ? `${y} es impar, así que le sumamos 11: ${y} + 11 = ${t1}.`
          : `${y} es par, así que lo dejamos como está: ${t1}.`,
      },
      {
        title: 'Dividir entre 2',
        text: `${t1} / 2 = ${t2}.`,
      },
      {
        title: 'Segundo "Odd + 11"',
        text: secondOdd
          ? `${t2} es impar, así que le sumamos 11: ${t2} + 11 = ${t3}.`
          : `${t2} es par, así que lo dejamos como está: ${t3}.`,
      },
      {
        title: 'Resto entre 7',
        text: `${t3} mod 7 = ${rest}. Restamos de 7: 7 − ${rest} = ${t4}.`,
      },
      {
        title: 'Doomsday del año',
        text:
          `Sumamos el ancla del siglo: ${anchor} (${WEEKDAYS[anchor]}) + ${t4} = ${total}. ` +
          `Quitando sietes queda ${value}: el doomsday de ${year} es ${WEEKDAYS[value]}.`,
      },
    ];

    return { value, steps };
  },
});