import type {
  mutationCallBack,
  scrollCallback,
  MutationBufferParam,
  SamplingStrategy,
} from '../types';
import { initMutationObserver, initScrollObserver } from './observer';
import { patch } from '../utils';
import type { Mirror } from 'rrweb-snapshot';

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
  private restorePatches: (() => void)[] = [];

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

    // Patch 'attachShadow' to observe newly added shadow doms.
    const manager = this;
    this.restorePatches.push(
      patch(HTMLElement.prototype, 'attachShadow', function (original) {
        return function () {
          const shadowRoot = original.apply(this, arguments);
          if (this.shadowRoot)
            manager.addShadowRoot(this.shadowRoot, this.ownerDocument);
          return shadowRoot;
        };
      }),
    );
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
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const manager = this;
      this.restorePatches.push(
        patch(
          (iframeElement.contentWindow as Window & {
            HTMLElement: { prototype: HTMLElement };
          }).HTMLElement.prototype,
          'attachShadow',
          function (original) {
            return function (this: HTMLElement, ...args: unknown[]) {
              const shadowRoot = original.apply(this, args);
              if (this.shadowRoot)
                manager.addShadowRoot(
                  this.shadowRoot,
                  iframeElement.contentDocument as Document,
                );
              return shadowRoot;
            };
          },
        ),
      );
    }
  }

  public reset() {
    this.restorePatches.forEach((restorePatch) => restorePatch());
  }
}
