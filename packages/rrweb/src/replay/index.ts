import {
  rebuild,
  buildNodeWithSN,
  INode,
  NodeType,
  BuildCache,
  createCache,
} from 'rrweb-snapshot';
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
  missingNode,
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
  Mirror,
  ElementState,
  styleAttributeValue,
  styleValueWithPriority,
} from '../types';
import {
  createMirror,
  polyfill,
  TreeIndex,
  queueToResolveTrees,
  iterateResolveTree,
  AppendedIframe,
  isIframeINode,
  getBaseDimension,
  hasShadowRoot,
} from '../utils';
import getInjectStyleRules from './styles/inject-style';
import './styles/style.css';
import {
  applyVirtualStyleRulesToNode,
  storeCSSRules,
  StyleRuleType,
  VirtualStyleRules,
  VirtualStyleRulesMap,
  getNestedRule,
} from './virtual-styles';

const SKIP_TIME_THRESHOLD = 10 * 1000;
const SKIP_TIME_INTERVAL = 5 * 1000;

// https://github.com/rollup/rollup/issues/1267#issuecomment-296395734
// tslint:disable-next-line
const mitt = (mittProxy as any).default || mittProxy;

const REPLAY_CONSOLE_PREFIX = '[replayer]';

const defaultMouseTailConfig = {
  duration: 500,
  lineCap: 'round',
  lineWidth: 3,
  strokeStyle: 'red',
} as const;

export class Replayer {
  public wrapper: HTMLDivElement;
  public iframe: HTMLIFrameElement;

  public service: ReturnType<typeof createPlayerService>;
  public speedService: ReturnType<typeof createSpeedService>;
  public get timer() {
    return this.service.state.context.timer;
  }

  public config: playerConfig;

  private mouse: HTMLDivElement;
  private mouseTail: HTMLCanvasElement | null = null;
  private tailPositions: Array<{ x: number; y: number }> = [];

  private emitter: Emitter = mitt();

  private nextUserInteractionEvent: eventWithTime | null;

  // tslint:disable-next-line: variable-name
  private legacy_missingNodeRetryMap: missingNodeMap = {};

  private treeIndex!: TreeIndex;
  private fragmentParentMap!: Map<INode, INode>;
  private elementStateMap!: Map<INode, ElementState>;
  // Hold the list of CSSRules for in-memory state restoration
  private virtualStyleRulesMap!: VirtualStyleRulesMap;

  // The replayer uses the cache to speed up replay and scrubbing.
  private cache: BuildCache = createCache();

  private imageMap: Map<eventWithTime, HTMLImageElement> = new Map();

  private mirror: Mirror = createMirror();

  private firstFullSnapshot: eventWithTime | true | null = null;

