import _Player from './Player.svelte';
import type { RRwebPlayerOptions } from './types';
class Player extends _Player {
  constructor(
    options: {
      // for compatibility
      data?: RRwebPlayerOptions['props'];
    } & RRwebPlayerOptions,
  ) {
    super({
      target: options.target,
      props: options.data || options.props,
    });
  }
}

export default Player;
