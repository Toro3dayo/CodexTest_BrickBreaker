function createTitleScreen({ onStart } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'screen';

  const heading = document.createElement('h2');
  heading.className = 'screen__title';
  heading.textContent = 'ブロック崩し';

  const description = document.createElement('p');
  description.className = 'screen__message';
  description.textContent = '「ゲーム開始」を押すとプレイが始まります。';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'screen__button';
  button.textContent = 'ゲーム開始';
  if (typeof onStart === 'function') {
    button.addEventListener('click', onStart);
  } else {
    button.disabled = true;
  }

  wrapper.appendChild(heading);
  wrapper.appendChild(description);
  wrapper.appendChild(button);

  return {
    element: wrapper,
    cleanup: () => {
      if (typeof onStart === 'function') {
        button.removeEventListener('click', onStart);
      }
    },
  };
}

export { createTitleScreen };
