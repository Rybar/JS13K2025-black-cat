import { games, getGameBySlug } from '../games/registry.js';
import { createDisplayShell } from './app/displayShell.js';
import { createGamePlayer } from './app/gamePlayer.js';

const displayShell = createDisplayShell();
const player = createGamePlayer(displayShell);

function updateUrlForGame(slug = null) {
  const url = new URL(globalThis.location.href);
  if (slug) {
    url.searchParams.set('game', slug);
  } else {
    url.searchParams.delete('game');
  }
  globalThis.history.replaceState({}, '', url);
}

function createLauncher(errorMessage = null) {
  const launcher = document.createElement('section');
  launcher.className = 'game-launcher';

  const panel = document.createElement('div');
  panel.className = 'game-launcher-panel';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'game-launcher-eyebrow';
  eyebrow.textContent = 'RetroBuffer Demo Shelf';

  const title = document.createElement('h1');
  title.className = 'game-launcher-title';
  title.textContent = 'Choose a Game';

  const copy = document.createElement('p');
  copy.className = 'game-launcher-copy';
  copy.textContent = 'This repository now treats games as first-class projects under src/games. Start a demo here, or deep-link with ?game=<slug>.';

  panel.append(eyebrow, title, copy);

  if (errorMessage) {
    const error = document.createElement('p');
    error.className = 'game-launcher-error';
    error.textContent = errorMessage;
    panel.append(error);
  }

  const list = document.createElement('div');
  list.className = 'game-launcher-list';

  for (const game of games) {
    const card = document.createElement('article');
    card.className = 'game-launcher-card';

    const meta = document.createElement('div');
    meta.className = 'game-launcher-meta';

    const name = document.createElement('h2');
    name.className = 'game-launcher-name';
    name.textContent = game.title;

    const description = document.createElement('p');
    description.className = 'game-launcher-description';
    description.textContent = game.description;

    const button = document.createElement('button');
    button.className = 'game-launcher-button';
    button.type = 'button';
    button.textContent = 'Launch';
    button.addEventListener('click', () => {
      void startGame(game.slug);
    });

    meta.append(name, description);
    card.append(meta, button);
    list.append(card);
  }

  panel.append(list);
  launcher.append(panel);
  return launcher;
}

function showLauncher(errorMessage = null) {
  updateUrlForGame();
  document.title = 'RetroBuffer Demos';
  displayShell.mount(createLauncher(errorMessage));
}

async function startGame(slug) {
  const game = getGameBySlug(slug);
  if (!game) {
    showLauncher(`Unknown game slug: ${slug}`);
    return;
  }

  try {
    updateUrlForGame(slug);
    await player.start(game);
  } catch (error) {
    console.error(error);
    showLauncher(`Failed to start ${game.title}: ${error.message}`);
  }
}

const requestedGame = getGameBySlug(new URLSearchParams(globalThis.location.search).get('game'));
if (requestedGame) {
  void startGame(requestedGame.slug);
} else {
  showLauncher();
}
