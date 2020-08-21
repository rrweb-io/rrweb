import { eventWithTime } from 'rrweb/typings/types';
import { Replayer } from 'rrweb';

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
    };
  });

  addEventListener(event: string, handler: (params: any) => unknown): void;

  addEvent(event: eventWithTime): void;
  getMetaData: Replayer['getMetaData'];
  getReplayer: () => Replayer;

  toggle: () => void;
  setSpeed: (speed: number) => void;
  toggleSkipInactive: () => void;
}
