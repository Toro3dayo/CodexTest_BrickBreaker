function createResultScreen({ score = 0, highScore = 0, onBackToTitle } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'screen';

  const heading = document.createElement('h2');
  heading.className = 'screen__title';
  heading.textContent = 'ゲーム結果';

  const description = document.createElement('p');
  description.className = 'screen__message';
  description.innerHTML = `今回のスコア: <strong>${score}</strong><br />ハイスコア: <strong>${highScore}</strong>`;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'screen__button';
  button.textContent = 'タイトルへ戻る';
  if (typeof onBackToTitle === 'function') {
    button.addEventListener('click', onBackToTitle);
  } else {
    button.disabled = true;
  }

  wrapper.appendChild(heading);
  wrapper.appendChild(description);
  wrapper.appendChild(button);

  return {
    element: wrapper,
    cleanup: () => {
      if (typeof onBackToTitle === 'function') {
        button.removeEventListener('click', onBackToTitle);
      }
    },
  };
}

export { createResultScreen };
