import { rebuild } from 'rrweb-snapshot';
import later from './timer';
import {
  EventType,
  incrementalData,
  IncrementalSource,
  fullSnapshotEvent,
  eventWithTime,
  MouseInteractions,
} from '../types';
import eventsStr from './events';
import { mirror, getIdNodeMap } from '../utils';

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
      mirror.map = getIdNodeMap(this.iframe.contentDocument!);
      // avoid form submit to refresh the iframe
      this.iframe.contentDocument!.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', evt => evt.preventDefault());
      });
    }
  }

  private applyIncremental(d: incrementalData) {
    switch (d.source) {
      case IncrementalSource.Mutation: {
        d.texts.forEach(mutation => {
          const target = (mirror.getNode(mutation.id) as Node) as Text;
          target.textContent = mutation.value;
        });
        d.attributes.forEach(mutation => {
          const target = (mirror.getNode(mutation.id) as Node) as Element;
          for (const attributeName in mutation.attributes) {
            if (typeof attributeName === 'string') {
              const value = mutation.attributes[attributeName];
              if (value) {
                target.setAttribute(attributeName, value);
              } else {
                target.removeAttribute(attributeName);
              }
            }
          }
        });
        // TODO: update id node map
        d.removes.forEach(mutation => {
          const target = (mirror.getNode(mutation.id) as Node) as Element;
          const parent = (mirror.getNode(mutation.parentId) as Node) as Element;
          parent.removeChild(target);
        });
        d.adds.forEach(mutation => {
          const target = (mirror.getNode(mutation.id) as Node) as Element;
          const parent = (mirror.getNode(mutation.parentId) as Node) as Element;
          if (mutation.nextId) {
            const next = (mirror.getNode(mutation.nextId) as Node) as Element;
            parent.insertBefore(target, next);
          } else if (mutation.previousId) {
            const previous = (mirror.getNode(
              mutation.previousId,
            ) as Node) as Element;
            parent.insertBefore(target, previous.nextSibling);
          } else {
            parent.appendChild(target);
          }
        });
        break;
      }
      case IncrementalSource.MouseMove:
        d.positions.forEach(p => {
          later(() => {
            this.mouse.style.left = `${p.x}px`;
            this.mouse.style.top = `${p.y}px`;
          }, p.timeOffset);
        });
        break;
      case IncrementalSource.MouseInteraction: {
        const event = new Event(MouseInteractions[d.type].toLowerCase());
        const target = (mirror.getNode(d.id) as Node) as HTMLElement;
        target.dispatchEvent(event);
        if (d.type === MouseInteractions.Blur) {
          target.blur();
        } else if (d.type === MouseInteractions.Click) {
          target.click();
        } else if (d.type === MouseInteractions.Focus) {
          target.focus();
        }
        break;
      }
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
        const target: HTMLInputElement = (mirror.getNode(
          d.id,
        ) as Node) as HTMLInputElement;
        target.checked = d.isChecked;
        target.value = d.text;
        break;
      }
      default:
    }
  }
}

const replayer = new Replayer(_events);

export default replayer;
