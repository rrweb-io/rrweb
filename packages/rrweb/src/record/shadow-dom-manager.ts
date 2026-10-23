import type { MutationBufferParam } from '../types';
import type {
  listenerHandler,
  mutationCallBack,
  scrollCallback,
  SamplingStrategy,
} from '@rrweb/types';
import {
  initMutationObserver,
  initScrollObserver,
  initAdoptedStyleSheetObserver,
} from './observer';
import { inDom } from '../utils';
import type { Mirror } from 'rrweb-snapshot';
import { isNativeShadowDom } from 'rrweb-snapshot';
import dom, { patch } from '@rrweb/utils';

type BypassOptions = Omit<
  MutationBufferParam,
  'doc' | 'mutationCb' | 'mirror' | 'shadowDomManager'
> & {
  sampling: SamplingStrategy;
};

export class ShadowDomManager {
  /** Observed shadow roots and the handlers that stop observing them. */
  private shadowDoms = new Map<
    ShadowRoot,
    { doc: Document; handlers: listenerHandler[] }
  >();
  private mutationCb: mutationCallBack;
  private scrollCb: scrollCallback;
  private bypassOptions: BypassOptions;
  private mirror: Mirror;
  private restoreHandlers = new Map<Document, listenerHandler>();

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
  }

  public init() {
    this.reset();
    // Patch 'attachShadow' to observe newly added shadow doms.
    this.patchAttachShadow(Element, document);
  }

  public addShadowRoot(shadowRoot: ShadowRoot) {
    if (this.bypassOptions.snapshotSignal?.aborted) return;
    if (!isNativeShadowDom(shadowRoot)) return;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const doc = dom.ownerDocument(shadowRoot)!;
    const existing = this.shadowDoms.get(shadowRoot);
    if (existing?.doc === doc) return;
    if (existing) this.removeShadowRoot(shadowRoot);
    const handlers: listenerHandler[] = [];
    const entry = { doc, handlers };
    const stopMutationObserver = initMutationObserver(
      {
        ...this.bypassOptions,
        doc,
        mutationCb: this.mutationCb,
        mirror: this.mirror,
        shadowDomManager: this,
      },
      shadowRoot,
    );
    handlers.push(stopMutationObserver);
    try {
      handlers.push(
        initScrollObserver({
          ...this.bypassOptions,
          scrollCb: this.scrollCb,
          // Scroll events do not cross the shadow boundary.
          doc: shadowRoot as unknown as Document,
          mirror: this.mirror,
        }),
      );
    } catch (error) {
      stopMutationObserver();
      throw error;
    }
    this.shadowDoms.set(shadowRoot, entry);
    // Defer this to avoid adoptedStyleSheet events being created before the full snapshot is created or attachShadow action is recorded.
    setTimeout(() => {
      // The shadow root was released, or the manager reset, in the meantime.
      if (this.shadowDoms.get(shadowRoot) !== entry) return;
      if (
        shadowRoot.adoptedStyleSheets &&
        shadowRoot.adoptedStyleSheets.length > 0
      )
        this.bypassOptions.stylesheetManager.adoptStyleSheets(
          shadowRoot.adoptedStyleSheets,
          this.mirror.getId(dom.host(shadowRoot)),
        );
      handlers.push(
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
   * Stops observing the shadow roots in a removed subtree, including nested ones. Hosts that are back in the
   * document by now were moved rather than removed and stay observed.
   */
  public removeShadowRootsIn(n: Node) {
    if (this.shadowDoms.size === 0) return;
    const shadowRoot = dom.shadowRoot(n);
    if (shadowRoot) {
      if (this.shadowDoms.has(shadowRoot) && !inDom(n)) {
        this.removeShadowRoot(shadowRoot);
      }
      this.removeShadowRootsIn(shadowRoot);
    }
    dom.childNodes(n).forEach((child) => this.removeShadowRootsIn(child));
  }

  private removeShadowRoot(shadowRoot: ShadowRoot) {
    const entry = this.shadowDoms.get(shadowRoot);
    this.shadowDoms.delete(shadowRoot);
    entry?.handlers.forEach(runHandler);
  }

  public removeDocument(doc: Document) {
    const errors: unknown[] = [];
    for (const [shadowRoot, entry] of this.shadowDoms) {
      if (entry.doc !== doc) continue;
      this.removeShadowRoot(shadowRoot);
      if (dom.ownerDocument(shadowRoot) !== doc && inDom(shadowRoot)) {
        try {
          this.addShadowRoot(shadowRoot);
        } catch (error) {
          errors.push(error);
        }
      }
    }
    const restore = this.restoreHandlers.get(doc);
    this.restoreHandlers.delete(doc);
    if (restore) runHandler(restore);
    if (errors.length) throw errors[0];
  }

  /**
   * Monkey patch 'attachShadow' of an IFrameElement to observe newly added shadow doms.
   */
  public observeAttachShadow(iframeElement: HTMLIFrameElement) {
    if (!iframeElement.contentWindow || !iframeElement.contentDocument) return;

    this.patchAttachShadow(
      (
        iframeElement.contentWindow as Window & {
          Element: { prototype: Element };
        }
      ).Element,
      iframeElement.contentDocument,
    );
  }

  /**
   * Patch 'attachShadow' to observe newly added shadow doms.
   */
  private patchAttachShadow(
    element: {
      prototype: Element;
    },
    doc: Document,
  ) {
    if (this.bypassOptions.snapshotSignal?.aborted) return;
    if (this.restoreHandlers.has(doc)) return;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const manager = this;
    this.restoreHandlers.set(
      doc,
      patch(
        element.prototype,
        'attachShadow',
        function (original: (init: ShadowRootInit) => ShadowRoot) {
          return function (this: Element, option: ShadowRootInit) {
            const sRoot = original.call(this, option);
            // For the shadow dom elements in the document, monitor their dom mutations.
            // For shadow dom elements that aren't in the document yet,
            // we start monitoring them once their shadow dom host is appended to the document.
            const shadowRootEl = dom.shadowRoot(this);
            if (shadowRootEl && inDom(this))
              manager.addShadowRoot(shadowRootEl);
            return sRoot;
          };
        },
      ),
    );
  }

  public reset() {
    this.restoreHandlers.forEach(runHandler);
    this.restoreHandlers.clear();
    const shadowDoms = this.shadowDoms;
    this.shadowDoms = new Map();
    shadowDoms.forEach(({ handlers }) => handlers.forEach(runHandler));
  }
}

function runHandler(handler: listenerHandler) {
  try {
    handler();
  } catch (e) {
    //
  }
}
