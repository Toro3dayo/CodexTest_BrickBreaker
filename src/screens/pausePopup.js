import { PopupScreen } from './popupBase.js';

class PausePopup extends PopupScreen {
  constructor({ message, onResume } = {}) {
    super();
    this.createTitle('一時停止中');
    const content = message && message.trim().length > 0
      ? message
      : 'ゲームは一時停止しています。再開するには「再開」を押してください。';
    this.createMessage(content);
    this.createButton({
      label: '再開',
      onClick: typeof onResume === 'function' ? onResume : undefined,
    });
  }
}

function createPausePopup(options = {}) {
  const popup = new PausePopup(options);
  return popup.toScreen();
}

export { PausePopup, createPausePopup };
