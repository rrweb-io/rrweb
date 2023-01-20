import {
  eventWithTime,
  playerConfig,
} from '@sentry-internal/rrweb/typings/types';
import { Replayer, mirror } from '@sentry-internal/rrweb';
import { SvelteComponent } from 'svelte';

export type RRwebPlayerOptions = {
  target: HTMLElement;
  props: {
    events: eventWithTime[];
    width?: number;
    height?: number;
    autoPlay?: boolean;
    speed?: number;
    speedOption?: number[];
    showController?: boolean;
    tags?: Record<string, string>;
  } & Partial<playerConfig>;
};

export default class rrwebPlayer extends SvelteComponent {
  constructor(options: RRwebPlayerOptions);

  addEventListener(event: string, handler: (params: any) => unknown): void;

  addEvent(event: eventWithTime): void;
  getMetaData: Replayer['getMetaData'];
  getReplayer: () => Replayer;
  getMirror: () => typeof mirror;

  toggle: () => void;
  setSpeed: (speed: number) => void;
  toggleSkipInactive: () => void;
  triggerResize: () => void;
  play: () => void;
  pause: () => void;
  goto: (timeOffset: number, play?: boolean) => void;
}
