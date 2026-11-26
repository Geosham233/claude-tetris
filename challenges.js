'use strict';

// Niveles del modo desafío. Los tiempos van en ms.
const CHALLENGES = [
  {
    id: 'sprint',
    name: 'Contrarreloj',
    description: 'Limpia 40 líneas en 2 minutos',
    targetLines: 40,
    timeLimit: 120000,
  },
  {
    id: 'garbage',
    name: 'Basura',
    description: 'Sobrevive 2 minutos: sube basura cada 10 s',
    surviveTime: 120000,
    garbageInterval: 10000,
  },
  {
    id: 'fixed',
    name: 'Bloques fijos',
    description: 'Limpia 10 líneas en un tablero pre-colocado',
    targetLines: 10,
    // filas inferiores del tablero; '#' es un bloque fijo
    layout: [
      '#........#',
      '..........',
      '...#..#...',
      '..........',
      '.#......#.',
      '..........',
      '##..##..##',
    ],
  },
  {
    id: 'invisible',
    name: 'Invisibles',
    description: 'Limpia 10 líneas: las piezas desaparecen al fijarse',
    targetLines: 10,
    invisible: true,
  },
  {
    id: 'inverse',
    name: 'Rotación inversa',
    description: 'Limpia 15 líneas a alta velocidad girando al revés',
    targetLines: 15,
    startLevel: 7,
    inverseRotation: true,
  },
];

const CHALLENGES_KEY = 'tetris-challenges';

// Ids de los desafíos superados
function loadCompletedChallenges() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHALLENGES_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveCompletedChallenge(id) {
  const completed = loadCompletedChallenges();
  if (!completed.includes(id)) {
    localStorage.setItem(CHALLENGES_KEY, JSON.stringify([...completed, id]));
  }
}
