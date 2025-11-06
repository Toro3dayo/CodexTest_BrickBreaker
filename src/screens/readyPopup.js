import { PopupScreen } from './popupBase.js';

class ReadyPopup extends PopupScreen {
  constructor({ message, onResume } = {}) {
    super();
    this.createTitle('準備完了');
    const content = message && message.trim().length > 0 ? message : '準備ができたら「再開」を押してください。';
    this.createMessage(content);
    this.createButton({
      label: '再開',
      onClick: typeof onResume === 'function' ? onResume : undefined,
    });
  }
}

function createReadyPopup(options = {}) {
  const popup = new ReadyPopup(options);
  return popup.toScreen();
}

export { ReadyPopup, createReadyPopup };
