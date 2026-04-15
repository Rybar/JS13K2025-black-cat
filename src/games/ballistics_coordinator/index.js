import { ballisticsConfig } from './config.js';
import { updateBallistics } from './gameplay.js';
import { renderBallistics } from './rendering.js';
import { createShell, showTitle } from './state.js';

export const ballisticsCoordinatorGame = {
  slug: ballisticsConfig.slug,
  title: ballisticsConfig.title,
  description: ballisticsConfig.description,
  screen: ballisticsConfig.screen,
  displayScale: ballisticsConfig.displayScale,
  input: ballisticsConfig.input,
  assets: ballisticsConfig.assetManifest,
  create({ input, storage }) {
    const shell = createShell(ballisticsConfig, storage, input);
    showTitle(shell);
    return shell;
  },
  update: updateBallistics,
  render: renderBallistics,
  onBlur(shell) {
    if (shell.scene === 'gameplay') {
      shell.paused = true;
    }
  },
};