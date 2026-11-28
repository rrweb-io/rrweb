import {
  type actionWithDelay,
  type eventWithTime,
  EventType,
  IncrementalSource,
} from '@rrweb/types';

export class Timer {
  public timeOffset = 0;
  public speed: number;
  /** While skipping, where the skip ends: the interaction, or a stall marker before it. */
  public skipEnd: number | null = null;

  private actions: actionWithDelay[];
  private raf: number | true | null = null;
  private lastTimestamp: number;
  private onExhausted?: () => void;

  constructor(
    actions: actionWithDelay[] = [],
    config: {
      speed: number;
      onExhausted?: () => void;
    },
  ) {
    this.actions = actions;
    this.speed = config.speed;
    this.onExhausted = config.onExhausted;
  }

  /**
   * Add an action, possibly after the timer starts.
   */
  public addAction(action: actionWithDelay) {
    const rafWasActive = this.raf === true;
    if (
      !this.actions.length ||
      this.actions[this.actions.length - 1].delay <= action.delay
    ) {
      // 'fast track'
      this.actions.push(action);
    } else {
      // binary search - events can arrive out of order in a realtime context
      const index = this.findActionIndex(action);
      this.actions.splice(index, 0, action);
    }
    if (rafWasActive) {
      this.raf = requestAnimationFrame(this.rafCheck.bind(this));
    }
  }

  public start() {
    this.timeOffset = 0;
    this.lastTimestamp = performance.now();
    this.raf = requestAnimationFrame(this.rafCheck.bind(this));
  }

  public updateLiveTime() {
    if (this.raf === true) {
      // in live mode awaiting new events
      // we don't run requestAnimationFrame
      this.rafCheck(); // updates timeOffset
    }
  }

  private rafCheck() {
    const time = performance.now();
    let next = this.timeOffset + (time - this.lastTimestamp) * this.speed;
    // While skipping, an overdue action (one scheduled in the past, such as a
    // stall marker behind a seek) runs before time moves on, and a frame does
    // not run past the end of the skip while an action before it is due.
    if (this.skipEnd !== null && this.actions.length) {
      const due = this.actions[0].delay;
      if (due < this.timeOffset) next = this.timeOffset;
      else if (due <= this.skipEnd) next = Math.min(next, this.skipEnd);
    }
    this.timeOffset = next;
    this.lastTimestamp = time;
    while (this.actions.length) {
      const action = this.actions[0];

      if (this.timeOffset >= action.delay) {
        this.actions.shift();
        action.doAction();
      } else {
        break;
      }
    }
    if (this.raf === null) {
      // if an action itself cleared the timer
      return;
    }
    if (this.actions.length > 0) {
      this.raf = requestAnimationFrame(this.rafCheck.bind(this));
    } else {
      if (this.onExhausted) {
        this.onExhausted();
      }
      this.raf = true; // was active
    }
  }

  public clear() {
    if (this.raf) {
      if (this.raf !== true) {
        cancelAnimationFrame(this.raf);
      }
      this.raf = null;
    }
    this.actions.length = 0;
  }

  public setSpeed(speed: number) {
    this.speed = speed;
  }

  public isActive() {
    return this.raf !== null;
  }

  public hasUpcomingActions() {
    return this.actions.length > 0;
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

export function getEarliestTimestamp(event: eventWithTime): number {
  // Multiple mouse move events can be throttled to a single batch
  // with earlier mvoements emitted with negative `timeOffset`
  let negOffset = 0;
  if (
    event.type === EventType.IncrementalSnapshot &&
    event.data.source === IncrementalSource.MouseMove &&
    event.data.positions &&
    event.data.positions.length
  ) {
    negOffset = event.data.positions[0].timeOffset;
  }
  return event.timestamp + negOffset;
}

export function addDelay(event: eventWithTime, baselineTime: number): number {
  event.delay = getEarliestTimestamp(event) - baselineTime;
  return event.delay;
}
