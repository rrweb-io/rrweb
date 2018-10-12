import { rebuild } from 'rrweb-snapshot';
import later from './timer';
import {
  EventType,
  incrementalData,
  IncrementalSource,
  fullSnapshotEvent,
  eventWithTime,
} from '../types';
import eventsStr from './events';

const _events: eventWithTime[] = JSON.parse(eventsStr);

class Replayer {
  private events: eventWithTime[] = [];
  private wrapper: HTMLDivElement;
  private iframe: HTMLIFrameElement;
  private mouse: HTMLDivElement;
  private startTime: number = 0;

  constructor(events: eventWithTime[]) {
    this.events = events;
  }

  public play() {
    this.setupDom();
    for (const event of this.events) {
      switch (event.type) {
        case EventType.DomContentLoaded:
          this.startTime = event.timestamp;
          break;
        case EventType.Load:
          this.iframe.width = `${event.data.width}px`;
          this.iframe.height = `${event.data.height}px`;
          break;
        case EventType.FullSnapshot:
          later(() => {
            this.rebuildFullSnapshot(event);
          }, this.getDelay(event));
          break;
        case EventType.IncrementalSnapshot:
          later(() => {
            this.applyIncremental(event.data);
          }, this.getDelay(event));
          break;
        default:
      }
    }
  }

  private setupDom() {
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('replayer-wrapper');
    document.body.appendChild(this.wrapper);

    this.mouse = document.createElement('div');
    this.mouse.classList.add('replayer-mouse');
    this.wrapper.appendChild(this.mouse);

    this.iframe = document.createElement('iframe');
    this.wrapper.appendChild(this.iframe);
  }

  private getDelay(event: eventWithTime): number {
    // Mouse move events was recorded in a throttle function,
    // so we need to find the real timestamp by traverse the time offsets.
    if (
      event.type === EventType.IncrementalSnapshot &&
      event.data.source === IncrementalSource.MouseMove
    ) {
      const firstOffset = event.data.positions[0].timeOffset;
      // timeoffset is a negative offset to event.timestamp
      const firstTimestamp = event.timestamp + firstOffset;
      event.data.positions = event.data.positions.map(p => {
        return {
          ...p,
          timeOffset: p.timeOffset - firstOffset,
        };
      });
      return firstTimestamp - this.startTime;
    }
    return event.timestamp - this.startTime;
  }

  private rebuildFullSnapshot(event: fullSnapshotEvent) {
    const doc = rebuild(event.data.node);
    if (doc) {
      this.iframe.contentDocument!.open();
      // https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML
      this.iframe.contentDocument!.write(
        (doc as Document).documentElement.outerHTML
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>'),
      );
      this.iframe.contentDocument!.close();
    }
  }

  private applyIncremental(d: incrementalData) {
    switch (d.source) {
      case IncrementalSource.Mutation:
        break;
      case IncrementalSource.MouseMove:
        d.positions.forEach(p => {
          later(() => {
            this.mouse.style.left = `${p.x}px`;
            this.mouse.style.top = `${p.y}px`;
          }, p.timeOffset);
        });
        break;
      case IncrementalSource.MouseInteraction:
        break;
      case IncrementalSource.Scroll:
        // TODO: maybe element
        this.iframe.contentWindow!.scrollTo({
          top: d.y,
          left: d.x,
          behavior: 'smooth',
        });
        break;
      case IncrementalSource.ViewportResize:
        this.iframe.width = `${d.width}px`;
        this.iframe.height = `${d.height}px`;
        break;
      case IncrementalSource.Input: {
        const target: HTMLInputElement | null = this.iframe.contentDocument!.querySelector(
          `[data-rrid="${d.id}"]`,
        );
        if (target) {
          target.checked = d.isChecked;
          target.value = d.text;
        }
        break;
      }
      default:
    }
  }
}

const replayer = new Replayer(_events);

export default replayer;
