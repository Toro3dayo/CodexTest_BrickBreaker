const BASE_WIDTH = 480;
const BASE_HEIGHT = 640;
const BRICK_COLUMNS = 8;
const BRICK_MARGIN = 8;
const BRICK_HEIGHT = 22;
const INITIAL_LIVES = 3;
const STORAGE_KEY = 'blockBreakerHighScore';
const BALL_TRAIL_MAX_POINTS = 14;
const BALL_TRAIL_LIFETIME = 280;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export class GameModel {
  constructor({ now = () => performance.now() } = {}) {
    this.constants = {
      BASE_WIDTH,
      BASE_HEIGHT,
      BRICK_COLUMNS,
      BRICK_MARGIN,
      BRICK_HEIGHT,
      INITIAL_LIVES,
      BALL_TRAIL_MAX_POINTS,
      BALL_TRAIL_LIFETIME,
    };

    this._now = now;

    this.paddle = {
      width: BASE_WIDTH * 0.22,
      height: 14,
      x: (BASE_WIDTH - BASE_WIDTH * 0.22) / 2,
      y: BASE_HEIGHT - 60,
      speed: 8,
    };

    this.ball = {
      radius: 8,
      x: BASE_WIDTH / 2,
      y: BASE_HEIGHT - 80,
      dx: 0,
      dy: 0,
      speed: 5,
      powerUpActive: false,
      trail: [],
    };

    this.input = {
      left: false,
      right: false,
    };

    this.bricks = [];

    this.gameState = {
      status: 'idle',
      score: 0,
      level: 1,
      lives: INITIAL_LIVES,
      highScore: this.loadHighScore(),
      message: 'スタートボタンでゲーム開始！',
      bricksBrokenSincePowerUp: 0,
      powerUpTutorialShown: false,
      powerUpTutorialVisibleUntil: 0,
    };

    this.prepareLevel({ announce: false });
  }

  loadHighScore() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? Number(stored) : 0;
    } catch (error) {
      return 0;
    }
  }

  saveHighScore(value) {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch (error) {
      // Ignore persistence errors (e.g. Safari private mode)
    }
  }

  setStatus(newStatus, message = null) {
    this.gameState.status = newStatus;
    if (typeof message === 'string') {
      this.gameState.message = message;
    }
  }

  updateScore(diff) {
    this.gameState.score = Math.max(this.gameState.score + diff, 0);
    if (this.gameState.score > this.gameState.highScore) {
      this.gameState.highScore = this.gameState.score;
      this.saveHighScore(this.gameState.highScore);
    }
  }

  resetPaddle() {
    const maxWidth = BASE_WIDTH * 0.26;
    const minWidth = BASE_WIDTH * 0.16;
    const widthReduction = (this.gameState.level - 1) * 12;
    this.paddle.width = clamp(maxWidth - widthReduction, minWidth, maxWidth);
    this.paddle.x = (BASE_WIDTH - this.paddle.width) / 2;
    this.paddle.y = BASE_HEIGHT - 60;
    this.paddle.speed = 8 + Math.min(this.gameState.level - 1, 6);
  }

  clearBallTrail() {
    this.ball.trail = [];
  }

  placeBallAbovePaddle() {
    this.ball.x = this.paddle.x + this.paddle.width / 2;
    this.ball.y = this.paddle.y - this.ball.radius - 4;
    this.ball.dx = 0;
    this.ball.dy = 0;
    this.clearBallTrail();
  }

  setBallSpeedForLevel() {
    this.ball.speed = 4.5 + (this.gameState.level - 1) * 0.6;
    this.ball.speed = Math.min(this.ball.speed, 9);
  }

  buildBricksForLevel(level) {
    this.bricks = [];
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
        this.bricks.push({
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

  prepareLevel({ announce = true, message } = {}) {
    this.resetPaddle();
    this.setBallSpeedForLevel();
    this.buildBricksForLevel(this.gameState.level);
    this.placeBallAbovePaddle();
    this.resetPowerUpProgress();
    if (announce) {
      this.setStatus(
        'ready',
        message ?? `レベル${this.gameState.level} スタート準備完了！スペースキーまたはボタンで開始`,
      );
    }
  }

  launchBall() {
    if (this.gameState.status !== 'ready' && this.gameState.status !== 'idle') {
      return false;
    }

    this.setBallSpeedForLevel();
    const minAngle = Math.PI / 6;
    const maxAngle = (5 * Math.PI) / 12;
    const angle = minAngle + Math.random() * (maxAngle - minAngle);
    const horizontalDirection = Math.random() < 0.5 ? -1 : 1;
    this.ball.dx = Math.cos(angle) * this.ball.speed * horizontalDirection;
    this.ball.dy = -Math.sin(angle) * this.ball.speed;
    this.setStatus('running', '');
    return true;
  }

  resumeGame() {
    if (this.gameState.status === 'paused') {
      this.setStatus('running', '');
    }
  }

  pauseGame() {
    if (this.gameState.status === 'running') {
      this.setStatus('paused', '一時停止中… スペースキーまたはボタンで再開');
    }
  }

  startNewGame() {
    this.gameState.score = 0;
    this.gameState.level = 1;
    this.gameState.lives = INITIAL_LIVES;
    this.gameState.message = '';
    this.prepareLevel();
  }

  prepareTitleState() {
    this.gameState.score = 0;
    this.gameState.level = 1;
    this.gameState.lives = INITIAL_LIVES;
    this.prepareLevel({ announce: false });
    this.setStatus('idle', 'スタートボタンでゲーム開始！');
  }

  handleLifeLost() {
    if (this.gameState.status !== 'running') {
      return { lifeLost: false, gameOver: false };
    }

    this.gameState.lives -= 1;
    this.resetPowerUpProgress();

    if (this.gameState.lives > 0) {
      this.setStatus('ready', `残りライフ ${this.gameState.lives}！スペースキーまたはボタンで再開`);
      this.resetPaddle();
      this.placeBallAbovePaddle();
      return { lifeLost: true, gameOver: false };
    }

    this.setStatus('gameOver', 'ゲームオーバー… スタートで再挑戦');
    this.resetPaddle();
    this.placeBallAbovePaddle();
    return { lifeLost: true, gameOver: true };
  }

  handleLevelClear() {
    if (this.gameState.status !== 'running') {
      return { levelCleared: false, gainedLife: false };
    }

    this.updateScore(150);
    this.gameState.level += 1;
    const gainedLife = (this.gameState.level - 1) % 3 === 0;

    if (gainedLife) {
      this.gameState.lives += 1;
    }

    const message = gainedLife
      ? `レベル${this.gameState.level} スタート準備完了！ライフが1つ増えました`
      : undefined;

    this.prepareLevel({ message });
    return { levelCleared: true, gainedLife };
  }

  updateBallSpeedAfterHit() {
    const currentSpeed = Math.max(Math.hypot(this.ball.dx, this.ball.dy), 0.0001);
    const target = Math.min(currentSpeed * 1.03, 7.5 + this.gameState.level * 0.6);
    const scale = target / currentSpeed;
    this.ball.dx *= scale;
    this.ball.dy *= scale;
    this.ball.speed = target;
  }

  updateBallTrail(shouldRecord) {
    const now = this._now();
    this.ball.trail = this.ball.trail.filter((point) => now - point.timestamp <= BALL_TRAIL_LIFETIME);

    if (!this.ball.powerUpActive) {
      if (this.ball.trail.length) {
        this.clearBallTrail();
      }
      return;
    }

    if (shouldRecord) {
      this.ball.trail.push({ x: this.ball.x, y: this.ball.y, timestamp: now });
      if (this.ball.trail.length > BALL_TRAIL_MAX_POINTS) {
        this.ball.trail.splice(0, this.ball.trail.length - BALL_TRAIL_MAX_POINTS);
      }
    }
  }

  moveBall() {
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    if (this.ball.x + this.ball.radius > BASE_WIDTH || this.ball.x - this.ball.radius < 0) {
      this.ball.dx = -this.ball.dx;
      this.ball.x = clamp(this.ball.x, this.ball.radius, BASE_WIDTH - this.ball.radius);
    }

    if (this.ball.y - this.ball.radius < 0) {
      this.ball.dy = -this.ball.dy;
      this.ball.y = this.ball.radius;
      this.deactivatePowerUp();
    }

    const hitsPaddleVertically =
      this.ball.y + this.ball.radius >= this.paddle.y &&
      this.ball.y - this.ball.radius <= this.paddle.y + this.paddle.height;

    if (hitsPaddleVertically && this.ball.x >= this.paddle.x && this.ball.x <= this.paddle.x + this.paddle.width) {
      const hitPos = (this.ball.x - (this.paddle.x + this.paddle.width / 2)) / (this.paddle.width / 2);
      const maxBounce = (5 * Math.PI) / 12;
      const bounceAngle = hitPos * maxBounce;
      const speed = Math.max(Math.hypot(this.ball.dx, this.ball.dy), this.ball.speed);
      this.ball.dx = speed * Math.sin(bounceAngle);
      this.ball.dy = -Math.abs(speed * Math.cos(bounceAngle));
      this.ball.y = this.paddle.y - this.ball.radius - 1;
    }

    if (this.ball.y - this.ball.radius > BASE_HEIGHT) {
      return this.handleLifeLost();
    }

    return { lifeLost: false, gameOver: false };
  }

  checkBrickCollisions() {
    let destroyedAny = false;

    for (const brick of this.bricks) {
      if (brick.status <= 0) {
        continue;
      }

      const overlapsX =
        this.ball.x + this.ball.radius > brick.x && this.ball.x - this.ball.radius < brick.x + brick.width;
      const overlapsY =
        this.ball.y + this.ball.radius > brick.y && this.ball.y - this.ball.radius < brick.y + brick.height;

      if (!overlapsX || !overlapsY) {
        continue;
      }

      brick.status -= 1;
      destroyedAny = true;
      this.updateScore(10 + (this.gameState.level - 1) * 2);

      const overlapLeft = this.ball.x + this.ball.radius - brick.x;
      const overlapRight = brick.x + brick.width - (this.ball.x - this.ball.radius);
      const overlapTop = this.ball.y + this.ball.radius - brick.y;
      const overlapBottom = brick.y + brick.height - (this.ball.y - this.ball.radius);
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if (brick.status <= 0) {
        if (!this.ball.powerUpActive) {
          this.gameState.bricksBrokenSincePowerUp += 1;
          if (this.gameState.bricksBrokenSincePowerUp >= 5) {
            this.activatePowerUp();
          }
        }
      }

      if (!this.ball.powerUpActive) {
        if (minOverlap === overlapLeft || minOverlap === overlapRight) {
          this.ball.dx = -this.ball.dx;
        } else {
          this.ball.dy = -this.ball.dy;
        }

        this.updateBallSpeedAfterHit();
        if (!this.bricks.some((b) => b.status > 0)) {
          return this.handleLevelClear();
        }
        return { levelCleared: false, gainedLife: false };
      }
    }

    if (destroyedAny && !this.bricks.some((b) => b.status > 0)) {
      return this.handleLevelClear();
    }

    return { levelCleared: false, gainedLife: false };
  }

  updatePaddleFromInput() {
    if (this.input.left && !this.input.right) {
      this.paddle.x -= this.paddle.speed;
    } else if (this.input.right && !this.input.left) {
      this.paddle.x += this.paddle.speed;
    }

    this.paddle.x = clamp(this.paddle.x, 0, BASE_WIDTH - this.paddle.width);
  }

  movePaddleCenterTo(x) {
    const position = x - this.paddle.width / 2;
    this.paddle.x = clamp(position, 0, BASE_WIDTH - this.paddle.width);
  }

  setInputDirection(direction, active) {
    if (direction === 'left') {
      this.input.left = active;
    }
    if (direction === 'right') {
      this.input.right = active;
    }
  }

  resetPowerUpProgress() {
    this.gameState.bricksBrokenSincePowerUp = 0;
    this.deactivatePowerUp();
  }

  showPowerUpTutorial() {
    if (this.gameState.powerUpTutorialShown) {
      return;
    }

    this.gameState.powerUpTutorialShown = true;
    this.gameState.powerUpTutorialVisibleUntil = this._now() + 10000;
  }

  activatePowerUp() {
    this.clearBallTrail();
    this.ball.powerUpActive = true;
    this.gameState.bricksBrokenSincePowerUp = 0;
    this.showPowerUpTutorial();
  }

  deactivatePowerUp() {
    if (!this.ball.powerUpActive) {
      return;
    }

    this.ball.powerUpActive = false;
    this.clearBallTrail();
  }

  updatePowerUpTutorialVisibility(now = this._now()) {
    if (!this.gameState.powerUpTutorialVisibleUntil) {
      return false;
    }

    if (now >= this.gameState.powerUpTutorialVisibleUntil) {
      this.gameState.powerUpTutorialVisibleUntil = 0;
      return false;
    }

    return true;
  }
}
