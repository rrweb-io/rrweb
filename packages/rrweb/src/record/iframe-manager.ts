import type { Mirror, serializedNodeWithId } from 'rrweb-snapshot';
import type { mutationCallBack } from '@rrweb/types';
import type { StylesheetManager } from './stylesheet-manager';

export class IframeManager {
  private iframes: WeakMap<HTMLIFrameElement, true> = new WeakMap();
  private mutationCb: mutationCallBack;
  private loadListener?: (iframeEl: HTMLIFrameElement) => unknown;
  private stylesheetManager: StylesheetManager;

  constructor(options: {
    mutationCb: mutationCallBack;
    stylesheetManager: StylesheetManager;
  }) {
    this.mutationCb = options.mutationCb;
    this.stylesheetManager = options.stylesheetManager;
  }

  public addIframe(iframeEl: HTMLIFrameElement) {
    this.iframes.set(iframeEl, true);
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
}
