import { hideScreen, showResultScreen, showTitleScreen } from '../screenNavigation.js';
import { GameModel } from '../model/gameModel.js';
import { GameView } from '../view/gameView.js';

export class GamePresenter {
  constructor({ model = new GameModel(), view = new GameView() } = {}) {
    this.model = model;
    this.view = view;
    this.animationId = null;
    this.previousStatus = this.model.gameState.status;
    this.resultScreenVisible = false;

    this.gameLoop = this.gameLoop.bind(this);
    this.handleStartButtonClick = this.handleStartButtonClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  initialize() {
    const { BASE_WIDTH, BASE_HEIGHT } = this.model.constants;
    this.view.setupCanvas(BASE_WIDTH, BASE_HEIGHT);
    this.registerEvents();
    this.showTitleAfterReset();
    this.startLoop();
  }

  startLoop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  registerEvents() {
    const startButton = this.view.getStartButton();
    if (startButton) {
      startButton.addEventListener('click', this.handleStartButtonClick);
    }

    const canvas = this.view.getCanvas();
    const touchControl = this.view.getTouchControl();
    if (canvas) {
      canvas.addEventListener('mousemove', this.handleMouseMove);
    }

    if (touchControl) {
      touchControl.addEventListener('touchstart', this.handleTouchStart, { passive: true });
      touchControl.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    } else if (canvas) {
      canvas.addEventListener('touchstart', this.handleTouchStart, { passive: true });
      canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    }

    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);
  }

  gameLoop() {
    this.model.updatePaddleFromInput();

    if (this.model.gameState.status === 'ready') {
      this.model.placeBallAbovePaddle();
    }

    if (this.model.gameState.status === 'running') {
      this.model.moveBall();
      if (this.model.gameState.status === 'running') {
        this.model.checkBrickCollisions();
      }
      this.model.updateBallTrail(true);
    } else {
      this.model.updateBallTrail(false);
    }

    this.model.updatePowerUpTutorialVisibility();
    this.view.render(this.model);
    this.syncView();

    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  syncView(forceUpdate = false) {
    this.view.updateHud(this.model.gameState);
    const status = this.model.gameState.status;
    if (forceUpdate || status !== this.previousStatus) {
      this.view.updateStartButtonLabel(status);
      if (status === 'gameOver' && this.previousStatus !== 'gameOver') {
        this.presentResultScreen();
      }
      this.previousStatus = status;
    }
  }

  presentResultScreen() {
    if (this.resultScreenVisible) {
      return;
    }

    this.resultScreenVisible = true;
    showResultScreen({
      score: this.model.gameState.score,
      highScore: this.model.gameState.highScore,
      onBackToTitle: () => {
        this.resultScreenVisible = false;
        this.showTitleAfterReset();
      },
    });
  }

  showTitleAfterReset() {
    this.model.prepareTitleState();
    this.view.render(this.model);
    this.syncView(true);
    showTitleScreen({ onStart: () => this.startGameFromTitle() });
  }

  startGameFromTitle() {
    this.startGameFromIdle();
  }

  startGameFromIdle() {
    hideScreen();
    this.resultScreenVisible = false;
    this.model.startNewGame();
    this.view.render(this.model);
    this.syncView(true);
    this.model.launchBall();
    this.view.render(this.model);
    this.syncView(true);
  }

  handleStartButtonClick() {
    const { status } = this.model.gameState;

    if (status === 'idle') {
      this.startGameFromIdle();
      return;
    }

    if (status === 'gameOver') {
      this.startGameFromIdle();
      return;
    }

    if (status === 'ready') {
      this.model.launchBall();
      this.syncView(true);
      return;
    }

    if (status === 'running') {
      this.model.pauseGame();
      this.syncView(true);
      return;
    }

    if (status === 'paused') {
      this.model.resumeGame();
      this.syncView(true);
    }
  }

  handleKeyDown(event) {
    if (event.key === 'ArrowLeft' || event.key === 'a') {
      this.model.setInputDirection('left', true);
      event.preventDefault();
    } else if (event.key === 'ArrowRight' || event.key === 'd') {
      this.model.setInputDirection('right', true);
      event.preventDefault();
    } else if (event.key === ' ') {
      event.preventDefault();
      const { status } = this.model.gameState;
      if (status === 'running') {
        this.model.pauseGame();
        this.syncView(true);
      } else if (status === 'paused') {
        this.model.resumeGame();
        this.syncView(true);
      } else if (status === 'ready') {
        this.model.launchBall();
        this.syncView(true);
      } else if (status === 'idle') {
        this.startGameFromIdle();
      } else if (status === 'gameOver') {
        this.startGameFromIdle();
      }
    }
  }

  handleKeyUp(event) {
    if (event.key === 'ArrowLeft' || event.key === 'a') {
      this.model.setInputDirection('left', false);
      event.preventDefault();
    } else if (event.key === 'ArrowRight' || event.key === 'd') {
      this.model.setInputDirection('right', false);
      event.preventDefault();
    }
  }

  handlePointer(clientX) {
    const x = this.view.toGameX(clientX);
    this.model.movePaddleCenterTo(x);
  }

  handleMouseMove(event) {
    this.handlePointer(event.clientX);
  }

  handleTouchStart(event) {
    if (event.touches.length > 0) {
      this.handlePointer(event.touches[0].clientX);
    }
  }

  handleTouchMove(event) {
    if (event.touches.length > 0) {
      event.preventDefault();
      this.handlePointer(event.touches[0].clientX);
    }
  }

  handleResize() {
    const { BASE_WIDTH, BASE_HEIGHT } = this.model.constants;
    this.view.setupCanvas(BASE_WIDTH, BASE_HEIGHT);
    this.view.render(this.model);
  }
}
