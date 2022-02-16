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

export class ShadowDomManager {
  private mutationCb: mutationCallBack;
  private scrollCb: scrollCallback;
  private bypassOptions: BypassOptions;
  private mirror: Mirror;
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
      if (this.shadowRoot) manager.addShadowRoot(this.shadowRoot, document);
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

  public reset() {
    HTMLElement.prototype.attachShadow = this.originalAttachShadow;
  }
}
