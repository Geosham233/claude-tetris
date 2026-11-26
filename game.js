'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#64b5f6', // J - pale blue
  '#ffb74d', // L - orange
  '#90a4ae', // N - nut
  '#ff5252', // bomb
  '#ffee58', // lightning
  '#ab47bc', // ink (wildcard)
  '#8d6e63', // gravity
  '#4fc3f7', // freeze
  '#f06292', // + (pentomino)
  '#aed581', // U (pentomino)
  '#7986cb', // Y (pentomino)
  '#fafafa', // single (recompensa por tetris)
  '#9e9e9e', // basura (modo desafío)
  '#546e7a', // bloque fijo (modo desafío)
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // N (nut)
  [[9]],                                       // bomb (1x1)
  [[10]],                                      // lightning (1x1)
  [[11]],                                      // ink (1x1)
  [[12]],                                      // gravity (1x1)
  [[13]],                                      // freeze (1x1)
  [[0,14,0],[14,14,14],[0,14,0]],             // + (pentomino)
  [[15,0,15],[15,15,15],[0,0,0]],             // U (pentomino)
  [[0,0,0,0],[16,16,16,16],[0,16,0,0],[0,0,0,0]], // Y (pentomino)
  [[17]],                                      // single (1x1)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const BASE_TYPES = [1, 2, 3, 4, 5, 6, 7, 8]; // clásicas + N
const PENTOMINO_TYPES = [14, 15, 16];
const PENTOMINO_CHANCE = 0.10;  // probabilidad total, repartida entre los pentominós
const SINGLE_TYPE = 17;
const TETRIS_LINES = 4;         // líneas de golpe que premian con una pieza 1x1

const GARBAGE_TYPE = 18;
const FIXED_TYPE = 19;          // solo desaparece al completar su línea
const LOCK_FADE_DURATION = 600; // ms que tarda en desvanecerse una pieza invisible

const BOMB_TYPE = 9;
const LIGHTNING_TYPE = 10;
const INK_TYPE = 11;
const GRAVITY_TYPE = 12;
const FREEZE_TYPE = 13;
const POWERUP_TYPES = [BOMB_TYPE, LIGHTNING_TYPE, INK_TYPE, GRAVITY_TYPE, FREEZE_TYPE];
const POWERUP_LINE_INTERVAL = 5;
const EXPLOSION_RADIUS = 1;     // -> área 3x3
const EXPLOSION_DURATION = 300; // ms de flash visual
const LIGHTNING_DURATION = 300; // ms de flash visual
const LIGHTNING_FALL_DURATION = 250; // ms de caída de los bloques tras el flash
const INK_DURATION = 300;       // ms de flash visual
const GRAVITY_DURATION = 300;   // ms de flash visual
const FREEZE_DURATION = 5000;   // ms de pausa real de la caída

const T_TYPE = 3;
const TSPIN_SCORES = [400, 800, 1200, 1600];             // por 0-3 líneas
const PERFECT_CLEAR_SCORES = [0, 800, 1200, 1800, 2000]; // por 1-4+ líneas
const B2B_MULTIPLIER = 1.5;
const CLEAR_NAMES = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS'];
const WIN_TITLE = '¡DESAFÍO SUPERADO!';
const POPUP_DURATION = 1200;          // ms del texto flotante
const PERFECT_FLASH_DURATION = 500;   // ms del destello de perfect clear
const SHAKE_MAX_COMBO = 6;            // combo a partir del cual la sacudida no crece

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const peekSectionEl = document.getElementById('peek-section');
const peekCanvas = document.getElementById('peek-canvas');
const peekCtx = peekCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const energyBarEl = document.getElementById('energy-bar');
const energyFillEl = document.getElementById('energy-fill');
const abilityBtn = document.getElementById('ability-btn');
const slowStatusEl = document.getElementById('slow-status');
const abilityListEl = document.getElementById('ability-list');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const soundToggleBtn = document.getElementById('sound-toggle');
const comboEl = document.getElementById('combo');
const b2bEl = document.getElementById('b2b');
const menuBtn = document.getElementById('menu-btn');
const levelListEl = document.getElementById('level-list');
const objectiveEl = document.getElementById('objective');
const objectiveNameEl = document.getElementById('objective-name');
const objectiveStatusEl = document.getElementById('objective-status');
const rotateLabelEl = document.getElementById('rotate-label');

