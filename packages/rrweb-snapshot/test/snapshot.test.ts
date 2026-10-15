/**
 * @vitest-environment jsdom
 */
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import snapshot, {
  _isBlockedElement,
  ignoreAttribute,
  serializeNodeWithId,
} from '../src/snapshot';
import { elementNode, serializedNodeWithId } from '../src/types';
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

  it('can handle hashes', () => {
    expect(absolutifyURLs('url("../a.jpg#c/d")', href + '#e/f')).toEqual(
      `url("http://localhost/a.jpg#c/d")`,
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

describe('inline images', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createImage = (loaded: boolean) => {
    const doc = document.implementation.createHTMLDocument();
    const image = doc.createElement('img');
    image.src = 'https://example.com/image.png';
    const setLoaded = (complete: boolean) =>
      Object.defineProperties(image, {
        complete: { configurable: true, value: complete },
        naturalWidth: { configurable: true, value: complete ? 16 : 0 },
        naturalHeight: { configurable: true, value: complete ? 9 : 0 },
      });
    setLoaded(loaded);
    doc.body.append(image);

    const drawImage = vi.fn();
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    const toDataURL = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/png;base64,image');

    return {
      image,
      setLoaded,
      drawImage,
      getContext,
      toDataURL,
      createElement: vi.spyOn(doc, 'createElement'),
      addEventListener: vi.spyOn(image, 'addEventListener'),
    };
  };

  const serializeImage = async (
    image: HTMLImageElement,
    blockSelector: string | null = null,
  ) => {
    const { default: snapshot } = await import('../src/snapshot');
    const mirror = new Mirror();
    snapshot(image.ownerDocument, {
      mirror,
      inlineImages: true,
      blockSelector,
    });
    return mirror.getMeta(image) as elementNode;
  };

  it.each([
    { blocking: 'blockClass', loaded: true },
    { blocking: 'blockClass', loaded: false },
    { blocking: 'blockSelector', loaded: true },
    { blocking: 'blockSelector', loaded: false },
  ])(
    'does not inline an image blocked by $blocking (loaded: $loaded)',
    async ({ blocking, loaded }) => {
      const {
        image,
        setLoaded,
        createElement,
        getContext,
        drawImage,
        toDataURL,
        addEventListener,
      } = createImage(loaded);
      if (blocking === 'blockClass') image.className = 'rr-block';
      else image.setAttribute('data-rr-block', '');

      const serializedImage = await serializeImage(
        image,
        blocking === 'blockSelector' ? '[data-rr-block]' : null,
      );
      setLoaded(true);
      image.dispatchEvent(new Event('load'));

      expect(serializedImage.attributes).toEqual({
        class: blocking === 'blockClass' ? 'rr-block' : undefined,
        rr_width: '0px',
        rr_height: '0px',
      });
      expect(createElement).not.toHaveBeenCalledWith('canvas');
      expect(getContext).not.toHaveBeenCalled();
      expect(drawImage).not.toHaveBeenCalled();
      expect(toDataURL).not.toHaveBeenCalled();
      expect(addEventListener).not.toHaveBeenCalledWith(
        'load',
        expect.any(Function),
      );
    },
  );

  it.each([true, false])(
    'inlines an unblocked image (loaded: %s)',
    async (loaded) => {
      const { image, setLoaded, drawImage, toDataURL, addEventListener } =
        createImage(loaded);
      const serializedImage = await serializeImage(image);
      if (!loaded) {
        expect(drawImage).not.toHaveBeenCalled();
        expect(addEventListener).toHaveBeenCalledWith(
          'load',
          expect.any(Function),
        );
        setLoaded(true);
        image.dispatchEvent(new Event('load'));
      }

      expect(drawImage).toHaveBeenCalledTimes(1);
      expect(drawImage).toHaveBeenCalledWith(image, 0, 0);
      expect(toDataURL).toHaveBeenCalledTimes(1);
      expect(serializedImage.attributes.rr_dataURL).toBe(
        'data:image/png;base64,image',
      );
    },
  );
});

describe('ignoreAttribute()', () => {
  it('ignores autoplay on lowercase media tag names', () => {
    expect(ignoreAttribute('video', 'autoplay', '')).toEqual(true);
    expect(ignoreAttribute('audio', 'autoplay', '')).toEqual(true);
  });

  it('ignores autoplay regardless of attribute-name case', () => {
    expect(ignoreAttribute('video', 'AUTOPLAY', '')).toEqual(true);
    expect(ignoreAttribute('audio', 'AutoPlay', '')).toEqual(true);
  });

  it('does not ignore other attributes or other elements', () => {
    expect(ignoreAttribute('video', 'src', '')).toEqual(false);
    expect(ignoreAttribute('div', 'autoplay', '')).toEqual(false);
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
    const el = render(`<div stylel='overflow: auto; width: 1px; height: 1px;'>
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
