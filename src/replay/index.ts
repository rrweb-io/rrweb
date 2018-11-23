import { rebuild, buildNodeWithSN } from 'rrweb-snapshot';
import * as mittProxy from 'mitt';
import { on, off } from 'delegated-events';
import Timer from './timer';
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
  missingNodeMap,
  addedNodeMutation,
  missingNode,
  actionWithDelay,
} from '../types';
import { mirror } from '../utils';
import './styles/style.css';

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

  private emitter: mitt.Emitter = mitt();

  private baselineTime: number = 0;
  // record last played event timestamp when paused
  private lastPlayedEvent: eventWithTime;

  private timer: Timer;

  constructor(events: eventWithTime[], config?: Partial<playerConfig>) {
    if (events.length < 2) {
      throw new Error('Replayer need at least 2 events.');
    }
    this.events = events;
    this.handleResize = this.handleResize.bind(this);

    this.timer = new Timer(this.config);
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
    this.baselineTime = this.events[0].timestamp + timeOffset;
    const actions = new Array<actionWithDelay>();
    for (const event of this.events) {
      const isSync = event.timestamp < this.baselineTime;
      const castFn = this.getCastFn(event, isSync);
      if (isSync) {
        castFn();
      } else {
        actions.push({ doAction: castFn, delay: this.getDelay(event) });
      }
    }
    this.timer.addActions(actions);
    this.timer.start();
  }

  public pause() {
    this.timer.clear();
  }

  public resume(timeOffset = 0) {
    this.timer.clear();
    const actions = new Array<actionWithDelay>();
    for (const event of this.events) {
      if (
        event.timestamp < this.lastPlayedEvent.timestamp ||
        event === this.lastPlayedEvent
      ) {
        continue;
      }
      const delayToBaseline = this.getDelay(event);
      const castFn = this.getCastFn(event);
      actions.push({
        doAction: castFn,
        delay: delayToBaseline - timeOffset,
      });
    }
    this.timer.addActions(actions);
    this.timer.start();
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

  // TODO: add speed to mouse move timestamp calculation
  private getDelay(event: eventWithTime): number {
    // Mouse move events was recorded in a throttle function,
    // so we need to find the real timestamp by traverse the time offsets.
    if (
      event.type === EventType.IncrementalSnapshot &&
      event.data.source === IncrementalSource.MouseMove
    ) {
      const firstOffset = event.data.positions[0].timeOffset;
      // timeOffset is a negative offset to event.timestamp
      const firstTimestamp = event.timestamp + firstOffset;
      const delay = firstTimestamp - this.baselineTime;
      event.data.positions = event.data.positions.map(p => {
        return {
          ...p,
          timeOffset: p.timeOffset - firstOffset + delay,
        };
      });
      return delay;
    }
    return event.timestamp - this.baselineTime;
  }

  private getCastFn(event: eventWithTime, isSync = false) {
    let castFn: undefined | (() => void);
    switch (event.type) {
      case EventType.DomContentLoaded:
      case EventType.Load:
        break;
      case EventType.Meta:
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
    const wrappedCastFn = () => {
      if (castFn) {
        castFn();
      }
      this.lastPlayedEvent = event;
    };
    return wrappedCastFn;
  }

  private rebuildFullSnapshot(
    event: fullSnapshotEvent & { timestamp: number },
  ) {
    mirror.map = rebuild(event.data.node, this.iframe.contentDocument!)[1];
    // avoid form submit to refresh the iframe
    off('submit', 'form', this.preventDefault, {
      document: this.iframe.contentDocument!,
    });
    on('submit', 'form', this.preventDefault, {
      document: this.iframe.contentDocument!,
    });
    // avoid a link click to refresh the iframe
    off('click', 'a', this.preventDefault, {
      document: this.iframe.contentDocument!,
    });
    on('click', 'a', this.preventDefault, {
      document: this.iframe.contentDocument!,
    });
  }

  private preventDefault(evt: Event) {
    evt.preventDefault();
  }

  private applyIncremental(d: incrementalData, isSync: boolean) {
    switch (d.source) {
      case IncrementalSource.Mutation: {
        d.removes.forEach(mutation => {
          const target = mirror.getNode(mutation.id);
          if (!target) {
            return;
          }
          const parent = (mirror.getNode(
            mutation.parentId!,
          ) as Node) as Element;
          // target may be removed with its parents before
          mirror.removeNodeFromMap(target);
          if (parent) {
            parent.removeChild(target);
          }
        });

        const missingNodeMap: missingNodeMap = {};
        d.adds.forEach(mutation => {
          const target = buildNodeWithSN(
            mutation.node,
            this.iframe.contentDocument!,
            mirror.map,
            true,
          ) as Node;
          const parent = (mirror.getNode(mutation.parentId) as Node) as Element;
          let previous: Node | null = null;
          let next: Node | null = null;
          if (mutation.previousId) {
            previous = mirror.getNode(mutation.previousId) as Node;
          }
          if (mutation.nextId) {
            next = mirror.getNode(mutation.nextId) as Node;
          }

          if (mutation.previousId === -1 || mutation.nextId === -1) {
            missingNodeMap[mutation.node.id] = {
              node: target,
              mutation,
            };
            return;
          }

          if (previous && previous.nextSibling) {
            parent.insertBefore(target, previous.nextSibling);
          } else if (next) {
            parent.insertBefore(target, next);
          } else {
            parent.appendChild(target);
          }

          if (mutation.previousId || mutation.nextId) {
            this.resolveMissingNode(missingNodeMap, parent, target, mutation);
          }
        });
        if (Object.keys(missingNodeMap).length) {
          console.warn('Found unresolved missing node map', missingNodeMap);
        }

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
        break;
      }
      case IncrementalSource.MouseMove:
        // skip mouse move in sync mode
        if (!isSync) {
          d.positions.forEach(p => {
            const action = {
              doAction: () => {
                this.mouse.style.left = `${p.x}px`;
                this.mouse.style.top = `${p.y}px`;
                const target = mirror.getNode(p.id);
                if (target) {
                  this.hoverElements((target as Node) as Element);
                }
              },
              delay: p.timeOffset,
            };
            this.timer.addAction(action);
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

  private resolveMissingNode(
    map: missingNodeMap,
    parent: Node,
    target: Node,
    targetMutation: addedNodeMutation,
  ) {
    const { previousId, nextId } = targetMutation;
    const previousInMap = previousId && map[previousId];
    const nextInMap = nextId && map[nextId];
    if (previousInMap || nextInMap) {
      const { node, mutation } = (previousInMap || nextInMap) as missingNode;
      if (previousInMap) {
        parent.insertBefore(node, target);
      } else {
        parent.insertBefore(node, target.nextSibling);
      }
      delete map[mutation.node.id];
      if (mutation.previousId || mutation.nextId) {
        this.resolveMissingNode(map, parent, node as Node, mutation);
      }
    }
  }

  private hoverElements(el: Element) {
    this.iframe
      .contentDocument!.querySelectorAll('.\\:hover')
      .forEach(hoveredEl => {
        hoveredEl.classList.remove(':hover');
      });
    let currentEl: Element | null = el;
    while (currentEl) {
      currentEl.classList.add(':hover');
      currentEl = currentEl.parentElement;
    }
  }
}
