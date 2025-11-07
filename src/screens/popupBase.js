/**
 * ポップアップ画面を構築するための共通ユーティリティ。
 * DOM ノードを組み立て、後片付け用のコールバックも管理する。
 */
class PopupScreen {
  constructor({ modifier } = {}) {
    this.element = document.createElement('div');
    this.element.className = modifier ? `screen ${modifier}` : 'screen';
    this.cleanupCallbacks = [];
  }

  createTitle(text) {
    const heading = document.createElement('h2');
    heading.className = 'screen__title';
    heading.textContent = text ?? '';
    this.element.appendChild(heading);
    return heading;
  }

  createMessage(text, { html = false } = {}) {
    const message = document.createElement('p');
    message.className = 'screen__message';
    if (html) {
      message.innerHTML = text ?? '';
    } else {
      message.textContent = text ?? '';
    }
    this.element.appendChild(message);
    return message;
  }

  createButton({ label, onClick, className = 'screen__button', type = 'button', disabled = false } = {}) {
    const button = document.createElement('button');
    button.type = type;
    button.className = className;
    button.textContent = label ?? '';

    if (typeof onClick === 'function' && !disabled) {
      button.addEventListener('click', onClick);
      this.registerCleanup(() => button.removeEventListener('click', onClick));
    } else {
      button.disabled = true;
    }

    if (disabled) {
      button.disabled = true;
    }

    this.element.appendChild(button);
    return button;
  }

  appendChild(node) {
    if (node instanceof Node) {
      this.element.appendChild(node);
    }
    return node;
  }

  registerCleanup(callback) {
    if (typeof callback === 'function') {
      this.cleanupCallbacks.push(callback);
    }
  }

  cleanup() {
    while (this.cleanupCallbacks.length) {
      const callback = this.cleanupCallbacks.pop();
      try {
        callback();
      } catch (error) {
        console.error('Failed to cleanup popup listener', error);
      }
    }
  }

  toScreen() {
    return {
      element: this.element,
      cleanup: () => this.cleanup(),
    };
  }
}

export { PopupScreen };
