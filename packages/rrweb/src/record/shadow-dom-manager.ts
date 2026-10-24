import type { MutationBufferParam } from '../types';
import type {
  mutationCallBack,
  scrollCallback,
  SamplingStrategy,
} from '@rrweb/types';
import {
  initMutationObserver,
  removeMutationBuffer,
  initScrollObserver,
  initAdoptedStyleSheetObserver,
} from './observer';
import { inDom, hasShadowRoot } from '../utils';
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
  private shadowDoms = new WeakSet<ShadowRoot>();
  /** Per-root teardowns, so one detached root can be released alone. */
  private shadowRootTeardowns = new Map<ShadowRoot, (() => void)[]>();
  private mutationCb: mutationCallBack;
  private scrollCb: scrollCallback;
  private bypassOptions: BypassOptions;
  private mirror: Mirror;
  private restoreHandlers: (() => void)[] = [];

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
    this.shadowDoms.add(shadowRoot);
    const teardowns: (() => void)[] = [];
    this.shadowRootTeardowns.set(shadowRoot, teardowns);
    const [observer] = initMutationObserver(
      {
        ...this.bypassOptions,
        doc,
        mutationCb: this.mutationCb,
        mirror: this.mirror,
        shadowDomManager: this,
      },
      shadowRoot,
    );
    teardowns.push(() => removeMutationBuffer(observer));
    teardowns.push(
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
      if (
        shadowRoot.adoptedStyleSheets &&
        shadowRoot.adoptedStyleSheets.length > 0
      )
        this.bypassOptions.stylesheetManager.adoptStyleSheets(
          shadowRoot.adoptedStyleSheets,
          this.mirror.getId(dom.host(shadowRoot)),
        );
      const restore = initAdoptedStyleSheetObserver(
        {
          mirror: this.mirror,
          stylesheetManager: this.bypassOptions.stylesheetManager,
        },
        shadowRoot,
      );
      const pending = this.shadowRootTeardowns.get(shadowRoot);
      if (pending) {
        pending.push(restore);
      } else {
        restore();
      }
    }, 0);
  }

  /** Disconnects one shadow root and forgets it. */
  public removeShadowRoot(shadowRoot: ShadowRoot) {
    const teardowns = this.shadowRootTeardowns.get(shadowRoot);
    if (teardowns) {
      teardowns.forEach((teardown) => {
        try {
          teardown();
        } catch (e) {
          //
        }
      });
      this.shadowRootTeardowns.delete(shadowRoot);
    }
    this.shadowDoms.delete(shadowRoot);
  }

  public removeShadowRootsFor(node: Node) {
    if (hasShadowRoot(node)) {
      const shadowRoot = node.shadowRoot;
      // Attached at emit time means moved or reinserted: keep observing.
      if (this.shadowDoms.has(shadowRoot) && !inDom(node)) {
        this.removeShadowRoot(shadowRoot);
      }
      this.removeShadowRootsFor(shadowRoot);
    }
    node.childNodes?.forEach((child) => this.removeShadowRootsFor(child));
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
            const shadowRootEl = dom.shadowRoot(this);
            if (shadowRootEl && inDom(this))
              manager.addShadowRoot(shadowRootEl, doc);
            return sRoot;
          };
        },
      ),
    );
  }

  public reset(doc?: Document) {
    if (doc) {
      // 子文档导航时，只释放该文档中的根，保留其他文档的监听。
      for (const root of this.shadowRootTeardowns.keys()) {
        if (root.ownerDocument === doc) this.removeShadowRoot(root);
      }
      return;
    }
    this.restoreHandlers.forEach((handler) => {
      try {
        handler();
      } catch (e) {
        //
      }
    });
    this.restoreHandlers = [];
    this.shadowRootTeardowns.forEach((teardowns) => {
      teardowns.forEach((teardown) => {
        try {
          teardown();
        } catch (e) {
          //
        }
      });
    });
    this.shadowRootTeardowns = new Map();
    this.shadowDoms = new WeakSet();
  }
}
