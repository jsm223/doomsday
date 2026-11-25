// service-worker.js
// Caché offline de la app (contrato 5.8): install precarga, activate borra las
// cachés antiguas y fetch responde primero desde la caché (cache-first).
//
// IMPORTANTE (sección 7 del plan): cada vez que cambie la lista de archivos o el
// contenido de alguno, hay que actualizar ASSETS y subir CACHE_NAME
// ('doomsday-v2', ...). Si no, los móviles siguen con la versión antigua.

const CACHE_PREFIX = 'doomsday-';
const CACHE_NAME = 'doomsday-v1';

// Todos los archivos de la app. Rutas relativas a este archivo, para que
// funcionen igual en local (127.0.0.1) y en GitHub Pages (/<repositorio>/).
const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'css/styles.css',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/main.js',
  'js/config.js',
  'js/doomsdayEngine.js',
  'js/gameModes.js',
  'js/storageManager.js',
  'js/statsCalculator.js',
  'js/statsView.js',
  'js/calculatorView.js',
  'js/uiController.js',
  'js/methods/index.js',
  'js/methods/classic12.js',
  'js/methods/odd11.js',
  'js/methods/anchor.js',
  'js/modes/index.js',
  'js/modes/practice.js',
  'js/modes/competition.js',
];

// Precarga: si algún archivo de ASSETS no existe (404), la instalación falla
// entera y no se queda una caché a medias. 'reload' evita copiar versiones
// viejas de la caché HTTP del navegador.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
  );
});

// Limpieza: borra las cachés de esta app que no sean la actual. Se filtra por
// prefijo porque otras apps del mismo origen (p. ej. otro proyecto en
// <usuario>.github.io) comparten el almacén de cachés.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
  );
});

// Cache-first: si está en caché se sirve de ahí; si no, se pide a la red.
// Solo se gestionan peticiones GET del propio origen. Si falla la red al abrir
// una página, se devuelve index.html desde la caché.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).catch(() => {
        if (request.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      });
    })
  );
});