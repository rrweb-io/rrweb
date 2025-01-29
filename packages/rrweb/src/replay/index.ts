import {
  rebuild,
  adaptCssForReplay,
  buildNodeWithSN,
  type BuildCache,
  createCache,
  Mirror,
  createMirror,
  toLowerCase,
} from '@saola.ai/rrweb-snapshot';
import {
  RRDocument,
  createOrGetNode,
  buildFromNode,
  buildFromDom,
  diff,
  getDefaultSN,
} from '@saola.ai/rrdom';
import type {
  RRNode,
  RRElement,
  RRStyleElement,
  RRIFrameElement,
  RRMediaElement,
  RRCanvasElement,
  ReplayerHandler,
  Mirror as RRDOMMirror,
} from '@saola.ai/rrdom';
import * as mittProxy from 'mitt';
import { polyfill as smoothscrollPolyfill } from './smoothscroll';
import { Timer } from './timer';
import {
  createPlayerService,
  createSpeedService,
  type PlayerMachineState,
  type SpeedMachineState,
} from './machine';
import type { playerConfig, missingNodeMap } from '../types';
import {
  NodeType,
  EventType,
  IncrementalSource,
  MouseInteractions,
  ReplayerEvents,
} from '@saola.ai/rrweb-types';
import type {
  attributes,
  fullSnapshotEvent,
  eventWithTime,
  playerMetaData,
  viewportResizeDimension,
  addedNodeMutation,
  incrementalSnapshotEvent,
  incrementalData,
  Handler,
  Emitter,
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
  selectionData,
  styleSheetRuleData,
  styleDeclarationData,
  adoptedStyleSheetData,
  serializedElementNodeWithId,
} from '@saola.ai/rrweb-types';
import {
  polyfill,
  queueToResolveTrees,
  iterateResolveTree,
  type AppendedIframe,
  getBaseDimension,
  hasShadowRoot,
  isSerializedIframe,
  getNestedRule,
  getPositionsAndIndex,
  uniqueTextMutations,
  StyleSheetMirror,
} from '../utils';
import getInjectStyleRules from './styles/inject-style';
import './styles/style.css';
import canvasMutation from './canvas';
import { deserializeArg } from './canvas/deserialize-args';
import { MediaManager } from './media';
import { applyDialogToTopLevel, removeDialogFromTopLevel } from './dialog';

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

  // Used to track StyleSheetObjects adopted on multiple document hosts.
  private styleMirror: StyleSheetMirror = new StyleSheetMirror();

  // Used to track video & audio elements, and keep them in sync with general playback.
  private mediaManager: MediaManager;

  private firstFullSnapshot: eventWithTime | true | null = null;

  private newDocumentQueue: addedNodeMutation[] = [];

  private mousePos: mouseMovePos | null = null;
  private touchActive: boolean | null = null;
  private lastMouseDownEvent: [Node, Event] | null = null;

  // Keep the rootNode of the last hovered element. So  when hovering a new element, we can remove the last hovered element's :hover style.
  private lastHoveredRootNode: Document | ShadowRoot;

  // In the fast-forward mode, only the last selection data needs to be applied.
  private lastSelectionData: selectionData | null = null;

  // In the fast-forward mode using VirtualDom optimization, all stylesheetRule, and styleDeclaration events on constructed StyleSheets will be delayed to get applied until the flush stage.
  private constructedStyleMutations: (
    | styleSheetRuleData
    | styleDeclarationData
  )[] = [];

  // Similar to the reason for constructedStyleMutations.
  private adoptedStyleSheets: adoptedStyleSheetData[] = [];

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
      inactivePeriodThreshold: 10 * 1000,
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
      logger: console,
      removeAnimationCss: false,
    };
    this.config = Object.assign({}, defaultConfig, config);

    this.handleResize = this.handleResize.bind(this);
    this.getCastFn = this.getCastFn.bind(this);
    this.applyEventsSynchronously = this.applyEventsSynchronously.bind(this);
    this.emitter.on(ReplayerEvents.Resize, this.handleResize as Handler);

    this.setupDom();

    /**
     * Exposes mirror to the plugins
     */
    for (const plugin of this.config.plugins || []) {
      if (plugin.getMirror) plugin.getMirror({ nodeMirror: this.mirror });
    }

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
            });
          },
          applyInput: this.applyInput.bind(this),
          applyScroll: this.applyScroll.bind(this),
          applyStyleSheetMutation: (
            data: styleDeclarationData | styleSheetRuleData,
            styleSheet: CSSStyleSheet,
          ) => {
            if (data.source === IncrementalSource.StyleSheetRule)
              this.applyStyleSheetRule(data, styleSheet);
            else if (data.source === IncrementalSource.StyleDeclaration)
              this.applyStyleDeclaration(data, styleSheet);
          },
          afterAppend: (node: Node, id: number) => {
            for (const plugin of this.config.plugins || []) {
              if (plugin.onBuild) plugin.onBuild(node, { id, replayer: this });
            }
          },
        };
        if (this.iframe.contentDocument)
          try {
            diff(
              this.iframe.contentDocument,
              this.virtualDom,
              replayerHandler,
              this.virtualDom.mirror,
            );
          } catch (e) {
            console.warn(e);
          }

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
              this.warn(error);
            }
          }
        }

        this.constructedStyleMutations.forEach((data) => {
          this.applyStyleSheetMutation(data);
        });
        this.constructedStyleMutations = [];

        this.adoptedStyleSheets.forEach((data) => {
          this.applyAdoptedStyleSheet(data);
        });
        this.adoptedStyleSheets = [];
      }

      if (this.mousePos) {
        this.moveAndHover(
          this.mousePos.x,
          this.mousePos.y,
          this.mousePos.id,
          true,
          this.mousePos.debugData,
        );
        this.mousePos = null;
      }

      if (this.touchActive === true) {
        this.mouse.classList.add('touch-active');
      } else if (this.touchActive === false) {
        this.mouse.classList.remove('touch-active');
      }
      this.touchActive = null;

      if (this.lastMouseDownEvent) {
        const [target, event] = this.lastMouseDownEvent;
        target.dispatchEvent(event);
      }
      this.lastMouseDownEvent = null;

      if (this.lastSelectionData) {
        this.applySelection(this.lastSelectionData);
        this.lastSelectionData = null;
      }
    });
    this.emitter.on(ReplayerEvents.PlayBack, () => {
      this.firstFullSnapshot = null;
      this.mirror.reset();
      this.styleMirror.reset();
      this.mediaManager.reset();
    });

    const timer = new Timer([], {
      speed: this.config.speed,
    });
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
    this.mediaManager = new MediaManager({
      warn: this.warn.bind(this),
      service: this.service,
      speedService: this.speedService,
      emitter: this.emitter,
      getCurrentTime: this.getCurrentTime.bind(this),
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
        this.iframe.contentWindow?.scrollTo(
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

  public getMetaData(rangeStart?: number, rangeEnd?: number): playerMetaData {
    if (
      this.service.state.context.rangeStart !== rangeStart ||
      this.service.state.context.rangeEnd !== rangeEnd
    ) {
      this.service.send({
        type: 'SET_RANGE',
        payload: { start: rangeStart, end: rangeEnd },
      });
    }

    const firstEventTimestamp =
      rangeStart || this.service.state.context.events[0].timestamp;
    const lastEventTimestamp =
      rangeEnd ||
      this.service.state.context.events[
        this.service.state.context.events.length - 1
      ].timestamp;

    return {
      startTime: firstEventTimestamp,
      endTime: lastEventTimestamp,
      totalTime: lastEventTimestamp - firstEventTimestamp,
    };
  }

  /**
   * Get the actual time offset the player is at now compared to the first event.
   */
  public getCurrentTime(): number {
    return this.timer.timeOffset + this.getTimeOffset();
  }

  /**
   * Get the time offset the player is at now compared to the first event, but without regard for the timer.
   */
  public getTimeOffset(): number {
    const { baselineTime, events } = this.service.state.context;
    return baselineTime - events[0].timestamp;
  }

  public getMirror(): Mirror {
    return this.mirror;
  }

  public handleGoto(
    timeOffset: number,
    resumePlaying: boolean,
    fromProgress: boolean,
  ) {
    if (fromProgress) {
      this.emitter.emit(ReplayerEvents.GotoStarted);
    }
    const modifiedOffset = this.service.state.context.rangeStart
      ? this.service.state.context.rangeStart -
        this.service.state.context.events[0].timestamp +
        timeOffset
      : timeOffset;

    const handle = () => {
      if (resumePlaying) {
        this.play(modifiedOffset);
      } else {
        this.pause(modifiedOffset);
      }
    };

    if (fromProgress) {
      // inside an immediate callback in order to release the thread, so the UI can render a loader
      setTimeout(handle, 0);
    } else handle();
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
      this.service.send({
        type: 'PLAY',
        payload: { timeOffset },
      });
    } else {
      this.service.send({ type: 'PAUSE' });
      this.service.send({
        type: 'PLAY',
        payload: { timeOffset },
      });
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
    this.warn(
      `The 'resume' was deprecated in 1.0. Please use 'play' method which has the same interface.`,
    );
    this.play(timeOffset);
    this.emitter.emit(ReplayerEvents.Resume);
  }

  /**
   * Totally destroy this replayer and please be careful that this operation is irreversible.
   * Memory occupation can be released by removing all references to this replayer.
   */
  public destroy() {
    this.pause();
    this.mirror.reset();
    this.styleMirror.reset();
    this.mediaManager.reset();
    // this.config.root.removeChild(this.wrapper);  - Leaving the DOM handling to React, causes issues with Vite's hot reloading
    this.emitter.emit(ReplayerEvents.Destroy);
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
          this.mediaManager.reset();
          this.styleMirror.reset();
          this.rebuildFullSnapshot(event, isSync);
          this.iframe.contentWindow?.scrollTo(event.data.initialOffset);
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
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  _event.delay! - event.delay! >
                  this.config.inactivePeriodThreshold *
                    this.speedService.state.context.timer.speed
                ) {
                  this.nextUserInteractionEvent = _event;
                }
                break;
              }
            }
            if (this.nextUserInteractionEvent) {
              const skipTime =
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
        if (plugin.handler) plugin.handler(event, isSync, { replayer: this });
      }

      this.service.send({ type: 'CAST_EVENT', payload: { event } });

      // events are kept sorted by timestamp, check if this is the last event
      const lastIndex = this.service.state.context.events.length - 1;
      if (
        !this.config.liveMode &&
        event === this.service.state.context.events[lastIndex]
      ) {
        const finish = () => {
          if (lastIndex < this.service.state.context.events.length - 1) {
            // more events have been added since the setTimeout
            return;
          }
          this.backToNormal();
          this.service.send('END');
          this.emitter.emit(ReplayerEvents.Finish);
        };
        let finishBuffer = 50; // allow for checking whether new events aren't just about to be loaded in
        if (
          event.type === EventType.IncrementalSnapshot &&
          event.data.source === IncrementalSource.MouseMove &&
          event.data.positions.length
        ) {
          // extend finish event if the last event is a mouse move so that the timer isn't stopped by the service before checking the last event
          finishBuffer += Math.max(0, -event.data.positions[0].timeOffset);
        }
        setTimeout(finish, finishBuffer);
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
      return this.warn('Looks like your replayer has been destroyed.');
    }
    if (Object.keys(this.legacy_missingNodeRetryMap).length) {
      this.warn(
        'Found unresolved missing node map',
        this.legacy_missingNodeRetryMap,
      );
    }
    this.legacy_missingNodeRetryMap = {};
    const collectedIframes: AppendedIframe[] = [];
    const collectedDialogs = new Set<HTMLDialogElement>();
    const afterAppend = (builtNode: Node, id: number) => {
      if (builtNode.nodeName === 'DIALOG')
        collectedDialogs.add(builtNode as HTMLDialogElement);
      this.collectIframeAndAttachDocument(collectedIframes, builtNode);
      if (this.mediaManager.isSupportedMediaElement(builtNode)) {
        const { events } = this.service.state.context;
        this.mediaManager.addMediaElements(
          builtNode,
          event.timestamp - events[0].timestamp,
          this.mirror,
        );
      }
      for (const plugin of this.config.plugins || []) {
        if (plugin.onBuild)
          plugin.onBuild(builtNode, {
            id,
            replayer: this,
          });
      }
    };

    /**
     * Normally rebuilding full snapshot should not be under virtual dom environment.
     * But if the order of data events has some issues, it might be possible.
     * Adding this check to avoid any potential issues.
     */
    if (this.usingVirtualDom) {
      this.virtualDom.destroyTree();
      this.usingVirtualDom = false;
    }

    this.mirror.reset();
    rebuild(event.data.node, {
      doc: this.iframe.contentDocument,
      afterAppend,
      cache: this.cache,
      mirror: this.mirror,
      removeAnimationCss: this.config.removeAnimationCss,
    });
    afterAppend(this.iframe.contentDocument, event.data.node.id);

    for (const { mutationInQueue, builtNode } of collectedIframes) {
      this.attachDocumentToIframe(mutationInQueue, builtNode);
      this.newDocumentQueue = this.newDocumentQueue.filter(
        (m) => m !== mutationInQueue,
      );
    }
    const { documentElement, head } = this.iframe.contentDocument;
    this.insertStyleRules(documentElement, head);
    collectedDialogs.forEach((d) => applyDialogToTopLevel(d));
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
    if (!injectStylesRules.length) {
      return;
    }
    if (this.usingVirtualDom) {
      const styleEl = this.virtualDom.createElement('style');
      this.virtualDom.mirror.add(
        styleEl,
        getDefaultSN(styleEl, this.virtualDom.unserializedId),
      );
      (documentElement as RRElement).insertBefore(styleEl, head as RRElement);
      styleEl.rules.push({
        source: IncrementalSource.StyleSheetRule,
        adds: injectStylesRules.map((cssText, index) => ({
          rule: cssText,
          index,
        })),
      });
    } else {
      const styleEl = document.createElement('style');
      (documentElement as HTMLElement).insertBefore(
        styleEl,
        head as HTMLHeadElement,
      );
      for (let idx = 0; idx < injectStylesRules.length; idx++) {
        styleEl.sheet?.insertRule(injectStylesRules[idx], idx);
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

    const collectedIframes: AppendedIframe[] = [];
    const collectedDialogs = new Set<HTMLDialogElement>();
    const afterAppend = (builtNode: Node, id: number) => {
      if (builtNode.nodeName === 'DIALOG')
        collectedDialogs.add(builtNode as HTMLDialogElement);
      this.collectIframeAndAttachDocument(collectedIframes, builtNode);
      const sn = (mirror as TMirror).getMeta(builtNode as unknown as TNode);
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

      // Skip the plugin onBuild callback in the virtual dom mode
      if (this.usingVirtualDom) return;
      for (const plugin of this.config.plugins || []) {
        if (plugin.onBuild)
          plugin.onBuild(builtNode, {
            id,
            replayer: this,
          });
      }
    };

    buildNodeWithSN(mutation.node, {
      doc: iframeEl.contentDocument! as Document,
      mirror: mirror as Mirror,
      hackCss: true,
      skipChild: false,
      afterAppend,
      cache: this.cache,
      removeAnimationCss: this.config.removeAnimationCss,
    });
    afterAppend(iframeEl.contentDocument! as Document, mutation.node.id);

    for (const { mutationInQueue, builtNode } of collectedIframes) {
      this.attachDocumentToIframe(mutationInQueue, builtNode);
      this.newDocumentQueue = this.newDocumentQueue.filter(
        (m) => m !== mutationInQueue,
      );
    }

    collectedDialogs.forEach((d) => applyDialogToTopLevel(d));
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
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
        const event = new Event(toLowerCase(MouseInteractions[d.type]));
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
          case MouseInteractions.MouseDown:
          case MouseInteractions.MouseUp:
            if (isSync) {
              if (d.type === MouseInteractions.TouchStart) {
                this.touchActive = true;
              } else if (d.type === MouseInteractions.TouchEnd) {
                this.touchActive = false;
              }
              if (d.type === MouseInteractions.MouseDown) {
                this.lastMouseDownEvent = [target, event];
              } else if (d.type === MouseInteractions.MouseUp) {
                this.lastMouseDownEvent = null;
              }
              this.mousePos = {
                x: d.x || 0,
                y: d.y || 0,
                id: d.id,
                debugData: d,
              };
            } else {
              if (d.type === MouseInteractions.TouchStart) {
                // don't draw a trail as user has lifted finger and is placing at a new point
                this.tailPositions.length = 0;
              }
              this.moveAndHover(d.x || 0, d.y || 0, d.id, isSync, d);
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
              } else {
                // for MouseDown & MouseUp also invoke default behavior
                target.dispatchEvent(event);
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
        const { events } = this.service.state.context;

        this.mediaManager.mediaMutation({
          target: mediaEl,
          timeOffset: e.timestamp - events[0].timestamp,
          mutation: d,
        });

        break;
      }
      case IncrementalSource.StyleSheetRule:
      case IncrementalSource.StyleDeclaration: {
        if (this.usingVirtualDom) {
          if (d.styleId) this.constructedStyleMutations.push(d);
          else if (d.id)
            (
              this.virtualDom.mirror.getNode(d.id) as RRStyleElement | null
            )?.rules.push(d);
        } else this.applyStyleSheetMutation(d);
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
          this.warn(error);
        }
        break;
      }
      case IncrementalSource.Selection: {
        if (isSync) {
          this.lastSelectionData = d;
          break;
        }
        this.applySelection(d);
        break;
      }
      case IncrementalSource.AdoptedStyleSheet: {
        if (this.usingVirtualDom) this.adoptedStyleSheets.push(d);
        else this.applyAdoptedStyleSheet(d);
        break;
      }
      default:
    }
  }

  /**
   * Apply the mutation to the virtual dom or the real dom.
   * @param d - The mutation data.
   * @param isSync - Whether the mutation should be applied synchronously (while fast-forwarding).
   */
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
            this.warn(error);
          }
        }
      }
    }
    const mirror = this.usingVirtualDom ? this.virtualDom.mirror : this.mirror;
    type TNode = typeof mirror extends Mirror ? Node : RRNode;

    d.removes = d.removes.filter((mutation) => {
      // warn of absence from mirror before we start applying each removal
      // as earlier removals could remove a tree that includes a later removal
      if (!mirror.getNode(mutation.id)) {
        this.warnNodeNotFound(d, mutation.id);
        return false;
      }
      return true;
    });
    d.removes.forEach((mutation) => {
      const target = mirror.getNode(mutation.id);
      if (!target) {
        // no need to warn here, an ancestor may have already been removed
        return;
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
        return this.warn('Looks like your replayer has been destroyed.');
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
      const afterAppend = (node: Node | RRNode, id: number) => {
        // Skip the plugin onBuild callback for virtual dom
        if (this.usingVirtualDom) return;
        applyDialogToTopLevel(node);
        for (const plugin of this.config.plugins || []) {
          if (plugin.onBuild) plugin.onBuild(node, { id, replayer: this });
        }
      };

      const target = buildNodeWithSN(mutation.node, {
        doc: targetDoc as Document, // can be Document or RRDocument
        mirror: mirror as Mirror, // can be this.mirror or virtualDom.mirror
        skipChild: true,
        hackCss: true,
        cache: this.cache,
        removeAnimationCss: this.config.removeAnimationCss,
        /**
         * caveat: `afterAppend` only gets called on child nodes of target
         * we have to call it again below when this target was added to the DOM
         */
        afterAppend,
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
        mutation.node.type === NodeType.Text
      ) {
        const prospectiveSiblings = Array.isArray(parent.childNodes)
          ? parent.childNodes
          : Array.from(parent.childNodes);
        if (parentSn.tagName === 'textarea') {
          // This should be redundant now as we are either recording the value or the childNode, and not both
          // keeping around for backwards compatibility with old bad double data, see

          // https://github.com/rrweb-io/rrweb/issues/745
          // parent is textarea, will only keep one child node as the value
          for (const c of prospectiveSiblings) {
            if (c.nodeType === parent.TEXT_NODE) {
              parent.removeChild(c as Node & RRNode);
            }
          }
        } else if (
          parentSn.tagName === 'style' &&
          prospectiveSiblings.length === 1
        ) {
          // https://github.com/rrweb-io/rrweb/pull/1417
          /**
           * If both _cssText and textContent are present for a style element due to some existing bugs, the element was ending up with two child text nodes
           * We need to remove the textNode created by _cssText as it doesn't have an id in the mirror, and thus cannot be further mutated.
           */
          for (const cssText of prospectiveSiblings as (Node & RRNode)[]) {
            if (
              cssText.nodeType === parent.TEXT_NODE &&
              !mirror.hasNode(cssText)
            ) {
              target.textContent = cssText.textContent;
              parent.removeChild(cssText);
            }
          }
        }
      } else if (parentSn?.type === NodeType.Document) {
        /**
         * Sometimes the document object is changed or reopened and the MutationObserver is disconnected, so the removal of child elements can't be detected and recorded.
         * After the change of document, we may get another mutation which adds a new doctype or a HTML element, while the old one still exists in the dom.
         * So, we need to remove the old one first to avoid collision.
         */
        const parentDoc = parent as Document | RRDocument;
        /**
         * To detect the exist of the old doctype before adding a new doctype.
         * We need to remove the old doctype before adding the new one. Otherwise, code will throw "mutation Failed to execute 'insertBefore' on 'Node': Only one doctype on document allowed".
         */
        if (
          mutation.node.type === NodeType.DocumentType &&
          parentDoc.childNodes[0]?.nodeType === Node.DOCUMENT_TYPE_NODE
        )
          parentDoc.removeChild(parentDoc.childNodes[0] as Node & RRNode);
        /**
         * To detect the exist of the old HTML element before adding a new HTML element.
         * The reason is similar to the above. One document only allows exactly one DocType and one HTML Element.
         */
        if (target.nodeName === 'HTML' && parentDoc.documentElement)
          parentDoc.removeChild(
            parentDoc.documentElement as HTMLElement & RRNode,
          );
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
        (parent as TNode).appendChild(target as TNode);
      }
      /**
       * target was added, execute plugin hooks
       */
      afterAppend(target, mutation.node.id);

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

      const parentEl = target.parentElement as Element | RRElement;
      if (mutation.value && parentEl && parentEl.tagName === 'STYLE') {
        // assumes hackCss: true (which isn't currently configurable from rrweb)
        target.textContent = adaptCssForReplay(
          mutation.value,
          this.cache,
          this.config.removeAnimationCss,
        );
      } else {
        target.textContent = mutation.value;
      }

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
            if (attributeName === 'open')
              removeDialogFromTopLevel(target, mutation);
          } else if (typeof value === 'string') {
            try {
              // When building snapshot, some link styles haven't loaded. Then they are loaded, they will be inlined as incremental mutation change of attribute. We need to replace the old elements whose styles aren't inlined.
              if (
                attributeName === '_cssText' &&
                (target.nodeName === 'LINK' || target.nodeName === 'STYLE')
              ) {
                try {
                  const newSn = mirror.getMeta(
                    target as Node & RRNode,
                  ) as serializedElementNodeWithId;
                  const newNode = buildNodeWithSN(
                    {
                      ...newSn,
                      attributes: {
                        ...newSn.attributes,
                        ...(mutation.attributes as attributes),
                      },
                    },
                    {
                      doc: target.ownerDocument as Document, // can be Document or RRDocument
                      mirror: mirror as Mirror,
                      skipChild: true,
                      hackCss: true,
                      cache: this.cache,
                      removeAnimationCss: this.config.removeAnimationCss,
                    },
                  );
                  // Update mirror meta's attributes
                  Object.assign(
                    newSn.attributes,
                    mutation.attributes as attributes,
                  );
                  const siblingNode = target.nextSibling;
                  const parentNode = target.parentNode;
                  if (newNode && parentNode) {
                    parentNode.removeChild(target as Node & RRNode);
                    parentNode.insertBefore(
                      newNode as Node & RRNode,
                      siblingNode as (Node & RRNode) | null,
                    );
                    mirror.replace(mutation.id, newNode as Node & RRNode);
                    break;
                  }
                } catch (e) {
                  // for safe
                }
              }
              if (attributeName === 'value' && target.nodeName === 'TEXTAREA') {
                // this may or may not have an effect on the value property (which is what is displayed)
                // depending on whether the textarea has been modified by the user yet
                // TODO: replaceChildNodes is not available in RRDom
                const textarea = target as TNode;
                textarea.childNodes.forEach((c) =>
                  textarea.removeChild(c as TNode),
                );
                const tn = target.ownerDocument?.createTextNode(value);
                if (tn) {
                  textarea.appendChild(tn as TNode);
                }
              } else {
                (target as Element | RRElement).setAttribute(
                  attributeName,
                  value,
                );
              }

              if (
                attributeName === 'rr_open_mode' &&
                target.nodeName === 'DIALOG'
              ) {
                applyDialogToTopLevel(target, mutation);
              }
            } catch (error) {
              this.warn(
                'An error occurred may due to the checkout feature.',
                error,
              );
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
                const svs = styleValues[s];
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
      this.iframe.contentWindow?.scrollTo({
        top: d.y,
        left: d.x,
        behavior: isSync ? 'auto' : 'smooth',
      });
    } else if (sn?.type === NodeType.Document) {
      // nest iframe content document
      (target as Document).defaultView?.scrollTo({
        top: d.y,
        left: d.x,
        behavior: isSync ? 'auto' : 'smooth',
      });
    } else {
      try {
        (target as Element).scrollTo({
          top: d.y,
          left: d.x,
          behavior: isSync ? 'auto' : 'smooth',
        });
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

  private applySelection(d: selectionData) {
    try {
      const selectionSet = new Set<Selection>();
      const ranges = d.ranges.map(({ start, startOffset, end, endOffset }) => {
        const startContainer = this.mirror.getNode(start);
        const endContainer = this.mirror.getNode(end);

        if (!startContainer || !endContainer) return;

        const result = new Range();

        result.setStart(startContainer, startOffset);
        result.setEnd(endContainer, endOffset);
        const doc = startContainer.ownerDocument;
        const selection = doc?.getSelection();
        selection && selectionSet.add(selection);

        return {
          range: result,
          selection,
        };
      });

      selectionSet.forEach((s) => s.removeAllRanges());

      ranges.forEach((r) => r && r.selection?.addRange(r.range));
    } catch (error) {
      // for safe
    }
  }

  private applyStyleSheetMutation(
    data: styleDeclarationData | styleSheetRuleData,
  ) {
    let styleSheet: CSSStyleSheet | null = null;
    if (data.styleId) styleSheet = this.styleMirror.getStyle(data.styleId);
    else if (data.id)
      styleSheet =
        (this.mirror.getNode(data.id) as HTMLStyleElement)?.sheet || null;
    if (!styleSheet) return;
    if (data.source === IncrementalSource.StyleSheetRule)
      this.applyStyleSheetRule(data, styleSheet);
    else if (data.source === IncrementalSource.StyleDeclaration)
      this.applyStyleDeclaration(data, styleSheet);
  }

  private applyStyleSheetRule(
    data: styleSheetRuleData,
    styleSheet: CSSStyleSheet,
  ) {
    data.adds?.forEach(({ rule, index: nestedIndex }) => {
      try {
        if (Array.isArray(nestedIndex)) {
          const { positions, index } = getPositionsAndIndex(nestedIndex);
          const nestedRule = getNestedRule(styleSheet.cssRules, positions);
          nestedRule.insertRule(rule, index);
        } else {
          const index =
            nestedIndex === undefined
              ? undefined
              : Math.min(nestedIndex, styleSheet.cssRules.length);
          styleSheet?.insertRule(rule, index);
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

    data.removes?.forEach(({ index: nestedIndex }) => {
      try {
        if (Array.isArray(nestedIndex)) {
          const { positions, index } = getPositionsAndIndex(nestedIndex);
          const nestedRule = getNestedRule(styleSheet.cssRules, positions);
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

    if (data.replace)
      try {
        void styleSheet.replace?.(data.replace);
      } catch (e) {
        // for safety
      }

    if (data.replaceSync)
      try {
        styleSheet.replaceSync?.(data.replaceSync);
      } catch (e) {
        // for safety
      }
  }

  private applyStyleDeclaration(
    data: styleDeclarationData,
    styleSheet: CSSStyleSheet,
  ) {
    if (data.set) {
      const rule = getNestedRule(
        styleSheet.rules,
        data.index,
      ) as unknown as CSSStyleRule;
      rule.style.setProperty(
        data.set.property,
        data.set.value,
        data.set.priority,
      );
    }

    if (data.remove) {
      const rule = getNestedRule(
        styleSheet.rules,
        data.index,
      ) as unknown as CSSStyleRule;
      rule.style.removeProperty(data.remove.property);
    }
  }

  private applyAdoptedStyleSheet(data: adoptedStyleSheetData) {
    const targetHost = this.mirror.getNode(data.id);
    if (!targetHost) return;
    // Create StyleSheet objects which will be adopted after.
    data.styles?.forEach((style) => {
      let newStyleSheet: CSSStyleSheet | null = null;
      /**
       * Constructed StyleSheet can't share across multiple documents.
       * The replayer has to get the correct host window to recreate a StyleSheetObject.
       */
      let hostWindow: IWindow | null = null;
      if (hasShadowRoot(targetHost))
        hostWindow = targetHost.ownerDocument?.defaultView || null;
      else if (targetHost.nodeName === '#document')
        hostWindow = (targetHost as Document).defaultView;

      if (!hostWindow) return;
      try {
        newStyleSheet = new hostWindow.CSSStyleSheet();
        this.styleMirror.add(newStyleSheet, style.styleId);
        // To reuse the code of applying stylesheet rules
        this.applyStyleSheetRule(
          {
            source: IncrementalSource.StyleSheetRule,
            adds: style.rules,
          },
          newStyleSheet,
        );
      } catch (e) {
        // In case some browsers don't support constructing StyleSheet.
      }
    });

    const MAX_RETRY_TIME = 10;
    let count = 0;
    const adoptStyleSheets = (targetHost: Node, styleIds: number[]) => {
      const stylesToAdopt = styleIds
        .map((styleId) => this.styleMirror.getStyle(styleId))
        .filter((style) => style !== null);
      if (hasShadowRoot(targetHost))
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (targetHost as HTMLElement).shadowRoot!.adoptedStyleSheets =
          stylesToAdopt;
      else if (targetHost.nodeName === '#document')
        (targetHost as Document).adoptedStyleSheets = stylesToAdopt;

      /**
       * In the live mode where events are transferred over network without strict order guarantee, some newer events are applied before some old events and adopted stylesheets may haven't been created.
       * This retry mechanism can help resolve this situation.
       */
      if (stylesToAdopt.length !== styleIds.length && count < MAX_RETRY_TIME) {
        setTimeout(
          () => adoptStyleSheets(targetHost, styleIds),
          0 + 100 * count,
        );
        count++;
      }
    };
    adoptStyleSheets(targetHost, data.styleIds);
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
    (this.lastHoveredRootNode || this.iframe.contentDocument)
      ?.querySelectorAll('.\\:hover')
      .forEach((hoveredEl) => {
        hoveredEl.classList.remove(':hover');
      });
    this.lastHoveredRootNode = el.getRootNode() as Document | ShadowRoot;
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
    this.debug(`Node with id '${id}' not found. `, d);
  }

  private warn(...args: Parameters<typeof console.warn>) {
    if (!this.config.showWarning) {
      return;
    }
    this.config.logger.warn(REPLAY_CONSOLE_PREFIX, ...args);
  }

  private debug(...args: Parameters<typeof console.log>) {
    if (!this.config.showDebug) {
      return;
    }
    this.config.logger.log(REPLAY_CONSOLE_PREFIX, ...args);
  }
}

export { type PlayerMachineState, type SpeedMachineState, type playerConfig };
