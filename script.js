const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const hintEl = document.getElementById('hint');

const CELL = 20;
const COLS = canvas.width / CELL;
const ROWS = canvas.height / CELL;

const COLORS = {
  tileA: '#12231a',
  tileB: '#143025',
  head: '#b5f5c4',
  body: '#7be495',
  food: '#f2c94c',
  overlay: 'rgba(13, 23, 18, 0.78)',
  text: '#e8f3ea'
};

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

let snake, dir, nextDir, food, score, best, timer;
let state = 'ready'; // ready, running, paused, over

best = loadBest();
bestEl.textContent = best;

function loadBest() {
  try {
    return Number(localStorage.getItem('snake-best')) || 0;
  } catch (error) {
    return 0;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem('snake-best', String(value));
  } catch (error) {
    // Storage can be blocked; the game still works without it.
  }
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function placeFood() {
  let spot;
  do {
    spot = { x: randomInt(COLS), y: randomInt(ROWS) };
  } while (snake.some((part) => part.x === spot.x && part.y === spot.y));
  return spot;
}

function setHint(text) {
  hintEl.textContent = text;
}

function reset() {
  clearTimeout(timer);
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  dir = DIRS.right;
  nextDir = DIRS.right;
  score = 0;
  scoreEl.textContent = score;
  food = placeFood();
  state = 'ready';
  setHint('Press an arrow key or W, A, S, D to start. Space pauses.');
  draw();
}

function delay() {
  // The game gets faster as the score grows, down to a minimum.
  return Math.max(60, 140 - score * 4);
}

function start() {
  if (state !== 'ready') return;
  state = 'running';
  setHint('');
  timer = setTimeout(tick, delay());
}

function togglePause() {
  if (state === 'running') {
    state = 'paused';
    clearTimeout(timer);
    setHint('Paused. Press Space to continue.');
    draw();
  } else if (state === 'paused') {
    state = 'running';
    setHint('');
    timer = setTimeout(tick, delay());
  }
}

function tick() {
  if (state !== 'running') return;
  step();
  draw();
  if (state === 'running') {
    timer = setTimeout(tick, delay());
  }
}

function step() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  const eating = head.x === food.x && head.y === food.y;

  // When not eating, the tail moves away, so its cell is free.
  const body = eating ? snake : snake.slice(0, -1);
  const hitWall = head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS;
  const hitSelf = body.some((part) => part.x === head.x && part.y === head.y);

  if (hitWall || hitSelf) {
    gameOver();
    return;
  }

  snake.unshift(head);

  if (eating) {
    score += 1;
    scoreEl.textContent = score;
    food = placeFood();
  } else {
    snake.pop();
  }
}

function gameOver() {
  state = 'over';
  clearTimeout(timer);
  if (score > best) {
    best = score;
    bestEl.textContent = best;
    saveBest(best);
  }
  setHint('Press Space or Enter, or tap New game, to play again.');
}

function setDirection(name) {
  const wanted = DIRS[name];
  if (!wanted) return;

  if (state === 'over') return;

  // Ignore a direct reversal of the way the snake last moved.
  if (wanted.x === -dir.x && wanted.y === -dir.y) return;

  nextDir = wanted;
  if (state === 'ready') start();
}

function drawBoard() {
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.tileA : COLORS.tileB;
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
}

function drawFood() {
  ctx.fillStyle = COLORS.food;
  ctx.beginPath();
  ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawSnake() {
  snake.forEach((part, index) => {
    ctx.fillStyle = index === 0 ? COLORS.head : COLORS.body;
    ctx.fillRect(part.x * CELL + 1, part.y * CELL + 1, CELL - 2, CELL - 2);
  });
}

function drawOverlay(title, subtitle) {
  ctx.fillStyle = COLORS.overlay;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 6);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 26);
}

function draw() {
  drawBoard();
  drawFood();
  drawSnake();

  if (state === 'paused') drawOverlay('Paused', 'Press Space to continue');
  if (state === 'over') drawOverlay('Game over', 'Score: ' + score);
}

// Keyboard
const KEY_MAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right'
};

document.addEventListener('keydown', (event) => {
  const name = KEY_MAP[event.code];

  if (name) {
    event.preventDefault();
    setDirection(name);
    return;
  }

  if (event.code === 'Space') {
    event.preventDefault();
    if (state === 'over') {
      reset();
      start();
    } else {
      togglePause();
    }
  }

  if (event.code === 'Enter' && state === 'over') {
    reset();
  }
});

// On-screen buttons (shown on touch screens)
document.querySelectorAll('.pad button').forEach((button) => {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    setDirection(button.dataset.dir);
  });
});

document.getElementById('restart').addEventListener('click', reset);

reset();
