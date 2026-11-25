# PLAN.md — App Doomsday (PWA offline)

> Este archivo es la **fuente de verdad** del proyecto. Vive en la carpeta del proyecto, no en el chat.
> Solo cambia el contrato (sección 5) si es imprescindible, y cada cambio se anota en la sección 8.

**Bloque actual:** 5  |  **Última tarea cerrada:** 4B2

---

## 1. Objetivo y prioridades

PWA en español, instalable y 100 % offline, para entrenar el cálculo mental del día de la semana con el algoritmo Doomsday. Sin backend, sin frameworks, sin bundlers.

Prioridades, en este orden:
1. **Extensibilidad:** añadir o quitar modos, métodos, niveles, dificultades de tiempo y métricas tocando lo mínimo (ver sección 7).
2. **Funcionar sin conexión** en el móvil.
3. **Simplicidad:** HTML + CSS + JavaScript (ES Modules), nada que instalar.

---

## 2. Instrucciones de trabajo

### Reglas para Claude
1. Trabaja **solo el bloque indicado** y respeta el contrato de la sección 5. No inventes funciones ni cambies firmas.
2. Entrega **un archivo por mensaje**, completo y funcional. Nada de "el resto igual".
3. Tras cada archivo, termina con un estado de 3 líneas: *archivo entregado · tarea del checklist cubierta · siguiente archivo*.
4. Código sin dependencias externas. Identificadores en inglés, comentarios y textos de interfaz en español. Rutas siempre relativas.
5. Si algo del contrato es insuficiente, para y propón el cambio. No lo apliques en silencio.
6. Tras cada archivo, incluye las líneas exactas para probarlo en la Console del navegador y el resultado esperado.
7. Cuando se cierre un bloque, devuelve este `PLAN.md` con las actualizaciones precisas (bloques marcados, cabecera cambiada, cambios anotados), pero no borres nada ni cambies el resto. Cuando se termine un bloque, avísalo y pide al usuario que diga "Siguiente bloque", y devuelve el `PLAN.md` ya cambiado y la plantilla para abrir conversación actualizada y lista para copiar y pegar.

### Reglas para ti
1. Guarda cada archivo en la carpeta en cuanto te lo den.
2. Marca `[x]` solo lo que hayas **probado** (criterio "Hecho cuando").
3. Si se corta la sesión a mitad de archivo, descarta ese archivo y pídelo de nuevo. Los anteriores no se tocan.
4. Una conversación nueva por bloque (o por dos si son pequeños).

### Plantilla para abrir cada conversación
```
Proyecto: app Doomsday (PWA). Adjunto PLAN.md.
Toca el BLOQUE <N>. Empieza por la tarea <ID>.
Archivos de los que depende (adjuntos): <lista o "ninguno">.
Sigue las reglas de la sección 2 del plan.
```

---

## 3. Estructura de archivos

```
doomsday/
├─ index.html
├─ manifest.json
├─ service-worker.js
├─ README.md
├─ PLAN.md
├─ css/styles.css
├─ icons/            (icon.svg, icon-192.png, icon-512.png)
├─ tests/engine.test.html
└─ js/
   ├─ main.js
   ├─ config.js
   ├─ doomsdayEngine.js
   ├─ methods/   index.js · classic12.js · odd11.js · anchor.js
   ├─ modes/     index.js · practice.js · competition.js
   ├─ gameModes.js
   ├─ storageManager.js
   ├─ statsCalculator.js
   ├─ statsView.js
   ├─ calculatorView.js
   └─ uiController.js
```

| Archivo | Responsabilidad |
|---|---|
| `index.html` | Esqueleto de pantallas (menú, juego, estadísticas, calculadora, ajustes). Carga `main.js`. |
| `styles.css` | Mobile-first, temas claro/oscuro con variables CSS. |
| `manifest.json` / `service-worker.js` | Instalación y caché offline. |
| `main.js` | Punto de entrada: crea módulos, los conecta, registra el service worker. |
| `config.js` | Datos: niveles, dificultades de tiempo, nombres, ajustes por defecto. |
| `doomsdayEngine.js` | Lógica pura: fechas, respuesta correcta, pistas y solución. Sin DOM ni almacenamiento. |
| `methods/*` | Un archivo por método de cálculo del año. `index.js` es su registro. |
| `modes/*` | Un archivo por modo de juego. `index.js` es su registro. |
| `gameModes.js` | Fachada: lista los modos y crea sesiones. |
| `storageManager.js` | `localStorage` (ajustes, récord) e `IndexedDB` (historial). |
| `statsCalculator.js` | Registro de métricas; funciones puras sobre el historial. |
| `statsView.js` | Dibuja el panel de estadísticas a partir de los resultados de las métricas. |
| `calculatorView.js` | Herramienta de consulta: dado un año (o una fecha) muestra el doomsday o el día de la semana con su desglose. No es un modo y no guarda historial. |
| `uiController.js` | Único módulo que gestiona las pantallas del juego: eventos, selectores, tema. |
| `tests/engine.test.html` | Pruebas del motor en el navegador, sin instalar nada. |

