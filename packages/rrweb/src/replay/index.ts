import {
  rebuild,
  buildNodeWithSN,
  NodeType,
  BuildCache,
  createCache,
  Mirror,
  createMirror,
} from 'rrweb-snapshot';
import {
  RRDocument,
  StyleRuleType,
  createOrGetNode,
  buildFromNode,
  buildFromDom,
  diff,
  getDefaultSN,
} from 'rrdom';
import type {
  RRNode,
  RRElement,
  RRStyleElement,
  RRIFrameElement,
  RRMediaElement,
  RRCanvasElement,
  ReplayerHandler,
  Mirror as RRDOMMirror,
  VirtualStyleRules,
} from 'rrdom';
import * as mittProxy from 'mitt';
import { polyfill as smoothscrollPolyfill } from './smoothscroll';
import { Timer } from './timer';
import { createPlayerService, createSpeedService } from './machine';
import {
  EventType,
  IncrementalSource,
  fullSnapshotEvent,
  eventWithTime,
  MouseInteractions,
  playerConfig,
  playerMetaData,
  viewportResizeDimension,
  missingNodeMap,
  addedNodeMutation,
  incrementalSnapshotEvent,
  incrementalData,
  ReplayerEvents,
  Handler,
  Emitter,
  MediaInteractions,
  metaEvent,
  mutationData,
  scrollData,
  inputData,
  canvasMutationData,
  styleValueWithPriority,
  mouseMovePos,
  IWindow,
  canvasMutationCommand,
  canvasMutationParam,
  canvasEventWithTime,
  CanvasContext,
} from '../types';
import {
  polyfill,
  queueToResolveTrees,
  iterateResolveTree,
  AppendedIframe,
  getBaseDimension,
  hasShadowRoot,
  isSerializedIframe,
  getNestedRule,
  getPositionsAndIndex,
  uniqueTextMutations,
} from '../utils';
import getInjectStyleRules from './styles/inject-style';
import './styles/style.css';
import canvasMutation from './canvas';
import { deserializeArg } from './canvas/deserialize-args';

const SKIP_TIME_THRESHOLD = 10 * 1000;
const SKIP_TIME_INTERVAL = 5 * 1000;

// https://github.com/rollup/rollup/issues/1267#issuecomment-296395734
const mitt = mittProxy.default || mittProxy;

const REPLAY_CONSOLE_PREFIX = '[replayer]';

const defaultMouseTailConfig = {
  duration: 500,
  lineCap: 'round',
  lineWidth: 3,
  strokeStyle: 'red',
} as const;

function indicatesTouchDevice(e: eventWithTime) {
  return (
    e.type == EventType.IncrementalSnapshot &&
    (e.data.source == IncrementalSource.TouchMove ||
      (e.data.source == IncrementalSource.MouseInteraction &&
        e.data.type == MouseInteractions.TouchStart))
  );
}

export class Replayer {
  public wrapper: HTMLDivElement;
  public iframe: HTMLIFrameElement;

  public service: ReturnType<typeof createPlayerService>;
  public speedService: ReturnType<typeof createSpeedService>;
  public get timer() {
    return this.service.state.context.timer;
  }

  public config: playerConfig;

  // In the fast-forward process, if the virtual-dom optimization is used, this flag value is true.
  public usingVirtualDom = false;
  public virtualDom: RRDocument = new RRDocument();

  private mouse: HTMLDivElement;
  private mouseTail: HTMLCanvasElement | null = null;
  private tailPositions: Array<{ x: number; y: number }> = [];

  private emitter: Emitter = mitt();

  private nextUserInteractionEvent: eventWithTime | null;

  private legacy_missingNodeRetryMap: missingNodeMap = {};

  // The replayer uses the cache to speed up replay and scrubbing.
  private cache: BuildCache = createCache();

  private imageMap: Map<eventWithTime | string, HTMLImageElement> = new Map();
  private canvasEventMap: Map<eventWithTime, canvasMutationParam> = new Map();

  private mirror: Mirror = createMirror();

  private firstFullSnapshot: eventWithTime | true | null = null;

  private newDocumentQueue: addedNodeMutation[] = [];

  private mousePos: mouseMovePos | null = null;
  private touchActive: boolean | null = null;

  constructor(
    events: Array<eventWithTime | string>,
    config?: Partial<playerConfig>,
  ) {
    if (!config?.liveMode && events.length < 2) {
      throw new Error('Replayer need at least 2 events.');
    }
    const defaultConfig: playerConfig = {
      speed: 1,
      maxSpeed: 360,
      root: document.body,
      loadTimeout: 0,
      skipInactive: false,
      showWarning: true,
      showDebug: false,
      blockClass: 'rr-block',
      liveMode: false,
      insertStyleRules: [],
      triggerFocus: true,
      UNSAFE_replayCanvas: false,
      pauseAnimation: true,
      mouseTail: defaultMouseTailConfig,
      useVirtualDom: true, // Virtual-dom optimization is enabled by default.
    };
    this.config = Object.assign({}, defaultConfig, config);

    this.handleResize = this.handleResize.bind(this);
    this.getCastFn = this.getCastFn.bind(this);
    this.applyEventsSynchronously = this.applyEventsSynchronously.bind(this);
    this.emitter.on(ReplayerEvents.Resize, this.handleResize as Handler);

    this.setupDom();

    this.emitter.on(ReplayerEvents.Flush, () => {
      if (this.usingVirtualDom) {
        const replayerHandler: ReplayerHandler = {
          mirror: this.mirror,
          applyCanvas: (
            canvasEvent: canvasEventWithTime,
            canvasMutationData: canvasMutationData,
            target: HTMLCanvasElement,
          ) => {
            void canvasMutation({
              event: canvasEvent,
              mutation: canvasMutationData,
              target,
              imageMap: this.imageMap,
              canvasEventMap: this.canvasEventMap,
              errorHandler: this.warnCanvasMutationFailed.bind(this),
              mirror: this.mirror,
              webRTCSignalCallback: this.config.webRTCSignalCallback,
            });
          },
          applyInput: this.applyInput.bind(this),
          applyScroll: this.applyScroll.bind(this),
        };
        diff(
          this.iframe.contentDocument!,
          this.virtualDom,
          replayerHandler,
          this.virtualDom.mirror,
        );
        this.virtualDom.destroyTree();
        this.usingVirtualDom = false;

        // If these legacy missing nodes haven't been resolved, they should be converted to real Nodes.
        if (Object.keys(this.legacy_missingNodeRetryMap).length) {
          for (const key in this.legacy_missingNodeRetryMap) {
            try {
              const value = this.legacy_missingNodeRetryMap[key];
              const realNode = createOrGetNode(
                value.node as RRNode,
                this.mirror,
                this.virtualDom.mirror,
              );
              diff(
                realNode,
                value.node as RRNode,
                replayerHandler,
                this.virtualDom.mirror,
              );
              value.node = realNode;
            } catch (error) {
              if (this.config.showWarning) {
                console.warn(error);
              }
            }
          }
        }
      }

      if (this.mousePos) {
        this.moveAndHover(
          this.mousePos.x,
          this.mousePos.y,
          this.mousePos.id,
          true,
          this.mousePos.debugData,
        );
      }
      this.mousePos = null;
    });
    this.emitter.on(ReplayerEvents.PlayBack, () => {
      this.firstFullSnapshot = null;
      this.mirror.reset();
    });

    const timer = new Timer([], config?.speed || defaultConfig.speed);
    this.service = createPlayerService(
      {
        events: events
          .map((e) => {
            if (config && config.unpackFn) {
              return config.unpackFn(e as string);
            }
            return e as eventWithTime;
          })
          .sort((a1, a2) => a1.timestamp - a2.timestamp),
        timer,
        timeOffset: 0,
        baselineTime: 0,
        lastPlayedEvent: null,
      },
      {
        getCastFn: this.getCastFn,
        applyEventsSynchronously: this.applyEventsSynchronously,
        emitter: this.emitter,
      },
    );
    this.service.start();
    this.service.subscribe((state) => {
      this.emitter.emit(ReplayerEvents.StateChange, {
        player: state,
      });
    });
    this.speedService = createSpeedService({
      normalSpeed: -1,
      timer,
    });
    this.speedService.start();
    this.speedService.subscribe((state) => {
      this.emitter.emit(ReplayerEvents.StateChange, {
        speed: state,
      });
    });

    // rebuild first full snapshot as the poster of the player
    // maybe we can cache it for performance optimization
    const firstMeta = this.service.state.context.events.find(
      (e) => e.type === EventType.Meta,
    );
    const firstFullsnapshot = this.service.state.context.events.find(
      (e) => e.type === EventType.FullSnapshot,
    );
    if (firstMeta) {
      const { width, height } = firstMeta.data as metaEvent['data'];
      setTimeout(() => {
        this.emitter.emit(ReplayerEvents.Resize, {
          width,
          height,
        });
      }, 0);
    }
    if (firstFullsnapshot) {
      setTimeout(() => {
        // when something has been played, there is no need to rebuild poster
        if (this.firstFullSnapshot) {
          // true if any other fullSnapshot has been executed by Timer already
          return;
        }
        this.firstFullSnapshot = firstFullsnapshot;
        this.rebuildFullSnapshot(
          firstFullsnapshot as fullSnapshotEvent & { timestamp: number },
        );
        this.iframe.contentWindow!.scrollTo(
          (firstFullsnapshot as fullSnapshotEvent).data.initialOffset,
        );
      }, 1);
    }
    if (this.service.state.context.events.find(indicatesTouchDevice)) {
      this.mouse.classList.add('touch-device');
    }
  }

