const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const scoreLabel = document.getElementById('score');
const highScoreLabel = document.getElementById('highScore');
const levelLabel = document.getElementById('level');
const livesLabel = document.getElementById('lives');

const BASE_WIDTH = 480;
const BASE_HEIGHT = 640;
const BRICK_COLUMNS = 8;
const BRICK_MARGIN = 8;
const BRICK_HEIGHT = 22;
const INITIAL_LIVES = 3;
const STORAGE_KEY = 'blockBreakerHighScore';

const paddle = {
  width: BASE_WIDTH * 0.22,
  height: 14,
  x: (BASE_WIDTH - BASE_WIDTH * 0.22) / 2,
  y: BASE_HEIGHT - 60,
  speed: 8,
};

const ball = {
  radius: 8,
  x: BASE_WIDTH / 2,
  y: BASE_HEIGHT - 80,
  dx: 0,
  dy: 0,
  speed: 5,
  powerUpActive: false,
};

const input = {
  left: false,
  right: false,
};

let bricks = [];

const gameState = {
  status: 'idle',
  score: 0,
  level: 1,
  lives: INITIAL_LIVES,
  highScore: loadHighScore(),
  message: 'スタートボタンでゲーム開始！',
  animationId: null,
  bricksBrokenSincePowerUp: 0,
  powerUpTutorialShown: false,
  powerUpTutorialVisibleUntil: 0,
};

function resetPowerUpProgress() {
  gameState.bricksBrokenSincePowerUp = 0;
  deactivatePowerUp();
}

function showPowerUpTutorial() {
  if (gameState.powerUpTutorialShown) {
    return;
  }

  gameState.powerUpTutorialShown = true;
  gameState.powerUpTutorialVisibleUntil = performance.now() + 10000;
}

function activatePowerUp() {
  ball.powerUpActive = true;
  gameState.bricksBrokenSincePowerUp = 0;
  showPowerUpTutorial();
}

function deactivatePowerUp() {
  if (!ball.powerUpActive) {
    return;
  }

  ball.powerUpActive = false;
}

function loadHighScore() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : 0;
  } catch (error) {
    return 0;
  }
}

function saveHighScore(value) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch (error) {
    // Ignore persistence errors (e.g. Safari private mode)
  }
}

function setupCanvas() {
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = BASE_WIDTH * pixelRatio;
  canvas.height = BASE_HEIGHT * pixelRatio;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function roundedRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setStatus(newStatus, message = null) {
  gameState.status = newStatus;
  if (typeof message === 'string') {
    gameState.message = message;
  }
  updateStartButtonLabel();
}

function updateStartButtonLabel() {
  let label = 'スタート';
  if (gameState.status === 'running') {
    label = '一時停止';
  } else if (gameState.status === 'paused') {
    label = '再開';
  } else if (gameState.status === 'gameOver') {
    label = 'リスタート';
  }
  startButton.textContent = label;
}

function updateHud() {
  scoreLabel.textContent = gameState.score;
  highScoreLabel.textContent = gameState.highScore;
  levelLabel.textContent = gameState.level;
  livesLabel.textContent = gameState.lives;
}

function updateScore(diff) {
  gameState.score = Math.max(gameState.score + diff, 0);
  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    saveHighScore(gameState.highScore);
  }
  updateHud();
}

function resetPaddle() {
  const maxWidth = BASE_WIDTH * 0.26;
  const minWidth = BASE_WIDTH * 0.16;
  const widthReduction = (gameState.level - 1) * 12;
  paddle.width = clamp(maxWidth - widthReduction, minWidth, maxWidth);
  paddle.x = (BASE_WIDTH - paddle.width) / 2;
  paddle.y = BASE_HEIGHT - 60;
  paddle.speed = 8 + Math.min(gameState.level - 1, 6);
}

function placeBallAbovePaddle() {
  ball.x = paddle.x + paddle.width / 2;
  ball.y = paddle.y - ball.radius - 4;
  ball.dx = 0;
  ball.dy = 0;
}

function setBallSpeedForLevel() {
  ball.speed = 4.5 + (gameState.level - 1) * 0.6;
  ball.speed = Math.min(ball.speed, 9);
}

