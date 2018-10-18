import { rebuild, serializeNodeWithId } from 'rrweb-snapshot';
import * as mittProxy from 'mitt';
import { later, clear } from './timer';
import {
  EventType,
  incrementalData,
  IncrementalSource,
  fullSnapshotEvent,
  eventWithTime,
  MouseInteractions,
  playerConfig,
  playerMetaData,
  viewportResizeDimention,
} from '../types';
import { mirror, getIdNodeMap } from '../utils';

// https://github.com/rollup/rollup/issues/1267#issuecomment-296395734
// tslint:disable-next-line
const mitt = (mittProxy as any).default || mittProxy;

const defaultConfig: playerConfig = {
  speed: 1,
  root: document.body,
};

export class Replayer {
  public wrapper: HTMLDivElement;

  private events: eventWithTime[] = [];
  private config: playerConfig = defaultConfig;

  private iframe: HTMLIFrameElement;
  private mouse: HTMLDivElement;
  private startTime: number = 0;

  private timerIds: number[] = [];
  private emitter: mitt.Emitter = mitt();

  constructor(events: eventWithTime[], config?: Partial<playerConfig>) {
    if (events.length < 2) {
      throw new Error('Replayer need at least 2 events.');
    }
    this.events = events;
    this.handleResize = this.handleResize.bind(this);

    this.setConfig(Object.assign({}, config));
    this.setupDom();
    this.emitter.on('resize', this.handleResize as mitt.Handler);
  }

  public on(event: string, handler: mitt.Handler) {
    this.emitter.on(event, handler);
  }

  public setConfig(config: Partial<playerConfig>) {
    Object.keys(config).forEach((key: keyof playerConfig) => {
      this.config[key] = config[key]!;
    });
  }

  public getMetaData(): playerMetaData {
    const firstEvent = this.events[0];
    const lastEvent = this.events[this.events.length - 1];
    return {
      totalTime: lastEvent.timestamp - firstEvent.timestamp,
    };
  }

  /**
   * This API was designed to be used as play at any time offset.
   * Since we minimized the data collected from recorder, we do not
   * have the ability of undo an event.
   * So the implementation of play at any time offset will always iterate
   * all of the events, cast event before the offset synchronously
   * and cast event after the offset asynchronously with timer.
   * @param timeOffset number
   */
  public play(timeOffset = 0) {
    this.startTime = this.events[0].timestamp + timeOffset;
    for (const event of this.events) {
      const isSync = event.timestamp < this.startTime;
      let castFn: undefined | (() => void);
      switch (event.type) {
        case EventType.DomContentLoaded:
          break;
        case EventType.Load:
          castFn = () =>
            this.emitter.emit('resize', {
              width: event.data.width,
              height: event.data.height,
            });
          break;
        case EventType.FullSnapshot:
          castFn = () => {
            this.rebuildFullSnapshot(event);
            this.iframe.contentWindow!.scrollTo(event.data.initialOffset);
          };
          break;
        case EventType.IncrementalSnapshot:
          castFn = () => {
            this.applyIncremental(event.data, isSync);
          };
          break;
        default:
      }
      if (!castFn) {
        continue;
      }
      if (isSync) {
        castFn();
      } else {
        this.later(castFn, this.getDelay(event));
      }
    }
  }

  public pause() {
    this.timerIds.forEach(clear);
  }

  private setupDom() {
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('replayer-wrapper');
    this.config.root.appendChild(this.wrapper);

    this.mouse = document.createElement('div');
    this.mouse.classList.add('replayer-mouse');
    this.wrapper.appendChild(this.mouse);

    this.iframe = document.createElement('iframe');
    this.wrapper.appendChild(this.iframe);
  }

  private handleResize(dimension: viewportResizeDimention) {
    this.iframe.width = `${dimension.width}px`;
    this.iframe.height = `${dimension.height}px`;
  }

  private later(cb: () => void, delayMs: number) {
    const id = later(cb, delayMs, this.config);
    this.timerIds.push(id);
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
        new XMLSerializer()
          .serializeToString(doc as Document)
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

  private applyIncremental(d: incrementalData, isSync: boolean) {
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
        d.removes.forEach(mutation => {
          const target = (mirror.getNode(mutation.id) as Node) as Element;
          const parent = (mirror.getNode(mutation.parentId) as Node) as Element;
          parent.removeChild(target);
          delete mirror.map[mutation.id];
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
          serializeNodeWithId(
            mirror.getNode(mutation.id),
            this.iframe.contentDocument!,
            mirror.map,
          );
        });
        break;
      }
      case IncrementalSource.MouseMove:
        // skip mouse move in sync mode
        if (!isSync) {
          d.positions.forEach(p => {
            this.later(() => {
              this.mouse.style.left = `${p.x}px`;
              this.mouse.style.top = `${p.y}px`;
            }, p.timeOffset);
          });
        }
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
      case IncrementalSource.Scroll: {
        const target = mirror.getNode(d.id) as Node;
        if (target === this.iframe.contentDocument) {
          this.iframe.contentWindow!.scrollTo({
            top: d.y,
            left: d.x,
            behavior: isSync ? 'instant' : 'smooth',
          });
        } else {
          (target as Element).scrollTop = d.y;
          (target as Element).scrollLeft = d.x;
        }
        break;
      }
      case IncrementalSource.ViewportResize:
        this.emitter.emit('resize', {
          width: d.width,
          height: d.height,
        });
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