  public on(event: string, handler: Handler) {
    this.emitter.on(event, handler);
    return this;
  }

  public off(event: string, handler: Handler) {
    this.emitter.off(event, handler);
    return this;
  }

  public setConfig(config: Partial<playerConfig>) {
    Object.keys(config).forEach((key) => {
      const newConfigValue = config[key as keyof playerConfig];
      (this.config as Record<keyof playerConfig, typeof newConfigValue>)[
        key as keyof playerConfig
      ] = config[key as keyof playerConfig];
    });
    if (!this.config.skipInactive) {
      this.backToNormal();
    }
    if (typeof config.speed !== 'undefined') {
      this.speedService.send({
        type: 'SET_SPEED',
        payload: {
          speed: config.speed,
        },
      });
    }
    if (typeof config.mouseTail !== 'undefined') {
      if (config.mouseTail === false) {
        if (this.mouseTail) {
          this.mouseTail.style.display = 'none';
        }
      } else {
        if (!this.mouseTail) {
          this.mouseTail = document.createElement('canvas');
          this.mouseTail.width = Number.parseFloat(this.iframe.width);
          this.mouseTail.height = Number.parseFloat(this.iframe.height);
          this.mouseTail.classList.add('replayer-mouse-tail');
          this.wrapper.insertBefore(this.mouseTail, this.iframe);
        }
        this.mouseTail.style.display = 'inherit';
      }
    }
  }

  public getMetaData(): playerMetaData {
    const firstEvent = this.service.state.context.events[0];
    const lastEvent = this.service.state.context.events[
      this.service.state.context.events.length - 1
    ];
    return {
      startTime: firstEvent.timestamp,
      endTime: lastEvent.timestamp,
      totalTime: lastEvent.timestamp - firstEvent.timestamp,
    };
  }

  public getCurrentTime(): number {
    return this.timer.timeOffset + this.getTimeOffset();
  }

  public getTimeOffset(): number {
    const { baselineTime, events } = this.service.state.context;
    return baselineTime - events[0].timestamp;
  }

  public getMirror(): Mirror {
    return this.mirror;
  }

  /**
   * This API was designed to be used as play at any time offset.
   * Since we minimized the data collected from recorder, we do not
   * have the ability of undo an event.
   * So the implementation of play at any time offset will always iterate
   * all of the events, cast event before the offset synchronously
   * and cast event after the offset asynchronously with timer.
   * @param timeOffset - number
   */
  public play(timeOffset = 0) {
    if (this.service.state.matches('paused')) {
      this.service.send({ type: 'PLAY', payload: { timeOffset } });
    } else {
      this.service.send({ type: 'PAUSE' });
      this.service.send({ type: 'PLAY', payload: { timeOffset } });
    }
    this.iframe.contentDocument
      ?.getElementsByTagName('html')[0]
      ?.classList.remove('rrweb-paused');
    this.emitter.emit(ReplayerEvents.Start);
  }

  public pause(timeOffset?: number) {
    if (timeOffset === undefined && this.service.state.matches('playing')) {
      this.service.send({ type: 'PAUSE' });
    }
    if (typeof timeOffset === 'number') {
      this.play(timeOffset);
      this.service.send({ type: 'PAUSE' });
    }
    this.iframe.contentDocument
      ?.getElementsByTagName('html')[0]
      ?.classList.add('rrweb-paused');
    this.emitter.emit(ReplayerEvents.Pause);
  }

  public resume(timeOffset = 0) {
    console.warn(
      `The 'resume' will be departed in 1.0. Please use 'play' method which has the same interface.`,
    );
    this.play(timeOffset);
    this.emitter.emit(ReplayerEvents.Resume);
  }

  public startLive(baselineTime?: number) {
    this.service.send({ type: 'TO_LIVE', payload: { baselineTime } });
  }

  public addEvent(rawEvent: eventWithTime | string) {
    const event = this.config.unpackFn
      ? this.config.unpackFn(rawEvent as string)
      : (rawEvent as eventWithTime);
    if (indicatesTouchDevice(event)) {
      this.mouse.classList.add('touch-device');
    }
    void Promise.resolve().then(() =>
      this.service.send({ type: 'ADD_EVENT', payload: { event } }),
    );
  }

  public enableInteract() {
    this.iframe.setAttribute('scrolling', 'auto');
    this.iframe.style.pointerEvents = 'auto';
  }

  public disableInteract() {
    this.iframe.setAttribute('scrolling', 'no');
    this.iframe.style.pointerEvents = 'none';
  }

  /**
   * Empties the replayer's cache and reclaims memory.
   * The replayer will use this cache to speed up the playback.
   */
  public resetCache() {
    this.cache = createCache();
  }

