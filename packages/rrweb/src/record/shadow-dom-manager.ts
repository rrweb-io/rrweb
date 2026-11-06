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
import { inDom, on } from '../utils';
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
  private shadowDoms = new Map<ShadowRoot, listenerHandler[]>();
  private mutationCb: mutationCallBack;
  private scrollCb: scrollCallback;
  private bypassOptions: BypassOptions;
  private mirror: Mirror;
  private restoreHandlers: (() => void)[] = [];
  private eventObservers = new Set<{
    doc: Document;
    observe(root: ShadowRoot): void;
  }>();

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

    this.init();
  }

  public init() {
    this.reset();
    // Patch 'attachShadow' to observe newly added shadow doms.
    this.patchAttachShadow(Element, document);
  }

  public addShadowRoot(shadowRoot: ShadowRoot, doc: Document) {
    if (!isNativeShadowDom(shadowRoot)) return;
    if (this.shadowDoms.has(shadowRoot)) return;
    const handlers: listenerHandler[] = [];
    this.shadowDoms.set(shadowRoot, handlers);
    this.eventObservers.forEach((observer) => {
      if (observer.doc === shadowRoot.ownerDocument)
        observer.observe(shadowRoot);
    });
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
    handlers.push(
      initScrollObserver({
        ...this.bypassOptions,
        scrollCb: this.scrollCb,
        // https://gist.github.com/praveenpuglia/0832da687ed5a5d7a0907046c9ef1813
        // scroll is not allowed to pass the boundary, so we need to listen the shadow document
        doc: shadowRoot as unknown as Document,
        mirror: this.mirror,
      }),
    );
    // Defer this to avoid adoptedStyleSheet events being created before the full snapshot is created or attachShadow action is recorded.
    setTimeout(() => {
      // The shadow root was released, or the manager reset, in the meantime.
      if (this.shadowDoms.get(shadowRoot) !== handlers) return;
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

  /** 在文档和它的各个根内监听，避免 closed 边界隐藏原始事件目标。 */
  public observeEvent(type: string, listener: EventListener, doc: Document) {
    const handlers = new Map<ShadowRoot, listenerHandler>();
    const observer = {
      doc,
      observe: (root: ShadowRoot) => {
        handlers.set(root, on(type, listener, root));
        this.shadowDoms.get(root)?.push(() => {
          handlers.get(root)?.();
          handlers.delete(root);
        });
      },
    };
    this.eventObservers.add(observer);
    this.shadowDoms.forEach((_, root) => {
      if (root.ownerDocument === doc) observer.observe(root);
    });
    const stop = on(type, listener, doc);
    return () => {
      stop();
      handlers.forEach((handler) => handler());
      handlers.clear();
      this.eventObservers.delete(observer);
    };
  }

  public removeShadowRootsIn(n: Node) {
    if (this.shadowDoms.size === 0) return;
    const shadowRoot = dom.shadowRoot(n);
    if (shadowRoot) {
      if (this.shadowDoms.has(shadowRoot)) {
        this.removeShadowRoot(shadowRoot);
      }
      this.removeShadowRootsIn(shadowRoot);
    }
    dom.childNodes(n).forEach((child) => this.removeShadowRootsIn(child));
  }

  private removeShadowRoot(shadowRoot: ShadowRoot) {
    const handlers = this.shadowDoms.get(shadowRoot);
    this.shadowDoms.delete(shadowRoot);
    handlers?.forEach(runHandler);
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
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const manager = this;
    this.restoreHandlers.push(
      patch(
        element.prototype,
        'attachShadow',
        function (original: (init: ShadowRootInit) => ShadowRoot) {
          return function (this: Element, option: ShadowRootInit) {
            const sRoot = original.call(this, option);
            // For the shadow dom elements in the document, monitor their dom mutations.
            // For shadow dom elements that aren't in the document yet,
            // we start monitoring them once their shadow dom host is appended to the document.
            if (isNativeShadowDom(sRoot)) dom.registerShadowRoot(sRoot);
            const shadowRootEl = dom.shadowRoot(this);
            if (shadowRootEl && inDom(this))
              manager.addShadowRoot(shadowRootEl, doc);
            return sRoot;
          };
        },
      ),
    );
  }

  public reset() {
    this.restoreHandlers.forEach(runHandler);
    this.restoreHandlers = [];
    const shadowDoms = this.shadowDoms;
    this.shadowDoms = new Map();
    shadowDoms.forEach((handlers) => handlers.forEach(runHandler));
  }
}

function runHandler(handler: listenerHandler) {
  try {
    handler();
  } catch (e) {
    //
  }
}
