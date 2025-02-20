/**
 * @vitest-environment jsdom
 */
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

import snapshot, {
  _isBlockedElement,
  serializeNodeWithId,
} from '../src/snapshot';
import type {
  serializedNodeWithId,
  elementNode,
  asset,
  captureAssetsParam,
} from '@rrweb/types';
import { Mirror, absolutifyURLs } from '../src/utils';

const serializeNode = (node: Node): serializedNodeWithId | null => {
  return serializeNodeWithId(node, {
    doc: document,
    mirror: new Mirror(),
    blockClass: 'blockblock',
    blockSelector: null,
    maskTextClass: 'maskmask',
    maskTextSelector: null,
    skipChild: false,
    inlineStylesheet: true,
    maskTextFn: undefined,
    maskInputFn: undefined,
    slimDOMOptions: {},
  });
};

describe('absolute url to stylesheet', () => {
  const href = 'http://localhost/css/style.css';

  it('can handle relative path', () => {
    expect(absolutifyURLs('url(a.jpg)', href)).toEqual(
      `url(http://localhost/css/a.jpg)`,
    );
  });

  it('can handle same level path', () => {
    expect(absolutifyURLs('url("./a.jpg")', href)).toEqual(
      `url("http://localhost/css/a.jpg")`,
    );
  });

  it('can handle parent level path', () => {
    expect(absolutifyURLs('url("../a.jpg")', href)).toEqual(
      `url("http://localhost/a.jpg")`,
    );
  });

  it('can handle absolute path', () => {
    expect(absolutifyURLs('url("/a.jpg")', href)).toEqual(
      `url("http://localhost/a.jpg")`,
    );
  });

  it('can handle external path', () => {
    expect(absolutifyURLs('url("http://localhost/a.jpg")', href)).toEqual(
      `url("http://localhost/a.jpg")`,
    );
  });

  it('can handle single quote path', () => {
    expect(absolutifyURLs(`url('./a.jpg')`, href)).toEqual(
      `url('http://localhost/css/a.jpg')`,
    );
  });

  it('can handle no quote path', () => {
    expect(absolutifyURLs('url(./a.jpg)', href)).toEqual(
      `url(http://localhost/css/a.jpg)`,
    );
  });

  it('can handle multiple no quote paths', () => {
    expect(
      absolutifyURLs(
        'background-image: url(images/b.jpg);background: #aabbcc url(images/a.jpg) 50% 50% repeat;',
        href,
      ),
    ).toEqual(
      `background-image: url(http://localhost/css/images/b.jpg);` +
        `background: #aabbcc url(http://localhost/css/images/a.jpg) 50% 50% repeat;`,
    );
  });

  it('can handle data url image', () => {
    expect(absolutifyURLs('url(data:image/gif;base64,ABC)', href)).toEqual(
      'url(data:image/gif;base64,ABC)',
    );
    expect(
      absolutifyURLs(
        'url(data:application/font-woff;base64,d09GMgABAAAAAAm)',
        href,
      ),
    ).toEqual('url(data:application/font-woff;base64,d09GMgABAAAAAAm)');
  });

  it('preserves quotes around inline svgs with spaces', () => {
    expect(
      absolutifyURLs(
        "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath fill='%2328a745' d='M3'/%3E%3C/svg%3E\")",
        href,
      ),
    ).toEqual(
      "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath fill='%2328a745' d='M3'/%3E%3C/svg%3E\")",
    );
    expect(
      absolutifyURLs(
        'url(\'data:image/svg+xml;utf8,<svg width="28" height="32" viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg"><path d="M27 14C28" fill="white"/></svg>\')',
        href,
      ),
    ).toEqual(
      'url(\'data:image/svg+xml;utf8,<svg width="28" height="32" viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg"><path d="M27 14C28" fill="white"/></svg>\')',
    );
    expect(
      absolutifyURLs(
        'url("data:image/svg+xml;utf8,<svg width="28" height="32" viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg"><path d="M27 14C28" fill="white"/></svg>")',
        href,
      ),
    ).toEqual(
      'url("data:image/svg+xml;utf8,<svg width="28" height="32" viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg"><path d="M27 14C28" fill="white"/></svg>")',
    );
  });
  it('can handle empty path', () => {
    expect(absolutifyURLs(`url('')`, href)).toEqual(`url('')`);
  });
});