---

## 4. Reglas de arquitectura

- **Dependencias en un solo sentido:** `uiController → gameModes → doomsdayEngine`; `uiController → storageManager`; `uiController → statsView → statsCalculator`; `uiController → calculatorView → doomsdayEngine`. Nunca al revés.
- `doomsdayEngine`, `methods/*`, `statsCalculator` y `config` son **puros**: no usan DOM, `localStorage` ni `IndexedDB`.
- La interfaz **nunca nombra un elemento concreto** (modo, método, nivel, métrica). Construye sus selectores recorriendo los registros.
- Todo lo ampliable se declara como **dato u objeto registrado** (array o `Map`), no como `if/switch` repartidos.
- Convenciones de datos: días de la semana `0=Domingo … 6=Sábado` (igual que `Date.getUTCDay()`); meses `1…12`.

---

## 5. Contrato de interfaces

### 5.1 Tipos
```js
Question = { id, year, month, day, answer /*0-6*/, century /*p.ej. 19*/, isLeap }
Step     = { title, text }
Result   = { question, guess /*0-6 | null*/, correct, timeMs,
             hintsUsed, solutionShown, timedOut }
Attempt  = { ts, modeId, levelId, methodId, year, month, day, century, isLeap,
             answer, guess, correct, timeMs, hintsUsed, solutionShown, timedOut }
Settings = { theme /*'auto'|'light'|'dark'*/, modeId, levelId, timeId, methodId }
```

### 5.2 `config.js`
```js
export const WEEKDAYS      // ['Domingo', ..., 'Sábado']
export const MONTHS        // ['Enero', ..., 'Diciembre']  (índice 0 = enero)
export const LEVELS        // [{ id, label, min, max }]  n1 1900-2099, n2 1800-2199, n3 1600-2500
export const TIME_LEVELS   // [{ id, label, seconds }]   valores iniciales: relajado 60, normal 30, rápido 15, experto 8
export const DEFAULT_SETTINGS  // Settings
```

### 5.3 `methods/`
```js
// Un método:
{ id, label, description,
  explainYear(year) → { value /*0-6: doomsday del año*/, steps: Step[] } }
// methods/index.js
export function listMethods() → Method[]
export function getMethod(id) → Method          // lanza error si no existe
```
- `classic12`: con `y` = dos últimas cifras: `a=⌊y/12⌋`, `b=y mod 12`, `c=⌊b/4⌋`; doomsday = `(a+b+c+ancla) mod 7`.
- `odd11`: `T=y`; si `T` es impar `T+=11`; `T=T/2`; si `T` es impar `T+=11`; `T=7−(T mod 7)`; doomsday = `(ancla+T) mod 7`.

### 5.4 `doomsdayEngine.js` (puro)
```js
export function isLeap(year) → boolean
export function isValidDate(year, month, day) → boolean
export function buildQuestion(year, month, day) → Question
export function centuryAnchor(year) → 0-6                  // reexporta methods/anchor.js
export function doomsdayOfYear(year) → 0-6
export function doomsdayOfMonth(year, month) → number     // día del mes que cae en doomsday
export function weekdayOf(year, month, day) → 0-6
export function generateQuestion({ min, max }, rng = Math.random) → Question
export function checkAnswer(question, guess) → boolean
export function getHints(question, methodId) → string[]    // de la más vaga a la más reveladora; ninguna da el resultado final
export function getSolution(question, methodId) → Step[]   // desglose completo; el último paso es la respuesta
```

