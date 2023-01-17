import type { MutationBufferParam } from '../types';
import type {
  mutationCallBack,
  scrollCallback,
  SamplingStrategy,
} from '@rrweb/types';
import {
  initMutationObserver,
  initScrollObserver,
  initAdoptedStyleSheetObserver,
} from './observer';
import { patch, inDom } from '../utils';
import type { Mirror } from 'rrweb-snapshot';
import { isNativeShadowDom } from 'rrweb-snapshot';

type BypassOptions = Omit<
  MutationBufferParam,
  'doc' | 'mutationCb' | 'mirror' | 'shadowDomManager'
> & {
  sampling: SamplingStrategy;
};

export class ShadowDomManager {
  private shadowDoms = new WeakSet<ShadowRoot>();
  private mutationCb: mutationCallBack;
  private scrollCb: scrollCallback;
  private bypassOptions: BypassOptions;
  private mirror: Mirror;
  private observerHandlers: (() => void)[] = [];
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
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const manager = this;
    this.restorePatches.push(
      patch(
        Element.prototype,
        'attachShadow',
        function (original: (init: ShadowRootInit) => ShadowRoot) {
          return function (this: HTMLElement, option: ShadowRootInit) {
            const shadowRoot = original.call(this, option);

            // For the shadow dom elements in the document, monitor their dom mutations.
            // For shadow dom elements that aren't in the document yet,
            // we start monitoring them once their shadow dom host is appended to the document.
            if (this.shadowRoot && inDom(this))
              manager.addShadowRoot(this.shadowRoot, this.ownerDocument);
            return shadowRoot;
          };
        },
      ),
    );
  }

  public addShadowRoot(shadowRoot: ShadowRoot, doc: Document) {
    if (!isNativeShadowDom(shadowRoot)) return;
    if (this.shadowDoms.has(shadowRoot)) return;
    this.shadowDoms.add(shadowRoot);
    const observer = initMutationObserver(
      {
        ...this.bypassOptions,
        doc,
        mutationCb: this.mutationCb,
        mirror: this.mirror,
        shadowDomManager: this,
      },
      shadowRoot,
    );
    this.observerHandlers.push(() => observer.disconnect());
    this.observerHandlers.push(
      initScrollObserver({
        ...this.bypassOptions,
        scrollCb: this.scrollCb,
        // https://gist.github.com/praveenpuglia/0832da687ed5a5d7a0907046c9ef1813
        // scroll is not allowed to pass the boundary, so we need to listen the shadow document
        doc: (shadowRoot as unknown) as Document,
        mirror: this.mirror,
      }),
    );
    // Defer this to avoid adoptedStyleSheet events being created before the full snapshot is created or attachShadow action is recorded.
    setTimeout(() => {
      if (
        shadowRoot.adoptedStyleSheets &&
        shadowRoot.adoptedStyleSheets.length > 0
      )
        this.bypassOptions.stylesheetManager.adoptStyleSheets(
          shadowRoot.adoptedStyleSheets,
          this.mirror.getId(shadowRoot.host),
        );
      this.observerHandlers.push(
        initAdoptedStyleSheetObserver(
          {
            mirror: this.mirror,
            stylesheetManager: this.bypassOptions.stylesheetManager,
          },
          shadowRoot,
        ),
      );
    }, 0);
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
          function (original: (init: ShadowRootInit) => ShadowRoot) {
            return function (this: HTMLElement, option: ShadowRootInit) {
              const shadowRoot = original.call(this, option);
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

  public clearCache() {
    this.shadowDoms = new WeakSet();
    this.observerHandlers.forEach((handler) => {
      try {
        handler();
      } catch (e) {
        //
      }
    });
    this.observerHandlers = [];
  }

  public reset() {
    this.restorePatches.forEach((restorePatch) => restorePatch());
    this.clearCache();
  }
}
