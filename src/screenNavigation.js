const screenRoot = document.getElementById('screen-root');

let activeTransitionId = 0;
let cleanupCurrentScreen = null;

function clearCurrentScreen() {
  if (cleanupCurrentScreen) {
    try {
      cleanupCurrentScreen();
    } finally {
      cleanupCurrentScreen = null;
    }
  }
  if (screenRoot) {
    screenRoot.innerHTML = '';
  }
}

function renderLoadingMessage() {
  if (!screenRoot) {
    return;
  }
  clearCurrentScreen();
  const loading = document.createElement('div');
  loading.className = 'screen screen--loading';
  loading.innerHTML = '<p class="screen__message">読み込み中...</p>';
  screenRoot.appendChild(loading);
}

function renderErrorMessage() {
  if (!screenRoot) {
    return;
  }
  clearCurrentScreen();
  const wrapper = document.createElement('div');
  wrapper.className = 'screen';

  const message = document.createElement('p');
  message.className = 'screen__message';
  message.textContent = '画面の読み込みに失敗しました。ページを再読み込みしてください。';

  wrapper.appendChild(message);
  screenRoot.appendChild(wrapper);
}

function renderScreen(screen) {
  if (!screenRoot) {
    return;
  }
  clearCurrentScreen();
  screenRoot.appendChild(screen.element);
  cleanupCurrentScreen = screen.cleanup ?? null;
}

async function transitionTo(loadScreen) {
  activeTransitionId += 1;
  const transitionId = activeTransitionId;

  renderLoadingMessage();

  try {
    const screen = await loadScreen();
    if (transitionId !== activeTransitionId) {
      if (typeof screen.cleanup === 'function') {
        screen.cleanup();
      }
      return;
    }
    renderScreen(screen);
  } catch (error) {
    console.error('Failed to load screen', error);
    if (transitionId !== activeTransitionId) {
      return;
    }
    renderErrorMessage();
  }
}

function hideScreen() {
  activeTransitionId += 1;
  clearCurrentScreen();
}

async function showTitleScreen(options = {}) {
  const { onStart } = options;
  await transitionTo(async () => {
    const module = await import('./screens/titleScreen.js');
    return module.createTitleScreen({ onStart });
  });
}

async function showResultScreen(options = {}) {
  const { score, highScore, onBackToTitle } = options;
  await transitionTo(async () => {
    const module = await import('./screens/resultScreen.js');
    return module.createResultScreen({ score, highScore, onBackToTitle });
  });
}

export { hideScreen, showResultScreen, showTitleScreen };
