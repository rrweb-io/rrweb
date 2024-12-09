import _Player from './Player.svelte';
import type { RRwebPlayerOptions } from './types';

// Make sure generated Player type inherit all the props of _Player
type SvelteComponentProps = InstanceType<typeof _Player>;

export class Player extends _Player implements SvelteComponentProps {
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