const THEME_KEY = 'tetris-theme';
const MUTE_KEY = 'tetris-muted';

let board, current, queue, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId,
    linesSincePowerUp, powerUpPending, singlesPending, explosion, lightningEffect, inkEffect,
    gravityEffect, freezeRemaining, combo, b2bActive, lastActionRotation, popup,
    elapsed, garbageAccum, lockFade,
    energy, heldType, peekRemaining, slowRemaining, undoSnapshot, spawnScore, choosingAbility;
let challenge = null; // null = modo clásico
let inMenu = true;
let muted = false;
let audioCtx = null;

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggleBtn.textContent = theme === 'light' ? '☀️' : '🌙';
  themeToggleBtn.setAttribute('aria-label', theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved === 'light' ? 'light' : 'dark');
}

themeToggleBtn.addEventListener('click', () => {
  const newTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, newTheme);
  applyTheme(newTheme);
});

initTheme();

function applyMute(value) {
  muted = value;
  soundToggleBtn.textContent = muted ? '🔇' : '🔊';
  soundToggleBtn.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar');
}

function toggleMute() {
  applyMute(!muted);
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
}

soundToggleBtn.addEventListener('click', () => {
  initAudio();
  toggleMute();
  soundToggleBtn.blur(); // evita que Espacio vuelva a activar el botón
});

applyMute(localStorage.getItem(MUTE_KEY) === '1');

// El navegador solo permite audio tras una interacción del usuario
function initAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  if (!audioCtx) audioCtx = new AudioContextClass();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playTone(freq, delay, duration, wave, volume) {
  const start = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration);
}

function playTurnSound({ cleared, tspin, b2b, perfect, comboCount }) {
  if (muted || !audioCtx || audioCtx.state !== 'running') return;
  if (cleared) {
    // un tono entero más agudo por cada eslabón del combo
    const base = 330 * Math.pow(2, Math.min(comboCount - 1, 12) / 6);
    [1, 1.25, 1.5].forEach((ratio, i) => playTone(base * ratio, i * 0.05, 0.15, 'square', 0.05));
  }
  if (tspin) [622, 932].forEach((f, i) => playTone(f, 0.15 + i * 0.08, 0.18, 'sawtooth', 0.05));
  if (b2b) [196, 262, 392].forEach((f, i) => playTone(f, 0.2 + i * 0.07, 0.22, 'triangle', 0.12));
  if (perfect) [523, 659, 784, 1047, 1319].forEach((f, i) => playTone(f, 0.3 + i * 0.09, 0.3, 'triangle', 0.12));
}

function createBoard(layout = []) {
  const result = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  layout.forEach((row, i) => {
    const r = ROWS - layout.length + i;
    [...row].forEach((cell, c) => { if (cell === '#') result[r][c] = FIXED_TYPE; });
  });
  return result;
}

function startLevel() {
  return challenge?.startLevel ?? 1;
}

function dropIntervalFor(lvl) {
  return Math.max(100, 1000 - (lvl - 1) * 90);
}

function randomPiece() {
  // piezas normales y pentominós; power-ups y 1x1 se inyectan desde spawn() al completar líneas
  const type = Math.random() < PENTOMINO_CHANCE
    ? PENTOMINO_TYPES[Math.floor(Math.random() * PENTOMINO_TYPES.length)]
    : BASE_TYPES[Math.floor(Math.random() * BASE_TYPES.length)];
  return createPiece(type);
}

