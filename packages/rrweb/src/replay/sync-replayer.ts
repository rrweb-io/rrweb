import {
  rebuild,
  buildNodeWithSN,
  NodeType,
  BuildCache,
  createCache,
  Mirror,
  attributes,
  serializedElementNodeWithId,
  IMirror,
} from 'rrweb-snapshot';
import { RRDocument as BaseRRDocument } from 'rrdom';
import type {
  RRNode,
  RRElement,
  RRStyleElement,
  RRIFrameElement,
  RRMediaElement,
  RRCanvasElement,
  Mirror as RRDOMMirror,
} from 'rrdom';
import * as mittProxy from 'mitt';
import type { playerConfig } from '../types';
import {
  EventType,
  IncrementalSource,
  fullSnapshotEvent,
  eventWithTime,
  MouseInteractions,
  playerMetaData,
  addedNodeMutation,
  incrementalSnapshotEvent,
  incrementalData,
  ReplayerEvents,
  Handler,
  Emitter,
  MediaInteractions,
  metaEvent,
  mutationData,
  styleValueWithPriority,
  mouseMovePos,
  canvasEventWithTime,
  selectionData,
  styleSheetRuleData,
  styleDeclarationData,
  adoptedStyleSheetData,
} from '@rrweb/types';
import {
  queueToResolveTrees,
  iterateResolveTree,
  hasShadowRoot,
  isSerializedIframe,
  uniqueTextMutations,
} from '../utils';
import type { Replayer } from '.';

// https://github.com/rollup/rollup/issues/1267#issuecomment-296395734
const mitt = mittProxy.default || mittProxy;

const REPLAY_CONSOLE_PREFIX = '[replayer]';

class RRDocument extends BaseRRDocument {
  scrollTop: number;
  scrollLeft: number;
}

type missingNodeMap = {
  [id: number]: { node: RRNode; mutation: addedNodeMutation };
};

type AppendedIframe = {
  mutationInQueue: addedNodeMutation;
  builtNode: RRIFrameElement;
};

export class SyncReplayer {
  public config: Partial<playerConfig>;

  public virtualDom: RRDocument = new RRDocument();

  public mousePos: mouseMovePos | null = null;

  // In the fast-forward mode, only the last selection data needs to be applied.
  public lastSelectionData: selectionData | null = null;

  // In the fast-forward mode using VirtualDom optimization, all stylesheetRule, and styleDeclaration events on constructed StyleSheets will be delayed to get applied until the flush stage.
  public constructedStyleMutations: (
    | styleSheetRuleData
    | styleDeclarationData
  )[] = [];

  // Similar to the reason for constructedStyleMutations.
  public adoptedStyleSheets: adoptedStyleSheetData[] = [];

  public events: eventWithTime[];

  public latestMetaEvent: eventWithTime | null = null;

  public unhandledEvents: eventWithTime[] = [];

  private currentTime = 0;

  private emitter: Emitter = mitt();

  private legacy_missingNodeRetryMap: missingNodeMap = {};

  // The replayer uses the cache to speed up replay and scrubbing.
  private cache: BuildCache = createCache();

  private mirror: RRDOMMirror = this.virtualDom.mirror;

  private newDocumentQueue: addedNodeMutation[] = [];

