import { eventWithTime } from 'rrweb/typings/types';

export default class rrwebPlayer {
  constructor(options: {
    target: HTMLElement;
    props: {
      events: eventWithTime[];
      width?: number;
      height?: number;
      skipInactive?: boolean;
      autoPlay?: number;
      speedOption?: number[];
      showController?: boolean;
      showWarning?: boolean;
      showDebug?: boolean;
      tags?: Record<string, string>;
    };
  });

  addEventListener(event: string, handler: () => unknown): void;

  addEvent(event: eventWithTime): void;
}