function createPiece(type) {
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function isBomb(piece) {
  return piece.type === BOMB_TYPE;
}

function isLightning(piece) {
  return piece.type === LIGHTNING_TYPE;
}

function isInk(piece) {
  return piece.type === INK_TYPE;
}

function isGravity(piece) {
  return piece.type === GRAVITY_TYPE;
}

function isFreeze(piece) {
  return piece.type === FREEZE_TYPE;
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function rotateCCW(shape) {
  return rotateCW(rotateCW(rotateCW(shape)));
}

function tryRotate() {
  const rotate = challenge?.inverseRotation ? rotateCCW : rotateCW;
  const rotated = rotate(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      lastActionRotation = true;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0) || board[r].includes(INK_TYPE)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  return cleared;
}

// T-spin: la última acción fue un giro y 3 de las 4 esquinas del centro de la T
// están ocupadas (paredes y suelo cuentan). Se evalúa antes de fijar la pieza.
function isTSpin() {
  if (current.type !== T_TYPE || !lastActionRotation) return false;
  const corners = [[0, 0], [2, 0], [0, 2], [2, 2]];
  const filled = corners.filter(([dx, dy]) => collide([[1]], current.x + dx, current.y + dy));
  return filled.length >= 3;
}

function isBoardEmpty() {
  return board.every(row => row.every(v => v === 0));
}

function scoreTurn(cleared, tspin, isPowerUp) {
  if (!cleared) {
    // un power-up sin líneas es neutro para el combo
    if (!isPowerUp) combo = 0;
    if (tspin) {
      const points = TSPIN_SCORES[0] * level;
      score += points;
      showTurnEffects({ cleared, tspin, points, labels: ['T-SPIN'] });
    }
    updateHUD();
    return;
  }

  const rank = Math.min(cleared, TETRIS_LINES); // tinta y gravedad pueden limpiar más de 4
  const isTetris = cleared >= TETRIS_LINES;
  const b2b = isTetris && b2bActive;
  const perfect = isBoardEmpty();
  combo++;
  b2bActive = isTetris;

  const base = (tspin ? TSPIN_SCORES[rank] : LINE_SCORES[rank]) * level;
  const bonus = perfect ? PERFECT_CLEAR_SCORES[rank] * level : 0;
  const points = Math.round(base * (b2b ? B2B_MULTIPLIER : 1) * combo) + bonus;
  score += points;

  lines += cleared;
  level = startLevel() + Math.floor(lines / 10);
  dropInterval = dropIntervalFor(level);
  if (isTetris) singlesPending++;
  gainEnergy(cleared);
  linesSincePowerUp += cleared;
  if (!powerUpPending && linesSincePowerUp >= POWERUP_LINE_INTERVAL) {
    powerUpPending = true;
    linesSincePowerUp -= POWERUP_LINE_INTERVAL;
  }

  const labels = [];
  if (perfect) labels.push('PERFECT CLEAR');
  if (b2b) labels.push('B2B TETRIS');
  else if (tspin) labels.push(`T-SPIN ${CLEAR_NAMES[rank]}`);
  else if (isTetris) labels.push('TETRIS');
  if (combo > 1) labels.push(`COMBO x${combo}`);
  showTurnEffects({ cleared, tspin, b2b, perfect, comboCount: combo, points, labels });
  updateHUD();
}

function showTurnEffects(turn) {
  // una limpieza simple sin cadena solo suena
  if (turn.labels.length) {
    popup = { labels: turn.labels, points: turn.points, perfect: turn.perfect, startTime: performance.now() };
  }
  if (turn.tspin || turn.b2b || turn.perfect || turn.comboCount > 1) {
    shakeBoard(turn.perfect ? SHAKE_MAX_COMBO : Math.min(turn.comboCount || 1, SHAKE_MAX_COMBO));
  }
  playTurnSound(turn);
}

function shakeBoard(intensity) {
  canvas.style.setProperty('--shake', `${intensity + 1}px`);
  canvas.classList.remove('shake');
  void canvas.offsetWidth; // reinicia la animación
  canvas.classList.add('shake');
}

function triggerExplosion(cx, cy) {
  for (let r = cy - EXPLOSION_RADIUS; r <= cy + EXPLOSION_RADIUS; r++) {
    for (let c = cx - EXPLOSION_RADIUS; c <= cx + EXPLOSION_RADIUS; c++) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      if (board[r][c] !== FIXED_TYPE) board[r][c] = 0;
    }
  }
  explosion = { x: cx, y: cy, startTime: performance.now() };
}

function triggerLightning(cx, cy) {
  if (cx >= 0 && cx < COLS) {
    for (let r = 0; r < ROWS; r++) if (board[r][cx] !== FIXED_TYPE) board[r][cx] = 0;
  }
  let falls = false;
  if (cy >= 0 && cy < ROWS) {
    if (board[cy].includes(FIXED_TYPE)) {
      // una fila con bloques fijos no desaparece: solo pierde el resto
      board[cy] = board[cy].map(v => (v === FIXED_TYPE ? v : 0));
    } else {
      // la fila desaparece y todo lo que está encima baja una posición
      board.splice(cy, 1);
      board.unshift(new Array(COLS).fill(0));
      falls = true;
    }
  }
  lightningEffect = { x: cx, y: cy, falls, startTime: performance.now() };
}

function triggerInk(cx, cy) {
  const freq = {};
  // las filas con bloques fijos quedan fuera: la tinta no puede eliminarlos
  const rows = board.filter(row => !row.includes(FIXED_TYPE));
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = rows[r][c];
      if (v && v !== INK_TYPE) freq[v] = (freq[v] || 0) + 1;
    }
  }
  let targetColor = 0, maxCount = 0;
  for (const key in freq) {
    if (freq[key] > maxCount) {
      maxCount = freq[key];
      targetColor = Number(key);
    }
  }
  if (targetColor) {
    for (let r = 0; r < rows.length; r++)
      for (let c = 0; c < COLS; c++)
        if (rows[r][c] === targetColor) rows[r][c] = INK_TYPE;
  }
  inkEffect = { x: cx, y: cy, startTime: performance.now() };
}