  private newDocumentQueue: addedNodeMutation[] = [];

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
    };
    this.config = Object.assign({}, defaultConfig, config);

    this.handleResize = this.handleResize.bind(this);
    this.getCastFn = this.getCastFn.bind(this);
    this.emitter.on(ReplayerEvents.Resize, this.handleResize as Handler);

    this.setupDom();

    this.treeIndex = new TreeIndex();
    this.fragmentParentMap = new Map<INode, INode>();
    this.elementStateMap = new Map<INode, ElementState>();
    this.virtualStyleRulesMap = new Map();

    this.emitter.on(ReplayerEvents.Flush, () => {
      const { scrollMap, inputMap } = this.treeIndex.flush();

      this.fragmentParentMap.forEach((parent, frag) =>
        this.restoreRealParent(frag, parent),
      );
      for (const node of this.virtualStyleRulesMap.keys()) {
        // restore css rules of style elements after they are mounted
        this.restoreNodeSheet(node);
      }
      this.fragmentParentMap.clear();
      this.elementStateMap.clear();
      this.virtualStyleRulesMap.clear();

      for (const d of scrollMap.values()) {
        this.applyScroll(d);
      }
      for (const d of inputMap.values()) {
        this.applyInput(d);
      }
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
      // @ts-ignore
      this.config[key] = config[key];
    });
    if (!this.config.skipInactive) {
      this.backToNormal();
    }
    if (typeof config.speed !== 'undefined') {
      this.speedService.send({
        type: 'SET_SPEED',
        payload: {
          speed: config.speed!,
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
   * @param timeOffset number
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
      .classList.remove('rrweb-paused');
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
      .classList.add('rrweb-paused');
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
    Promise.resolve().then(() =>
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
    this.config.root!.appendChild(this.wrapper);

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

      polyfill(this.iframe.contentWindow as Window & typeof globalThis);
    }
  }

  private handleResize(dimension: viewportResizeDimension) {
    this.iframe.style.display = 'inherit';
    for (const el of [this.mouseTail, this.iframe]) {
      if (!el) {
        continue;
      }
      el.setAttribute('width', String(dimension.width));
      el.setAttribute('height', String(dimension.height));
    }
  }

  private getCastFn(event: eventWithTime, isSync = false) {
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
              if (_event.timestamp! <= event.timestamp!) {
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
      let last_index = this.service.state.context.events.length - 1;
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
    };
    return wrappedCastFn;
  }

  private rebuildFullSnapshot(
    event: fullSnapshotEvent & { timestamp: number },
    isSync: boolean = false,
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
    this.mirror.map = rebuild(event.data.node, {
      doc: this.iframe.contentDocument,
      afterAppend: (builtNode) => {
        this.collectIframeAndAttachDocument(collected, builtNode);
      },
      cache: this.cache,
    })[1];
    for (const { mutationInQueue, builtNode } of collected) {
      this.attachDocumentToIframe(mutationInQueue, builtNode);
      this.newDocumentQueue = this.newDocumentQueue.filter(
        (m) => m !== mutationInQueue,
      );
      if (builtNode.contentDocument) {
        const { documentElement, head } = builtNode.contentDocument;
        this.insertStyleRules(documentElement, head);
      }
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
      this.preloadAllImages();
    }
  }

  private insertStyleRules(
    documentElement: HTMLElement,
    head: HTMLHeadElement,
  ) {
    const styleEl = document.createElement('style');
    documentElement!.insertBefore(styleEl, head);
    const injectStylesRules = getInjectStyleRules(
      this.config.blockClass,
    ).concat(this.config.insertStyleRules);
    if (this.config.pauseAnimation) {
      injectStylesRules.push(
        'html.rrweb-paused * { animation-play-state: paused !important; }',
      );
    }
    for (let idx = 0; idx < injectStylesRules.length; idx++) {
      (styleEl.sheet! as CSSStyleSheet).insertRule(injectStylesRules[idx], idx);
    }
  }

  private attachDocumentToIframe(
    mutation: addedNodeMutation,
    iframeEl: HTMLIFrameElement,
  ) {
    const collected: AppendedIframe[] = [];
    // If iframeEl is detached from dom, iframeEl.contentDocument is null.
    if (!iframeEl.contentDocument) {
      let parent = iframeEl.parentNode;
      while (parent) {
        // The parent of iframeEl is virtual parent and we need to mount it on the dom.
        if (this.fragmentParentMap.has((parent as unknown) as INode)) {
          const frag = (parent as unknown) as INode;
          const realParent = this.fragmentParentMap.get(frag)!;
          this.restoreRealParent(frag, realParent);
          break;
        }
        parent = parent.parentNode;
      }
    }
    buildNodeWithSN(mutation.node, {
      doc: iframeEl.contentDocument!,
      map: this.mirror.map,
      hackCss: true,
      skipChild: false,
      afterAppend: (builtNode) => {
        this.collectIframeAndAttachDocument(collected, builtNode);
      },
      cache: this.cache,
    });
    for (const { mutationInQueue, builtNode } of collected) {
      this.attachDocumentToIframe(mutationInQueue, builtNode);
      this.newDocumentQueue = this.newDocumentQueue.filter(
        (m) => m !== mutationInQueue,
      );
      if (builtNode.contentDocument) {
        const { documentElement, head } = builtNode.contentDocument;
        this.insertStyleRules(documentElement, head);
      }
    }
  }

  private collectIframeAndAttachDocument(
    collected: AppendedIframe[],
    builtNode: INode,
  ) {
    if (isIframeINode(builtNode)) {
      const mutationInQueue = this.newDocumentQueue.find(
        (m) => m.parentId === builtNode.__sn.id,
      );
      if (mutationInQueue) {
        collected.push({ mutationInQueue, builtNode });
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
      let timer: number;
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
                  window.clearTimeout(timer);
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
        timer = window.setTimeout(() => {
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
  private preloadAllImages() {
    let beforeLoadState = this.service.state;
    const stateHandler = () => {
      beforeLoadState = this.service.state;
    };
    this.emitter.on(ReplayerEvents.Start, stateHandler);
    this.emitter.on(ReplayerEvents.Pause, stateHandler);
    let count = 0;
    let resolved = 0;
    for (const event of this.service.state.context.events) {
      if (
        event.type === EventType.IncrementalSnapshot &&
        event.data.source === IncrementalSource.CanvasMutation &&
        event.data.property === 'drawImage' &&
        typeof event.data.args[0] === 'string' &&
        !this.imageMap.has(event)
      ) {
        count++;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const imgd = ctx?.createImageData(canvas.width, canvas.height);
        let d = imgd?.data;
        d = JSON.parse(event.data.args[0]);
        ctx?.putImageData(imgd!, 0, 0);
      }
    }
    if (count !== resolved) {
      this.service.send({ type: 'PAUSE' });
    }
  }

  private applyIncremental(
    e: incrementalSnapshotEvent & { timestamp: number; delay?: number },
    isSync: boolean,
  ) {
    const { data: d } = e;
    switch (d.source) {
      case IncrementalSource.Mutation: {
        if (isSync) {
          d.adds.forEach((m) => this.treeIndex.add(m));
          d.texts.forEach((m) => this.treeIndex.text(m));
          d.attributes.forEach((m) => this.treeIndex.attribute(m));
          d.removes.forEach((m) => this.treeIndex.remove(m, this.mirror));
        }
        try {
          this.applyMutation(d, isSync);
        } catch (error) {
          this.warn(`Exception in mutation ${error.message || error}`, d);
        }
        break;
      }
      case IncrementalSource.Drag:
      case IncrementalSource.TouchMove:
      case IncrementalSource.MouseMove:
        if (isSync) {
          const lastPosition = d.positions[d.positions.length - 1];
          this.moveAndHover(d, lastPosition.x, lastPosition.y, lastPosition.id);
        } else {
          d.positions.forEach((p) => {
            const action = {
              doAction: () => {
                this.moveAndHover(d, p.x, p.y, p.id);
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
            doAction() {},
            delay: e.delay! - d.positions[0]?.timeOffset,
          });
        }
        break;
      case IncrementalSource.MouseInteraction: {
        /**
         * Same as the situation of missing input target.
         */
        if (d.id === -1) {
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
            if ('blur' in ((target as Node) as HTMLElement)) {
              ((target as Node) as HTMLElement).blur();
            }
            break;
          case MouseInteractions.Focus:
            if (triggerFocus && ((target as Node) as HTMLElement).focus) {
              ((target as Node) as HTMLElement).focus({
                preventScroll: true,
              });
            }
            break;
          case MouseInteractions.Click:
          case MouseInteractions.TouchStart:
          case MouseInteractions.TouchEnd:
            /**
             * Click has no visual impact when replaying and may
             * trigger navigation when apply to an <a> link.
             * So we will not call click(), instead we add an
             * animation to the mouse element which indicate user
             * clicked at this moment.
             */
            if (!isSync) {
              this.moveAndHover(d, d.x, d.y, d.id);
              this.mouse.classList.remove('active');
              // tslint:disable-next-line
              void this.mouse.offsetWidth;
              this.mouse.classList.add('active');
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
        if (isSync) {
          this.treeIndex.scroll(d);
          break;
        }
        this.applyScroll(d);
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
        if (isSync) {
          this.treeIndex.input(d);
          break;
        }
        this.applyInput(d);
        break;
      }
      case IncrementalSource.MediaInteraction: {
        const target = this.mirror.getNode(d.id);
        if (!target) {
          return this.debugNodeNotFound(d, d.id);
        }
        const mediaEl = (target as Node) as HTMLMediaElement;
        try {
          if (d.currentTime) {
            mediaEl.currentTime = d.currentTime;
          }
          if (d.type === MediaInteractions.Pause) {
            mediaEl.pause();
          }
          if (d.type === MediaInteractions.Play) {
            // remove listener for 'canplay' event because play() is async and returns a promise
            // i.e. media will evntualy start to play when data is loaded
            // 'canplay' event fires even when currentTime attribute changes which may lead to
            // unexpeted behavior
            mediaEl.play();
          }
        } catch (error) {
          if (this.config.showWarning) {
            console.warn(
              `Failed to replay media interactions: ${error.message || error}`,
            );
          }
        }
        break;
      }
      case IncrementalSource.StyleSheetRule: {
        const target = this.mirror.getNode(d.id);
        if (!target) {
          return this.debugNodeNotFound(d, d.id);
        }

        const styleEl = (target as Node) as HTMLStyleElement;
        const parent = (target.parentNode as unknown) as INode;
        const usingVirtualParent = this.fragmentParentMap.has(parent);

        /**
         * Always use existing DOM node, when it's there.
         * In in-memory replay, there is virtual node, but it's `sheet` is inaccessible.
         * Hence, we buffer all style changes in virtualStyleRulesMap.
         */
        const styleSheet = usingVirtualParent ? null : styleEl.sheet;
        let rules: VirtualStyleRules;

        if (!styleSheet) {
          /**
           * styleEl.sheet is only accessible if the styleEl is part of the
           * dom. This doesn't work on DocumentFragments so we have to add the
           * style mutations to the virtualStyleRulesMap.
           */

          if (this.virtualStyleRulesMap.has(target)) {
            rules = this.virtualStyleRulesMap.get(target) as VirtualStyleRules;
          } else {
            rules = [];
            this.virtualStyleRulesMap.set(target, rules);
          }
        }

        if (d.adds) {
          d.adds.forEach(({ rule, index }) => {
            if (styleSheet) {
              try {
                if (Array.isArray(index)) {
                  const positions = [...index];
                  const insertAt = positions.pop();
                  const nestedRule = getNestedRule(
                    styleSheet.cssRules,
                    positions,
                  );
                  nestedRule.insertRule(rule, insertAt);
                } else {
                  const _index =
                  index === undefined
                    ? undefined
                    : Math.min(index, styleSheet.cssRules.length);
                  styleSheet.insertRule(rule, _index);
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
            } else {
              rules?.push({ cssText: rule, index, type: StyleRuleType.Insert });
            }
          });
        }

        if (d.removes) {
          d.removes.forEach(({ index }) => {
            if (usingVirtualParent) {
              rules?.push({ index, type: StyleRuleType.Remove });
            } else {
              try {
                if (Array.isArray(index)) {
                  const positions = [...index];
                  const deleteAt = positions.pop();
                  const nestedRule = getNestedRule(
                    styleSheet!.cssRules,
                    positions,
                  );
                  nestedRule.deleteRule(deleteAt || 0);
                } else {
                  styleSheet?.deleteRule(index);
                }
              } catch (e) {
                /**
                 * same as insertRule
                 */
              }
            }
          });
        }
        break;
      }
      case IncrementalSource.CanvasMutation: {
        if (!this.config.UNSAFE_replayCanvas) {
          return;
        }
        const target = this.mirror.getNode(d.id);
        if (!target) {
          return this.debugNodeNotFound(d, d.id);
        }
        try {
          const ctx = ((target as unknown) as HTMLCanvasElement).getContext(
            '2d',
          )!;
          if (d.setter) {
            // skip some read-only type checks
            // tslint:disable-next-line:no-any
            (ctx as any)[d.property] = d.args[0];
            return;
          }
          const original = ctx[
            d.property as keyof CanvasRenderingContext2D
          ] as Function;
          /**
           * We have serialized the image source into base64 string during recording,
           * which has been preloaded before replay.
           * So we can get call drawImage SYNCHRONOUSLY which avoid some fragile cast.
           */
          if (d.property === 'drawImage' && typeof d.args[0] === 'string') {
            const image = this.imageMap.get(e);
            d.args[0] = image;
            original.apply(ctx, d.args);
          } else {
            original.apply(ctx, d.args);
          }
        } catch (error) {
          this.warnCanvasMutationFailed(d, d.id, error);
        }
        break;
      }
      case IncrementalSource.Font: {
        try {
          const fontFace = new FontFace(
            d.family,
            d.buffer ? new Uint8Array(JSON.parse(d.fontSource)) : d.fontSource,
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

  private applyMutation(d: mutationData, useVirtualParent: boolean) {
    d.removes.forEach((mutation) => {
      let target = this.mirror.getNode(mutation.id);
      if (!target) {
        if (d.removes.find((r) => r.id === mutation.parentId)) {
          // no need to warn, parent was already removed
          return;
        }
        return this.warnNodeNotFound(d, mutation.id);
      }
      let parent: INode | null | ShadowRoot = this.mirror.getNode(
        mutation.parentId,
      );
      if (!parent) {
        return this.warnNodeNotFound(d, mutation.parentId);
      }
      if (mutation.isShadow && hasShadowRoot(parent)) {
        parent = parent.shadowRoot;
      }
      // target may be removed with its parents before
      this.mirror.removeNodeFromMap(target);
      if (parent) {
        let realTarget = null;
        const realParent =
          '__sn' in parent ? this.fragmentParentMap.get(parent) : undefined;
        if (realParent && realParent.contains(target)) {
          parent = realParent;
        } else if (this.fragmentParentMap.has(target)) {
          /**
           * the target itself is a fragment document and it's not in the dom
           * so we should remove the real target from its parent
           */
          realTarget = this.fragmentParentMap.get(target)!;
          this.fragmentParentMap.delete(target);
          target = realTarget;
        }
        try {
          parent.removeChild(target);
        } catch (error) {
          if (error instanceof DOMException) {
            this.warn(
              'parent could not remove child in mutation',
              parent,
              realParent,
              target,
              realTarget,
              d,
            );
          } else {
            throw error;
          }
        }
      }
    });

    // tslint:disable-next-line: variable-name
    const legacy_missingNodeMap: missingNodeMap = {
      ...this.legacy_missingNodeRetryMap,
    };
    const queue: addedNodeMutation[] = [];

    // next not present at this moment
    const nextNotInDOM = (mutation: addedNodeMutation) => {
      let next: Node | null = null;
      if (mutation.nextId) {
        next = this.mirror.getNode(mutation.nextId) as Node;
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
      let parent: INode | null | ShadowRoot = this.mirror.getNode(
        mutation.parentId,
      );
      if (!parent) {
        if (mutation.node.type === NodeType.Document) {
          // is newly added document, maybe the document node of an iframe
          return this.newDocumentQueue.push(mutation);
        }
        return queue.push(mutation);
      }

      let parentInDocument = null;
      if (this.iframe.contentDocument.contains) {
        parentInDocument = this.iframe.contentDocument.contains(parent);
      } else if (this.iframe.contentDocument.body.contains) {
        // fix for IE
        // refer 'Internet Explorer notes' at https://developer.mozilla.org/zh-CN/docs/Web/API/Document
        parentInDocument = this.iframe.contentDocument.body.contains(parent);
      }

      const hasIframeChild =
        ((parent as unknown) as HTMLElement).getElementsByTagName?.('iframe')
          .length > 0;
      /**
       * Why !isIframeINode(parent)? If parent element is an iframe, iframe document can't be appended to virtual parent.
       * Why !hasIframeChild? If we move iframe elements from dom to fragment document, we will lose the contentDocument of iframe. So we need to disable the virtual dom optimization if a parent node contains iframe elements.
       */
      if (
        useVirtualParent &&
        parentInDocument &&
        !isIframeINode(parent) &&
        !hasIframeChild
      ) {
        const virtualParent = (document.createDocumentFragment() as unknown) as INode;
        this.mirror.map[mutation.parentId] = virtualParent;
        this.fragmentParentMap.set(virtualParent, parent);

        // store the state, like scroll position, of child nodes before they are unmounted from dom
        this.storeState(parent);

        while (parent.firstChild) {
          virtualParent.appendChild(parent.firstChild);
        }
        parent = virtualParent;
      }

      if (mutation.node.isShadow && hasShadowRoot(parent)) {
        parent = parent.shadowRoot;
      }

      let previous: Node | null = null;
      let next: Node | null = null;
      if (mutation.previousId) {
        previous = this.mirror.getNode(mutation.previousId) as Node;
      }
      if (mutation.nextId) {
        next = this.mirror.getNode(mutation.nextId) as Node;
      }
      if (nextNotInDOM(mutation)) {
        return queue.push(mutation);
      }

      if (mutation.node.rootId && !this.mirror.getNode(mutation.node.rootId)) {
        return;
      }

      const targetDoc = mutation.node.rootId
        ? this.mirror.getNode(mutation.node.rootId)
        : this.iframe.contentDocument;
      if (isIframeINode(parent)) {
        this.attachDocumentToIframe(mutation, parent);
        return;
      }
      const target = buildNodeWithSN(mutation.node, {
        doc: targetDoc as Document,
        map: this.mirror.map,
        skipChild: true,
        hackCss: true,
        cache: this.cache,
      }) as INode;

      // legacy data, we should not have -1 siblings any more
      if (mutation.previousId === -1 || mutation.nextId === -1) {
        legacy_missingNodeMap[mutation.node.id] = {
          node: target,
          mutation,
        };
        return;
      }

      if (previous && previous.nextSibling && previous.nextSibling.parentNode) {
        parent.insertBefore(target, previous.nextSibling);
      } else if (next && next.parentNode) {
        // making sure the parent contains the reference nodes
        // before we insert target before next.
        parent.contains(next)
          ? parent.insertBefore(target, next)
          : parent.insertBefore(target, null);
      } else {
        /**
         * Sometimes the document changes and the MutationObserver is disconnected, so the removal of child elements can't be detected and recorded. After the change of document, we may get another mutation which adds a new html element, while the old html element still exists in the dom, and we need to remove the old html element first to avoid collision.
         */
        if (parent === targetDoc) {
          while (targetDoc.firstChild) {
            targetDoc.removeChild(targetDoc.firstChild);
          }
        }

        parent.appendChild(target);
      }

      if (isIframeINode(target)) {
        const mutationInQueue = this.newDocumentQueue.find(
          (m) => m.parentId === target.__sn.id,
        );
        if (mutationInQueue) {
          this.attachDocumentToIframe(mutationInQueue, target);
          this.newDocumentQueue = this.newDocumentQueue.filter(
            (m) => m !== mutationInQueue,
          );
        }
        if (target.contentDocument) {
          const { documentElement, head } = target.contentDocument;
          this.insertStyleRules(documentElement, head);
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

    let startTime = Date.now();
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
        let parent = this.mirror.getNode(tree.value.parentId);
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

    d.texts.forEach((mutation) => {
      let target = this.mirror.getNode(mutation.id);
      if (!target) {
        if (d.removes.find((r) => r.id === mutation.id)) {
          // no need to warn, element was already removed
          return;
        }
        return this.warnNodeNotFound(d, mutation.id);
      }
      /**
       * apply text content to real parent directly
       */
      if (this.fragmentParentMap.has(target)) {
        target = this.fragmentParentMap.get(target)!;
      }
      target.textContent = mutation.value;
    });
    d.attributes.forEach((mutation) => {
      let target = this.mirror.getNode(mutation.id);
      if (!target) {
        if (d.removes.find((r) => r.id === mutation.id)) {
          // no need to warn, element was already removed
          return;
        }
        return this.warnNodeNotFound(d, mutation.id);
      }
      if (this.fragmentParentMap.has(target)) {
        target = this.fragmentParentMap.get(target)!;
      }
      for (const attributeName in mutation.attributes) {
        if (typeof attributeName === 'string') {
          const value = mutation.attributes[attributeName];
          if (value === null) {
            ((target as Node) as Element).removeAttribute(attributeName);
          } else if (typeof value === 'string') {
            try {
              ((target as Node) as Element).setAttribute(attributeName, value);
            } catch (error) {
              if (this.config.showWarning) {
                console.warn(
                  'An error occurred may due to the checkout feature.',
                  error,
                );
              }
            }
          } else if (attributeName === 'style') {
            let styleValues = value as styleAttributeValue;
            const targetEl = (target as Node) as HTMLElement;
            for (var s in styleValues) {
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

  private applyScroll(d: scrollData) {
    const target = this.mirror.getNode(d.id);
    if (!target) {
      return this.debugNodeNotFound(d, d.id);
    }
    if ((target as Node) === this.iframe.contentDocument) {
      this.iframe.contentWindow!.scrollTo({
        top: d.y,
        left: d.x,
        behavior: 'smooth',
      });
    } else {
      try {
        ((target as Node) as Element).scrollTop = d.y;
        ((target as Node) as Element).scrollLeft = d.x;
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
      ((target as Node) as HTMLInputElement).checked = d.isChecked;
      ((target as Node) as HTMLInputElement).value = d.text;
    } catch (error) {
      // for safe
    }
  }

  private legacy_resolveMissingNode(
    map: missingNodeMap,
    parent: Node,
    target: Node,
    targetMutation: addedNodeMutation,
  ) {
    const { previousId, nextId } = targetMutation;
    const previousInMap = previousId && map[previousId];
    const nextInMap = nextId && map[nextId];
    if (previousInMap) {
      const { node, mutation } = previousInMap as missingNode;
      parent.insertBefore(node, target);
      delete map[mutation.node.id];
      delete this.legacy_missingNodeRetryMap[mutation.node.id];
      if (mutation.previousId || mutation.nextId) {
        this.legacy_resolveMissingNode(map, parent, node as Node, mutation);
      }
    }
    if (nextInMap) {
      const { node, mutation } = nextInMap as missingNode;
      parent.insertBefore(node, target.nextSibling);
      delete map[mutation.node.id];
      delete this.legacy_missingNodeRetryMap[mutation.node.id];
      if (mutation.previousId || mutation.nextId) {
        this.legacy_resolveMissingNode(map, parent, node as Node, mutation);
      }
    }
  }

  private moveAndHover(d: incrementalData, x: number, y: number, id: number) {
    const target = this.mirror.getNode(id);
    if (!target) {
      return this.debugNodeNotFound(d, id);
    }

    const base = getBaseDimension(target, this.iframe);
    const _x = x * base.absoluteScale + base.x;
    const _y = y * base.absoluteScale + base.y;

    this.mouse.style.left = `${_x}px`;
    this.mouse.style.top = `${_y}px`;
    this.drawMouseTail({ x: _x, y: _y });
    this.hoverElements((target as Node) as Element);
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

  /**
   * Replace the virtual parent with the real parent.
   * @param frag fragment document, the virtual parent
   * @param parent real parent element
   */
  private restoreRealParent(frag: INode, parent: INode) {
    this.mirror.map[parent.__sn.id] = parent;
    /**
     * If we have already set value attribute on textarea,
     * then we could not apply text content as default value any more.
     */
    if (
      parent.__sn.type === NodeType.Element &&
      parent.__sn.tagName === 'textarea' &&
      frag.textContent
    ) {
      ((parent as unknown) as HTMLTextAreaElement).value = frag.textContent;
    }
    parent.appendChild(frag);
    // restore state of elements after they are mounted
    this.restoreState(parent);
  }

  /**
   * store state of elements before unmounted from dom recursively
   * the state should be restored in the handler of event ReplayerEvents.Flush
   * e.g. browser would lose scroll position after the process that we add children of parent node to Fragment Document as virtual dom
   */
  private storeState(parent: INode) {
    if (parent) {
      if (parent.nodeType === parent.ELEMENT_NODE) {
        const parentElement = (parent as unknown) as HTMLElement;
        if (parentElement.scrollLeft || parentElement.scrollTop) {
          // store scroll position state
          this.elementStateMap.set(parent, {
            scroll: [parentElement.scrollLeft, parentElement.scrollTop],
          });
        }
        if (parentElement.tagName === 'STYLE')
          storeCSSRules(
            parentElement as HTMLStyleElement,
            this.virtualStyleRulesMap,
          );
        const children = parentElement.children;
        for (const child of Array.from(children)) {
          this.storeState((child as unknown) as INode);
        }
      }
    }
  }

  /**
   * restore the state of elements recursively, which was stored before elements were unmounted from dom in virtual parent mode
   * this function corresponds to function storeState
   */
  private restoreState(parent: INode) {
    if (parent.nodeType === parent.ELEMENT_NODE) {
      const parentElement = (parent as unknown) as HTMLElement;
      if (this.elementStateMap.has(parent)) {
        const storedState = this.elementStateMap.get(parent)!;
        // restore scroll position
        if (storedState.scroll) {
          parentElement.scrollLeft = storedState.scroll[0];
          parentElement.scrollTop = storedState.scroll[1];
        }
        this.elementStateMap.delete(parent);
      }
      const children = parentElement.children;
      for (const child of Array.from(children)) {
        this.restoreState((child as unknown) as INode);
      }
    }
  }

  private restoreNodeSheet(node: INode) {
    const storedRules = this.virtualStyleRulesMap.get(node);
    if (node.nodeName !== 'STYLE') {
      return;
    }

    if (!storedRules) {
      return;
    }

    const styleNode = (node as unknown) as HTMLStyleElement;

    applyVirtualStyleRulesToNode(storedRules, styleNode);
  }

  private warnNodeNotFound(d: incrementalData, id: number) {
    if (this.treeIndex.idRemoved(id)) {
      this.warn(`Node with id '${id}' was previously removed. `, d);
    } else {
      this.warn(`Node with id '${id}' not found. `, d);
    }
  }

  private warnCanvasMutationFailed(
    d: canvasMutationData,
    id: number,
    error: unknown,
  ) {
    this.warn(`Has error on update canvas '${id}'`, d, error);
  }

  private debugNodeNotFound(d: incrementalData, id: number) {
    /**
     * There maybe some valid scenes of node not being found.
     * Because DOM events are macrotask and MutationObserver callback
     * is microtask, so events fired on a removed DOM may emit
     * snapshots in the reverse order.
     */
    if (this.treeIndex.idRemoved(id)) {
      this.debug(
        REPLAY_CONSOLE_PREFIX,
        `Node with id '${id}' was previously removed. `,
        d,
      );
    } else {
      this.debug(REPLAY_CONSOLE_PREFIX, `Node with id '${id}' not found. `, d);
    }
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
    // tslint:disable-next-line: no-console
    console.log(REPLAY_CONSOLE_PREFIX, ...args);
  }
}
