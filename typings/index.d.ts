import { eventWithTime, playerConfig } from 'rrweb/typings/types';
import { Replayer, mirror } from 'rrweb';

export default class rrwebPlayer {
  constructor(options: {
    target: HTMLElement;
    props: {
      events: eventWithTime[];
      width?: number;
      height?: number;
      skipInactive?: boolean;
      autoPlay?: boolean;
      speedOption?: number[];
      showController?: boolean;
      showWarning?: boolean;
      showDebug?: boolean;
      tags?: Record<string, string>;
      mouseTail?: playerConfig['mouseTail'];
      UNSAFE_replayCanvas?: boolean;
    };
  });

  addEventListener(event: string, handler: (params: any) => unknown): void;

  addEvent(event: eventWithTime): void;
  getMetaData: Replayer['getMetaData'];
  getReplayer: () => Replayer;
  getMirror: () => typeof mirror;

  toggle: () => void;
  setSpeed: (speed: number) => void;
  toggleSkipInactive: () => void;
  play: () => void;
  pause: () => void;
  goto: (timeOffset: number) => void;
}
