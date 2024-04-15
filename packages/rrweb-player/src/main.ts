import type { eventWithTime } from '@rrweb/types';
import _Player from './Player.svelte';
import type { RRwebPlayerExpose, RRwebPlayerOptions } from './types';
export class Player extends _Player {
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