  private setupDom() {
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('replayer-wrapper');
    this.config.root.appendChild(this.wrapper);

    this.mouse = document.createElement('div');
    this.mouse.classList.add('replayer-mouse');
    this.wrapper.appendChild(this.mouse);

    if (this.config.mouseTail !== false) {
      this.mouseTail = document.createElement('canvas');
      this.mouseTail.classList.add('replayer-mouse-tail');
      this.mouseTail.style.display = 'inherit';
      this.wrapper.appendChild(this.mouseTail);
    }

    this.iframe = document.createElement('iframe');
    const attributes = ['allow-same-origin'];
    if (this.config.UNSAFE_replayCanvas) {
      attributes.push('allow-scripts');
    }
    // hide iframe before first meta event
    this.iframe.style.display = 'none';
    this.iframe.setAttribute('sandbox', attributes.join(' '));
    this.disableInteract();
    this.wrapper.appendChild(this.iframe);
    if (this.iframe.contentWindow && this.iframe.contentDocument) {
      smoothscrollPolyfill(
        this.iframe.contentWindow,
        this.iframe.contentDocument,
      );

      polyfill(this.iframe.contentWindow as IWindow);
    }
  }

  private handleResize = (dimension: viewportResizeDimension) => {
    this.iframe.style.display = 'inherit';
    for (const el of [this.mouseTail, this.iframe]) {
      if (!el) {
        continue;
      }
      el.setAttribute('width', String(dimension.width));
      el.setAttribute('height', String(dimension.height));
    }
  };

  private applyEventsSynchronously = (events: Array<eventWithTime>) => {
    for (const event of events) {
      switch (event.type) {
        case EventType.DomContentLoaded:
        case EventType.Load:
        case EventType.Custom:
          continue;
        case EventType.FullSnapshot:
        case EventType.Meta:
        case EventType.Plugin:
        case EventType.IncrementalSnapshot:
          break;
        default:
          break;
      }
      const castFn = this.getCastFn(event, true);
      castFn();
    }
    if (this.touchActive === true) {
      this.mouse.classList.add('touch-active');
    } else if (this.touchActive === false) {
      this.mouse.classList.remove('touch-active');
    }
    this.touchActive = null;
  };

  private getCastFn = (event: eventWithTime, isSync = false) => {
    let castFn: undefined | (() => void);
    switch (event.type) {
      case EventType.DomContentLoaded:
      case EventType.Load:
        break;
      case EventType.Custom:
        castFn = () => {
          /**
           * emit custom-event and pass the event object.
           *
           * This will add more value to the custom event and allows the client to react for custom-event.
           */
          this.emitter.emit(ReplayerEvents.CustomEvent, event);
        };
        break;
      case EventType.Meta:
        castFn = () =>
          this.emitter.emit(ReplayerEvents.Resize, {
            width: event.data.width,
            height: event.data.height,
          });
        break;
      case EventType.FullSnapshot:
        castFn = () => {
          if (this.firstFullSnapshot) {
            if (this.firstFullSnapshot === event) {
              // we've already built this exact FullSnapshot when the player was mounted, and haven't built any other FullSnapshot since
              this.firstFullSnapshot = true; // forget as we might need to re-execute this FullSnapshot later e.g. to rebuild after scrubbing
              return;
            }
          } else {
            // Timer (requestAnimationFrame) can be faster than setTimeout(..., 1)
            this.firstFullSnapshot = true;
          }
          this.rebuildFullSnapshot(event, isSync);
          this.iframe.contentWindow!.scrollTo(event.data.initialOffset);
        };
        break;
      case EventType.IncrementalSnapshot:
        castFn = () => {
          this.applyIncremental(event, isSync);
          if (isSync) {
            // do not check skip in sync
            return;
          }
          if (event === this.nextUserInteractionEvent) {
            this.nextUserInteractionEvent = null;
            this.backToNormal();
          }
          if (this.config.skipInactive && !this.nextUserInteractionEvent) {
            for (const _event of this.service.state.context.events) {
              if (_event.timestamp <= event.timestamp) {
                continue;
              }
              if (this.isUserInteraction(_event)) {
                if (
                  _event.delay! - event.delay! >
                  SKIP_TIME_THRESHOLD *
                    this.speedService.state.context.timer.speed
                ) {
                  this.nextUserInteractionEvent = _event;
                }
                break;
              }
            }
            if (this.nextUserInteractionEvent) {
              const skipTime =
                this.nextUserInteractionEvent.delay! - event.delay!;
              const payload = {
                speed: Math.min(
                  Math.round(skipTime / SKIP_TIME_INTERVAL),
                  this.config.maxSpeed,
                ),
              };
              this.speedService.send({ type: 'FAST_FORWARD', payload });
              this.emitter.emit(ReplayerEvents.SkipStart, payload);
            }
          }
        };
        break;
      default:
    }
    const wrappedCastFn = () => {
      if (castFn) {
        castFn();
      }

      for (const plugin of this.config.plugins || []) {
        plugin.handler(event, isSync, { replayer: this });
      }

      this.service.send({ type: 'CAST_EVENT', payload: { event } });

      // events are kept sorted by timestamp, check if this is the last event
      const last_index = this.service.state.context.events.length - 1;
      if (event === this.service.state.context.events[last_index]) {
        const finish = () => {
          if (last_index < this.service.state.context.events.length - 1) {
            // more events have been added since the setTimeout
            return;
          }
          this.backToNormal();
          this.service.send('END');
          this.emitter.emit(ReplayerEvents.Finish);
        };
        if (
          event.type === EventType.IncrementalSnapshot &&
          event.data.source === IncrementalSource.MouseMove &&
          event.data.positions.length
        ) {
          // defer finish event if the last event is a mouse move
          setTimeout(() => {
            finish();
          }, Math.max(0, -event.data.positions[0].timeOffset + 50)); // Add 50 to make sure the timer would check the last mousemove event. Otherwise, the timer may be stopped by the service before checking the last event.
        } else {
          finish();
        }
      }

      this.emitter.emit(ReplayerEvents.EventCast, event);
    };
    return wrappedCastFn;
  };

  private rebuildFullSnapshot(
    event: fullSnapshotEvent & { timestamp: number },
    isSync = false,
  ) {
    if (!this.iframe.contentDocument) {
      return console.warn('Looks like your replayer has been destroyed.');
    }
    if (Object.keys(this.legacy_missingNodeRetryMap).length) {
      console.warn(
        'Found unresolved missing node map',
        this.legacy_missingNodeRetryMap,
      );
    }
    this.legacy_missingNodeRetryMap = {};
    const collected: AppendedIframe[] = [];
    rebuild(event.data.node, {
      doc: this.iframe.contentDocument,
      afterAppend: (builtNode) => {
        this.collectIframeAndAttachDocument(collected, builtNode);
      },
      cache: this.cache,
      mirror: this.mirror,
    });
    for (const { mutationInQueue, builtNode } of collected) {
      this.attachDocumentToIframe(mutationInQueue, builtNode);
      this.newDocumentQueue = this.newDocumentQueue.filter(
        (m) => m !== mutationInQueue,
      );
    }
    const { documentElement, head } = this.iframe.contentDocument;
    this.insertStyleRules(documentElement, head);
    if (!this.service.state.matches('playing')) {
      this.iframe.contentDocument
        .getElementsByTagName('html')[0]
        .classList.add('rrweb-paused');
    }
    this.emitter.emit(ReplayerEvents.FullsnapshotRebuilded, event);
    if (!isSync) {
      this.waitForStylesheetLoad();
    }
    if (this.config.UNSAFE_replayCanvas) {
      void this.preloadAllImages();
    }
  }

