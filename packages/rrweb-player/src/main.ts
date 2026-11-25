import _Player from './Player.svelte';
import type { RRwebPlayerOptions, RRwebPlayerExpose } from './types';
import type { SvelteComponent } from 'svelte';

// A clean build initially sees Svelte's generic declaration for this import.
const PlayerComponent = _Player as new (
  options: RRwebPlayerOptions,
) => SvelteComponent<RRwebPlayerOptions['props']> & RRwebPlayerExpose;

export class Player extends PlayerComponent {
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

export type { annotationData } from '@rrweb/types';

export type {
  PlayerFeatures,
  DownloadLink,
  PlayerControls,
  PlayerIcons,
  PlayerIconName,
  PlayerIconContext,
  JumpEvent,
  ActivityLayer,
} from './features';
