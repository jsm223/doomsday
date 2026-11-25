// main.js
// Punto de entrada de la app: crea los módulos, los conecta y registra el
// service worker. No contiene lógica de juego ni de interfaz.
// index.html lo carga con <script type="module">, que se ejecuta cuando el DOM
// ya está listo.

import * as storage from './storageManager.js';
import * as gameModes from './gameModes.js';
import * as stats from './statsCalculator.js';
import { init as initUi } from './uiController.js';

/** Registra el service worker (caché offline). Un fallo no debe impedir jugar. */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Se espera a 'load' para que el registro no compita con la carga inicial.
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js', { scope: './' })
      .catch((error) => console.warn('No se pudo registrar el service worker:', error));
  });
}

/** Muestra un error visible en pantalla (en el móvil no hay Console a mano). */
function showFatalError(root, error) {
  console.error(error);
  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  message.textContent = 'No se pudo iniciar la aplicación. Recarga la página.';
  root.replaceChildren(message);
}

async function main() {
  const root = document.getElementById('app');
  if (!root) throw new Error('main.js: falta el elemento #app en index.html');
  try {
    await storage.init();
    initUi({ root, storage, gameModes, stats });
  } catch (error) {
    showFatalError(root, error);
  }
  registerServiceWorker();
}

main();