function triggerGravity(cx, cy) {
  for (let c = 0; c < COLS; c++) {
    let floor = ROWS - 1; // posición libre más baja donde puede caer un bloque
    for (let r = ROWS - 1; r >= 0; r--) {
      const v = board[r][c];
      if (v === FIXED_TYPE) {
        floor = r - 1;
      } else if (v) {
        board[r][c] = 0;
        board[floor--][c] = v;
      }
    }
  }
  gravityEffect = { x: cx, y: cy, startTime: performance.now() };
}

function triggerFreeze(cx, cy) {
  freezeRemaining = FREEZE_DURATION;
  dropAccum = 0;
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  if (gy > current.y) lastActionRotation = false;
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    lastActionRotation = false;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  undoSnapshot = takeSnapshot();
  lightningEffect = null; // evita animar un tablero que ya cambió
  const isPowerUp = POWERUP_TYPES.includes(current.type);
  const tspin = isTSpin();
  const lockedCells = [];
  if (isBomb(current)) {
    triggerExplosion(current.x, current.y);
  } else if (isLightning(current)) {
    triggerLightning(current.x, current.y);
  } else if (isInk(current)) {
    triggerInk(current.x, current.y);
  } else if (isGravity(current)) {
    triggerGravity(current.x, current.y);
  } else if (isFreeze(current)) {
    triggerFreeze(current.x, current.y);
  } else {
    current.shape.forEach((row, r) => row.forEach((v, c) => {
      if (v) lockedCells.push({ x: current.x + c, y: current.y + r, v });
    }));
    merge();
  }
  const cleared = clearLines();
  // si hubo líneas las filas se movieron, así que no hay fundido
  lockFade = cleared ? null : { cells: lockedCells, startTime: performance.now() };
  scoreTurn(cleared, tspin, isPowerUp);
  if (challenge?.targetLines && lines >= challenge.targetLines) {
    finishGame(true);
    return;
  }
  spawn();
}

function addGarbage() {
  if (board[0].some(v => v !== 0)) {
    finishGame(false);
    return;
  }
  const hole = Math.floor(Math.random() * COLS);
  board.shift();
  board.push(Array.from({ length: COLS }, (_, c) => (c === hole ? 0 : GARBAGE_TYPE)));
  undoSnapshot = null; // deshacer borraría la basura recién subida
  lightningEffect = null; // evita animar un tablero que ya cambió
  if (collide(current.shape, current.x, current.y)) {
    current.y--;
    lastActionRotation = false;
    // la basura empuja la pieza fuera del tablero
    if (current.shape.some((row, r) => current.y + r < 0 && row.some(v => v))) finishGame(false);
  }
}

// La cola siempre tiene generadas al menos las piezas que puede revelar la visión
function fillQueue() {
  while (queue.length < PEEK_COUNT) queue.push(randomPiece());
}

function spawn() {
  current = queue.shift();
  lastActionRotation = false;
  spawnScore = score;
  // las recompensas se cuelan al frente de la cola
  if (powerUpPending) {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    queue.unshift(createPiece(type));
    powerUpPending = false;
  } else if (singlesPending > 0) {
    // el power-up tiene prioridad; la 1x1 sale justo después
    queue.unshift(createPiece(SINGLE_TYPE));
    singlesPending--;
  }
  fillQueue();
  if (peekRemaining > 0) peekRemaining--;
  if (collide(current.shape, current.x, current.y)) {
    finishGame(false);
  }
  drawPreviews();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  comboEl.textContent = combo ? `x${combo}` : '—';
  b2bEl.classList.toggle('hidden', !b2bActive);
  updateEnergy();
  updateObjective();
}

