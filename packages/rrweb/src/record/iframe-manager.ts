import type { Mirror, serializedNodeWithId } from 'rrweb-snapshot';
import type {
  CrossOriginIframeMessageEvent,
  eventWithTime,
  mutationCallBack,
} from '../types';
import type { StylesheetManager } from './stylesheet-manager';

export class IframeManager {
  private iframes: WeakMap<HTMLIFrameElement, true> = new WeakMap();
  private crossOriginIframeMap: WeakMap<
    MessageEventSource,
    HTMLIFrameElement
  > = new WeakMap();
  private mutationCb: mutationCallBack;
  private wrappedEmit: (e: eventWithTime, isCheckout?: boolean) => void;
  private loadListener?: (iframeEl: HTMLIFrameElement) => unknown;
  private stylesheetManager: StylesheetManager;
  private recordCrossOriginIframes: boolean;

  constructor(options: {
    mutationCb: mutationCallBack;
    stylesheetManager: StylesheetManager;
    recordCrossOriginIframes: boolean;
    wrappedEmit: (e: eventWithTime, isCheckout?: boolean) => void;
  }) {
    this.mutationCb = options.mutationCb;
    this.wrappedEmit = options.wrappedEmit;
    this.stylesheetManager = options.stylesheetManager;
    this.recordCrossOriginIframes = options.recordCrossOriginIframes;
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
    mirror: Mirror,
  ) {
    this.mutationCb({
      adds: [
        {
          parentId: mirror.getId(iframeEl),
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
        mirror.getId(iframeEl.contentDocument),
      );
  }
  private handleMessage(message: MessageEvent | CrossOriginIframeMessageEvent) {
    if ((message as CrossOriginIframeMessageEvent).data.type === 'rrweb') {
      const iframeSourceWindow = message.source;

      console.log(
        'frameElement',
        iframeSourceWindow &&
          this.crossOriginIframeMap.get(iframeSourceWindow)?.outerHTML,
      );

      this.wrappedEmit(
        (message as CrossOriginIframeMessageEvent).data.event,
        (message as CrossOriginIframeMessageEvent).data.isCheckout,
      );
    }
  }
}
