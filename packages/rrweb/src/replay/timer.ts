import {
  actionWithDelay,
  eventWithTime,
  EventType,
  IncrementalSource,
} from '../types';

export class Timer {
  public timeOffset = 0;
  public speed: number;

  private actions: actionWithDelay[];
  private raf: number | null = null;
  private liveMode: boolean;

  constructor(
    actions: actionWithDelay[] = [],
    config: {
      speed: number;
      liveMode: boolean;
    },
  ) {
    this.actions = actions;
    this.speed = config.speed;
    this.liveMode = config.liveMode;
  }
  /**
   * Add an action after the timer starts.
   */
  public addAction(action: actionWithDelay) {
    const index = this.findActionIndex(action);
    this.actions.splice(index, 0, action);
  }
  /**
   * Add all actions before the timer starts
   */
  public addActions(actions: actionWithDelay[]) {
    this.actions = this.actions.concat(actions);
  }

  public start() {
    this.timeOffset = 0;
    let lastTimestamp = performance.now();
    const check = () => {
      const time = performance.now();
      this.timeOffset += (time - lastTimestamp) * this.speed;
      lastTimestamp = time;
      while (this.actions.length) {
        const action = this.actions[0];

        if (this.timeOffset >= action.delay) {
          this.actions.shift();
          action.doAction();
        } else {
          break;
        }
      }
      if (this.actions.length > 0 || this.liveMode) {
        this.raf = requestAnimationFrame(check);
      }
    };
    this.raf = requestAnimationFrame(check);
  }

  public clear() {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    this.actions.length = 0;
  }

  public setSpeed(speed: number) {
    this.speed = speed;
  }

  public toggleLiveMode(mode: boolean) {
    this.liveMode = mode;
  }

  public isActive() {
    return this.raf !== null;
  }

  private findActionIndex(action: actionWithDelay): number {
    let start = 0;
    let end = this.actions.length - 1;
    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      if (this.actions[mid].delay < action.delay) {
        start = mid + 1;
      } else if (this.actions[mid].delay > action.delay) {
        end = mid - 1;
      } else {
        // already an action with same delay (timestamp)
        // the plus one will splice the new one after the existing one
        return mid + 1;
      }
    }
    return start;
  }
}

// TODO: add speed to mouse move timestamp calculation
export function addDelay(event: eventWithTime, baselineTime: number): number {
  // Mouse move events was recorded in a throttle function,
  // so we need to find the real timestamp by traverse the time offsets.
  if (
    event.type === EventType.IncrementalSnapshot &&
    event.data.source === IncrementalSource.MouseMove &&
    event.data.positions &&
    event.data.positions.length
  ) {
    const firstOffset = event.data.positions[0].timeOffset;
    // timeOffset is a negative offset to event.timestamp
    const firstTimestamp = event.timestamp + firstOffset;
    event.delay = firstTimestamp - baselineTime;
    return firstTimestamp - baselineTime;
  }

  event.delay = event.timestamp - baselineTime;
  return event.delay;
}
