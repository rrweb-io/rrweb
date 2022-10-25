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

      this.wrappedEmit(
        this.transformCrossOriginEvent(
          iframeEl,
          (message as CrossOriginIframeMessageEvent).data.event,
        ),
        (message as CrossOriginIframeMessageEvent).data.isCheckout,
      );
    }
  }

  private transformCrossOriginEvent(
    iframeEl: HTMLIFrameElement,
    e: eventWithTime,
  ): eventWithTime {
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
    }
    return e;
  }

  private replaceIdOnNode(
    node: serializedNodeWithId,
    iframeEl: HTMLIFrameElement,
  ) {
    let idMap = this.iframeIdMap.get(iframeEl);
    if (!idMap) {
      idMap = new Map();
      this.iframeIdMap.set(iframeEl, idMap);
    }

    let newId = idMap.get(node.id);
    if (newId === undefined) {
      newId = genId();
      idMap.set(node.id, newId);
    }

    node.id = newId;
    if ('childNodes' in node) {
      node.childNodes.forEach((child) => {
        this.replaceIdOnNode(child, iframeEl);
      });
    }
  }
}
