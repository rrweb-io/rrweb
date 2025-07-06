import { stringifyStylesheet } from './utils';

const CLEANUP_DEBOUNCE_TIME = 1000 * 60 * 2;

class AsyncStylesheetManager {
  static instance: AsyncStylesheetManager;

  constructor() {
    if (AsyncStylesheetManager.instance) return AsyncStylesheetManager.instance;
    AsyncStylesheetManager.instance = this;
  }

  private currentHref: null | string = null;

  private clones: Record<
    string,
    | {
        original: HTMLLinkElement;
        clone: HTMLLinkElement;
        loaded: boolean;
        cssText: string | null;
        cloneNodeAttrId: string;
      }
    | undefined
  > = {};

  private cleanTimeout: ReturnType<typeof setTimeout> | null = null;

  private removeCloneNode(href: string) {
    if (!(href in this.clones) || this.clones[href] === undefined) return;

    const clone = document.querySelector<HTMLLinkElement>(
      `link[data-rrweb-link-cloned="${this.clones[href].cloneNodeAttrId}"]`,
    );

    if (!clone) return;

    document.head.removeChild(clone);
  }

  onLoad(href: string) {
    if (!(href in this.clones) || this.clones[href] === undefined) return;

    console.log('AsyncStylesheetManager, onLoad: href:', href);

    const styleSheets = Array.from(document.styleSheets);

    let clonedStyleSheet: CSSStyleSheet | null = null;

    //looping backwards in case the original did create a stylesheet (we want the clone)
    for (let i = styleSheets.length - 1; i >= 0; i--) {
      if (styleSheets[i].href === href) {
        clonedStyleSheet = styleSheets[i];
        break;
      }
    }

    if (!clonedStyleSheet) {
      console.log(
        "AsyncStylesheetManager, onLoad: couldn't find stylesheet for href:",
        href,
      );
      return this.removeCloneNode(href);
    }

    const newCssText = stringifyStylesheet(clonedStyleSheet);

    this.removeCloneNode(href);

    if (!newCssText) {
      console.log(
        "AsyncStylesheetManager, onLoad: couldn't stringify stylesheet for href:",
        href,
      );
      return;
    }

    console.log(
      'AsyncStylesheetManager, onLoad: success! did get new css text! forcing mutation... for href:',
      href,
    );

    this.clones[href].cssText = newCssText;
    this.clones[href].loaded = true;

    //trigger a mutation on the original link element
    this.clones[href].original.setAttribute(
      'data-rrweb-mutation',
      Date.now().toString(),
    );
  }

  onLoadError(href: string) {
    if (!(href in this.clones) || this.clones[href] === undefined) return;
    this.removeCloneNode(href);
    //we'll keep the clone in memory, we still dont want to re-fetch it bc it will just fail again.
  }

  removeAllCloneElements() {
    for (const href of Object.keys(this.clones)) {
      this.removeCloneNode(href);
    }
  }

  onCleanTimeout() {
    console.log('AsyncStylesheetManager, onCleanTimeout: cleaning up');

    this.cleanTimeout = null;
    this.removeAllCloneElements();
  }

  blowCache() {
    console.log('AsyncStylesheetManager, blowCache: blowing cache');

    this.clones = {};
    this.removeAllCloneElements();
  }

  registerClone({ forElement }: { forElement: HTMLLinkElement }) {
    if (this.currentHref != null && document.location.href !== this.currentHref)
      this.blowCache();

    this.currentHref = document.location.href;

    const href = forElement.href;

    if (!href) return;

    if (href in this.clones && this.clones[href] !== undefined) return;

    if (forElement.getAttribute('crossorigin') === 'anonymous') return;

    console.log(
      'AsyncStylesheetManager, registerClone: registering clone for href:',
      href,
    );

    const clone = forElement.cloneNode() as HTMLLinkElement;

    const cloneNodeAttrId = Math.random().toString(36).slice(2);

    clone.setAttribute('crossorigin', 'anonymous');
    clone.setAttribute('data-rrweb-link-cloned', cloneNodeAttrId);

    document.head.appendChild(clone);

    this.clones[href] = {
      original: forElement,
      clone,
      loaded: false,
      cssText: null,
      cloneNodeAttrId,
    };

    clone.onload = () => {
      this.onLoad(href);
    };

    clone.onerror = () => {
      this.onLoadError(href);
    };

    //this is only for safe keeping in case a clone doesn't get removed normally
    if (this.cleanTimeout) clearTimeout(this.cleanTimeout);
    this.cleanTimeout = setTimeout(this.onCleanTimeout, CLEANUP_DEBOUNCE_TIME);
  }

  getClonedCssTextIfAvailable(href: string) {
    if (
      href in this.clones &&
      this.clones[href] !== undefined &&
      this.clones[href].loaded === true
    ) {
      console.log(
        'AsyncStylesheetManager, getClonedCssTextIfAvailable: returning cloned cssText, for href:',
        href,
      );

      return this.clones[href].cssText;
    }
    return null;
  }
}

const asyncStylesheetManager = new AsyncStylesheetManager();

export default asyncStylesheetManager;