  constructor(
    events: Array<eventWithTime | string>,
    config?: Partial<playerConfig>,
  ) {
    if (!config?.liveMode && events.length < 2) {
      throw new Error('Replayer need at least 2 events.');
    }
    this.events = events
      .map((e) => {
        if (config && config.unpackFn) {
          return config.unpackFn(e as string);
        }
        return e as eventWithTime;
      })
      .sort((a1, a2) => a1.timestamp - a2.timestamp);
    const defaultConfig = {
      showWarning: true,
      showDebug: false,
      liveMode: false,
      logger: console,
    };
    this.config = Object.assign({}, defaultConfig, config);

    /**
     * Exposes mirror to the plugins
     */
    for (const plugin of this.config.plugins || []) {
      if (plugin.getMirror)
        plugin.getMirror({ nodeMirror: this.mirror as unknown as Mirror });
    }

    this.emitter.on(ReplayerEvents.PlayBack, () => {
      this.mirror.reset();
    });

    // rebuild first full snapshot as the poster of the player
    // maybe we can cache it for performance optimization
    const firstMeta = this.events.find((e) => e.type === EventType.Meta);
    if (firstMeta) {
      const { width, height } = firstMeta.data as metaEvent['data'];
      setTimeout(() => {
        this.emitter.emit(ReplayerEvents.Resize, {
          width,
          height,
        });
      }, 0);
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
  }

  public getMetaData(): playerMetaData {
    const firstEvent = this.events[0];
    const lastEvent = this.events[this.events.length - 1];
    return {
      startTime: firstEvent.timestamp,
      endTime: lastEvent.timestamp,
      totalTime: lastEvent.timestamp - firstEvent.timestamp,
    };
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public getMirror() {
    return this.mirror;
  }

  public play(
    castEventCallback?: (event: {
      index: number;
      event: eventWithTime;
      currentTime: number;
    }) => boolean | void,
  ) {
    const baseTime = this.events[0].timestamp;
    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      const castFn = this.getCastFn(event);
      castFn();
      this.currentTime = event.timestamp - baseTime;
      if (
        castEventCallback?.({
          index: i,
          event: event,
          currentTime: this.currentTime,
        }) === false
      )
        break;
    }
  }

  public reversePlay(
    castEventCallback?: (event: {
      index: number;
      event: eventWithTime;
      currentTime: number;
    }) => boolean | void,
  ) {
    const baseTime = this.events[0].timestamp;
    for (let i = this.events.length - 1; i >= 0; i--) {
      const event = this.events[i];
      this.currentTime = event.timestamp - baseTime;
      if (
        castEventCallback?.({
          index: i,
          event: event,
          currentTime: this.currentTime,
        }) === false
      )
        break;
    }
  }

  /**
   * Totally destroy this replayer and please be careful that this operation is irreversible.
   * Memory occupation can be released by removing all references to this replayer.
   */
  public destroy() {
    this.emitter.emit(ReplayerEvents.Destroy);
  }

  public startLive() {
    this.config.liveMode = true;
    this.play();
  }

  public addEvent(rawEvent: eventWithTime | string) {
    const event = this.config.unpackFn
      ? this.config.unpackFn(rawEvent as string)
      : (rawEvent as eventWithTime);
    const castFn = this.getCastFn(event);
    castFn();
  }

  /**
   * Empties the replayer's cache and reclaims memory.
   * The replayer will use this cache to speed up the playback.
   */
  public resetCache() {
    this.cache = createCache();
  }

  private getCastFn = (event: eventWithTime) => {
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
        this.latestMetaEvent = event;
        break;
      case EventType.FullSnapshot:
        castFn = () => {
          this.rebuildFullSnapshot(event);
          this.virtualDom.scrollTop = event.data.initialOffset.top;
          this.virtualDom.scrollLeft = event.data.initialOffset.left;
        };
        break;
      case EventType.IncrementalSnapshot:
        castFn = () => {
          this.applyIncremental(event);
        };
        break;
      default:
    }
    const wrappedCastFn = () => {
      if (castFn) {
        castFn();
      }

      for (const plugin of this.config.plugins || []) {
        if (plugin.handler)
          plugin.handler(event, true, {
            replayer: this as unknown as Replayer,
          });
      }

      // events are kept sorted by timestamp, check if this is the last event
      if (
        !this.config.liveMode &&
        event === this.events[this.events.length - 1]
      ) {
        this.emitter.emit(ReplayerEvents.Finish);
      }

      this.emitter.emit(ReplayerEvents.EventCast, event);
    };
    return wrappedCastFn;
  };

  private rebuildFullSnapshot(
    event: fullSnapshotEvent & { timestamp: number },
  ) {
    if (Object.keys(this.legacy_missingNodeRetryMap).length) {
      this.warn(
        'Found unresolved missing node map',
        this.legacy_missingNodeRetryMap,
      );
    }
    this.legacy_missingNodeRetryMap = {};
    const collected: AppendedIframe[] = [];
    const afterAppend = (builtNode: Node, id: number) => {
      this.collectIframeAndAttachDocument(
        collected,
        builtNode as unknown as RRNode,
      );
      for (const plugin of this.config.plugins || []) {
        if (plugin.onBuild)
          plugin.onBuild(builtNode, {
            id,
            replayer: this as unknown as Replayer,
          });
      }
    };

    this.mirror.reset();
    rebuild(event.data.node, {
      doc: this.virtualDom as unknown as Document,
      afterAppend,
      cache: this.cache,
      mirror: this.mirror as unknown as Mirror,
    });
    afterAppend(this.virtualDom as unknown as Document, event.data.node.id);

    for (const { mutationInQueue, builtNode } of collected) {
      this.attachDocumentToIframe(mutationInQueue, builtNode);
      this.newDocumentQueue = this.newDocumentQueue.filter(
        (m) => m !== mutationInQueue,
      );
    }
    this.emitter.emit(ReplayerEvents.FullsnapshotRebuilded, event);
  }