  private insertStyleRules(
    documentElement: HTMLElement | RRElement,
    head: HTMLHeadElement | RRElement,
  ) {
    const injectStylesRules = getInjectStyleRules(
      this.config.blockClass,
    ).concat(this.config.insertStyleRules);
    if (this.config.pauseAnimation) {
      injectStylesRules.push(
        'html.rrweb-paused *, html.rrweb-paused *:before, html.rrweb-paused *:after { animation-play-state: paused !important; }',
      );
    }
    if (this.usingVirtualDom) {
      const styleEl = this.virtualDom.createElement('style');
      this.virtualDom.mirror.add(
        styleEl,
        getDefaultSN(styleEl, this.virtualDom.unserializedId),
      );
      (documentElement as RRElement)!.insertBefore(styleEl, head as RRElement);
      for (let idx = 0; idx < injectStylesRules.length; idx++) {
        // push virtual styles
        styleEl.rules.push({
          cssText: injectStylesRules[idx],
          type: StyleRuleType.Insert,
          index: idx,
        });
      }
    } else {
      const styleEl = document.createElement('style');
      (documentElement as HTMLElement)!.insertBefore(
        styleEl,
        head as HTMLHeadElement,
      );
      for (let idx = 0; idx < injectStylesRules.length; idx++) {
        styleEl.sheet!.insertRule(injectStylesRules[idx], idx);
      }
    }
  }

  private attachDocumentToIframe(
    mutation: addedNodeMutation,
    iframeEl: HTMLIFrameElement | RRIFrameElement,
  ) {
    const mirror: RRDOMMirror | Mirror = this.usingVirtualDom
      ? this.virtualDom.mirror
      : this.mirror;
    type TNode = typeof mirror extends Mirror ? Node : RRNode;
    type TMirror = typeof mirror extends Mirror ? Mirror : RRDOMMirror;

    const collected: AppendedIframe[] = [];
    buildNodeWithSN(mutation.node, {
      doc: iframeEl.contentDocument! as Document,
      mirror: mirror as Mirror,
      hackCss: true,
      skipChild: false,
      afterAppend: (builtNode) => {
        this.collectIframeAndAttachDocument(collected, builtNode);
        const sn = (mirror as TMirror).getMeta((builtNode as unknown) as TNode);
        if (
          sn?.type === NodeType.Element &&
          sn?.tagName.toUpperCase() === 'HTML'
        ) {
          const { documentElement, head } = iframeEl.contentDocument!;
          this.insertStyleRules(
            documentElement as HTMLElement | RRElement,
            head as HTMLElement | RRElement,
          );
        }
      },
      cache: this.cache,
    });
    for (const { mutationInQueue, builtNode } of collected) {
      this.attachDocumentToIframe(mutationInQueue, builtNode);
      this.newDocumentQueue = this.newDocumentQueue.filter(
        (m) => m !== mutationInQueue,
      );
    }
  }

  private collectIframeAndAttachDocument(
    collected: AppendedIframe[],
    builtNode: Node,
  ) {
    if (isSerializedIframe(builtNode, this.mirror)) {
      const mutationInQueue = this.newDocumentQueue.find(
        (m) => m.parentId === this.mirror.getId(builtNode),
      );
      if (mutationInQueue) {
        collected.push({
          mutationInQueue,
          builtNode: builtNode as HTMLIFrameElement,
        });
      }
    }
  }

  /**
   * pause when loading style sheet, resume when loaded all timeout exceed
   */
  private waitForStylesheetLoad() {
    const head = this.iframe.contentDocument?.head;
    if (head) {
      const unloadSheets: Set<HTMLLinkElement> = new Set();
      let timer: ReturnType<typeof setTimeout> | -1;
      let beforeLoadState = this.service.state;
      const stateHandler = () => {
        beforeLoadState = this.service.state;
      };
      this.emitter.on(ReplayerEvents.Start, stateHandler);
      this.emitter.on(ReplayerEvents.Pause, stateHandler);
      const unsubscribe = () => {
        this.emitter.off(ReplayerEvents.Start, stateHandler);
        this.emitter.off(ReplayerEvents.Pause, stateHandler);
      };
      head
        .querySelectorAll('link[rel="stylesheet"]')
        .forEach((css: HTMLLinkElement) => {
          if (!css.sheet) {
            unloadSheets.add(css);
            css.addEventListener('load', () => {
              unloadSheets.delete(css);
              // all loaded and timer not released yet
              if (unloadSheets.size === 0 && timer !== -1) {
                if (beforeLoadState.matches('playing')) {
                  this.play(this.getCurrentTime());
                }
                this.emitter.emit(ReplayerEvents.LoadStylesheetEnd);
                if (timer) {
                  clearTimeout(timer);
                }
                unsubscribe();
              }
            });
          }
        });

      if (unloadSheets.size > 0) {
        // find some unload sheets after iterate
        this.service.send({ type: 'PAUSE' });
        this.emitter.emit(ReplayerEvents.LoadStylesheetStart);
        timer = setTimeout(() => {
          if (beforeLoadState.matches('playing')) {
            this.play(this.getCurrentTime());
          }
          // mark timer was called
          timer = -1;
          unsubscribe();
        }, this.config.loadTimeout);
      }
    }
  }

  /**
   * pause when there are some canvas drawImage args need to be loaded
   */
  private async preloadAllImages(): Promise<void[]> {
    let beforeLoadState = this.service.state;
    const stateHandler = () => {
      beforeLoadState = this.service.state;
    };
    this.emitter.on(ReplayerEvents.Start, stateHandler);
    this.emitter.on(ReplayerEvents.Pause, stateHandler);
    const promises: Promise<void>[] = [];
    for (const event of this.service.state.context.events) {
      if (
        event.type === EventType.IncrementalSnapshot &&
        event.data.source === IncrementalSource.CanvasMutation
      ) {
        promises.push(
          this.deserializeAndPreloadCanvasEvents(event.data, event),
        );
        const commands =
          'commands' in event.data ? event.data.commands : [event.data];
        commands.forEach((c) => {
          this.preloadImages(c, event);
        });
      }
    }
    return Promise.all(promises);
  }

