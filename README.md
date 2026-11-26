# Tetris

Implementación del clásico **Tetris** en JavaScript vanilla, usando HTML5 Canvas y CSS. Sin dependencias externas, sin frameworks, sin proceso de build: solo abrir y jugar.

![Tech](https://img.shields.io/badge/HTML5-Canvas-orange)
![Tech](https://img.shields.io/badge/CSS3-blueviolet)
![Tech](https://img.shields.io/badge/JavaScript-Vanilla-yellow)

---

## Tabla de contenidos

- [Tetris](#tetris)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [Qué hace el proyecto](#qué-hace-el-proyecto)
  - [Cómo ejecutar el juego](#cómo-ejecutar-el-juego)
    - [Opción 1: abrir el archivo directamente](#opción-1-abrir-el-archivo-directamente)
    - [Opción 2: servidor local (recomendado)](#opción-2-servidor-local-recomendado)
  - [Controles](#controles)
  - [Combos y bonus](#combos-y-bonus)
  - [Modo desafío](#modo-desafío)
  - [Habilidades](#habilidades)
  - [Cómo funciona](#cómo-funciona)
    - [1. `index.html`](#1-indexhtml)
    - [2. `style.css`](#2-stylecss)
    - [3. `game.js`](#3-gamejs)
    - [Flujo del juego](#flujo-del-juego)
  - [Tecnologías](#tecnologías)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Personalización](#personalización)
  - [Licencia](#licencia)

---

## Qué hace el proyecto

Es una versión jugable del Tetris clásico con todas las mecánicas que esperarías:

- Tablero de **10 × 20** celdas.
- Las **7 piezas estándar** (I, O, T, S, Z, J, L) con colores diferenciados, más la pieza **N**, un cuadrado 3×3 hueco.
- **Pentominós** ocasionales (`+`, `U`, `Y`): en conjunto, cerca del 10 % de las piezas.
- **Pieza 1×1** de recompensa tras un tetris (4 líneas de golpe). Aparece en la vista previa; si coincide con un power-up, sale primero el power-up.
- **Rotación** con _wall kicks_ básicos (pequeños desplazamientos para que la pieza pueda rotar pegada a la pared).
- **Soft drop** (bajada acelerada) y **hard drop** (caída instantánea).
- **Pieza fantasma** (_ghost piece_): muestra dónde aterrizará la pieza actual.
- **Vista previa** de la siguiente pieza.
- **Sistema de puntuación** clásico de Tetris (100 / 300 / 500 / 800 multiplicado por nivel).
- **Modo combo y multiplicadores** (ver [Combos y bonus](#combos-y-bonus)), con efectos visuales y sonoros.
- **Niveles** que aumentan cada 10 líneas y aceleran la caída.
- **Pausa** y **Game Over** con opción de reinicio o regreso al menú.
- **Modo desafío** con 5 niveles con objetivos (ver [Modo desafío](#modo-desafío)).
- **Habilidades cargables** con una barra de energía (ver [Habilidades](#habilidades)).

---

## Cómo ejecutar el juego

No hay nada que instalar ni compilar. Tienes dos opciones:

### Opción 1: abrir el archivo directamente

```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Opción 2: servidor local (recomendado)

Cualquier servidor estático funciona. Algunos ejemplos:

```bash
# Con Python 3
python3 -m http.server 8000

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8000
```

Después abre `http://localhost:8000` en el navegador.

---

## Controles

| Tecla     | Acción                            |
| --------- | --------------------------------- |
| `←` / `→` | Mover la pieza horizontalmente    |
| `↑` o `X` | Rotar la pieza en sentido horario |
| `↓`       | Soft drop (bajar más rápido)      |
| `Espacio` | Hard drop (caída instantánea)     |
| `E`       | Elegir habilidad (barra llena)    |
| `P`       | Pausar / reanudar                 |
| `M`       | Silenciar / activar el sonido     |

---

## Combos y bonus

| Jugada            | Regla                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| **Combo**         | Cada pieza consecutiva que limpia líneas sube el multiplicador (x1, x2, x3…). Una pieza sin líneas lo reinicia; un power-up sin líneas no lo afecta. |
| **T-spin**        | La T se fija tras un giro con 3 de las 4 esquinas de su centro ocupadas. Base por 0/1/2/3 líneas: 400/800/1200/1600 × nivel. |
| **B2B Tetris**    | Un Tetris cuya limpieza anterior también fue un Tetris vale ×1.5. Cualquier otra limpieza rompe la cadena. |
| **Perfect clear** | Dejar el tablero vacío suma 800/1200/1800/2000 × nivel (según 1/2/3/4+ líneas).                            |

Puntos de una limpieza: `base × B2B × combo + perfect clear`. El T-spin sin líneas no se multiplica y rompe el combo.

---

## Modo desafío

Al abrir el juego aparece el menú de modos: **Clásico** o cualquiera de los 5 desafíos, disponibles desde el inicio. Los superados se marcan con ✓ (se guardan en `localStorage`).

| Nivel                   | Mecánica                                            | Victoria             |
| ----------------------- | --------------------------------------------------- | -------------------- |
| **1. Contrarreloj**     | Límite de 2 minutos                                 | Limpiar 40 líneas    |
| **2. Basura**           | Sube una fila con un hueco cada 10 s                | Sobrevivir 2 minutos |
| **3. Bloques fijos**    | Tablero pre-colocado                                | Limpiar 10 líneas    |
| **4. Invisibles**       | Las piezas se desvanecen al fijarse                 | Limpiar 10 líneas    |
| **5. Rotación inversa** | Empieza en el nivel 7 y gira en sentido antihorario | Limpiar 15 líneas    |

- Los bloques fijos solo desaparecen al completar su línea; los power-ups no los destruyen.
- El power-up de congelar detiene la caída y la basura, pero no el reloj.
- Al ocultar la pestaña, el desafío se pausa.

Los niveles se configuran en `challenges.js`.

---

## Habilidades

Cada línea limpiada carga la barra de energía, que se llena con 6 líneas (el exceso se pierde). Con la barra llena, `E` o el botón **Habilidad** detiene el juego y permite elegir con `1`-`5` o con el ratón; `E` o `Esc` cancelan sin gastar energía. Usar una habilidad vacía la barra. Están disponibles en todos los modos.

| Habilidad           | Efecto                                                                            |
| ------------------- | --------------------------------------------------------------------------------- |
| **1. Visión**       | Muestra las siguientes 5 piezas; la lista se acorta según van saliendo.           |
| **2. Intercambio**  | Cambia la pieza actual por otra al azar (clásicas, N o pentominós), desde arriba. |
| **3. Cámara lenta** | Durante 10 s la caída y la basura van al 40 % de velocidad. El reloj no.          |
| **4. Deshacer**     | Revierte la última colocación (tablero, puntos y líneas) y devuelve esa pieza.    |
| **5. Reservar**     | Guarda la pieza actual en **HOLD**; si ya hay una, las intercambia.               |

- Las habilidades sin efecto posible aparecen desactivadas.
- Deshacer no está disponible si ha subido basura después de la última colocación.
- Recuperar la pieza reservada requiere volver a usar **Reservar**.

Los valores se ajustan en `abilities.js`.

---

## Cómo funciona

El juego se compone de cinco archivos que cooperan:

### 1. `index.html`

Define la estructura visual:

- Un `<canvas id="board">` de **300 × 600** píxeles donde se renderiza el tablero.
- Un panel lateral con `SCORE`, `LINES`, `LEVEL`, vista de la siguiente pieza y la lista de controles.
- Un overlay para el menú de modos y los estados **PAUSA**, **GAME OVER** y desafío superado.

### 2. `style.css`

Aporta el aspecto visual con estética _dark / retro arcade_: fondo oscuro, tipografía monoespaciada para los marcadores y _backdrop blur_ en los overlays.

### 3. `game.js`

Contiene toda la lógica del juego. A grandes rasgos:

- **Modelo del tablero**: una matriz `ROWS × COLS` donde cada celda guarda `0` (vacía) o un índice de color (1–7) que identifica la pieza.
- **Piezas**: definidas como matrices cuadradas. Para rotar se calcula la transposición + reverso de filas (`rotateCW`).
- **Detección de colisiones** (`collide`): comprueba que ninguna celda de la pieza salga del tablero ni se solape con bloques ya fijados.
- **Wall kicks** (`tryRotate`): si la rotación choca, intenta desplazar la pieza ±1 y ±2 columnas antes de descartar el giro.
- **Game loop** (`loop`): basado en `requestAnimationFrame`, acumula el tiempo transcurrido y baja la pieza una fila cuando se supera `dropInterval`.
- **Limpieza de líneas** (`clearLines`): recorre el tablero de abajo hacia arriba; cada fila completa se elimina y se inserta una vacía en la cima.
- **Puntuación**: usa la tabla clásica `[0, 100, 300, 500, 800]` multiplicada por el nivel actual; el hard drop suma 2 puntos por celda recorrida y el soft drop 1 punto por fila.
- **Nivel y velocidad**: el nivel sube cada 10 líneas; la velocidad de caída se calcula como `max(100, 1000 − (level − 1) × 90)` milisegundos.
- **Ghost piece** (`ghostY`): proyecta la posición final de la pieza actual hacia abajo y la dibuja con `globalAlpha = 0.2`.

`challenges.js` define los niveles del modo desafío y guarda el progreso. `abilities.js` contiene la energía y las habilidades.

### Flujo del juego

```
showMenu() → elegir modo
        ↓
init()
  ├─ createBoard()                  → matriz vacía
  ├─ fillQueue()                    → cola de próximas piezas
  ├─ spawn()                        → saca la primera de la cola y la rellena
  └─ requestAnimationFrame(loop)
        ↓
   loop(timestamp)
     ├─ acumula dt
     ├─ si dt ≥ dropInterval → baja la pieza o llama a lockPiece()
     ├─ draw()  (grid + tablero + ghost + pieza actual)
     └─ requestAnimationFrame(loop)

   keydown → mover / rotar / soft-drop / hard-drop / pausa
```

Cuando una pieza recién generada ya colisiona al aparecer (`spawn`), se dispara `finishGame(false)` y se muestra el overlay de **Game Over**.

---

## Tecnologías

- **HTML5** — marcado y dos elementos `<canvas>` (tablero y vista previa).
- **CSS3** — _flexbox_, variables de color, `backdrop-filter` y `box-shadow`.
- **JavaScript (ES6+) vanilla** — `const`/`let`, _arrow functions_, _spread operator_, `Array.from`, _template literals_…
- **Canvas 2D API** — para todo el renderizado del juego.
- **`requestAnimationFrame`** — para el bucle de juego sincronizado con el navegador.

**Sin dependencias.** No hay `package.json`, ni bundler, ni transpilador.

---

## Estructura del proyecto

```
03-tetris/
├── index.html      # Estructura del DOM y canvas
├── style.css       # Estilos del juego (dark theme)
├── challenges.js   # Niveles del modo desafío y progreso
├── abilities.js    # Energía y habilidades cargables
├── game.js         # Lógica del Tetris
└── README.md
```

---

## Personalización

Algunos parámetros fáciles de tunear en `game.js`:

| Constante      | Significado                              | Por defecto           |
| -------------- | ---------------------------------------- | --------------------- |
| `COLS`         | Columnas del tablero                     | `10`                  |
| `ROWS`         | Filas del tablero                        | `20`                  |
| `BLOCK`        | Tamaño en píxeles de cada celda          | `30`                  |
| `COLORS`       | Paleta de colores por tipo de pieza      | 7 colores             |
| `LINE_SCORES`  | Puntos por 1, 2, 3 o 4 líneas eliminadas | `[0,100,300,500,800]` |
| `dropInterval` | Velocidad inicial de caída en ms         | `1000`                |

> Si cambias `COLS`, `ROWS` o `BLOCK`, recuerda ajustar también `width` y `height` del `<canvas id="board">` en `index.html` para que coincida (`COLS × BLOCK` × `ROWS × BLOCK`).

---

## Licencia

Proyecto de uso libre con fines educativos y de práctica.
