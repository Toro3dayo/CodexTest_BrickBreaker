function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export class GameView {
  constructor({
    canvasId = 'gameCanvas',
    startButtonId = 'startButton',
    scoreId = 'score',
    highScoreId = 'highScore',
    levelId = 'level',
    livesId = 'lives',
  } = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas?.getContext('2d') ?? null;
    this.startButton = document.getElementById(startButtonId);
    this.touchControl = document.getElementById('touchControl');
    this.scoreLabel = document.getElementById(scoreId);
    this.highScoreLabel = document.getElementById(highScoreId);
    this.levelLabel = document.getElementById(levelId);
    this.livesLabel = document.getElementById(livesId);
    this.baseWidth = 0;
    this.baseHeight = 0;
  }

  getCanvas() {
    return this.canvas;
  }

  getStartButton() {
    return this.startButton;
  }

  setStartButtonVisibility(visible) {
    if (!this.startButton) {
      return;
    }

    if (visible) {
      this.startButton.removeAttribute('hidden');
      this.startButton.style.display = '';
    } else {
      this.startButton.setAttribute('hidden', '');
      this.startButton.style.display = 'none';
    }
  }

  getTouchControl() {
    return this.touchControl;
  }

  setupCanvas(baseWidth, baseHeight) {
    if (!this.canvas || !this.ctx) {
      return;
    }

    this.baseWidth = baseWidth;
    this.baseHeight = baseHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = baseWidth * pixelRatio;
    this.canvas.height = baseHeight * pixelRatio;
    this.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  updateHud(gameState) {
    if (this.scoreLabel) {
      this.scoreLabel.textContent = gameState.score;
    }
    if (this.highScoreLabel) {
      this.highScoreLabel.textContent = gameState.highScore;
    }
    if (this.levelLabel) {
      this.levelLabel.textContent = gameState.level;
    }
    if (this.livesLabel) {
      this.livesLabel.textContent = gameState.lives;
    }
  }

  updateStartButtonLabel(status) {
    if (!this.startButton) {
      return;
    }

    let label = 'スタート';
    if (status === 'running') {
      label = '一時停止';
    } else if (status === 'paused') {
      label = '再開';
    } else if (status === 'gameOver') {
      label = 'リスタート';
    }
    this.startButton.textContent = label;
  }

  toGameX(clientX) {
    if (!this.canvas) {
      return 0;
    }

    const rect = this.canvas.getBoundingClientRect();
    const scale = this.baseWidth / rect.width;
    return (clientX - rect.left) * scale;
  }

  render(model) {
    if (!this.ctx) {
      return;
    }

    const { paddle, ball, bricks, gameState, constants } = model;
    this.ctx.clearRect(0, 0, constants.BASE_WIDTH, constants.BASE_HEIGHT);
    this.drawBackground(constants);
    this.drawBricks(bricks);
    this.drawPaddle(paddle);
    this.drawBallTrail(ball, constants);
    this.drawBall(ball);
    this.drawMessage(gameState, constants);
    this.drawPowerUpTutorial(gameState, constants);
  }

  drawBackground(constants) {
    if (!this.ctx) {
      return;
    }
    const gradient = this.ctx.createLinearGradient(0, 0, constants.BASE_WIDTH, constants.BASE_HEIGHT);
    gradient.addColorStop(0, 'rgba(14, 165, 233, 0.18)');
    gradient.addColorStop(1, 'rgba(30, 64, 175, 0.08)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, constants.BASE_WIDTH, constants.BASE_HEIGHT);
  }

  drawPaddle(paddle) {
    if (!this.ctx) {
      return;
    }
    this.ctx.fillStyle = '#38bdf8';
    this.roundedRectPath(paddle.x, paddle.y, paddle.width, paddle.height, 8);
    this.ctx.fill();
  }

  drawBallTrail(ball, constants) {
    if (!this.ctx) {
      return;
    }

    if (!ball.powerUpActive || !ball.trail.length) {
      return;
    }

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    const now = performance.now();

    for (const point of ball.trail) {
      const age = (now - point.timestamp) / constants.BALL_TRAIL_LIFETIME;
      const visibility = clamp(1 - age, 0, 1);
      if (visibility <= 0) {
        continue;
      }

      const radius = ball.radius * (0.85 + visibility * 0.9);
      const gradient = this.ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius + 6);
      gradient.addColorStop(0, `rgba(248, 250, 252, ${0.32 * visibility})`);
      gradient.addColorStop(1, 'rgba(249, 115, 22, 0)');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, radius + 6, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawBall(ball) {
    if (!this.ctx) {
      return;
    }

    this.ctx.save();
    const gradient = this.ctx.createRadialGradient(ball.x, ball.y, 2, ball.x, ball.y, ball.radius + 5);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#f97316');

    if (ball.powerUpActive) {
      const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 120);
      this.ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
      this.ctx.shadowBlur = 24 + pulse * 8;
      this.ctx.fillStyle = '#fde68a';
      this.ctx.beginPath();
      this.ctx.arc(ball.x, ball.y, ball.radius + 3 + pulse * 2, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.shadowBlur = 0;
      this.ctx.globalCompositeOperation = 'lighter';
      const aura = this.ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius + 10);
      aura.addColorStop(0, 'rgba(253, 230, 138, 0.9)');
      aura.addColorStop(1, 'rgba(251, 146, 60, 0.1)');
      this.ctx.fillStyle = aura;
      this.ctx.beginPath();
      this.ctx.arc(ball.x, ball.y, ball.radius + 10, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalCompositeOperation = 'source-over';
    }

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawBricks(bricks) {
    if (!this.ctx) {
      return;
    }

    bricks.forEach((brick) => {
      if (brick.status <= 0) {
        return;
      }

      const brightness = 60 + brick.status * 6;
      const gradient = this.ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
      gradient.addColorStop(0, `hsl(${brick.hue}, 85%, ${brightness + 12}%)`);
      gradient.addColorStop(1, `hsl(${brick.hue + 16}, 70%, ${brightness}%)`);
      this.ctx.fillStyle = gradient;
      this.roundedRectPath(brick.x, brick.y, brick.width, brick.height, 6);
      this.ctx.fill();
    });
  }

  drawMessage(gameState, constants) {
    if (!this.ctx || !gameState.message) {
      return;
    }

    this.ctx.save();
    const lines = this.wrapText(gameState.message, 260);
    const lineHeight = 26;
    const boxWidth = 320;
    const boxHeight = lines.length * lineHeight + 28;
    const boxX = constants.BASE_WIDTH / 2 - boxWidth / 2;
    const boxY = constants.BASE_HEIGHT / 2 - boxHeight / 2;

    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    this.roundedRectPath(boxX, boxY, boxWidth, boxHeight, 16);
    this.ctx.fill();

    this.ctx.fillStyle = '#f8fafc';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.font = '18px "Segoe UI", sans-serif';

    lines.forEach((line, index) => {
      const textY = boxY + 14 + index * lineHeight + lineHeight / 2;
      this.ctx.fillText(line, constants.BASE_WIDTH / 2, textY);
    });

    this.ctx.restore();
  }

  drawPowerUpTutorial(gameState, constants) {
    if (!this.ctx || !gameState.powerUpTutorialVisibleUntil) {
      return;
    }

    const now = performance.now();
    if (now > gameState.powerUpTutorialVisibleUntil) {
      return;
    }

    this.ctx.save();
    const remaining = gameState.powerUpTutorialVisibleUntil - now;
    const fade = remaining < 1200 ? Math.max(remaining / 1200, 0) : 1;
    this.ctx.globalAlpha = 0.8 * fade;
    const boxWidth = 360;
    const boxHeight = 70;
    const boxX = constants.BASE_WIDTH / 2 - boxWidth / 2;
    const boxY = constants.BASE_HEIGHT * 0.32;
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    this.roundedRectPath(boxX, boxY, boxWidth, boxHeight, 18);
    this.ctx.fill();

    this.ctx.globalAlpha = fade;
    this.ctx.fillStyle = '#fef3c7';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.font = '16px "Segoe UI", sans-serif';
    this.ctx.fillText(
      'パワーアップ弾でブロックを貫通！上面に当たると解除されます。',
      constants.BASE_WIDTH / 2,
      boxY + boxHeight / 2,
    );
    this.ctx.restore();
  }

  roundedRectPath(x, y, width, height, radius) {
    if (!this.ctx) {
      return;
    }

    const r = Math.min(radius, width / 2, height / 2);
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + width - r, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    this.ctx.lineTo(x + width, y + height - r);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    this.ctx.lineTo(x + r, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  wrapText(message, maxWidth) {
    if (!this.ctx) {
      return [];
    }

    this.ctx.font = '18px "Segoe UI", sans-serif';
    const lines = [];
    let currentLine = '';

    for (const char of message) {
      const testLine = currentLine + char;
      if (this.ctx.measureText(testLine).width > maxWidth && currentLine) {
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
}