describe('isBlockedElement()', () => {
  const subject = (html: string, opt: any = {}) =>
    _isBlockedElement(render(html), 'rr-block', opt.blockSelector);

  const render = (html: string): HTMLElement =>
    JSDOM.fragment(html).querySelector('div')!;

  it('can handle empty elements', () => {
    expect(subject('<div />')).toEqual(false);
  });

  it('blocks prohibited className', () => {
    expect(subject('<div class="foo rr-block bar" />')).toEqual(true);
  });

  it('does not block random data selector', () => {
    expect(subject('<div data-rr-block />')).toEqual(false);
  });

  it('blocks blocked selector', () => {
    expect(
      subject('<div data-rr-block />', { blockSelector: '[data-rr-block]' }),
    ).toEqual(true);
  });
});

describe('style elements', () => {
  const render = (html: string): HTMLStyleElement => {
    document.write(html);
    return document.querySelector('style')!;
  };

  it('should serialize all rules of stylesheet when the sheet has a single child node', () => {
    const styleEl = render(`<style>body { color: red; }</style>`);
    styleEl.sheet?.insertRule('section { color: blue; }');
    expect(serializeNode(styleEl)).toMatchObject({
      rootId: undefined,
      attributes: {
        _cssText: 'section {color: blue;}body {color: red;}',
      },
      type: 2,
    });
  });

  it('should serialize all rules on stylesheets with mix of insertion type', () => {
    const styleEl = render(`<style>body { color: red; }</style>`);
    styleEl.sheet?.insertRule('section.lost { color: unseeable; }'); // browser throws this away after append
    styleEl.append(document.createTextNode('section { color: blue; }'));
    styleEl.sheet?.insertRule('section.working { color: pink; }');
    expect(serializeNode(styleEl)).toMatchObject({
      rootId: undefined,
      attributes: {
        _cssText:
          'section.working {color: pink;}body {color: red;}/* rr_split */section {color: blue;}',
      },
      type: 2,
    });
  });
});

describe('scrollTop/scrollLeft', () => {
  const render = (html: string): HTMLDivElement => {
    document.write(html);
    return document.querySelector('div')!;
  };

  it('should serialize scroll positions', () => {
    const el = render(`<div style='overflow: auto; width: 1px; height: 1px;'>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
    </div>`);
    el.scrollTop = 10;
    el.scrollLeft = 20;
    expect(serializeNode(el)).toMatchObject({
      attributes: {
        rr_scrollTop: 10,
        rr_scrollLeft: 20,
      },
    });
  });
});

describe('form', () => {
  const render = (html: string): HTMLTextAreaElement => {
    document.write(html);
    return document.querySelector('textarea')!;
  };

  it('should record textarea values once', () => {
    const el = render(`<textarea>Lorem ipsum</textarea>`);
    const sel = serializeNode(el) as elementNode;

    // we serialize according to where the DOM stores the value, not how
    // the HTML stores it (this is so that maskInputValue can work over
    // inputs/textareas/selects in a uniform way)
    expect(sel).toMatchObject({
      attributes: {
        value: 'Lorem ipsum',
      },
    });
    expect(sel?.childNodes).toEqual([]); // shouldn't be stored in childNodes while in transit
  });
});

