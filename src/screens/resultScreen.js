import { PopupScreen } from './popupBase.js';

/**
 * ゲーム終了後のスコアと操作を提示するリザルト画面。
 */
class ResultScreen extends PopupScreen {
  constructor({ score = 0, highScore = 0, onBackToTitle } = {}) {
    super();
    this.createTitle('ゲーム結果');
    this.createMessage(
      `今回のスコア: <strong>${score}</strong><br />ハイスコア: <strong>${highScore}</strong>`,
      { html: true },
    );
    this.createButton({
      label: 'タイトルへ戻る',
      onClick: typeof onBackToTitle === 'function' ? onBackToTitle : undefined,
    });
  }
}

function createResultScreen(options = {}) {
  const screen = new ResultScreen(options);
  return screen.toScreen();
}

export { ResultScreen, createResultScreen };