function updateEnergy() {
  const ready = energy >= ENERGY_MAX;
  energyFillEl.style.height = `${(energy / ENERGY_MAX) * 100}%`;
  energyBarEl.classList.toggle('ready', ready);
  energyBarEl.setAttribute('aria-valuemax', ENERGY_MAX);
  energyBarEl.setAttribute('aria-valuenow', energy);
  abilityBtn.disabled = !ready || gameOver;
  updateSlowStatus();
}

function updateSlowStatus() {
  const text = slowRemaining > 0 ? `Lento ${Math.ceil(slowRemaining / 1000)}s` : '';
  if (slowStatusEl.textContent !== text) slowStatusEl.textContent = text;
}

function formatTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function updateObjective() {
  objectiveEl.classList.toggle('hidden', !challenge);
  if (!challenge) return;
  const { targetLines, timeLimit, surviveTime, garbageInterval } = challenge;
  const status = [];
  if (targetLines) status.push(`Líneas ${Math.min(lines, targetLines)}/${targetLines}`);
  const duration = timeLimit || surviveTime;
  if (duration) status.push(`Tiempo ${formatTime(duration - elapsed)}`);
  if (garbageInterval) status.push(`Basura en ${Math.ceil((garbageInterval - garbageAccum) / 1000)}s`);
  const text = status.join('\n');
  if (objectiveStatusEl.textContent !== text) objectiveStatusEl.textContent = text;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  if (colorIndex === FIXED_TYPE) {
    context.strokeStyle = 'rgba(20,20,20,0.6)';
    context.lineWidth = size * 0.1;
    context.beginPath();
    context.moveTo(x * size + size * 0.25, y * size + size * 0.25);
    context.lineTo(x * size + size * 0.75, y * size + size * 0.75);
    context.moveTo(x * size + size * 0.75, y * size + size * 0.25);
    context.lineTo(x * size + size * 0.25, y * size + size * 0.75);
    context.stroke();
  }
  if (colorIndex === SINGLE_TYPE) {
    // contorno para que el bloque blanco se vea en el tema claro
    context.strokeStyle = 'rgba(20,20,20,0.85)';
    context.lineWidth = size * 0.08;
    context.strokeRect(x * size + size * 0.2, y * size + size * 0.2, size * 0.6, size * 0.6);
  }
  if (colorIndex === BOMB_TYPE) {
    context.fillStyle = 'rgba(20,20,20,0.85)';
    context.beginPath();
    context.arc(x * size + size / 2, y * size + size / 2, size * 0.22, 0, Math.PI * 2);
    context.fill();
  }
  if (colorIndex === LIGHTNING_TYPE) {
    context.fillStyle = 'rgba(20,20,20,0.85)';
    context.beginPath();
    context.moveTo(x * size + size * 0.58, y * size + size * 0.12);
    context.lineTo(x * size + size * 0.32, y * size + size * 0.55);
    context.lineTo(x * size + size * 0.5, y * size + size * 0.55);
    context.lineTo(x * size + size * 0.42, y * size + size * 0.88);
    context.lineTo(x * size + size * 0.7, y * size + size * 0.42);
    context.lineTo(x * size + size * 0.52, y * size + size * 0.42);
    context.closePath();
    context.fill();
  }
  if (colorIndex === INK_TYPE) {
    context.fillStyle = 'rgba(20,20,20,0.85)';
    const cx = x * size + size / 2, cy = y * size + size / 2;
    const spikes = 5, outerR = size * 0.28, innerR = size * 0.12;
    context.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI / spikes) * i - Math.PI / 2;
      const px = cx + Math.cos(angle) * r, py = cy + Math.sin(angle) * r;
      if (i === 0) context.moveTo(px, py); else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
  }
  if (colorIndex === GRAVITY_TYPE) {
    context.fillStyle = 'rgba(20,20,20,0.85)';
    const cx = x * size + size / 2;
    context.beginPath();
    context.moveTo(cx, y * size + size * 0.18);
    context.lineTo(cx, y * size + size * 0.68);
    context.moveTo(cx - size * 0.2, y * size + size * 0.5);
    context.lineTo(cx, y * size + size * 0.8);
    context.lineTo(cx + size * 0.2, y * size + size * 0.5);
    context.closePath();
    context.lineWidth = size * 0.1;
    context.strokeStyle = 'rgba(20,20,20,0.85)';
    context.stroke();
  }
  if (colorIndex === FREEZE_TYPE) {
    context.strokeStyle = 'rgba(20,20,20,0.85)';
    context.lineWidth = size * 0.08;
    const cx = x * size + size / 2, cy = y * size + size / 2, r = size * 0.28;
    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI / 3) * i;
      context.beginPath();
      context.moveTo(cx - Math.cos(angle) * r, cy - Math.sin(angle) * r);
      context.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      context.stroke();
    }
  }
  context.globalAlpha = 1;
}

