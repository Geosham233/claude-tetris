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
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const BOMB_TYPE = 9;
const LIGHTNING_TYPE = 10;
const INK_TYPE = 11;
const GRAVITY_TYPE = 12;
const FREEZE_TYPE = 13;
const POWERUP_LINE_INTERVAL = 10;
const EXPLOSION_RADIUS = 1;     // -> área 3x3
const EXPLOSION_DURATION = 300; // ms de flash visual
const LIGHTNING_DURATION = 300; // ms de flash visual
const INK_DURATION = 300;       // ms de flash visual
const GRAVITY_DURATION = 300;   // ms de flash visual
const FREEZE_DURATION = 5000;   // ms de pausa real de la caída

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggleBtn = document.getElementById('theme-toggle');

const THEME_KEY = 'tetris-theme';

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId,
    linesSincePowerUp, powerUpPending, nextPowerUpType, explosion, lightningEffect, inkEffect,
    gravityEffect, freezeUntil;

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

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  // types 9 (bomb) y 10 (lightning) nunca se generan al azar; se inyectan de forma determinista desde clearLines()/spawn()
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function createPowerUpPiece(type) {
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

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
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
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    linesSincePowerUp += cleared;
    if (!powerUpPending && linesSincePowerUp >= POWERUP_LINE_INTERVAL) {
      powerUpPending = true;
      linesSincePowerUp -= POWERUP_LINE_INTERVAL;
    }
    updateHUD();
  }
}

function triggerExplosion(cx, cy) {
  for (let r = cy - EXPLOSION_RADIUS; r <= cy + EXPLOSION_RADIUS; r++) {
    for (let c = cx - EXPLOSION_RADIUS; c <= cx + EXPLOSION_RADIUS; c++) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      board[r][c] = 0;
    }
  }
  explosion = { x: cx, y: cy, startTime: performance.now() };
}

function triggerLightning(cx, cy) {
  if (cy >= 0 && cy < ROWS) board[cy].fill(0);
  if (cx >= 0 && cx < COLS) for (let r = 0; r < ROWS; r++) board[r][cx] = 0;
  lightningEffect = { x: cx, y: cy, startTime: performance.now() };
}

function triggerInk(cx, cy) {
  const freq = {};
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = board[r][c];
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
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (board[r][c] === targetColor) board[r][c] = INK_TYPE;
  }
  inkEffect = { x: cx, y: cy, startTime: performance.now() };
}

function triggerGravity(cx, cy) {
  for (let c = 0; c < COLS; c++) {
    const colVals = [];
    for (let r = 0; r < ROWS; r++) {
      if (board[r][c]) colVals.push(board[r][c]);
    }
    for (let r = 0; r < ROWS; r++) board[r][c] = 0;
    const start = ROWS - colVals.length;
    for (let i = 0; i < colVals.length; i++) board[start + i][c] = colVals[i];
  }
  gravityEffect = { x: cx, y: cy, startTime: performance.now() };
}

function triggerFreeze(cx, cy) {
  freezeUntil = performance.now() + FREEZE_DURATION;
  dropAccum = 0;
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
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
    merge();
  }
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  if (powerUpPending) {
    next = createPowerUpPiece(nextPowerUpType);
    if (nextPowerUpType === BOMB_TYPE) nextPowerUpType = LIGHTNING_TYPE;
    else if (nextPowerUpType === LIGHTNING_TYPE) nextPowerUpType = INK_TYPE;
    else if (nextPowerUpType === INK_TYPE) nextPowerUpType = GRAVITY_TYPE;
    else if (nextPowerUpType === GRAVITY_TYPE) nextPowerUpType = FREEZE_TYPE;
    else nextPowerUpType = BOMB_TYPE;
    powerUpPending = false;
  } else {
    next = randomPiece();
  }
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
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

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

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

  drawExplosion();
  drawLightningEffect();
  drawInkEffect();
  drawGravityEffect();
  drawFreezeOverlay();
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

function drawLightningEffect() {
  if (!lightningEffect) return;
  const elapsed = performance.now() - lightningEffect.startTime;
  if (elapsed >= LIGHTNING_DURATION) { lightningEffect = null; return; }
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
  if (!freezeUntil) return;
  if (performance.now() >= freezeUntil) { freezeUntil = null; return; }
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#4fc3f7';
  ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
  ctx.globalAlpha = 1;
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  const frozen = freezeUntil && performance.now() < freezeUntil;
  if (freezeUntil && !frozen) freezeUntil = null;
  if (!frozen) {
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }
  if (gameOver) return;
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  linesSincePowerUp = 0;
  powerUpPending = false;
  nextPowerUpType = BOMB_TYPE;
  explosion = null;
  lightningEffect = null;
  inkEffect = null;
  gravityEffect = null;
  freezeUntil = null;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
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

restartBtn.addEventListener('click', init);

init();
