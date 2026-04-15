import { ballisticsCoordinatorGame } from './ballistics_coordinator/index.js';

export const games = [ballisticsCoordinatorGame];

export function getGameBySlug(slug) {
  return games.find((game) => game.slug === slug) ?? null;
}