function drawGrid() {
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-line').trim() || '#22222e';
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board (oculto en el desafío de invisibles hasta que termina la partida)
  if (challenge?.invisible && !gameOver) {
    drawLockFade();
  } else {
    for (let r = 0; r < ROWS; r++) {
      const offset = lightningFallOffset(r);
      for (let c = 0; c < COLS; c++)
        drawBlock(ctx, c, r - offset, board[r][c], BLOCK);
    }
  }

  if (!gameOver) drawActivePiece();

  drawExplosion();
  drawLightningEffect();
  drawInkEffect();
  drawGravityEffect();
  drawSlowOverlay();
  drawFreezeOverlay();
  drawComboPopup();
}

function drawActivePiece() {
  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawLockFade() {
  if (!lockFade) return;
  const t = Math.max(0, (performance.now() - lockFade.startTime) / LOCK_FADE_DURATION);
  if (t >= 1) { lockFade = null; return; }
  lockFade.cells.forEach(({ x, y, v }) => drawBlock(ctx, x, y, v, BLOCK, 1 - t));
}

function drawComboPopup() {
  if (!popup) return;
  const elapsed = performance.now() - popup.startTime;
  if (elapsed >= POPUP_DURATION) { popup = null; return; }
  const t = elapsed / POPUP_DURATION;

  ctx.save();
  if (popup.perfect && elapsed < PERFECT_FLASH_DURATION) {
    ctx.globalAlpha = (1 - elapsed / PERFECT_FLASH_DURATION) * 0.7;
    ctx.fillStyle = '#ffe082';
    ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
  }

  ctx.globalAlpha = Math.min(1, (1 - t) * 2); // opaco la primera mitad y luego se desvanece
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(10,10,20,0.85)';
  const x = (COLS * BLOCK) / 2;
  let y = ROWS * BLOCK * 0.4 - t * 50;
  const texts = [...popup.labels, `+${popup.points.toLocaleString()}`];
  texts.forEach((text, i) => {
    const isPoints = i === texts.length - 1;
    ctx.font = `800 ${isPoints ? 20 : 28}px system-ui, sans-serif`;
    ctx.fillStyle = isPoints ? '#ffffff' : '#ffd54f';
    ctx.strokeText(text, x, y, COLS * BLOCK - 10);
    ctx.fillText(text, x, y, COLS * BLOCK - 10);
    y += 34;
  });
  ctx.restore();
}

function drawExplosion() {
  if (!explosion) return;
  const elapsed = performance.now() - explosion.startTime;
  if (elapsed >= EXPLOSION_DURATION) { explosion = null; return; }
  const t = elapsed / EXPLOSION_DURATION;
  ctx.globalAlpha = 1 - t;
  ctx.fillStyle = '#fff59d';
  const left = Math.max(0, explosion.x - EXPLOSION_RADIUS);
  const top = Math.max(0, explosion.y - EXPLOSION_RADIUS);
  const right = Math.min(COLS - 1, explosion.x + EXPLOSION_RADIUS);
  const bottom = Math.min(ROWS - 1, explosion.y + EXPLOSION_RADIUS);
  ctx.fillRect(left * BLOCK, top * BLOCK, (right - left + 1) * BLOCK, (bottom - top + 1) * BLOCK);
  ctx.globalAlpha = 1;
}

// Cuántas celdas se dibuja una fila por encima de su posición final mientras cae
function lightningFallOffset(row) {
  if (!lightningEffect?.falls || row > lightningEffect.y) return 0;
  const elapsed = performance.now() - lightningEffect.startTime - LIGHTNING_DURATION;
  const t = Math.min(1, Math.max(0, elapsed / LIGHTNING_FALL_DURATION));
  return 1 - t * t; // caída acelerada
}

function drawLightningEffect() {
  if (!lightningEffect) return;
  const elapsed = performance.now() - lightningEffect.startTime;
  if (elapsed >= LIGHTNING_DURATION + LIGHTNING_FALL_DURATION) { lightningEffect = null; return; }
  if (elapsed >= LIGHTNING_DURATION) return; // solo queda la caída
  const t = elapsed / LIGHTNING_DURATION;
  ctx.globalAlpha = 1 - t;
  ctx.fillStyle = '#fff9c4';
  if (lightningEffect.y >= 0 && lightningEffect.y < ROWS) {
    ctx.fillRect(0, lightningEffect.y * BLOCK, COLS * BLOCK, BLOCK);
  }
  if (lightningEffect.x >= 0 && lightningEffect.x < COLS) {
    ctx.fillRect(lightningEffect.x * BLOCK, 0, BLOCK, ROWS * BLOCK);
  }
  ctx.globalAlpha = 1;
}

function drawInkEffect() {
  if (!inkEffect) return;
  const elapsed = performance.now() - inkEffect.startTime;
  if (elapsed >= INK_DURATION) { inkEffect = null; return; }
  const t = elapsed / INK_DURATION;
  ctx.globalAlpha = (1 - t) * 0.5;
  ctx.fillStyle = '#ab47bc';
  ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
  ctx.globalAlpha = 1;
}

function drawGravityEffect() {
  if (!gravityEffect) return;
  const elapsed = performance.now() - gravityEffect.startTime;
  if (elapsed >= GRAVITY_DURATION) { gravityEffect = null; return; }
  const t = elapsed / GRAVITY_DURATION;
  ctx.globalAlpha = (1 - t) * 0.5;
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
  ctx.globalAlpha = 1;
}

function drawFreezeOverlay() {
  if (freezeRemaining <= 0) return;
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#4fc3f7';
  ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
  ctx.globalAlpha = 1;
}

function drawSlowOverlay() {
  if (slowRemaining <= 0) return;
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#ffd54f';
  ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
  ctx.globalAlpha = 1;
}

// Dibuja una pieza centrada en el hueco de 4 filas que empieza en la fila `top`
function drawPreview(context, shape, size, top = 0) {
  const offX = (context.canvas.width / size - shape[0].length) / 2;
  const offY = top + Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(context, offX + c, offY + r, shape[r][c], size);
}

function drawPreviews() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  drawPreview(nextCtx, queue[0].shape, 30);

  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  if (heldType !== null) drawPreview(holdCtx, PIECES[heldType], 20);

  peekSectionEl.classList.toggle('hidden', peekRemaining <= 0);
  peekCtx.clearRect(0, 0, peekCanvas.width, peekCanvas.height);
  queue.slice(0, peekRemaining).forEach((piece, i) => drawPreview(peekCtx, piece.shape, 12, i * 4));
}