### 5.5 `modes/` y `gameModes.js`
```js
// Un modo:
{ id, label, description, features: { timer: boolean, streak: boolean },
  create({ settings, initialBestStreak }) → Session }

// Session:
session.start()
session.next()                 // nueva pregunta → evento 'question'
session.submit(guess)          // → evento 'result'
session.requestHint()          // → evento 'hint'
session.showSolution()         // → evento 'solution'; cierra la pregunta como fallada
session.stop()
session.on(event, handler)

// Eventos y payload:
'question'  Question
'tick'      { secondsLeft }                      // solo modos con timer
'hint'      { index, total, text }
'solution'  Step[]
'result'    Result
'streak'    { current, best }                    // solo modos con racha

// gameModes.js
export function listModes() → Mode[]
export function createSession(modeId, { settings, initialBestStreak }) → Session
```
Reglas iniciales (modificables, anotar si cambian):
- **Práctica:** sin temporizador ni racha; pistas ilimitadas.
- **Competición:** temporizador por pregunta según `TIME_LEVELS`; racha actual y récord; pedir pista o solución **rompe la racha**; agotar el tiempo cuenta como fallo (`timedOut: true`).
- `start()` reinicia el estado y emite el primer `'question'` (equivale a `next()`).
- `showSolution()` emite `'solution'` y después `'result'` (`correct: false`, `guess: null`, `solutionShown: true`).
- Agotar el tiempo emite `'result'` con `timedOut: true` y `guess: null`.
- Tras un `'result'` la sesión espera a que la interfaz llame a `next()`; un `submit` repetido se ignora.
- `requestHint()` tras la última pista no emite nada.
- `initialBestStreak` lo obtiene la interfaz con `storage.getBestStreak(modeId)`; la sesión emite `'streak'` y la interfaz lo guarda con `saveBestStreak(modeId, n)`.

Aclaraciones del Bloque 2 (ya implementadas en `practice.js` y `competition.js`):
- `'hint'`: `index` va de 1 a `total` (número de la pista mostrada).
- `'tick'` (Competición): se emite al abrir cada pregunta con el tiempo completo y después cada vez que cambia el segundo restante, hasta `0`; el `0` va justo antes del `'result'` con `timedOut: true`.
- `'streak'`: se emite solo cuando cambia la racha o el récord, y una vez al hacer `start()`. Pedir una pista emite `'hint'` y después `'streak'` con `current: 0`.
- Acertar tras pedir una pista cuenta como acierto, pero no suma racha.
- `start()` reinicia la racha actual y conserva el récord de la sesión.
- `submit(guess)` ignora (sin cerrar la pregunta) las respuestas que no sean enteros de 0 a 6.
- `modes/index.js` exporta `listModes()` (copia del array) y `getMode(id)` (lanza error si no existe), igual que `methods/index.js`, y comprueba que los ids sean únicos.

### 5.6 `storageManager.js`
```js
export async function init() → void
export function loadSettings() → Settings              // mezcla con DEFAULT_SETTINGS
export function saveSettings(partial) → void
export function getBestStreak(modeId) → number         // récord por modo
export function saveBestStreak(modeId, n) → void
export async function addAttempt(attempt) → void
export async function getAttempts() → Attempt[]
export async function clearAttempts() → void
```

### 5.7 `statsCalculator.js` y `statsView.js`
```js
// Una métrica:
{ id, label, type: 'number' | 'table' | 'bars', compute(attempts) → data }
//  number → { value, unit? }
//  table  → { columns: string[], rows: any[][] }
//  bars   → [{ label, value, max? }]

export const METRICS        // array registrado (ver 7)
export function computeAll(attempts) → [{ id, label, type, data }]

// statsView.js
export function render(container, results /* salida de computeAll */) → void
```
Métricas iniciales: total y precisión, tiempo medio, precisión por siglo, errores por mes, bisiestos vs no bisiestos, progreso por día.

### 5.7 bis `uiController.js` y `main.js`
```js
export function init({ root, storage, gameModes, stats }) → void
```
`main.js` importa los módulos, llama a `storage.init()`, a `ui.init(...)` y registra `service-worker.js`.

### 5.8 PWA
- `manifest.json`: `lang: "es"`, `start_url: "./"`, `scope: "./"`, `display: "standalone"`, iconos 192/512 (también *maskable*).
- `service-worker.js`: `CACHE_NAME = 'doomsday-v1'` y lista `ASSETS` con todos los archivos. `install` precarga; `activate` borra cachés antiguas; `fetch` es *cache-first*.

### 5.9 `calculatorView.js`
```js
export function render(container, { engine, methods }) → void
// Formulario: año (obligatorio), mes y día (opcionales) y selector de método
// construido con methods.listMethods().
// Solo año → doomsday del año y día doomsday de cada mes.
// Fecha completa → buildQuestion + getSolution.
// No genera Attempt: no toca el historial ni las estadísticas.
```

