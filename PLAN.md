# PLAN.md — App Doomsday (PWA offline)

> Este archivo es la **fuente de verdad** del proyecto. Vive en la carpeta del proyecto, no en el chat.
> Solo cambia el contrato (sección 5) si es imprescindible, y cada cambio se anota en la sección 8.

**Bloque actual:** 0  |  **Última tarea cerrada:** (ninguna)

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
6. Cuando se cierre un bloque, devuelve este `PLAN.md` con las casillas actualizadas.

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
   ├─ methods/   index.js · classic12.js · odd11.js
   ├─ modes/     index.js · practice.js · competition.js
   ├─ gameModes.js
   ├─ storageManager.js
   ├─ statsCalculator.js
   ├─ statsView.js
   └─ uiController.js
```

| Archivo | Responsabilidad |
|---|---|
| `index.html` | Esqueleto de pantallas (menú, juego, estadísticas, ajustes). Carga `main.js`. |
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
| `uiController.js` | Único módulo que gestiona las pantallas del juego: eventos, selectores, tema. |
| `tests/engine.test.html` | Pruebas del motor en el navegador, sin instalar nada. |

---

## 4. Reglas de arquitectura

- **Dependencias en un solo sentido:** `uiController → gameModes → doomsdayEngine`; `uiController → storageManager`; `uiController → statsView → statsCalculator`. Nunca al revés.
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
export function centuryAnchor(year) → 0-6
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

### 5.6 `storageManager.js`
```js
export async function init() → void
export function loadSettings() → Settings              // mezcla con DEFAULT_SETTINGS
export function saveSettings(partial) → void
export function getBestStreak() → number
export function saveBestStreak(n) → void
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

---

## 6. Checklist

### Bloque 0 — Preparación (tú)
- [ ] 0.1 Crear carpeta `doomsday/` y abrirla en VS Code
- [ ] 0.2 Instalar la extensión **Live Server** (o usar `python -m http.server`)
- [ ] 0.3 Copiar este `PLAN.md` a la carpeta
- [ ] 0.4 (Opcional) crear cuenta de GitHub para el despliegue final

### Bloque 1 — Núcleo
- [ ] 1.1 `config.js` · *Hecho cuando:* se importa sin errores desde la consola
- [ ] 1.2 `methods/classic12.js`, `odd11.js`, `index.js` · *Hecho cuando:* ambos dan el mismo `value` en 1000 años aleatorios
- [ ] 1.3 `doomsdayEngine.js` · *Hecho cuando:* `weekdayOf` coincide con `Date` en todos los días de 1600–2500 (muestra amplia)
- [ ] 1.4 `tests/engine.test.html` · *Hecho cuando:* muestra todas las pruebas en verde en el navegador
- [ ] 1.5 Pistas y solución · *Hecho cuando:* ninguna pista revela el resultado y la solución termina en la respuesta correcta

### Bloque 2 — Persistencia y modos
- [ ] 2.1 `storageManager.js` · *Hecho cuando:* ajustes y récord sobreviven a recargar; `addAttempt`/`getAttempts` funcionan
- [ ] 2.2 `modes/practice.js` · *Hecho cuando:* una sesión emite `question` y `result` desde la consola
- [ ] 2.3 `modes/competition.js` · *Hecho cuando:* el `tick`, la racha, el récord y el `timedOut` se comportan según 5.5
- [ ] 2.4 `modes/index.js` y `gameModes.js` · *Hecho cuando:* `listModes()` devuelve ambos y `createSession` funciona

### Bloque 3 — Estadísticas
- [ ] 3.1 `statsCalculator.js` (6 métricas) · *Hecho cuando:* con historial de prueba, los números cuadran a mano
- [ ] 3.2 `statsView.js` · *Hecho cuando:* pinta los tres tipos (`number`, `table`, `bars`) y un historial vacío sin errores

### Bloque 4 — Interfaz
- [ ] 4.1 `index.html` + `styles.css` (tema claro/oscuro) · *Hecho cuando:* se ve bien en pantalla de móvil y cambia de tema
- [ ] 4.2 `uiController.js`: menú y ajustes generados desde los registros
- [ ] 4.3 `uiController.js`: pantalla de juego (pregunta, respuesta, pistas, solución, temporizador, racha)
- [ ] 4.4 `uiController.js`: guarda cada intento y abre estadísticas
- [ ] 4.5 `main.js` · *Hecho cuando:* una partida completa funciona de principio a fin en el navegador

### Bloque 5 — PWA
- [ ] 5.1 `manifest.json` e iconos
- [ ] 5.2 `service-worker.js` · *Hecho cuando:* Chrome DevTools → Application muestra el SW activo y la caché llena
- [ ] 5.3 Prueba offline · *Hecho cuando:* con *Offline* activado en DevTools, la app carga y se puede jugar
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

- (vacío) Formato: `fecha · decisión · motivo`.
