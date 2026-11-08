import _Player from './Player.svelte';
import type { RRwebPlayerOptions } from './types';
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

export { StallEvents } from '@rrweb/replay';
export type { StallController } from '@rrweb/replay';
export type { annotationData } from '@rrweb/types';