function showOverlay(title, detail, { menu = false, abilities = false } = {}) {
  overlayTitle.textContent = title;
  overlayTitle.classList.toggle('success', title === WIN_TITLE);
  overlayScore.textContent = detail;
  levelListEl.classList.toggle('hidden', !menu);
  abilityListEl.classList.toggle('hidden', !abilities);
  restartBtn.classList.toggle('hidden', menu || abilities);
  menuBtn.classList.toggle('hidden', menu || abilities);
  overlay.classList.remove('hidden');
}

function finishGame(won, title = won ? WIN_TITLE : 'GAME OVER') {
  gameOver = true;
  cancelAnimationFrame(animId);
  if (won && challenge) saveCompletedChallenge(challenge.id);
  // sin efectos a medias congelados en el último fotograma
  explosion = lightningEffect = inkEffect = gravityEffect = popup = null;
  freezeRemaining = 0;
  slowRemaining = 0;
  draw();
  updateHUD();
  showOverlay(title, `Puntuación: ${score.toLocaleString()}`);
}

function renderLevelList() {
  const completed = loadCompletedChallenges();
  const options = [
    { name: 'Clásico', description: 'Partida sin objetivos', value: null },
    ...CHALLENGES.map((c, i) => ({
      name: `${i + 1}. ${c.name}${completed.includes(c.id) ? ' ✓' : ''}`,
      description: c.description,
      value: c,
    })),
  ];
  levelListEl.replaceChildren(...options.map(({ name, description, value }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'level-btn';
    const title = document.createElement('strong');
    title.textContent = name;
    const detail = document.createElement('span');
    detail.textContent = description;
    button.append(title, detail);
    button.addEventListener('click', () => {
      initAudio();
      button.blur();
      challenge = value;
      init();
    });
    return button;
  }));
}