---

## 6. Checklist

### Bloque 0 — Preparación (tú)
- [x] 0.1 Crear carpeta `doomsday/` y abrirla en VS Code
- [x] 0.2 Instalar la extensión **Live Server** 
- [x] 0.3 Copiar este `PLAN.md` a la carpeta
- [x] 0.4 (Opcional) crear cuenta de GitHub para el despliegue final

### Bloque 1 — Núcleo
- [x] 1.1 `config.js` · *Hecho cuando:* se importa sin errores desde la consola
- [x] 1.2 `methods/classic12.js`, `odd11.js`, `index.js` · *Hecho cuando:* ambos dan el mismo `value` en 1000 años aleatorios
- [x] 1.3 `doomsdayEngine.js` · *Hecho cuando:* `weekdayOf` coincide con `Date` en todos los días de 1600–2500 (muestra amplia)
- [x] 1.4 `tests/engine.test.html` · *Hecho cuando:* muestra todas las pruebas en verde en el navegador
- [x] 1.5 Pistas y solución · *Hecho cuando:* ninguna pista revela el resultado y la solución termina en la respuesta correcta
- [x] 1.6 `isValidDate` y `buildQuestion` · *Hecho cuando:* rechazan el 29/2 de un año no bisiesto y `buildQuestion` coincide con `weekdayOf`

### Bloque 2 — Persistencia y modos
- [x] 2.1 `storageManager.js` · *Hecho cuando:* ajustes y récord (por modo) sobreviven a recargar; `addAttempt`/`getAttempts` funcionan
- [x] 2.2 `modes/practice.js` · *Hecho cuando:* una sesión emite `question` y `result` desde la consola
- [x] 2.3 `modes/competition.js` · *Hecho cuando:* el `tick`, la racha, el récord y el `timedOut` se comportan según 5.5
- [x] 2.4 `modes/index.js` y `gameModes.js` · *Hecho cuando:* `listModes()` devuelve ambos y `createSession` funciona

### Bloque 3 — Estadísticas
- [x] 3.1 `statsCalculator.js` (6 métricas) · *Hecho cuando:* con historial de prueba, los números cuadran a mano
- [x] 3.2 `statsView.js` · *Hecho cuando:* pinta los tres tipos (`number`, `table`, `bars`) y un historial vacío sin errores

### Bloque 4 — Interfaz
- [x] 4.1 `index.html` + `styles.css` (tema claro/oscuro) · *Hecho cuando:* se ve bien en pantalla de móvil y cambia de tema
- [x] 4.2 `uiController.js`: menú y ajustes generados desde los registros
- [x] 4.3 `uiController.js`: pantalla de juego (pregunta, respuesta, pistas, solución, temporizador, racha)
- [x] 4.4 `uiController.js`: guarda cada intento y abre estadísticas
- [x] 4.5 `main.js` · *Hecho cuando:* una partida completa funciona de principio a fin en el navegador

### Bloque 4B — Calculadora (después del Bloque 4)
- [x] 4B.1 `calculatorView.js` · *Hecho cuando:* con solo el año muestra su doomsday y con fecha completa muestra el día de la semana y el desglose
- [x] 4B.2 Integración en el menú (`index.html` + `uiController.js`)

### Bloque 5 — PWA
- [x] 5.1 `manifest.json` e iconos
- [x] 5.2 `service-worker.js` · *Hecho cuando:* Chrome DevTools → Application muestra el SW activo y la caché llena
- [x] 5.3 Prueba offline · *Hecho cuando:* con *Offline* activado en DevTools, la app carga y se puede jugar
- [ ] 5.4 Despliegue en GitHub Pages e instalación en el móvil

### Bloque 6 — Documentación
- [ ] 6.1 `README.md` con: cómo está construida, cómo instalarla y ejecutarla, cómo usarla, y la guía de extensión (sección 7)
- [ ] 6.2 Repaso final: `PLAN.md` con todo tachado y decisiones registradas

---

## 7. Guía de extensión

