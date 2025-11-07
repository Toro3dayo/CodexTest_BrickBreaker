import { GamePresenter } from './presenter/gamePresenter.js';
import { setupHowToPlayModal } from './ui/howToPlayModal.js';

const presenter = new GamePresenter();
presenter.initialize();

setupHowToPlayModal({ onOpen: presenter.handleHowToPlayOpen });
