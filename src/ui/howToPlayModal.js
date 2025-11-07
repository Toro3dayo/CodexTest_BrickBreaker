const PAGES = [
  {
    title: '遊び方',
    body: `
      <div class="screen__body">
        <p>
          パドルを左右に動かし、ボールを跳ね返してブロックをすべて壊しましょう。
          レベルが上がるほどブロック数やスピードが増し、難易度も上がります。
        </p>
        <ul>
          <li>PC: マウスまたは左右キーでパドルを操作します。</li>
          <li>スマホ / タブレット: 画面下部のタッチゾーンをスライドして操作します。</li>
          <li>ポップアップのボタンやスペースキーでゲームを開始 / 再開できます。</li>
        </ul>
      </div>
    `,
  },
  {
    title: 'パワーアップ弾',
    body: `
      <div class="screen__body">
        <p>
          特定のブロックを壊すとオレンジ色のパワーアップ弾が発動します。発動中は
          ブロックを貫通し、まとめて破壊できます。
        </p>
        <ul>
          <li>効果中はボールが黄金色に輝き、軌跡が表示されます。</li>
          <li>上面の壁に当たる、または一定時間が経過すると効果が終了します。</li>
          <li>効果終了後は通常のボールに戻るため、落とさないよう注意しましょう。</li>
        </ul>
      </div>
    `,
  },
];

let overlayElement = null;
let closeButton = null;
let prevButton = null;
let nextButton = null;
let titleElement = null;
let bodyContainer = null;
let indicatorElement = null;
let currentPage = 0;
let isInitialized = false;
let beforeOpenCallback = null;
let previouslyFocusedElement = null;

function clampPage(index) {
  return Math.min(Math.max(index, 0), PAGES.length - 1);
}

function updatePage() {
  const page = PAGES[currentPage];
  if (!page || !titleElement || !bodyContainer || !prevButton || !nextButton || !indicatorElement) {
    return;
  }

  titleElement.textContent = page.title;
  bodyContainer.innerHTML = page.body;
  prevButton.disabled = currentPage === 0;
  nextButton.disabled = currentPage === PAGES.length - 1;
  indicatorElement.textContent = `${currentPage + 1} / ${PAGES.length}`;
}

function handleNav(delta) {
  currentPage = clampPage(currentPage + delta);
  updatePage();
}

function closeModal() {
  if (!overlayElement) {
    return;
  }
  overlayElement.classList.remove('is-open');
  overlayElement.setAttribute('aria-hidden', 'true');
  document.removeEventListener('keydown', handleKeydown);

  const focusTarget = previouslyFocusedElement;
  previouslyFocusedElement = null;
  if (focusTarget && typeof focusTarget.focus === 'function') {
    window.setTimeout(() => {
      focusTarget.focus({ preventScroll: true });
    }, 0);
  }
}

function handleBackgroundClick(event) {
  if (event.target === overlayElement) {
    closeModal();
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    closeModal();
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    handleNav(-1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    handleNav(1);
  }
}

function openModal(pageIndex = 0) {
  if (!overlayElement) {
    return;
  }
  if (typeof beforeOpenCallback === 'function') {
    try {
      beforeOpenCallback();
    } catch (error) {
      console.error('Failed to run beforeOpen callback for HowToPlayModal', error);
    }
  }
  currentPage = clampPage(pageIndex);
  updatePage();
  const activeElement = document.activeElement;
  previouslyFocusedElement =
    activeElement instanceof HTMLElement && typeof activeElement.focus === 'function'
      ? activeElement
      : null;
  overlayElement.classList.add('is-open');
  overlayElement.setAttribute('aria-hidden', 'false');
  document.addEventListener('keydown', handleKeydown);
  window.setTimeout(() => {
    closeButton?.focus({ preventScroll: true });
  }, 0);
}

function ensureModal() {
  if (isInitialized) {
    return;
  }

  overlayElement = document.createElement('div');
  overlayElement.className = 'howto-overlay';
  overlayElement.setAttribute('role', 'dialog');
  overlayElement.setAttribute('aria-modal', 'true');
  overlayElement.setAttribute('aria-hidden', 'true');

  const popup = document.createElement('div');
  popup.className = 'screen screen--howto';

  titleElement = document.createElement('h2');
  titleElement.className = 'screen__title';
  titleElement.id = 'howto-modal-title';
  popup.appendChild(titleElement);

  bodyContainer = document.createElement('div');
  bodyContainer.className = 'howto-modal__content';
  bodyContainer.id = 'howto-modal-content';
  popup.appendChild(bodyContainer);

  overlayElement.setAttribute('aria-labelledby', titleElement.id);
  overlayElement.setAttribute('aria-describedby', bodyContainer.id);

  indicatorElement = document.createElement('span');
  indicatorElement.className = 'howto-modal__indicator';

  const nav = document.createElement('div');
  nav.className = 'howto-modal__nav';

  prevButton = document.createElement('button');
  prevButton.type = 'button';
  prevButton.className = 'howto-modal__navButton';
  prevButton.textContent = '‹ 前へ';
  prevButton.addEventListener('click', () => handleNav(-1));

  nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'howto-modal__navButton';
  nextButton.textContent = '次へ ›';
  nextButton.addEventListener('click', () => handleNav(1));

  nav.appendChild(prevButton);
  nav.appendChild(indicatorElement);
  nav.appendChild(nextButton);

  popup.appendChild(nav);

  closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'screen__button';
  closeButton.textContent = '閉じる';
  closeButton.addEventListener('click', closeModal);

  popup.appendChild(closeButton);

  overlayElement.appendChild(popup);
  overlayElement.addEventListener('click', handleBackgroundClick);

  document.body.appendChild(overlayElement);
  isInitialized = true;
}

export function setupHowToPlayModal({ triggerId = 'howToPlayButton', onOpen } = {}) {
  ensureModal();

  if (typeof onOpen === 'function') {
    beforeOpenCallback = onOpen;
  }

  const trigger = document.getElementById(triggerId);
  if (!trigger) {
    return () => {};
  }

  const handleClick = () => openModal(0);
  trigger.addEventListener('click', handleClick);

  return () => {
    trigger.removeEventListener('click', handleClick);
  };
}

export function showHowToPlayModal(pageIndex = 0) {
  ensureModal();
  openModal(pageIndex);
}
