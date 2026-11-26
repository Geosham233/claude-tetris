'use strict';

// Habilidades cargables: la energía se llena limpiando líneas y se gasta entera al usar una.
// Este archivo usa el estado y las funciones de game.js, que se carga después.
const ENERGY_MAX = 6;       // líneas necesarias para llenar la barra
const PEEK_COUNT = 5;       // piezas que revela la visión
const SLOW_DURATION = 10000; // ms
const SLOW_FACTOR = 0.4;    // velocidad del juego mientras está ralentizado

// `canUse` indica si la habilidad tendría efecto ahora mismo
const ABILITIES = [
  {
    name: 'Visión',
    description: `Ve las siguientes ${PEEK_COUNT} piezas`,
    canUse: () => true,
    use() {
      peekRemaining = PEEK_COUNT;
    },
  },
  {
    name: 'Intercambio',
    description: 'Cambia la pieza actual por otra al azar',
    canUse: () => swapCandidates().length > 0,
    use() {
      const candidates = swapCandidates();
      replaceCurrent(candidates[Math.floor(Math.random() * candidates.length)]);
    },
  },
  {
    name: 'Cámara lenta',
    description: `Ralentiza el tiempo ${SLOW_DURATION / 1000} s`,
    canUse: () => true,
    use() {
      slowRemaining = SLOW_DURATION;
    },
  },
  {
    name: 'Deshacer',
    description: 'Revierte la última colocación',
    canUse: () => undoSnapshot !== null,
    use: undoPlacement,
  },
  {
    name: 'Reservar',
    description: 'Guarda la pieza actual o la cambia por la reservada',
    canUse: () => fits(createPiece(heldType ?? queue[0].type)),
    use() {
      const type = current.type;
      if (heldType === null) spawn();
      else replaceCurrent(createPiece(heldType));
      heldType = type;
    },
  },
];

function fits(piece) {
  return !collide(piece.shape, piece.x, piece.y);
}

// Piezas del pool normal, distintas de la actual, que caben en la zona de salida
function swapCandidates() {
  return [...BASE_TYPES, ...PENTOMINO_TYPES]
    .filter(type => type !== current.type)
    .map(createPiece)
    .filter(fits);
}

function replaceCurrent(piece) {
  current = piece;
  lastActionRotation = false;
}

// Estado previo a fijar la pieza actual
function takeSnapshot() {
  return {
    board: board.map(row => [...row]),
    type: current.type,
    queue: [...queue],
    score: spawnScore, // sin los puntos de bajada de la pieza que se deshace
    lines, level, dropInterval, combo, b2bActive,
    linesSincePowerUp, powerUpPending, singlesPending,
    peekRemaining, freezeRemaining,
  };
}

function undoPlacement() {
  const { type, ...state } = undoSnapshot;
  ({
    board, queue, score, lines, level, dropInterval, combo, b2bActive,
    linesSincePowerUp, powerUpPending, singlesPending,
    peekRemaining, freezeRemaining,
  } = state);
  spawnScore = score;
  replaceCurrent(createPiece(type));
  undoSnapshot = null;
  // sin efectos de la jugada deshecha
  explosion = lightningEffect = inkEffect = gravityEffect = popup = lockFade = null;
}

function gainEnergy(cleared) {
  energy = Math.min(ENERGY_MAX, energy + cleared);
}

function openAbilityMenu() {
  if (inMenu || paused || gameOver || choosingAbility || energy < ENERGY_MAX) return;
  choosingAbility = true;
  cancelAnimationFrame(animId);
  renderAbilityList();
  showOverlay('HABILIDAD', 'Elige con 1-5 · Esc para cancelar', { abilities: true });
}

function closeAbilityMenu() {
  choosingAbility = false;
  overlay.classList.add('hidden');
  drawPreviews();
  updateHUD();
  lastTime = performance.now();
  loop(lastTime);
}

function useAbility(index) {
  const ability = ABILITIES[index];
  if (!choosingAbility || !ability?.canUse()) return;
  ability.use();
  energy = 0;
  dropAccum = 0;
  closeAbilityMenu();
}

function renderAbilityList() {
  abilityListEl.replaceChildren(...ABILITIES.map((ability, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'level-btn';
    button.disabled = !ability.canUse();
    const title = document.createElement('strong');
    title.textContent = `${i + 1}. ${ability.name}`;
    const detail = document.createElement('span');
    detail.textContent = ability.description;
    button.append(title, detail);
    button.addEventListener('click', () => {
      button.blur();
      useAbility(i);
    });
    return button;
  }));
}

function handleAbilityKey(e) {
  if (e.code === 'Escape' || (e.code === 'KeyE' && !e.repeat)) {
    closeAbilityMenu();
    return;
  }
  const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
  if (digit) useAbility(Number(digit[1]) - 1);
}