function buildBricksForLevel(level) {
  bricks = [];
  const baseRows = 4;
  const maxAdditionalRows = 5;
  const rows = Math.min(baseRows + level - 1, baseRows + maxAdditionalRows);
  const durability = Math.min(1 + Math.floor((level - 1) / 2), 3);
  const totalMarginX = BRICK_MARGIN * (BRICK_COLUMNS + 1);
  const brickWidth = (BASE_WIDTH - totalMarginX) / BRICK_COLUMNS;
  const offsetTop = 70;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < BRICK_COLUMNS; col += 1) {
      const strength = clamp(durability - Math.floor(row / 3), 1, 3);
      bricks.push({
        x: BRICK_MARGIN + col * (brickWidth + BRICK_MARGIN),
        y: offsetTop + row * (BRICK_HEIGHT + BRICK_MARGIN),
        width: brickWidth,
        height: BRICK_HEIGHT,
        status: strength,
        hue: 200 + row * 14 + level * 4,
      });
    }
  }
}

function prepareLevel({ announce = true, message } = {}) {
  resetPaddle();
  setBallSpeedForLevel();
  buildBricksForLevel(gameState.level);
  placeBallAbovePaddle();
  resetPowerUpProgress();
  if (announce) {
    setStatus(
      'ready',
      message ?? `レベル${gameState.level} スタート準備完了！スペースキーまたはボタンで開始`,
    );
  }
}

function launchBall() {
  if (gameState.status !== 'ready' && gameState.status !== 'idle') {
    return;
  }

  setBallSpeedForLevel();
  const minAngle = Math.PI / 6;
  const maxAngle = (5 * Math.PI) / 12;
  const angle = minAngle + Math.random() * (maxAngle - minAngle);
  const horizontalDirection = Math.random() < 0.5 ? -1 : 1;
  ball.dx = Math.cos(angle) * ball.speed * horizontalDirection;
  ball.dy = -Math.sin(angle) * ball.speed;
  setStatus('running', '');
}

function resumeGame() {
  if (gameState.status === 'paused') {
    setStatus('running', '');
  }
}

function pauseGame() {
  if (gameState.status === 'running') {
    setStatus('paused', '一時停止中… スペースキーまたはボタンで再開');
  }
}

function startNewGame() {
  gameState.score = 0;
  gameState.level = 1;
  gameState.lives = INITIAL_LIVES;
  gameState.message = '';
  updateHud();
  prepareLevel();
}

function handleLifeLost() {
  if (gameState.status !== 'running') {
    return;
  }

  gameState.lives -= 1;
  updateHud();
  resetPowerUpProgress();

  if (gameState.lives > 0) {
    setStatus('ready', `残りライフ ${gameState.lives}！スペースキーまたはボタンで再開`);
    resetPaddle();
    placeBallAbovePaddle();
  } else {
    setStatus('gameOver', 'ゲームオーバー… スタートで再挑戦');
    resetPaddle();
    placeBallAbovePaddle();
  }
}

function handleLevelClear() {
  if (gameState.status !== 'running') {
    return;
  }

  updateScore(150);
  gameState.level += 1;
  const gainedLife = (gameState.level - 1) % 3 === 0;

  if (gainedLife) {
    gameState.lives += 1;
  }

  updateHud();
  resetPowerUpProgress();
  prepareLevel({
    message: gainedLife
      ? `レベル${gameState.level} スタート準備完了！ライフが1つ増えました`
      : undefined,
  });
}

function updateBallSpeedAfterHit() {
  const currentSpeed = Math.max(Math.hypot(ball.dx, ball.dy), 0.0001);
  const target = Math.min(currentSpeed * 1.03, 7.5 + gameState.level * 0.6);
  const scale = target / currentSpeed;
  ball.dx *= scale;
  ball.dy *= scale;
  ball.speed = target;
}

function moveBall() {
  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.x + ball.radius > BASE_WIDTH || ball.x - ball.radius < 0) {
    ball.dx = -ball.dx;
    ball.x = clamp(ball.x, ball.radius, BASE_WIDTH - ball.radius);
  }

  if (ball.y - ball.radius < 0) {
    ball.dy = -ball.dy;
    ball.y = ball.radius;
    deactivatePowerUp();
  }

  const hitsPaddleVertically =
    ball.y + ball.radius >= paddle.y && ball.y - ball.radius <= paddle.y + paddle.height;

  if (hitsPaddleVertically && ball.x >= paddle.x && ball.x <= paddle.x + paddle.width) {
    const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    const maxBounce = (5 * Math.PI) / 12;
    const bounceAngle = hitPos * maxBounce;
    const speed = Math.max(Math.hypot(ball.dx, ball.dy), ball.speed);
    ball.dx = speed * Math.sin(bounceAngle);
    ball.dy = -Math.abs(speed * Math.cos(bounceAngle));
    ball.y = paddle.y - ball.radius - 1;
  }

  if (ball.y - ball.radius > BASE_HEIGHT) {
    handleLifeLost();
  }
}

