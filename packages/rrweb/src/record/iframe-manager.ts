import type { Mirror, serializedNodeWithId } from 'rrweb-snapshot';
import { genId } from 'rrweb-snapshot';
import {
  CrossOriginIframeMessageEvent,
  EventType,
  eventWithTime,
  IncrementalSource,
  mutationCallBack,
} from '../types';
import type { StylesheetManager } from './stylesheet-manager';

export class IframeManager {
  private iframes: WeakMap<HTMLIFrameElement, true> = new WeakMap();
  private crossOriginIframeMap: WeakMap<
    MessageEventSource,
    HTMLIFrameElement
  > = new WeakMap();
  private iframeIdMap: WeakMap<
    HTMLIFrameElement,
    Map<number, number>
  > = new WeakMap();
  private mirror: Mirror;
  private mutationCb: mutationCallBack;
  private wrappedEmit: (e: eventWithTime, isCheckout?: boolean) => void;
  private loadListener?: (iframeEl: HTMLIFrameElement) => unknown;
  private stylesheetManager: StylesheetManager;
  private recordCrossOriginIframes: boolean;

  constructor(options: {
    mirror: Mirror;
    mutationCb: mutationCallBack;
    stylesheetManager: StylesheetManager;
    recordCrossOriginIframes: boolean;
    wrappedEmit: (e: eventWithTime, isCheckout?: boolean) => void;
  }) {
    this.mutationCb = options.mutationCb;
    this.wrappedEmit = options.wrappedEmit;
    this.stylesheetManager = options.stylesheetManager;
    this.recordCrossOriginIframes = options.recordCrossOriginIframes;
    this.mirror = options.mirror;
    if (this.recordCrossOriginIframes) {
      window.addEventListener('message', this.handleMessage.bind(this));
    }
  }

  public addIframe(iframeEl: HTMLIFrameElement) {
    this.iframes.set(iframeEl, true);
    if (iframeEl.contentWindow)
      this.crossOriginIframeMap.set(iframeEl.contentWindow, iframeEl);
  }

  public addLoadListener(cb: (iframeEl: HTMLIFrameElement) => unknown) {
    this.loadListener = cb;
  }

  public attachIframe(
    iframeEl: HTMLIFrameElement,
    childSn: serializedNodeWithId,
  ) {
    this.mutationCb({
      adds: [
        {
          parentId: this.mirror.getId(iframeEl),
          nextId: null,
          node: childSn,
        },
      ],
      removes: [],
      texts: [],
      attributes: [],
      isAttachIframe: true,
    });
    this.loadListener?.(iframeEl);

    if (
      iframeEl.contentDocument &&
      iframeEl.contentDocument.adoptedStyleSheets &&
      iframeEl.contentDocument.adoptedStyleSheets.length > 0
    )
      this.stylesheetManager.adoptStyleSheets(
        iframeEl.contentDocument.adoptedStyleSheets,
        this.mirror.getId(iframeEl.contentDocument),
      );
  }
  private handleMessage(message: MessageEvent | CrossOriginIframeMessageEvent) {
    if ((message as CrossOriginIframeMessageEvent).data.type === 'rrweb') {
      const iframeSourceWindow = message.source;
      if (!iframeSourceWindow) return;

      const iframeEl = this.crossOriginIframeMap.get(message.source);
      if (!iframeEl) return;

      const transformedEvent = this.transformCrossOriginEvent(
        iframeEl,
        (message as CrossOriginIframeMessageEvent).data.event,
      );

      if (transformedEvent)
        this.wrappedEmit(
          transformedEvent,
          (message as CrossOriginIframeMessageEvent).data.isCheckout,
        );
    }
  }

  private transformCrossOriginEvent(
    iframeEl: HTMLIFrameElement,
    e: eventWithTime,
  ): eventWithTime | void {
    if (e.type === EventType.FullSnapshot) {
      this.iframeIdMap.set(iframeEl, new Map());
      /**
       * Replaces the original id of the iframe with a new set of unique ids
       */
      this.replaceIdOnNode(e.data.node, iframeEl);
      return {
        timestamp: e.timestamp,
        type: EventType.IncrementalSnapshot,
        data: {
          source: IncrementalSource.Mutation,
          adds: [
            {
              parentId: this.mirror.getId(iframeEl),
              nextId: null,
              node: e.data.node,
            },
          ],
          removes: [],
          texts: [],
          attributes: [],
          isAttachIframe: true,
        },
      };
    } else if (e.type === EventType.IncrementalSnapshot) {
      switch (e.data.source) {
        case IncrementalSource.Mutation: {
          e.data.adds.forEach((n) => {
            this.replaceIds(n, iframeEl, ['parentId', 'nextId', 'previousId']);
            this.replaceIdOnNode(n.node, iframeEl);
          });
          e.data.removes.forEach((n) => {
            this.replaceIds(n, iframeEl, ['parentId', 'id']);
          });
          e.data.attributes.forEach((n) => {
            this.replaceIds(n, iframeEl, ['id']);
          });
          e.data.texts.forEach((n) => {
            this.replaceIds(n, iframeEl, ['id']);
          });
          break;
        }
        case IncrementalSource.MouseMove: {
          // TODO
          break;
        }
        case IncrementalSource.MouseInteraction: {
          // TODO
          break;
        }
        case IncrementalSource.Scroll: {
          this.replaceIds(e.data, iframeEl, ['id']);
          break;
        }
        case IncrementalSource.ViewportResize: {
          // can safely ignore these events
          return;
        }
        case IncrementalSource.Input: {
          this.replaceIds(e.data, iframeEl, ['id']);
          break;
        }
        case IncrementalSource.TouchMove: {
          // TODO
          break;
        }
        case IncrementalSource.MediaInteraction: {
          // TODO
          break;
        }
        case IncrementalSource.StyleSheetRule: {
          // TODO
          break;
        }
        case IncrementalSource.CanvasMutation: {
          // TODO
          break;
        }
        case IncrementalSource.Font: {
          // TODO
          break;
        }
        // case IncrementalSource.Log: {
        //   // TODO
        //   break;
        // }
        case IncrementalSource.Drag: {
          // TODO
          break;
        }
        case IncrementalSource.StyleDeclaration: {
          // TODO
          break;
        }
        case IncrementalSource.Selection: {
          // TODO
          break;
        }
        case IncrementalSource.AdoptedStyleSheet: {
          // TODO
          break;
        }
        default: {
          break;
        }
      }
      return e;
    }
    return e;
  }

  private replaceIds<T extends Record<string, unknown>>(
    obj: T,
    iframeEl: HTMLIFrameElement,
    keys: Array<keyof T>,
  ): T {
    let idMap = this.iframeIdMap.get(iframeEl);
    if (!idMap) {
      idMap = new Map();
      this.iframeIdMap.set(iframeEl, idMap);
    }

    for (const key of keys) {
      if (typeof obj[key] !== 'number') continue;
      const originalId = obj[key] as number;
      let newId = idMap.get(originalId);
      if (!newId) {
        newId = genId();
        idMap.set(originalId, newId);
      }
      (obj[key] as number) = newId;
    }

    return obj;
  }

  private replaceIdOnNode(
    node: serializedNodeWithId,
    iframeEl: HTMLIFrameElement,
  ) {
    this.replaceIds(node, iframeEl, ['id']);
    if ('childNodes' in node) {
      node.childNodes.forEach((child) => {
        this.replaceIdOnNode(child, iframeEl);
      });
    }
  }
}