  private preloadImages(data: canvasMutationCommand, event: eventWithTime) {
    if (
      data.property === 'drawImage' &&
      typeof data.args[0] === 'string' &&
      !this.imageMap.has(event)
    ) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const imgd = ctx?.createImageData(canvas.width, canvas.height);
      let d = imgd?.data;
      d = JSON.parse(data.args[0]) as Uint8ClampedArray;
      ctx?.putImageData(imgd!, 0, 0);
    }
  }
  private async deserializeAndPreloadCanvasEvents(
    data: canvasMutationData,
    event: eventWithTime,
  ) {
    if (!this.canvasEventMap.has(event)) {
      const status = {
        isUnchanged: true,
      };
      if ('commands' in data) {
        const commands = await Promise.all(
          data.commands.map(async (c) => {
            const args = await Promise.all(
              c.args.map(deserializeArg(this.imageMap, null, status)),
            );
            return { ...c, args };
          }),
        );
        if (status.isUnchanged === false)
          this.canvasEventMap.set(event, { ...data, commands });
      } else {
        const args = await Promise.all(
          data.args.map(deserializeArg(this.imageMap, null, status)),
        );
        if (status.isUnchanged === false)
          this.canvasEventMap.set(event, { ...data, args });
      }
    }
  }

  private applyIncremental(
    e: incrementalSnapshotEvent & { timestamp: number; delay?: number },
    isSync: boolean,
  ) {
    const { data: d } = e;
    switch (d.source) {
      case IncrementalSource.Mutation: {
        try {
          this.applyMutation(d, isSync);
        } catch (error) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
          this.warn(`Exception in mutation ${error.message || error}`, d);
        }
        break;
      }
      case IncrementalSource.Drag:
      case IncrementalSource.TouchMove:
      case IncrementalSource.MouseMove:
        if (isSync) {
          const lastPosition = d.positions[d.positions.length - 1];
          this.mousePos = {
            x: lastPosition.x,
            y: lastPosition.y,
            id: lastPosition.id,
            debugData: d,
          };
        } else {
          d.positions.forEach((p) => {
            const action = {
              doAction: () => {
                this.moveAndHover(p.x, p.y, p.id, isSync, d);
              },
              delay:
                p.timeOffset +
                e.timestamp -
                this.service.state.context.baselineTime,
            };
            this.timer.addAction(action);
          });
          // add a dummy action to keep timer alive
          this.timer.addAction({
            doAction() {
              //
            },
            delay: e.delay! - d.positions[0]?.timeOffset,
          });
        }
        break;
      case IncrementalSource.MouseInteraction: {
        /**
         * Same as the situation of missing input target.
         */
        if (d.id === -1 || isSync) {
          break;
        }
        const event = new Event(MouseInteractions[d.type].toLowerCase());
        const target = this.mirror.getNode(d.id);
        if (!target) {
          return this.debugNodeNotFound(d, d.id);
        }
        this.emitter.emit(ReplayerEvents.MouseInteraction, {
          type: d.type,
          target,
        });
        const { triggerFocus } = this.config;
        switch (d.type) {
          case MouseInteractions.Blur:
            if ('blur' in (target as HTMLElement)) {
              (target as HTMLElement).blur();
            }
            break;
          case MouseInteractions.Focus:
            if (triggerFocus && (target as HTMLElement).focus) {
              (target as HTMLElement).focus({
                preventScroll: true,
              });
            }
            break;
          case MouseInteractions.Click:
          case MouseInteractions.TouchStart:
          case MouseInteractions.TouchEnd:
            if (isSync) {
              if (d.type === MouseInteractions.TouchStart) {
                this.touchActive = true;
              } else if (d.type === MouseInteractions.TouchEnd) {
                this.touchActive = false;
              }
              this.mousePos = {
                x: d.x,
                y: d.y,
                id: d.id,
                debugData: d,
              };
            } else {
              if (d.type === MouseInteractions.TouchStart) {
                // don't draw a trail as user has lifted finger and is placing at a new point
                this.tailPositions.length = 0;
              }
              this.moveAndHover(d.x, d.y, d.id, isSync, d);
              if (d.type === MouseInteractions.Click) {
                /*
                 * don't want target.click() here as could trigger an iframe navigation
                 * instead any effects of the click should already be covered by mutations
                 */
                /*
                 * removal and addition of .active class (along with void line to trigger repaint)
                 * triggers the 'click' css animation in styles/style.css
                 */
                this.mouse.classList.remove('active');
                void this.mouse.offsetWidth;
                this.mouse.classList.add('active');
              } else if (d.type === MouseInteractions.TouchStart) {
                void this.mouse.offsetWidth; // needed for the position update of moveAndHover to apply without the .touch-active transition
                this.mouse.classList.add('touch-active');
              } else if (d.type === MouseInteractions.TouchEnd) {
                this.mouse.classList.remove('touch-active');
              }
            }
            break;
          case MouseInteractions.TouchCancel:
            if (isSync) {
              this.touchActive = false;
            } else {
              this.mouse.classList.remove('touch-active');
            }
            break;
          default:
            target.dispatchEvent(event);
        }
        break;
      }
      case IncrementalSource.Scroll: {
        /**
         * Same as the situation of missing input target.
         */
        if (d.id === -1) {
          break;
        }
        if (this.usingVirtualDom) {
          const target = this.virtualDom.mirror.getNode(d.id) as RRElement;
          if (!target) {
            return this.debugNodeNotFound(d, d.id);
          }
          target.scrollData = d;
          break;
        }
        // Use isSync rather than this.usingVirtualDom because not every fast-forward process uses virtual dom optimization.
        this.applyScroll(d, isSync);
        break;
      }
      case IncrementalSource.ViewportResize:
        this.emitter.emit(ReplayerEvents.Resize, {
          width: d.width,
          height: d.height,
        });
        break;
      case IncrementalSource.Input: {
        /**
         * Input event on an unserialized node usually means the event
         * was synchrony triggered programmatically after the node was
         * created. This means there was not an user observable interaction
         * and we do not need to replay it.
         */
        if (d.id === -1) {
          break;
        }
        if (this.usingVirtualDom) {
          const target = this.virtualDom.mirror.getNode(d.id) as RRElement;
          if (!target) {
            return this.debugNodeNotFound(d, d.id);
          }
          target.inputData = d;
          break;
        }
        this.applyInput(d);
        break;
      }
      case IncrementalSource.MediaInteraction: {
        const target = this.usingVirtualDom
          ? this.virtualDom.mirror.getNode(d.id)
          : this.mirror.getNode(d.id);
        if (!target) {
          return this.debugNodeNotFound(d, d.id);
        }
        const mediaEl = target as HTMLMediaElement | RRMediaElement;
        try {
          if (d.currentTime) {
            mediaEl.currentTime = d.currentTime;
          }
          if (d.volume) {
            mediaEl.volume = d.volume;
          }
          if (d.muted) {
            mediaEl.muted = d.muted;
          }
          if (d.type === MediaInteractions.Pause) {
            mediaEl.pause();
          }
          if (d.type === MediaInteractions.Play) {
            // remove listener for 'canplay' event because play() is async and returns a promise
            // i.e. media will evntualy start to play when data is loaded
            // 'canplay' event fires even when currentTime attribute changes which may lead to
            // unexpeted behavior
            void mediaEl.play();
          }
        } catch (error) {
          if (this.config.showWarning) {
            console.warn(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
              `Failed to replay media interactions: ${error.message || error}`,
            );
          }
        }
        break;
      }
      case IncrementalSource.StyleSheetRule: {
        if (this.usingVirtualDom) {
          const target = this.virtualDom.mirror.getNode(d.id) as RRStyleElement;
          if (!target) {
            return this.debugNodeNotFound(d, d.id);
          }
          const rules: VirtualStyleRules = target.rules;
          d.adds?.forEach(({ rule, index: nestedIndex }) =>
            rules?.push({
              cssText: rule,
              index: nestedIndex,
              type: StyleRuleType.Insert,
            }),
          );
          d.removes?.forEach(({ index: nestedIndex }) =>
            rules?.push({ index: nestedIndex, type: StyleRuleType.Remove }),
          );
        } else {
          const target = this.mirror.getNode(d.id);
          if (!target) {
            return this.debugNodeNotFound(d, d.id);
          }
          const styleSheet = (target as HTMLStyleElement).sheet!;
          d.adds?.forEach(({ rule, index: nestedIndex }) => {
            try {
              if (Array.isArray(nestedIndex)) {
                const { positions, index } = getPositionsAndIndex(nestedIndex);
                const nestedRule = getNestedRule(
                  styleSheet.cssRules,
                  positions,
                );
                nestedRule.insertRule(rule, index);
              } else {
                const index =
                  nestedIndex === undefined
                    ? undefined
                    : Math.min(nestedIndex, styleSheet.cssRules.length);
                styleSheet.insertRule(rule, index);
              }
            } catch (e) {
              /**
               * sometimes we may capture rules with browser prefix
               * insert rule with prefixs in other browsers may cause Error
               */
              /**
               * accessing styleSheet rules may cause SecurityError
               * for specific access control settings
               */
            }
          });

          d.removes?.forEach(({ index: nestedIndex }) => {
            try {
              if (Array.isArray(nestedIndex)) {
                const { positions, index } = getPositionsAndIndex(nestedIndex);
                const nestedRule = getNestedRule(
                  styleSheet.cssRules,
                  positions,
                );
                nestedRule.deleteRule(index || 0);
              } else {
                styleSheet?.deleteRule(nestedIndex);
              }
            } catch (e) {
              /**
               * same as insertRule
               */
            }
          });
        }
        break;
      }
      case IncrementalSource.StyleDeclaration: {
        if (this.usingVirtualDom) {
          const target = this.virtualDom.mirror.getNode(d.id) as RRStyleElement;
          if (!target) {
            return this.debugNodeNotFound(d, d.id);
          }
          const rules: VirtualStyleRules = target.rules;
          d.set &&
            rules.push({
              type: StyleRuleType.SetProperty,
              index: d.index,
              ...d.set,
            });
          d.remove &&
            rules.push({
              type: StyleRuleType.RemoveProperty,
              index: d.index,
              ...d.remove,
            });
        } else {
          const target = (this.mirror.getNode(
            d.id,
          ) as Node) as HTMLStyleElement;
          if (!target) {
            return this.debugNodeNotFound(d, d.id);
          }
          const styleSheet = target.sheet!;
          if (d.set) {
            const rule = (getNestedRule(
              styleSheet.rules,
              d.index,
            ) as unknown) as CSSStyleRule;
            rule.style.setProperty(d.set.property, d.set.value, d.set.priority);
          }

          if (d.remove) {
            const rule = (getNestedRule(
              styleSheet.rules,
              d.index,
            ) as unknown) as CSSStyleRule;
            rule.style.removeProperty(d.remove.property);
          }
        }
        break;
      }
      case IncrementalSource.CanvasMutation: {
        if (!this.config.UNSAFE_replayCanvas) {
          return;
        }
        if (this.usingVirtualDom) {
          const target = this.virtualDom.mirror.getNode(
            d.id,
          ) as RRCanvasElement;
          if (!target) {
            return this.debugNodeNotFound(d, d.id);
          }
          target.canvasMutations.push({
            event: e as canvasEventWithTime,
            mutation: d,
          });
        } else {
          const target = this.mirror.getNode(d.id);
          if (!target) {
            return this.debugNodeNotFound(d, d.id);
          }
          void canvasMutation({
            event: e,
            mutation: d,
            target: target as HTMLCanvasElement,
            imageMap: this.imageMap,
            canvasEventMap: this.canvasEventMap,
            errorHandler: this.warnCanvasMutationFailed.bind(this),
            mirror: this.mirror,
          });
        }
        break;
      }
      case IncrementalSource.Font: {
        try {
          const fontFace = new FontFace(
            d.family,
            d.buffer
              ? new Uint8Array(JSON.parse(d.fontSource) as Iterable<number>)
              : d.fontSource,
            d.descriptors,
          );
          this.iframe.contentDocument?.fonts.add(fontFace);
        } catch (error) {
          if (this.config.showWarning) {
            console.warn(error);
          }
        }
        break;
      }
      default:
    }
  }

  private applyMutation(d: mutationData, isSync: boolean) {
    // Only apply virtual dom optimization if the fast-forward process has node mutation. Because the cost of creating a virtual dom tree and executing the diff algorithm is usually higher than directly applying other kind of events.
    if (this.config.useVirtualDom && !this.usingVirtualDom && isSync) {
      this.usingVirtualDom = true;
      buildFromDom(this.iframe.contentDocument!, this.mirror, this.virtualDom);
      // If these legacy missing nodes haven't been resolved, they should be converted to virtual nodes.
      if (Object.keys(this.legacy_missingNodeRetryMap).length) {
        for (const key in this.legacy_missingNodeRetryMap) {
          try {
            const value = this.legacy_missingNodeRetryMap[key];
            const virtualNode = buildFromNode(
              value.node as Node,
              this.virtualDom,
              this.mirror,
            );
            if (virtualNode) value.node = virtualNode;
          } catch (error) {
            if (this.config.showWarning) {
              console.warn(error);
            }
          }
        }
      }
    }
    const mirror = this.usingVirtualDom ? this.virtualDom.mirror : this.mirror;
    type TNode = typeof mirror extends Mirror ? Node : RRNode;

    d.removes.forEach((mutation) => {
      const target = mirror.getNode(mutation.id);
      if (!target) {
        if (d.removes.find((r) => r.id === mutation.parentId)) {
          // no need to warn, parent was already removed
          return;
        }
        return this.warnNodeNotFound(d, mutation.id);
      }
      let parent: Node | null | ShadowRoot | RRNode = mirror.getNode(
        mutation.parentId,
      );
      if (!parent) {
        return this.warnNodeNotFound(d, mutation.parentId);
      }
      if (mutation.isShadow && hasShadowRoot(parent as Node)) {
        parent = (parent as Element | RRElement).shadowRoot;
      }
      // target may be removed with its parents before
      mirror.removeNodeFromMap(target as Node & RRNode);
      if (parent)
        try {
          parent.removeChild(target as Node & RRNode);
          /**
           * https://github.com/rrweb-io/rrweb/pull/887
           * Remove any virtual style rules for stylesheets if a child text node is removed.
           */
          if (
            this.usingVirtualDom &&
            target.nodeName === '#text' &&
            parent.nodeName === 'STYLE' &&
            (parent as RRStyleElement).rules?.length > 0
          )
            (parent as RRStyleElement).rules = [];
        } catch (error) {
          if (error instanceof DOMException) {
            this.warn(
              'parent could not remove child in mutation',
              parent,
              target,
              d,
            );
          } else {
            throw error;
          }
        }
    });

    const legacy_missingNodeMap: missingNodeMap = {
      ...this.legacy_missingNodeRetryMap,
    };
    const queue: addedNodeMutation[] = [];

    // next not present at this moment
    const nextNotInDOM = (mutation: addedNodeMutation) => {
      let next: TNode | null = null;
      if (mutation.nextId) {
        next = mirror.getNode(mutation.nextId) as TNode | null;
      }
      // next not present at this moment
      if (
        mutation.nextId !== null &&
        mutation.nextId !== undefined &&
        mutation.nextId !== -1 &&
        !next
      ) {
        return true;
      }
      return false;
    };

    const appendNode = (mutation: addedNodeMutation) => {
      if (!this.iframe.contentDocument) {
        return console.warn('Looks like your replayer has been destroyed.');
      }
      let parent: Node | null | ShadowRoot | RRNode = mirror.getNode(
        mutation.parentId,
      );
      if (!parent) {
        if (mutation.node.type === NodeType.Document) {
          // is newly added document, maybe the document node of an iframe
          return this.newDocumentQueue.push(mutation);
        }
        return queue.push(mutation);
      }

      if (mutation.node.isShadow) {
        // If the parent is attached a shadow dom after it's created, it won't have a shadow root.
        if (!hasShadowRoot(parent)) {
          (parent as Element | RRElement).attachShadow({ mode: 'open' });
          parent = (parent as Element | RRElement).shadowRoot! as Node | RRNode;
        } else parent = parent.shadowRoot as Node | RRNode;
      }

      let previous: Node | RRNode | null = null;
      let next: Node | RRNode | null = null;
      if (mutation.previousId) {
        previous = mirror.getNode(mutation.previousId);
      }
      if (mutation.nextId) {
        next = mirror.getNode(mutation.nextId);
      }
      if (nextNotInDOM(mutation)) {
        return queue.push(mutation);
      }

      if (mutation.node.rootId && !mirror.getNode(mutation.node.rootId)) {
        return;
      }

      const targetDoc = mutation.node.rootId
        ? mirror.getNode(mutation.node.rootId)
        : this.usingVirtualDom
        ? this.virtualDom
        : this.iframe.contentDocument;
      if (isSerializedIframe<typeof parent>(parent, mirror)) {
        this.attachDocumentToIframe(
          mutation,
          parent as HTMLIFrameElement | RRIFrameElement,
        );
        return;
      }
      const target = buildNodeWithSN(mutation.node, {
        doc: targetDoc as Document, // can be Document or RRDocument
        mirror: mirror as Mirror, // can be this.mirror or virtualDom.mirror
        skipChild: true,
        hackCss: true,
        cache: this.cache,
      }) as Node | RRNode;

      // legacy data, we should not have -1 siblings any more
      if (mutation.previousId === -1 || mutation.nextId === -1) {
        legacy_missingNodeMap[mutation.node.id] = {
          node: target,
          mutation,
        };
        return;
      }

      // Typescripts type system is not smart enough
      // to understand what is going on with the types below
      type TNode = typeof mirror extends Mirror ? Node : RRNode;
      type TMirror = typeof mirror extends Mirror ? Mirror : RRDOMMirror;

      const parentSn = (mirror as TMirror).getMeta(parent as TNode);
      if (
        parentSn &&
        parentSn.type === NodeType.Element &&
        parentSn.tagName === 'textarea' &&
        mutation.node.type === NodeType.Text
      ) {
        const childNodeArray = Array.isArray(parent.childNodes)
          ? parent.childNodes
          : Array.from(parent.childNodes);

        // https://github.com/rrweb-io/rrweb/issues/745
        // parent is textarea, will only keep one child node as the value
        for (const c of childNodeArray) {
          if (c.nodeType === parent.TEXT_NODE) {
            parent.removeChild(c as Node & RRNode);
          }
        }
      }

      if (previous && previous.nextSibling && previous.nextSibling.parentNode) {
        (parent as TNode).insertBefore(
          target as TNode,
          previous.nextSibling as TNode,
        );
      } else if (next && next.parentNode) {
        // making sure the parent contains the reference nodes
        // before we insert target before next.
        (parent as TNode).contains(next as TNode)
          ? (parent as TNode).insertBefore(target as TNode, next as TNode)
          : (parent as TNode).insertBefore(target as TNode, null);
      } else {
        /**
         * Sometimes the document changes and the MutationObserver is disconnected, so the removal of child elements can't be detected and recorded. After the change of document, we may get another mutation which adds a new html element, while the old html element still exists in the dom, and we need to remove the old html element first to avoid collision.
         */
        if (parent === targetDoc) {
          while (targetDoc.firstChild) {
            (targetDoc as TNode).removeChild(targetDoc.firstChild as TNode);
          }
        }

        (parent as TNode).appendChild(target as TNode);
      }
      /**
       * https://github.com/rrweb-io/rrweb/pull/887
       * Remove any virtual style rules for stylesheets if a new text node is appended.
       */
      if (
        this.usingVirtualDom &&
        target.nodeName === '#text' &&
        parent.nodeName === 'STYLE' &&
        (parent as RRStyleElement).rules?.length > 0
      )
        (parent as RRStyleElement).rules = [];

      if (isSerializedIframe(target, this.mirror)) {
        const targetId = this.mirror.getId(target as HTMLIFrameElement);
        const mutationInQueue = this.newDocumentQueue.find(
          (m) => m.parentId === targetId,
        );
        if (mutationInQueue) {
          this.attachDocumentToIframe(
            mutationInQueue,
            target as HTMLIFrameElement,
          );
          this.newDocumentQueue = this.newDocumentQueue.filter(
            (m) => m !== mutationInQueue,
          );
        }
      }

      if (mutation.previousId || mutation.nextId) {
        this.legacy_resolveMissingNode(
          legacy_missingNodeMap,
          parent,
          target,
          mutation,
        );
      }
    };

    d.adds.forEach((mutation) => {
      appendNode(mutation);
    });

    const startTime = Date.now();
    while (queue.length) {
      // transform queue to resolve tree
      const resolveTrees = queueToResolveTrees(queue);
      queue.length = 0;
      if (Date.now() - startTime > 500) {
        this.warn(
          'Timeout in the loop, please check the resolve tree data:',
          resolveTrees,
        );
        break;
      }
      for (const tree of resolveTrees) {
        const parent = mirror.getNode(tree.value.parentId);
        if (!parent) {
          this.debug(
            'Drop resolve tree since there is no parent for the root node.',
            tree,
          );
        } else {
          iterateResolveTree(tree, (mutation) => {
            appendNode(mutation);
          });
        }
      }
    }

    if (Object.keys(legacy_missingNodeMap).length) {
      Object.assign(this.legacy_missingNodeRetryMap, legacy_missingNodeMap);
    }

    uniqueTextMutations(d.texts).forEach((mutation) => {
      const target = mirror.getNode(mutation.id);
      if (!target) {
        if (d.removes.find((r) => r.id === mutation.id)) {
          // no need to warn, element was already removed
          return;
        }
        return this.warnNodeNotFound(d, mutation.id);
      }
      target.textContent = mutation.value;

      /**
       * https://github.com/rrweb-io/rrweb/pull/865
       * Remove any virtual style rules for stylesheets whose contents are replaced.
       */
      if (this.usingVirtualDom) {
        const parent = target.parentNode as RRStyleElement;
        if (parent?.rules?.length > 0) parent.rules = [];
      }
    });
    d.attributes.forEach((mutation) => {
      const target = mirror.getNode(mutation.id);
      if (!target) {
        if (d.removes.find((r) => r.id === mutation.id)) {
          // no need to warn, element was already removed
          return;
        }
        return this.warnNodeNotFound(d, mutation.id);
      }
      for (const attributeName in mutation.attributes) {
        if (typeof attributeName === 'string') {
          const value = mutation.attributes[attributeName];
          if (value === null) {
            (target as Element | RRElement).removeAttribute(attributeName);
          } else if (typeof value === 'string') {
            try {
              (target as Element | RRElement).setAttribute(
                attributeName,
                value,
              );
            } catch (error) {
              if (this.config.showWarning) {
                console.warn(
                  'An error occurred may due to the checkout feature.',
                  error,
                );
              }
            }
          } else if (attributeName === 'style') {
            const styleValues = value;
            const targetEl = target as HTMLElement | RRElement;
            for (const s in styleValues) {
              if (styleValues[s] === false) {
                targetEl.style.removeProperty(s);
              } else if (styleValues[s] instanceof Array) {
                const svp = styleValues[s] as styleValueWithPriority;
                targetEl.style.setProperty(s, svp[0], svp[1]);
              } else {
                const svs = styleValues[s] as string;
                targetEl.style.setProperty(s, svs);
              }
            }
          }
        }
      }
    });
  }

  /**
   * Apply the scroll data on real elements.
   * If the replayer is in sync mode, smooth scroll behavior should be disabled.
   * @param d - the scroll data
   * @param isSync - whether the replayer is in sync mode(fast-forward)
   */
  private applyScroll(d: scrollData, isSync: boolean) {
    const target = this.mirror.getNode(d.id);
    if (!target) {
      return this.debugNodeNotFound(d, d.id);
    }
    const sn = this.mirror.getMeta(target);
    if (target === this.iframe.contentDocument) {
      this.iframe.contentWindow!.scrollTo({
        top: d.y,
        left: d.x,
        behavior: isSync ? 'auto' : 'smooth',
      });
    } else if (sn?.type === NodeType.Document) {
      // nest iframe content document
      (target as Document).defaultView!.scrollTo({
        top: d.y,
        left: d.x,
        behavior: isSync ? 'auto' : 'smooth',
      });
    } else {
      try {
        (target as Element).scrollTop = d.y;
        (target as Element).scrollLeft = d.x;
      } catch (error) {
        /**
         * Seldomly we may found scroll target was removed before
         * its last scroll event.
         */
      }
    }
  }

  private applyInput(d: inputData) {
    const target = this.mirror.getNode(d.id);
    if (!target) {
      return this.debugNodeNotFound(d, d.id);
    }
    try {
      (target as HTMLInputElement).checked = d.isChecked;
      (target as HTMLInputElement).value = d.text;
    } catch (error) {
      // for safe
    }
  }

  private legacy_resolveMissingNode(
    map: missingNodeMap,
    parent: Node | RRNode,
    target: Node | RRNode,
    targetMutation: addedNodeMutation,
  ) {
    const { previousId, nextId } = targetMutation;
    const previousInMap = previousId && map[previousId];
    const nextInMap = nextId && map[nextId];
    if (previousInMap) {
      const { node, mutation } = previousInMap;
      parent.insertBefore(node as Node & RRNode, target as Node & RRNode);
      delete map[mutation.node.id];
      delete this.legacy_missingNodeRetryMap[mutation.node.id];
      if (mutation.previousId || mutation.nextId) {
        this.legacy_resolveMissingNode(map, parent, node, mutation);
      }
    }
    if (nextInMap) {
      const { node, mutation } = nextInMap;
      parent.insertBefore(
        node as Node & RRNode,
        target.nextSibling as Node & RRNode,
      );
      delete map[mutation.node.id];
      delete this.legacy_missingNodeRetryMap[mutation.node.id];
      if (mutation.previousId || mutation.nextId) {
        this.legacy_resolveMissingNode(map, parent, node, mutation);
      }
    }
  }

  private moveAndHover(
    x: number,
    y: number,
    id: number,
    isSync: boolean,
    debugData: incrementalData,
  ) {
    const target = this.mirror.getNode(id);
    if (!target) {
      return this.debugNodeNotFound(debugData, id);
    }

    const base = getBaseDimension(target, this.iframe);
    const _x = x * base.absoluteScale + base.x;
    const _y = y * base.absoluteScale + base.y;

    this.mouse.style.left = `${_x}px`;
    this.mouse.style.top = `${_y}px`;
    if (!isSync) {
      this.drawMouseTail({ x: _x, y: _y });
    }
    this.hoverElements(target as Element);
  }

  private drawMouseTail(position: { x: number; y: number }) {
    if (!this.mouseTail) {
      return;
    }

    const { lineCap, lineWidth, strokeStyle, duration } =
      this.config.mouseTail === true
        ? defaultMouseTailConfig
        : Object.assign({}, defaultMouseTailConfig, this.config.mouseTail);

    const draw = () => {
      if (!this.mouseTail) {
        return;
      }
      const ctx = this.mouseTail.getContext('2d');
      if (!ctx || !this.tailPositions.length) {
        return;
      }
      ctx.clearRect(0, 0, this.mouseTail.width, this.mouseTail.height);
      ctx.beginPath();
      ctx.lineWidth = lineWidth;
      ctx.lineCap = lineCap;
      ctx.strokeStyle = strokeStyle;
      ctx.moveTo(this.tailPositions[0].x, this.tailPositions[0].y);
      this.tailPositions.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    };

    this.tailPositions.push(position);
    draw();
    setTimeout(() => {
      this.tailPositions = this.tailPositions.filter((p) => p !== position);
      draw();
    }, duration / this.speedService.state.context.timer.speed);
  }

  private hoverElements(el: Element) {
    this.iframe.contentDocument
      ?.querySelectorAll('.\\:hover')
      .forEach((hoveredEl) => {
        hoveredEl.classList.remove(':hover');
      });
    let currentEl: Element | null = el;
    while (currentEl) {
      if (currentEl.classList) {
        currentEl.classList.add(':hover');
      }
      currentEl = currentEl.parentElement;
    }
  }

  private isUserInteraction(event: eventWithTime): boolean {
    if (event.type !== EventType.IncrementalSnapshot) {
      return false;
    }
    return (
      event.data.source > IncrementalSource.Mutation &&
      event.data.source <= IncrementalSource.Input
    );
  }

  private backToNormal() {
    this.nextUserInteractionEvent = null;
    if (this.speedService.state.matches('normal')) {
      return;
    }
    this.speedService.send({ type: 'BACK_TO_NORMAL' });
    this.emitter.emit(ReplayerEvents.SkipEnd, {
      speed: this.speedService.state.context.normalSpeed,
    });
  }

  private warnNodeNotFound(d: incrementalData, id: number) {
    this.warn(`Node with id '${id}' not found. `, d);
  }

  private warnCanvasMutationFailed(
    d: canvasMutationData | canvasMutationCommand,
    error: unknown,
  ) {
    this.warn(`Has error on canvas update`, error, 'canvas mutation:', d);
  }

  private debugNodeNotFound(d: incrementalData, id: number) {
    /**
     * There maybe some valid scenes of node not being found.
     * Because DOM events are macrotask and MutationObserver callback
     * is microtask, so events fired on a removed DOM may emit
     * snapshots in the reverse order.
     */
    this.debug(REPLAY_CONSOLE_PREFIX, `Node with id '${id}' not found. `, d);
  }

  private warn(...args: Parameters<typeof console.warn>) {
    if (!this.config.showWarning) {
      return;
    }
    console.warn(REPLAY_CONSOLE_PREFIX, ...args);
  }

  private debug(...args: Parameters<typeof console.log>) {
    if (!this.config.showDebug) {
      return;
    }
    console.log(REPLAY_CONSOLE_PREFIX, ...args);
  }
}