describe('jsdom snapshot', () => {
  const render = (html: string): Document => {
    document.write(html);
    return document;
  };

  it("doesn't rely on global browser objects", () => {
    // this test is incomplete in terms of coverage,
    // but the idea being that we are checking that all features use the
    // passed-in `doc` object rather than the global `document`
    // (which is only present in browsers)
    // in any case, supporting jsdom is not a primary goal

    const doc = render(`<!DOCTYPE html><p>Hello world</p><canvas></canvas>`);
    const sn = snapshot(doc, {
      // JSDOM Error: Not implemented: HTMLCanvasElement.prototype.toDataURL (without installing the canvas npm package)
      //recordCanvas: true,
    });
    expect(sn).toMatchObject({
      type: 0,
    });
  });
});

describe('onAssetDetected callback', () => {
  const serializeNode = (
    node: Node,
    onAssetDetected: (result: asset) => void,
    inlineImages?: boolean,
    captureAssets?: captureAssetsParam,
  ): serializedNodeWithId | null => {
    if (captureAssets === undefined) {
      captureAssets = {
        objectURLs: true,
        origins: ['https://example.com'],
      };
    }

    return serializeNodeWithId(node, {
      doc: document,
      mirror: new Mirror(),
      blockClass: 'blockblock',
      blockSelector: null,
      maskTextClass: 'maskmask',
      maskTextSelector: null,
      skipChild: false,
      inlineStylesheet: true,
      maskTextFn: undefined,
      maskInputFn: undefined,
      slimDOMOptions: {},
      newlyAddedElement: false,
      inlineImages: Boolean(inlineImages),
      onAssetDetected,
      captureAssets,
    });
  };

  const render = (html: string): HTMLDivElement => {
    document.write(html);
    return document.querySelector('div')!;
  };

  it('should detect `src` attribute in image', () => {
    const el = render(`<div>
      <img src="https://example.com/image.png" />
    </div>`);

    const onAssetDetectedCallback = vi.fn();
    serializeNode(el, onAssetDetectedCallback);
    expect(onAssetDetectedCallback).toHaveBeenCalledWith({
      element: el.querySelector('img'),
      attr: 'src',
      value: 'https://example.com/image.png',
    });
  });

  it('should detect `set` attribute in image with ObjectURL', () => {
    const el = render(`<div>
      <img src="blob:https://example.com/e81acc2b-f460-4aec-91b3-ce9732b837c4" />
    </div>`);

    const onAssetDetectedCallback = vi.fn();
    serializeNode(el, onAssetDetectedCallback);
    expect(onAssetDetectedCallback).toHaveBeenCalledWith({
      element: el.querySelector('img'),
      attr: 'src',
      value: 'blob:https://example.com/e81acc2b-f460-4aec-91b3-ce9732b837c4',
    });
  });
  it('should detect `srcset` attribute in image', () => {
    const el = render(`<div>
      <img srcset="https://example.com/images/team-photo.jpg, https://example.com/images/team-photo-retina.jpg 2x" />
    </div>`);

    // this used to trigger two calls, but now AssetManager is responsible for parsing the args
    const onAssetDetectedCallback = vi.fn();
    serializeNode(el, onAssetDetectedCallback);
    expect(onAssetDetectedCallback).toHaveBeenCalledWith({
      element: el.querySelector('img'),
      attr: 'srcset',
      value:
        'https://example.com/images/team-photo.jpg, https://example.com/images/team-photo-retina.jpg 2x',
    });
  });

  it('should detect `src` attribute in two images', () => {
    const el = render(`<div>
      <img src="https://example.com/image.png" />
      <img src="https://example.com/image2.png" />
    </div>`);

    const onAssetDetectedCallback = vi.fn();
    serializeNode(el, onAssetDetectedCallback);
    expect(onAssetDetectedCallback).toBeCalledTimes(2);
    expect(onAssetDetectedCallback).toHaveBeenCalledWith({
      element: el.querySelectorAll('img')[0],
      attr: 'src',
      value: 'https://example.com/image.png',
    });
    expect(onAssetDetectedCallback).toHaveBeenCalledWith({
      element: el.querySelectorAll('img')[1],
      attr: 'src',
      value: 'https://example.com/image2.png',
    });
  });

  it('should detect link stylesheet as asset', () => {
    const el = render(`<div>
<link rel="stylesheet" href="https://example.com/css/style.css" />
</div>`);

    // pretend it has loaded but isn't CORS accessible
    let linkEl = el.querySelector('link');
    Object.defineProperty(linkEl, 'sheet', {
      value: true,
    });

    const onAssetDetectedCallback = vi.fn();
    serializeNode(el, onAssetDetectedCallback);
    expect(onAssetDetectedCallback).toBeCalledTimes(1);
    expect(onAssetDetectedCallback).toHaveBeenCalledWith({
      element: el.querySelector('link'),
      attr: 'href',
      value: 'https://example.com/css/style.css',
    });
  });

  it('should not detect different origin stylesheet as asset', () => {
    const el = render(`<div>
<link rel="stylesheet" href="https://rrweb.com/css/style.css" />
</div>`);

    const onAssetDetectedCallback = vi.fn();
    serializeNode(el, onAssetDetectedCallback);
    expect(onAssetDetectedCallback).toBeCalledTimes(0);
  });

  it('should not confuse inlineImages=true with capturing all stylesheets', () => {
    const el = render(`<div>
<link rel="stylesheet" href="https://rrweb.com/css/style.css" />
</div>`);

    const onAssetDetectedCallback = vi.fn();
    const inlineImagesTrue = true;
    serializeNode(el, onAssetDetectedCallback, inlineImagesTrue);
    expect(onAssetDetectedCallback).toBeCalledTimes(0);
  });

  it('should detect style element as asset', () => {
    const el = render(`<div>
<style>
      body { background: pink; }
</style>
</div>`);

    const onAssetDetectedCallback = vi.fn();
    serializeNode(el, onAssetDetectedCallback);
    expect(onAssetDetectedCallback).toBeCalledTimes(1);
    expect(onAssetDetectedCallback).toHaveBeenCalledWith({
      element: el.querySelector('style'),
      attr: 'css_text',
      styleId: 1,
      value: 'http://localhost:3000/',
    });
  });

  it('should detect style depending on if stylesheetsRuleThreshold is met', () => {
    const el = render(`<div>
<style>
      body { background: pink; }
</style>
<style>
      body { background: pink; }
      div { background: pink; }
      span { background: pink; }
</style>
</div>`);

    const onAssetDetectedCallback = vi.fn();
    const captureAssets = {
      objectURLs: true,
      origins: ['https://example.com'],
      stylesheetsRuleThreshold: 2,
    };
    const inlineImagesUndefined = undefined;
    serializeNode(
      el,
      onAssetDetectedCallback,
      inlineImagesUndefined,
      captureAssets,
    );
    expect(onAssetDetectedCallback).toBeCalledTimes(1);
  });

  // SKIP: TODO: avoid capturing large video blobs, but allow capture of (presumably smaller) image blobs
  it.skip('should not try to capture blob video under defaults', () => {
    const el = render(`<div><video>
      <source src="blob:https://example.com/e81acc2b-f460-4aec-91b3-ce9732b837c4" type="video/mp4" />
    </video></div>`);

    const onAssetDetectedCallback = vi.fn();
    const captureAssets = undefined; // defaults
    const inlineImagesUndefined = undefined;
    serializeNode(
      el,
      onAssetDetectedCallback,
      inlineImagesUndefined,
      captureAssets,
    );
    expect(onAssetDetectedCallback).toBeCalledTimes(0);

    // make sure it would be called with video on
    captureAssets.video = true;
    serializeNode(
      el,
      onAssetDetectedCallback,
      inlineImagesUndefined,
      captureAssets,
    );
    expect(onAssetDetectedCallback).toBeCalledTimes(1);
  });
});
