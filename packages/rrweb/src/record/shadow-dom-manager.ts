import {
  mutationCallBack,
  Mirror,
  scrollCallback,
  MutationBufferParam,
  SamplingStrategy,
} from '../types';
import { initMutationObserver, initScrollObserver } from './observer';

type BypassOptions = Omit<
  MutationBufferParam,
  'doc' | 'mutationCb' | 'mirror' | 'shadowDomManager'
> & {
  sampling: SamplingStrategy;
};

type WindowWithHTMLElement = Window & {
  HTMLElement: { prototype: HTMLElement; new (): HTMLElement };
};

export class ShadowDomManager {
  private mutationCb: mutationCallBack;
  private scrollCb: scrollCallback;
  private bypassOptions: BypassOptions;
  private mirror: Mirror;
  private observedIFrames: {
    iframe: HTMLIFrameElement;
    originalAttachShadow: (init: ShadowRootInit) => ShadowRoot;
  }[] = [];
  private originalAttachShadow: (init: ShadowRootInit) => ShadowRoot;

  constructor(options: {
    mutationCb: mutationCallBack;
    scrollCb: scrollCallback;
    bypassOptions: BypassOptions;
    mirror: Mirror;
  }) {
    this.mutationCb = options.mutationCb;
    this.scrollCb = options.scrollCb;
    this.bypassOptions = options.bypassOptions;
    this.mirror = options.mirror;

    // Monkey patch 'attachShadow' to observe newly added shadow doms.
    this.originalAttachShadow = HTMLElement.prototype.attachShadow;
    const attachShadow = this.originalAttachShadow;
    const manager = this;
    HTMLElement.prototype.attachShadow = function () {
      const shadowRoot = attachShadow.apply(this, arguments);
      if (this.shadowRoot)
        manager.addShadowRoot(this.shadowRoot, this.ownerDocument);
      return shadowRoot;
    };
  }

  public addShadowRoot(shadowRoot: ShadowRoot, doc: Document) {
    initMutationObserver(
      {
        ...this.bypassOptions,
        doc,
        mutationCb: this.mutationCb,
        mirror: this.mirror,
        shadowDomManager: this,
      },
      shadowRoot,
    );
    initScrollObserver({
      ...this.bypassOptions,
      scrollCb: this.scrollCb,
      // https://gist.github.com/praveenpuglia/0832da687ed5a5d7a0907046c9ef1813
      // scroll is not allowed to pass the boundary, so we need to listen the shadow document
      doc: (shadowRoot as unknown) as Document,
      mirror: this.mirror,
    });
  }

  /**
   * Monkey patch 'attachShadow' of an IFrameElement to observe newly added shadow doms.
   */
  public observeAttachShadow(iframeElement: HTMLIFrameElement) {
    if (iframeElement.contentWindow) {
      const originalAttachShadow = (iframeElement.contentWindow as WindowWithHTMLElement)
        .HTMLElement.prototype.attachShadow;
      const manager = this;
      (iframeElement.contentWindow as WindowWithHTMLElement).HTMLElement.prototype.attachShadow = function () {
        const shadowRoot = originalAttachShadow.apply(this, arguments);
        if (this.shadowRoot)
          manager.addShadowRoot(
            this.shadowRoot,
            iframeElement.contentDocument as Document,
          );
        return shadowRoot;
      };
      this.observedIFrames.push({
        iframe: iframeElement,
        originalAttachShadow,
      });
    }
  }

  public reset() {
    HTMLElement.prototype.attachShadow = this.originalAttachShadow;
    this.observedIFrames.forEach(
      ({ iframe, originalAttachShadow }) =>
        iframe.contentWindow &&
        ((iframe.contentWindow as WindowWithHTMLElement).HTMLElement.prototype.attachShadow = originalAttachShadow),
    );
  }
}