  private attachDocumentToIframe(
    mutation: addedNodeMutation,
    iframeEl: RRIFrameElement,
  ) {
    const collected: AppendedIframe[] = [];
    const afterAppend = (builtNode: Node, id: number) => {
      this.collectIframeAndAttachDocument(
        collected,
        builtNode as unknown as RRNode,
      );

      for (const plugin of this.config.plugins || []) {
        if (plugin.onBuild)
          plugin.onBuild(builtNode, {
            id,
            replayer: this as unknown as Replayer,
          });
      }
    };

    buildNodeWithSN(mutation.node, {
      doc: iframeEl.contentDocument as unknown as Document,
      mirror: this.mirror as unknown as Mirror,
      hackCss: true,
      skipChild: false,
      afterAppend,
      cache: this.cache,
    });
    afterAppend(
      iframeEl.contentDocument as unknown as Document,
      mutation.node.id,
    );

    for (const { mutationInQueue, builtNode } of collected) {
      this.attachDocumentToIframe(mutationInQueue, builtNode);
      this.newDocumentQueue = this.newDocumentQueue.filter(
        (m) => m !== mutationInQueue,
      );
    }
  }

  private collectIframeAndAttachDocument(
    collected: AppendedIframe[],
    builtNode: RRNode,
  ) {
    if (
      isSerializedIframe(
        builtNode as unknown as Node,
        this.mirror as unknown as IMirror<Node>,
      )
    ) {
      const mutationInQueue = this.newDocumentQueue.find(
        (m) => m.parentId === this.mirror.getId(builtNode),
      );
      if (mutationInQueue) {
        collected.push({
          mutationInQueue,
          builtNode: builtNode as RRIFrameElement,
        });
      }
    }
  }

