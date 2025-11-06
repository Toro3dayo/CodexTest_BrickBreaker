import { PopupScreen } from './popupBase.js';

class TitleScreen extends PopupScreen {
  constructor({ onStart } = {}) {
    super();
    this.createTitle('ブロック崩し');
    this.createMessage('「ゲーム開始」を押すとプレイが始まります。');
    this.createButton({
      label: 'ゲーム開始',
      onClick: typeof onStart === 'function' ? onStart : undefined,
    });
  }
}

function createTitleScreen(options = {}) {
  const screen = new TitleScreen(options);
  return screen.toScreen();
}

export { TitleScreen, createTitleScreen };
