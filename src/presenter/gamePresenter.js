import {
  hideScreen,
  showPausePopup,
  showReadyPopup,
  showResultScreen,
  showTitleScreen,
} from '../screenNavigation.js';
import { GameModel } from '../model/gameModel.js';
import { GameView } from '../view/gameView.js';

export class GamePresenter {
  constructor({ model = new GameModel(), view = new GameView() } = {}) {
    this.model = model;
    this.view = view;
    this.animationId = null;
    this.previousStatus = this.model.gameState.status;
    this.resultScreenVisible = false;
    this.isCountdownActive = false;
    this.countdownTimeoutId = null;
    this.readyPopupVisible = false;
    this.pausePopupVisible = false;

    this.gameLoop = this.gameLoop.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.resumeFromReady = this.resumeFromReady.bind(this);
    this.resumeFromPause = this.resumeFromPause.bind(this);
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
      if (status === 'gameOver' && this.previousStatus !== 'gameOver') {
        this.presentResultScreen();
      } else if (status === 'ready') {
        this.presentReadyPopup();
      } else if (status === 'paused') {
        this.presentPausePopup();
      } else if (status === 'running' || status === 'idle') {
        this.hidePopups();
      }
      this.previousStatus = status;
    }
  }

  hidePopups() {
    if (!this.readyPopupVisible && !this.pausePopupVisible) {
      return;
    }
    hideScreen();
    this.readyPopupVisible = false;
    this.pausePopupVisible = false;
  }

  clearOverlay({ resetResult = false } = {}) {
    hideScreen();
    if (resetResult) {
      this.resultScreenVisible = false;
    }
    this.readyPopupVisible = false;
    this.pausePopupVisible = false;
  }

  presentReadyPopup() {
    if (
      this.isCountdownActive ||
      this.readyPopupVisible ||
      this.model.gameState.status !== 'ready' ||
      this.resultScreenVisible
    ) {
      return;
    }

    this.readyPopupVisible = true;
    this.pausePopupVisible = false;
    showReadyPopup({
      message: this.model.gameState.message,
      onResume: this.resumeFromReady,
    }).catch((error) => {
      console.error('Failed to show ready popup', error);
      this.readyPopupVisible = false;
    });
  }

  presentPausePopup() {
    if (this.pausePopupVisible || this.model.gameState.status !== 'paused' || this.resultScreenVisible) {
      return;
    }

    this.pausePopupVisible = true;
    this.readyPopupVisible = false;
    showPausePopup({
      message: this.model.gameState.message,
      onResume: this.resumeFromPause,
    }).catch((error) => {
      console.error('Failed to show pause popup', error);
      this.pausePopupVisible = false;
    });
  }

  resumeFromReady() {
    if (this.isCountdownActive) {
      return;
    }

    this.hidePopups();
    const launched = this.model.launchBall();
    if (launched) {
      this.view.render(this.model);
      this.syncView(true);
    }
  }

  resumeFromPause() {
    if (this.model.gameState.status !== 'paused') {
      return;
    }

    this.hidePopups();
    this.model.resumeGame();
    this.view.render(this.model);
    this.syncView(true);
  }

  cancelCountdown() {
    if (this.countdownTimeoutId !== null) {
      window.clearTimeout(this.countdownTimeoutId);
      this.countdownTimeoutId = null;
    }
    this.isCountdownActive = false;
  }

  startInitialCountdown(seconds = 3) {
    this.cancelCountdown();
    this.isCountdownActive = true;

    let remaining = seconds;
    const tick = () => {
      if (!this.isCountdownActive) {
        return;
      }

      if (remaining > 0) {
        this.model.setStatus('ready', String(remaining));
        this.view.render(this.model);
        this.syncView(true);
        remaining -= 1;
        this.countdownTimeoutId = window.setTimeout(tick, 1000);
      } else {
        this.isCountdownActive = false;
        this.countdownTimeoutId = null;
        this.model.launchBall();
        this.view.render(this.model);
        this.syncView(true);
      }
    };

    tick();
  }

  presentResultScreen() {
    if (this.resultScreenVisible) {
      return;
    }

    this.hidePopups();
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
    this.cancelCountdown();
    this.readyPopupVisible = false;
    this.pausePopupVisible = false;
    this.model.prepareTitleState();
    this.view.render(this.model);
    this.syncView(true);
    showTitleScreen({ onStart: () => this.startGameFromTitle() });
  }

  startGameFromTitle() {
    this.clearOverlay({ resetResult: true });
    this.model.startNewGame();
    this.startInitialCountdown();
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
      if (this.isCountdownActive) {
        return;
      }
      const { status } = this.model.gameState;
      if (status === 'running') {
        this.model.pauseGame();
        this.syncView(true);
      } else if (status === 'paused') {
        this.resumeFromPause();
      } else if (status === 'ready') {
        this.resumeFromReady();
      } else if (status === 'idle') {
        this.startGameFromTitle();
      } else if (status === 'gameOver') {
        this.startGameFromTitle();
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