  private applyIncremental(
    e: incrementalSnapshotEvent & { timestamp: number; delay?: number },
  ) {
    const { data: d } = e;
    switch (d.source) {
      case IncrementalSource.Mutation: {
        try {
          this.applyMutation(d);
        } catch (error) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
          this.warn(`Exception in mutation ${error.message || error}`, d);
        }
        break;
      }
      case IncrementalSource.Drag:
      case IncrementalSource.TouchMove:
      case IncrementalSource.MouseMove:
        {
          const lastPosition = d.positions[d.positions.length - 1];
          this.mousePos = {
            x: lastPosition.x,
            y: lastPosition.y,
            id: lastPosition.id,
            debugData: d,
          };
        }
        break;
      case IncrementalSource.MouseInteraction: {
        /**
         * Same as the situation of missing input target.
         */
        if (d.id === -1) {
          break;
        }

        const target = this.mirror.getNode(d.id);
        if (!target) {
          return this.debugNodeNotFound(d, d.id);
        }
        this.emitter.emit(ReplayerEvents.MouseInteraction, {
          type: d.type,
          target,
        });
        switch (d.type) {
          case MouseInteractions.Blur:
            break;
          case MouseInteractions.Focus:
            break;
          case MouseInteractions.Click:
          case MouseInteractions.TouchStart:
          case MouseInteractions.TouchEnd:
            this.mousePos = {
              x: d.x,
              y: d.y,
              id: d.id,
              debugData: d,
            };
            break;
          case MouseInteractions.TouchCancel:
            break;
          default:
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

        const target = this.virtualDom.mirror.getNode(d.id) as RRElement;
        if (!target) {
          return this.debugNodeNotFound(d, d.id);
        }
        target.scrollData = d;
        break;
      }
      case IncrementalSource.ViewportResize:
        this.emitter.emit(ReplayerEvents.Resize, {
          width: d.width,
          height: d.height,
        });
        if (!this.latestMetaEvent) break;
        Object.assign(this.latestMetaEvent.data as metaEvent, {
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
        const target = this.virtualDom.mirror.getNode(d.id) as RRElement;
        if (!target) {
          return this.debugNodeNotFound(d, d.id);
        }
        target.inputData = d;
        break;
      }
      case IncrementalSource.MediaInteraction: {
        const target = this.mirror.getNode(d.id);
        if (!target) {
          return this.debugNodeNotFound(d, d.id);
        }
        const mediaEl = target as RRMediaElement;
        try {
          if (d.currentTime !== undefined) {
            mediaEl.currentTime = d.currentTime;
          }
          if (d.volume !== undefined) {
            mediaEl.volume = d.volume;
          }
          if (d.muted !== undefined) {
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
          if (d.type === MediaInteractions.RateChange) {
            mediaEl.playbackRate = d.playbackRate;
          }
        } catch (error) {
          this.warn(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
            `Failed to replay media interactions: ${error.message || error}`,
          );
        }
        break;
      }
      case IncrementalSource.StyleSheetRule:
      case IncrementalSource.StyleDeclaration: {
        if (d.styleId) this.constructedStyleMutations.push(d);
        else if (d.id)
          (this.mirror.getNode(d.id) as RRStyleElement | null)?.rules.push(d);
        break;
      }
      case IncrementalSource.CanvasMutation: {
        if (!this.config.UNSAFE_replayCanvas) {
          return;
        }

        const target = this.virtualDom.mirror.getNode(d.id) as RRCanvasElement;
        if (!target) {
          return this.debugNodeNotFound(d, d.id);
        }
        target.canvasMutations.push({
          event: e as canvasEventWithTime,
          mutation: d,
        });
        break;
      }
      case IncrementalSource.Font: {
        this.unhandledEvents.push(e);
        break;
      }
      case IncrementalSource.Selection: {
        this.lastSelectionData = d;
        break;
      }
      case IncrementalSource.AdoptedStyleSheet: {
        this.adoptedStyleSheets.push(d);
        break;
      }
      default:
    }
  }

  private applyMutation(d: mutationData) {
    const mirror = this.mirror;

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
        // no need to warn, parent was already removed
        return;
      }
      let parent = mirror.getNode(mutation.parentId);
      if (!parent) {
        return this.warnNodeNotFound(d, mutation.parentId);
      }
      if (mutation.isShadow && hasShadowRoot(parent as unknown as Node)) {
        parent = (parent as RRElement).shadowRoot;
      }
      // target may be removed with its parents before
      mirror.removeNodeFromMap(target);
      if (parent)
        try {
          parent.removeChild(target);
          /**
           * https://github.com/rrweb-io/rrweb/pull/887
           * Remove any virtual style rules for stylesheets if a child text node is removed.
           */
          if (
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
      let next: RRNode | null = null;
      if (mutation.nextId) {
        next = mirror.getNode(mutation.nextId);
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
      let parent = mirror.getNode(mutation.parentId);
      if (!parent) {
        if (mutation.node.type === NodeType.Document) {
          // is newly added document, maybe the document node of an iframe
          return this.newDocumentQueue.push(mutation);
        }
        return queue.push(mutation);
      }
      if (mutation.node.isShadow) {
        // If the parent is attached a shadow dom after it's created, it won't have a shadow root.
        if (!hasShadowRoot(parent as unknown as Node)) {
          (parent as RRElement).attachShadow({ mode: 'open' });
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          parent = (parent as RRElement).shadowRoot!;
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        } else parent = (parent as RRElement).shadowRoot!;
      }

      let previous: RRNode | null = null;
      let next: RRNode | null = null;
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
        : this.virtualDom;

      if (isSerializedIframe<typeof parent>(parent, mirror)) {
        this.attachDocumentToIframe(mutation, parent as RRIFrameElement);
        return;
      }
      const afterAppend = (node: Node | RRNode, id: number) => {
        for (const plugin of this.config.plugins || []) {
          if (plugin.onBuild)
            plugin.onBuild(node, { id, replayer: this as unknown as Replayer });
        }
      };

      const target = buildNodeWithSN(mutation.node, {
        doc: targetDoc as unknown as Document,
        mirror: mirror as unknown as Mirror,
        skipChild: true,
        hackCss: true,
        cache: this.cache,
        /**
         * caveat: `afterAppend` only gets called on child nodes of target
         * we have to call it again below when this target was added to the DOM
         */
        afterAppend,
      }) as unknown as RRNode;

      // legacy data, we should not have -1 siblings any more
      if (mutation.previousId === -1 || mutation.nextId === -1) {
        legacy_missingNodeMap[mutation.node.id] = {
          node: target,
          mutation,
        };
        return;
      }

      const parentSn = mirror.getMeta(parent);
      if (
        parentSn &&
        parentSn.type === NodeType.Element &&
        parentSn.tagName === 'textarea' &&
        mutation.node.type === NodeType.Text
      ) {
        // https://github.com/rrweb-io/rrweb/issues/745
        // parent is textarea, will only keep one child node as the value
        for (const c of parent.childNodes) {
          if (c.nodeType === parent.TEXT_NODE) {
            parent.removeChild(c);
          }
        }
      } else if (parentSn?.type === NodeType.Document) {
        /**
         * Sometimes the document object is changed or reopened and the MutationObserver is disconnected, so the removal of child elements can't be detected and recorded.
         * After the change of document, we may get another mutation which adds a new doctype or a HTML element, while the old one still exists in the dom.
         * So, we need to remove the old one first to avoid collision.
         */
        const parentDoc = parent as RRDocument;
        /**
         * To detect the exist of the old doctype before adding a new doctype.
         * We need to remove the old doctype before adding the new one. Otherwise, code will throw "mutation Failed to execute 'insertBefore' on 'Node': Only one doctype on document allowed".
         */
        if (
          mutation.node.type === NodeType.DocumentType &&
          parentDoc.childNodes[0]?.nodeType === Node.DOCUMENT_TYPE_NODE
        )
          parentDoc.removeChild(parentDoc.childNodes[0]);
        /**
         * To detect the exist of the old HTML element before adding a new HTML element.
         * The reason is similar to the above. One document only allows exactly one DocType and one HTML Element.
         */
        if (target.nodeName === 'HTML' && parentDoc.documentElement)
          parentDoc.removeChild(parentDoc.documentElement);
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
        parent.appendChild(target);
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
        target.nodeName === '#text' &&
        parent.nodeName === 'STYLE' &&
        (parent as RRStyleElement).rules?.length > 0
      )
        (parent as RRStyleElement).rules = [];

      if (isSerializedIframe(target, this.mirror)) {
        const targetId = this.mirror.getId(target);
        const mutationInQueue = this.newDocumentQueue.find(
          (m) => m.parentId === targetId,
        );
        if (mutationInQueue) {
          this.attachDocumentToIframe(
            mutationInQueue,
            target as RRIFrameElement,
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
      const parent = target.parentNode as RRStyleElement;
      if (parent?.rules?.length > 0) parent.rules = [];
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
            (target as RRElement).removeAttribute(attributeName);
          } else if (typeof value === 'string') {
            try {
              // When building snapshot, some link styles haven't loaded. Then they are loaded, they will be inlined as incremental mutation change of attribute. We need to replace the old elements whose styles aren't inlined.
              if (
                attributeName === '_cssText' &&
                (target.nodeName === 'LINK' || target.nodeName === 'STYLE')
              ) {
                try {
                  const newSn = mirror.getMeta(
                    target,
                  ) as serializedElementNodeWithId;
                  Object.assign(
                    newSn.attributes,
                    mutation.attributes as attributes,
                  );
                  const newNode = buildNodeWithSN(newSn, {
                    doc: target.ownerDocument as unknown as Document,
                    mirror: mirror as unknown as Mirror,
                    skipChild: true,
                    hackCss: true,
                    cache: this.cache,
                  }) as unknown as RRNode;
                  const siblingNode = target.nextSibling;
                  const parentNode = target.parentNode;
                  if (newNode && parentNode) {
                    parentNode.removeChild(target);
                    parentNode.insertBefore(newNode, siblingNode);
                    mirror.replace(mutation.id, newNode as Node & RRNode);
                    break;
                  }
                } catch (e) {
                  // for safe
                }
              }
              (target as RRElement).setAttribute(attributeName, value);
            } catch (error) {
              this.warn(
                'An error occurred may due to the checkout feature.',
                error,
              );
            }
          } else if (attributeName === 'style') {
            const styleValues = value;
            const targetEl = target as RRElement;
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

  private legacy_resolveMissingNode(
    map: missingNodeMap,
    parent: RRNode,
    target: RRNode,
    targetMutation: addedNodeMutation,
  ) {
    const { previousId, nextId } = targetMutation;
    const previousInMap = previousId && map[previousId];
    const nextInMap = nextId && map[nextId];
    if (previousInMap) {
      const { node, mutation } = previousInMap;
      parent.insertBefore(node, target);
      delete map[mutation.node.id];
      delete this.legacy_missingNodeRetryMap[mutation.node.id];
      if (mutation.previousId || mutation.nextId) {
        this.legacy_resolveMissingNode(map, parent, node, mutation);
      }
    }
    if (nextInMap) {
      const { node, mutation } = nextInMap;
      parent.insertBefore(node, target.nextSibling);
      delete map[mutation.node.id];
      delete this.legacy_missingNodeRetryMap[mutation.node.id];
      if (mutation.previousId || mutation.nextId) {
        this.legacy_resolveMissingNode(map, parent, node, mutation);
      }
    }
  }

  private warnNodeNotFound(d: incrementalData, id: number) {
    this.warn(`Node with id '${id}' not found. `, d);
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
    this.config.logger?.warn(REPLAY_CONSOLE_PREFIX, ...args);
  }

  private debug(...args: Parameters<typeof console.log>) {
    if (!this.config.showDebug) {
      return;
    }
    this.config.logger?.log(REPLAY_CONSOLE_PREFIX, ...args);
  }
}