function showMenu() {
  cancelAnimationFrame(animId);
  inMenu = true;
  choosingAbility = false;
  challenge = null;
  objectiveEl.classList.add('hidden');
  renderLevelList();
  showOverlay('MODOS', '', { menu: true });
}

function togglePause() {
  if (gameOver || inMenu || choosingAbility) return;
  paused = !paused;
  if (!paused) {
    overlay.classList.add('hidden');
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    showOverlay('PAUSA', '');
  }
}

function loop(ts) {
  const dt = Math.max(0, ts - lastTime);
  lastTime = ts;
  if (challenge) {
    elapsed += dt;
    if (challenge.timeLimit && elapsed >= challenge.timeLimit) {
      finishGame(false, 'TIEMPO AGOTADO');
      return;
    }
    if (challenge.surviveTime && elapsed >= challenge.surviveTime) {
      finishGame(true);
      return;
    }
  }
  if (freezeRemaining > 0) {
    freezeRemaining = Math.max(0, freezeRemaining - dt);
  } else {
    // la cámara lenta afecta a la caída y a la basura, no al reloj del desafío
    const gameDt = slowRemaining > 0 ? dt * SLOW_FACTOR : dt;
    slowRemaining = Math.max(0, slowRemaining - dt);
    if (challenge?.garbageInterval) {
      garbageAccum += gameDt;
      if (garbageAccum >= challenge.garbageInterval) {
        garbageAccum -= challenge.garbageInterval;
        addGarbage();
        if (gameOver) return;
      }
    }
    dropAccum += gameDt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
        lastActionRotation = false;
      } else {
        lockPiece();
      }
    }
  }
  if (gameOver) return;
  updateObjective();
  updateSlowStatus();
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard(challenge?.layout);
  score = 0;
  lines = 0;
  level = startLevel();
  paused = false;
  gameOver = false;
  inMenu = false;
  elapsed = 0;
  garbageAccum = 0;
  lockFade = null;
  dropInterval = dropIntervalFor(level);
  dropAccum = 0;
  linesSincePowerUp = 0;
  powerUpPending = false;
  singlesPending = 0;
  explosion = null;
  lightningEffect = null;
  inkEffect = null;
  gravityEffect = null;
  freezeRemaining = 0;
  combo = 0;
  b2bActive = false;
  popup = null;
  energy = 0;
  heldType = null;
  peekRemaining = 0;
  slowRemaining = 0;
  undoSnapshot = null;
  choosingAbility = false;
  canvas.classList.remove('shake');
  objectiveNameEl.textContent = challenge?.name ?? '';
  rotateLabelEl.textContent = challenge?.inverseRotation ? 'rotar ↺' : 'rotar';
  lastTime = performance.now();
  queue = [];
  fillQueue();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  initAudio();
  if (e.code === 'KeyM') { toggleMute(); return; }
  if (inMenu) return;
  if (choosingAbility) { handleAbilityKey(e); return; }
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'KeyE':
      if (!e.repeat) openAbilityMenu();
      return;
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) {
        current.x--;
        lastActionRotation = false;
      }
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) {
        current.x++;
        lastActionRotation = false;
      }
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

abilityBtn.addEventListener('click', () => {
  initAudio();
  abilityBtn.blur(); // evita que Espacio vuelva a activar el botón
  openAbilityMenu();
});

restartBtn.addEventListener('click', () => {
  initAudio();
  restartBtn.blur();
  init();
});

menuBtn.addEventListener('click', () => {
  menuBtn.blur();
  showMenu();
});

// una pestaña oculta no debe consumir el tiempo de un desafío
document.addEventListener('visibilitychange', () => {
  if (document.hidden && challenge && !paused) togglePause();
});

drawGrid();
showMenu();
