export type PlayerFeatures = {
  /**
   * Off unless set. Adds back and forward jump buttons to the controller.
   * `keyboard` also lets the left and right arrows jump and Space play or
   * pause: `'player'` while the player has focus, `'page'` from anywhere on
   * the page.
   */
  jump?: { seconds?: number; keyboard?: 'player' | 'page' };
};

export type JumpEvent = {
  fromMs: number;
  toMs: number;
  source: 'button' | 'keyboard' | 'api';
};

export function jumpSeconds(jump: PlayerFeatures['jump']) {
  const value = jump?.seconds;
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : 10;
}