| Quiero… | Qué hacer |
|---|---|
| **Añadir un modo** | Crear `js/modes/<id>.js` con el objeto Mode (5.5) → añadirlo al array de `modes/index.js` → añadir el archivo a `ASSETS` del service worker y subir `CACHE_NAME`. |
| **Quitar un modo** | Borrar su línea en `modes/index.js` (y el archivo y su entrada en `ASSETS`). |
| **Añadir un método de cálculo** | Crear `js/methods/<id>.js` con `explainYear` → registrarlo en `methods/index.js` → `ASSETS` + `CACHE_NAME`. |
| **Añadir / quitar un nivel de años** | Añadir o borrar un objeto en `LEVELS` (`config.js`). |
| **Añadir / quitar una dificultad de tiempo** | Añadir o borrar un objeto en `TIME_LEVELS`. |
| **Añadir / quitar una métrica** | Añadir o borrar un objeto en `METRICS` (`statsCalculator.js`). |

Siempre que cambie la lista de archivos: actualizar `ASSETS` y subir `CACHE_NAME` (`doomsday-v2`, …); si no, los móviles siguen con la versión antigua en caché.

---

## 8. Registro de decisiones

Formato: `fecha · decisión · motivo`.

- 2026-11-21 · centuryAnchor vive en methods/anchor.js; el motor lo reexporta · evita el import circular entre motor y métodos
- 2026-11-21 · doomsdayOfYear es el cálculo canónico del motor y no usa los métodos registrados; el motor comprueba que coinciden · permite quitar un método sin romper el motor
- 2026-11-21 · el motor incluye isValidDate y buildQuestion · base para la futura calculadora de fechas (herramienta, no modo)
- 2026-11-21 · 5.5 aclarado (start, showSolution, timeout, pistas) y récord de racha por modo (getBestStreak/saveBestStreak reciben modeId) · evitar ambigüedades en el Bloque 2
- 2026-11-21 · calculatorView.js se añade como herramienta aparte (Bloque 4B, contrato 5.9) · la calculadora no es un modo y no genera historial
- 2026-11-21 · 5.5 ampliado con aclaraciones del Bloque 2: `hint.index` de 1 a `total`; `tick` inicial con el tiempo completo y hasta `0`; `streak` solo al cambiar y en `start()`; acertar con pista no suma racha; `start()` conserva el récord; `submit` ignora respuestas no válidas · el contrato no lo especificaba y `practice.js` y `competition.js` ya lo implementan
- 2026-11-21 · `modes/index.js` exporta `listModes()` y `getMode(id)` y comprueba ids únicos · mismo patrón que `methods/index.js`; `gameModes.js` será la fachada
- 2026-11-21 · el temporizador de Competición usa una hora límite revisada cada 250 ms, no un contador de 1 s · no se desvía si el navegador retrasa los avisos
- 2026-11-21 · `storageManager.js` guarda el historial en IndexedDB con clave autoincremental externa y cae a memoria si IndexedDB o `localStorage` no están disponibles · el `Attempt` se guarda tal cual y la app sigue funcionando en navegadores restrictivos
- 2026-11-25 · `gameModes.js` vive en `js/` y es una fachada fina: `listModes()` delega en `modes/index.js` y `createSession(modeId, options)` llama a `getMode(modeId).create(...)` sin modificar `settings` ni `initialBestStreak` · la interfaz no conoce ningún modo concreto y los errores de id inexistente vienen del registro
- 2026-11-25 · en `statsCalculator.js`, "Total y precisión" es de tipo `table` (una fila: intentos, aciertos, precisión) y no `number` · el tipo `number` solo admite un valor y aquí hacen falta tres
- 2026-11-25 · el tiempo medio excluye los intentos con `timedOut` o `solutionShown`; sin datos, los porcentajes y medias valen `null` · su `timeMs` no mide una respuesta real y evita dividir entre cero; `statsView.js` pinta `null` como "—"
- 2026-11-25 · "Progreso por día" agrupa por día local (`ts` interpretado con `new Date(ts)`) y muestra como máximo los últimos 14 días con actividad · mantiene el gráfico legible en móvil
- 2026-11-25 · `statsView.js` dibuja según el tipo de métrica con un objeto `RENDERERS` y no nombra ninguna métrica; las barras sin `max` se escalan con el mayor valor del grupo y no llevan unidad · permite añadir métricas sin tocar la vista
- 2026-11-25 · `index.html` define el contrato de DOM que usa `uiController.js`: pantallas `<section data-screen>`, navegación con `data-goto` y los `id` del esqueleto; solo las opciones de tema están fijas en el HTML · modos, niveles, tiempos, métodos y respuestas se generan desde los registros (sección 4)
- 2026-11-25 · `styles.css` decide el tema con `data-theme` de `<html>` (`auto` | `light` | `dark`, igual que `Settings.theme`) y reserva las clases `is-correct` / `is-wrong` para el feedback de respuestas y `stats-*` para `statsView.js` · el controlador solo cambia el atributo y las clases
- 2026-11-25 · `uiController.js` importa directamente `config.js`, `methods/index.js`, `doomsdayEngine.js`, `statsView.js` y `calculatorView.js`, además de recibir `storage`, `gameModes` y `stats` por `init` (5.7 bis sin cambios) · son datos y módulos puros en la dirección permitida de la sección 4; la calculadora recibe `engine` y `methods` como pide 5.9
- 2026-11-25 · los botones de respuesta se generan desde `WEEKDAYS` y el controlador guarda el récord de racha con `saveBestStreak` solo cuando supera el ya guardado · la interfaz no escribe en cada acierto; al salir de la partida se llama a `session.stop()` y se ignoran los eventos de sesiones anteriores
- 2026-11-25 · tras fallar (respuesta incorrecta o tiempo agotado) el botón de solución pasa a "Ver cómo se calcula" y muestra el desglose con `getSolution` del motor, sin llamar a `session.showSolution()` · 5.5 dice que `showSolution()` cierra la pregunta como fallada y emite otro `'result'`, y contaría el intento dos veces; el repaso no cuenta como `solutionShown`
- 2026-11-25 · el recuadro de solución incluye un selector de método generado desde `listMethods()`; elegir uno cambia también el ajuste global `methodId` (se guarda y se sincroniza con Ajustes) y solo redibuja la solución, no las pistas de la partida en curso · pedido por el usuario para no ir a Ajustes; la sesión recibe una copia de los ajustes al crearse (5.5)
- 2026-11-25 · `uiController.js` guarda cada `'result'` como `Attempt` (también solución pedida y tiempo agotado) con `modeId`, `levelId` y `methodId` de la sesión, no los ajustes del momento; los guardados se encadenan en orden y las estadísticas esperan al último · el método puede cambiar a mitad de partida y un intento recién hecho debe aparecer siempre; un fallo de almacenamiento solo avisa por consola
- 2026-11-25 · "Borrar historial" pide confirmación y borra solo los intentos, no los récords de racha · son datos distintos (`clearAttempts` frente a `getBestStreak`)
- 2026-11-25 · `main.js` crea los módulos, llama a `storage.init()` y `init` de la interfaz; si falla el arranque muestra un mensaje en pantalla, y el registro del service worker espera a `load` y un fallo solo avisa por consola · la app debe poder jugarse aunque el service worker no exista o falle
- 2026-11-25 · en `calculatorView.js`, mes sin día (o día sin mes) es un error con mensaje, no una consulta parcial; el método inicial es el primero del registro y no depende de los ajustes; la pantalla se monta una sola vez y conserva lo último consultado · el contrato 5.9 no pasa `settings` y con solo el año ya se ven los días doomsday de todos los meses
- 2026-11-25 · el rango de años de la calculadora es fijo (1600–2500, constantes `MIN_YEAR` / `MAX_YEAR` de `calculatorView.js`) y no depende de `LEVELS` · petición del usuario: debe ser siempre completo; 1600–2500 es el rango que el motor tiene comprobado contra `Date` (1.3)

---
 
## 9. TODO
 
Mejoras pedidas que no pertenecen al bloque actual. Al empezar una, anotar en la sección 8 lo que cambie del contrato.
 
- [ ] **Primer día de la semana configurable (domingo o lunes).** Hoy los botones de respuesta salen en el orden de `WEEKDAYS` (Domingo primero). Debe poder elegirse domingo o lunes como primer día. Solo cambia el orden de presentación: la convención de datos (`0=Domingo … 6=Sábado`) no se toca. Implica un campo nuevo en `Settings` (5.1) y en `DEFAULT_SETTINGS`, un selector en Ajustes y el orden de los botones en `uiController.js`.
- [ ] **Rango de años de la calculadora siempre completo.** No debe depender de los niveles (hecho en 4B.1 con el rango fijo 1600–2500). Pendiente decidir si "completo" significa ampliarlo más allá de 2500 o por debajo de 1600; en ese caso, probar antes el motor con esos años (1.3 y `tests/engine.test.html`) y cambiar `MIN_YEAR` / `MAX_YEAR` en `calculatorView.js`, anotando el cambio en la sección 8.
- [ ] Poder configurar los aspectos del modo competición (el tiempo total, que acertar sume tiempo...)
