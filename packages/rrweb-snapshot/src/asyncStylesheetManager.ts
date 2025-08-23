import { stringifyStylesheet } from './utils';

//effectively, this becomes the time limit on all fetching (caused by cloning)
//link tag is cloned -> triggers a fetch -> if the fetch is pending after this time, the cloned link element will forcefully be removed
//and therefore it's associated "styleSheet" (if there is one or one will be created shortly) will also be removed
//(but it's main purpose is just safe-keeping so we don't overflow the page with cloned links)
const CLEANUP_DEBOUNCE_TIME = 1000 * 30;

const DATA_ATTRIBUTE_CLONED_NAME = 'data-rrweb-link-cloned';

const DISALLOWED_EXTENSIONS = [
  // Fonts
  'woff',
  'woff2',
  'ttf',
  'otf',
  // Embedded OpenType font
  'eot',
  // Images
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'webp',
  'ico',
  // Scripts
  'js',
  'mjs',
  'ts',
  'jsx',
  'tsx',
  // Data files
  'json',
  'map',
  // Media
  'mp4',
  'webm',
  'ogg',
  'mp3',
  'wav',
  // Archives
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
  // Documents
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
];

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
        requestCssId: string;
      }
    | undefined
  > = {};

  private cleanTimeout: ReturnType<typeof setTimeout> | null = null;

  private removeCloneNode(href: string) {
    if (!(href in this.clones) || this.clones[href] === undefined) return;

    const clone = document.querySelector<HTMLLinkElement>(
      `link[${DATA_ATTRIBUTE_CLONED_NAME}="${this.clones[href].cloneNodeAttrId}"]`,
    );

    if (!clone) return;

    clone.parentNode?.removeChild(clone);
  }

  onLoad(href: string) {
    if (!(href in this.clones) || this.clones[href] === undefined) return;

    const styleSheets = Array.from(document.styleSheets);

    let clonedStyleSheet: CSSStyleSheet | null = null;

    //looping backwards in case the original did create a stylesheet (we want the clone)
    for (let i = styleSheets.length - 1; i >= 0; i--) {
      if (styleSheets[i].href === href) {
        clonedStyleSheet = styleSheets[i];
        break;
      }
    }

    if (!clonedStyleSheet) return this.removeCloneNode(href);

    const newCssText = stringifyStylesheet(clonedStyleSheet);

    this.removeCloneNode(href);

    if (!newCssText) return;

    this.clones[href].cssText = newCssText;
    this.clones[href].loaded = true;

    const original = document.querySelector<HTMLLinkElement>(
      `link[${DATA_ATTRIBUTE_CLONED_NAME}="source-${this.clones[href].cloneNodeAttrId}"]`,
    );

    //trigger a mutation on the original link element
    if (original) {
      //just removing the attribute should be enough to trigger a mutation
      //but in some cases, apparently, it doesn't have to trigger a mutation
      //(so we'll also add "data-rrweb-mutation")
      original.setAttribute('data-rrweb-mutation', Date.now().toString());
      original.removeAttribute(DATA_ATTRIBUTE_CLONED_NAME);
    } else {
      //fallback
      this.clones[href].original.setAttribute(
        'data-rrweb-mutation',
        Date.now().toString(),
      );

      this.clones[href].original.removeAttribute(DATA_ATTRIBUTE_CLONED_NAME);
    }

    //so, in our case, we're changing the "rrweb-snapshot" code to improve our recordings
    //but this package "rrweb-snapshot" is used by other packages as well.
    //so, we cannot access the rrweb-record code directly, so we'll use a custom event (instead of record.addCustomEvent)
    //which the user needs to listen to (if they want)
    //BUT, we'll keep rrweb's data structure.
    window.dispatchEvent(
      new CustomEvent('__rrweb_custom_event__', {
        detail: {
          type: 5,
          timestamp: Date.now(),
          data: {
            tag: 'async-css-resolution',
            requestCssId: this.clones[href].requestCssId,
            cssText: this.clones[href].cssText,
          },
        },
      }),
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
    asyncStylesheetManager.cleanTimeout = null;
    asyncStylesheetManager.removeAllCloneElements();
  }

  blowCache() {
    this.removeAllCloneElements();
    this.clones = {};
  }

  requestClone({
    forElement,
    requestCssId,
  }: {
    forElement: HTMLLinkElement;
    requestCssId: string;
  }) {
    if (this.currentHref != null && document.location.href !== this.currentHref)
      this.blowCache();

    this.currentHref = document.location.href;

    const href = forElement.href;

    if (!href) return;

    if (href in this.clones && this.clones[href] !== undefined) return;

    if (forElement.getAttribute('crossorigin') === 'anonymous') return;

    if (forElement.rel !== 'stylesheet') {
      //we want to handle some links which are not stylesheets (e.g. preloads which kinda creates a stylesheet)
      //but we dont want to handle links which we are sure isn't css (hence the extension check)
      //however, this check isn't exhastive, so we'll still probably gonna process some links which aren't css
      //which is fine, and will be handled gracefully by this manager.
      //this is just to avoid the majority of unnecessary re-fetches
      const last = href.split('/').pop();
      if (last && last.includes('.')) {
        const [filename] = last.split('?');
        const ext = filename.split('.').pop();
        if (ext) {
          if (DISALLOWED_EXTENSIONS.includes(ext.trim().toLowerCase())) return;
        }
      }
    }

    const clone = forElement.cloneNode() as HTMLLinkElement;

    const cloneNodeAttrId = Math.random().toString(36).slice(2);

    clone.setAttribute('crossorigin', 'anonymous');
    clone.setAttribute(DATA_ATTRIBUTE_CLONED_NAME, cloneNodeAttrId);

    forElement.setAttribute(
      DATA_ATTRIBUTE_CLONED_NAME,
      `source-${cloneNodeAttrId}`,
    );

    document.head.appendChild(clone);

    this.clones[href] = {
      original: forElement,
      clone,
      loaded: false,
      cssText: null,
      cloneNodeAttrId,
      requestCssId,
    };

    clone.onload = () => {
      this.onLoad(href);
    };

    clone.onerror = () => {
      this.onLoadError(href);
    };

    //this is only for safe keeping in case a clone doesn't get removed normally
    if (this.cleanTimeout) clearTimeout(this.cleanTimeout);
    this.cleanTimeout = setTimeout(
      asyncStylesheetManager.onCleanTimeout,
      CLEANUP_DEBOUNCE_TIME,
    );
  }

  getClonedCssTextIfAvailable(href: string) {
    if (
      href in this.clones &&
      this.clones[href] !== undefined &&
      this.clones[href].loaded === true
    ) {
      return this.clones[href].cssText;
    }
    return null;
  }
}

const asyncStylesheetManager = new AsyncStylesheetManager();

export default asyncStylesheetManager;