function checkBrickCollisions() {
  let destroyedAny = false;
  for (const brick of bricks) {
    if (brick.status <= 0) {
      continue;
    }

    const overlapsX = ball.x + ball.radius > brick.x && ball.x - ball.radius < brick.x + brick.width;
    const overlapsY = ball.y + ball.radius > brick.y && ball.y - ball.radius < brick.y + brick.height;

    if (!overlapsX || !overlapsY) {
      continue;
    }

    brick.status -= 1;
    updateScore(10 + (gameState.level - 1) * 2);

    const overlapLeft = ball.x + ball.radius - brick.x;
    const overlapRight = brick.x + brick.width - (ball.x - ball.radius);
    const overlapTop = ball.y + ball.radius - brick.y;
    const overlapBottom = brick.y + brick.height - (ball.y - ball.radius);
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (brick.status <= 0) {
      destroyedAny = true;
      if (!ball.powerUpActive) {
        gameState.bricksBrokenSincePowerUp += 1;
        if (gameState.bricksBrokenSincePowerUp >= 5) {
          activatePowerUp();
        }
      }
    }

    if (!ball.powerUpActive) {
      if (minOverlap === overlapLeft || minOverlap === overlapRight) {
        ball.dx = -ball.dx;
      } else {
        ball.dy = -ball.dy;
      }

      updateBallSpeedAfterHit();
      if (!bricks.some((b) => b.status > 0)) {
        handleLevelClear();
      }
      return;
    }
  }

  if (destroyedAny && !bricks.some((b) => b.status > 0)) {
    handleLevelClear();
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, BASE_WIDTH, BASE_HEIGHT);
  gradient.addColorStop(0, 'rgba(14, 165, 233, 0.18)');
  gradient.addColorStop(1, 'rgba(30, 64, 175, 0.08)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
}

function drawPaddle() {
  ctx.fillStyle = '#38bdf8';
  roundedRectPath(paddle.x, paddle.y, paddle.width, paddle.height, 8);
  ctx.fill();
}

function drawBall() {
  ctx.save();
  const gradient = ctx.createRadialGradient(ball.x, ball.y, 2, ball.x, ball.y, ball.radius + 5);
  gradient.addColorStop(0, '#f8fafc');
  gradient.addColorStop(1, '#f97316');

  if (ball.powerUpActive) {
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 120);
    ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
    ctx.shadowBlur = 24 + pulse * 8;
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius + 3 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'lighter';
    const aura = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius + 10);
    aura.addColorStop(0, 'rgba(253, 230, 138, 0.9)');
    aura.addColorStop(1, 'rgba(251, 146, 60, 0.1)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius + 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBricks() {
  bricks.forEach((brick) => {
    if (brick.status <= 0) {
      return;
    }

    const brightness = 60 + brick.status * 6;
    const gradient = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
    gradient.addColorStop(0, `hsl(${brick.hue}, 85%, ${brightness + 12}%)`);
    gradient.addColorStop(1, `hsl(${brick.hue + 16}, 70%, ${brightness}%)`);
    ctx.fillStyle = gradient;
    roundedRectPath(brick.x, brick.y, brick.width, brick.height, 6);
    ctx.fill();
  });
}

function wrapText(message, maxWidth) {
  ctx.font = '18px "Segoe UI", sans-serif';
  const lines = [];
  let currentLine = '';

  for (const char of message) {
    const testLine = currentLine + char;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = char === ' ' ? '' : char;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function drawMessage() {
  if (!gameState.message) {
    return;
  }

  ctx.save();
  const lines = wrapText(gameState.message, 260);
  const lineHeight = 26;
  const boxWidth = 320;
  const boxHeight = lines.length * lineHeight + 28;
  const boxX = BASE_WIDTH / 2 - boxWidth / 2;
  const boxY = BASE_HEIGHT / 2 - boxHeight / 2;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  roundedRectPath(boxX, boxY, boxWidth, boxHeight, 16);
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '18px "Segoe UI", sans-serif';

  lines.forEach((line, index) => {
    const textY = boxY + 14 + index * lineHeight + lineHeight / 2;
    ctx.fillText(line, BASE_WIDTH / 2, textY);
  });

  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  drawBackground();
  drawBricks();
  drawPaddle();
  drawBall();
  drawMessage();
  drawPowerUpTutorial();
}

function drawPowerUpTutorial() {
  if (!gameState.powerUpTutorialVisibleUntil) {
    return;
  }

  const now = performance.now();
  if (now > gameState.powerUpTutorialVisibleUntil) {
    gameState.powerUpTutorialVisibleUntil = 0;
    return;
  }

  ctx.save();
  const remaining = gameState.powerUpTutorialVisibleUntil - now;
  const fade = remaining < 1200 ? remaining / 1200 : 1;
  ctx.globalAlpha = 0.8 * fade;
  const boxWidth = 360;
  const boxHeight = 70;
  const boxX = BASE_WIDTH / 2 - boxWidth / 2;
  const boxY = BASE_HEIGHT * 0.32;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  roundedRectPath(boxX, boxY, boxWidth, boxHeight, 18);
  ctx.fill();

  ctx.globalAlpha = fade;
  ctx.fillStyle = '#fef3c7';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '16px "Segoe UI", sans-serif';
  ctx.fillText('パワーアップ弾でブロックを貫通！上面に当たると解除されます。', BASE_WIDTH / 2, boxY + boxHeight / 2);
  ctx.restore();
}

function updatePaddleFromInput() {
  if (input.left && !input.right) {
    paddle.x -= paddle.speed;
  } else if (input.right && !input.left) {
    paddle.x += paddle.speed;
  }

  paddle.x = clamp(paddle.x, 0, BASE_WIDTH - paddle.width);
}

function gameLoop() {
  updatePaddleFromInput();

  if (gameState.status === 'ready') {
    placeBallAbovePaddle();
  }

  if (gameState.status === 'running') {
    moveBall();
    checkBrickCollisions();
  }

  draw();
  gameState.animationId = requestAnimationFrame(gameLoop);
}

function handlePointer(clientX) {
  const rect = canvas.getBoundingClientRect();
  const scale = BASE_WIDTH / rect.width;
  const position = (clientX - rect.left) * scale - paddle.width / 2;
  paddle.x = clamp(position, 0, BASE_WIDTH - paddle.width);
}

canvas.addEventListener('mousemove', (event) => {
  handlePointer(event.clientX);
});

canvas.addEventListener(
  'touchstart',
  (event) => {
    if (event.touches.length > 0) {
      handlePointer(event.touches[0].clientX);
    }
  },
  { passive: true },
);

canvas.addEventListener(
  'touchmove',
  (event) => {
    if (event.touches.length > 0) {
      event.preventDefault();
      handlePointer(event.touches[0].clientX);
    }
  },
  { passive: false },
);

startButton.addEventListener('click', () => {
  if (gameState.status === 'idle') {
    startNewGame();
    launchBall();
    return;
  }

  if (gameState.status === 'gameOver') {
    startNewGame();
    launchBall();
    return;
  }

  if (gameState.status === 'ready') {
    launchBall();
    return;
  }

  if (gameState.status === 'running') {
    pauseGame();
    return;
  }

  if (gameState.status === 'paused') {
    resumeGame();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'a') {
    input.left = true;
    event.preventDefault();
  } else if (event.key === 'ArrowRight' || event.key === 'd') {
    input.right = true;
    event.preventDefault();
  } else if (event.key === ' ') {
    event.preventDefault();
    if (gameState.status === 'running') {
      pauseGame();
    } else if (gameState.status === 'paused') {
      resumeGame();
    } else if (gameState.status === 'ready') {
      launchBall();
    } else if (gameState.status === 'idle') {
      startNewGame();
      launchBall();
    } else if (gameState.status === 'gameOver') {
      startNewGame();
      launchBall();
    }
  }
});

document.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'a') {
    input.left = false;
    event.preventDefault();
  } else if (event.key === 'ArrowRight' || event.key === 'd') {
    input.right = false;
    event.preventDefault();
  }
});

window.addEventListener('resize', () => {
  setupCanvas();
  draw();
});

setupCanvas();
prepareLevel({ announce: false });
setStatus('idle', 'スタートボタンでゲーム開始！');
updateHud();
draw();
requestAnimationFrame(gameLoop);
