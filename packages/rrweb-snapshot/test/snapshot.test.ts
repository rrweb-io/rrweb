/**
 * @vitest-environment jsdom
 */
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

import snapshot, {
  _isBlockedElement,
  serializeNodeWithId,
} from '../src/snapshot';
import type { asset, captureAssetsParam } from '@rrweb/types';
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

describe('onAssetDetected callback', () => {
  const serializeAssetNode = (
    node: Node,
    onAssetDetected: (result: asset) => void,
    captureAssets: captureAssetsParam = {
      objectURLs: true,
      origins: ['https://example.com'],
    },
    inlineImages = false,
    inlineStylesheet: boolean | 'all' = true,
  ): serializedNodeWithId | null => {
    return serializeNodeWithId(node, {
      doc: document,
      mirror: new Mirror(),
      blockClass: 'blockblock',
      blockSelector: null,
      maskTextClass: 'maskmask',
      maskTextSelector: null,
      skipChild: false,
      inlineStylesheet,
      maskTextFn: undefined,
      maskInputFn: undefined,
      slimDOMOptions: {},
      newlyAddedElement: false,
      inlineImages,
      onAssetDetected,
      captureAssets,
    });
  };

  const render = (html: string): HTMLDivElement => {
    document.body.innerHTML = html;
    return document.querySelector('div')!;
  };

  const findElement = (
    node: serializedNodeWithId,
    tagName: string,
  ): elementNode | undefined => {
    if (node.type === 2 && node.tagName === tagName) {
      return node as elementNode;
    }
    if ('childNodes' in node) {
      for (const child of node.childNodes) {
        const match = findElement(child, tagName);
        if (match) return match;
      }
    }
    return undefined;
  };

  it('emits rr_captured_src for captured image assets', () => {
    const el = render(`<div>
      <img src="https://example.com/image.png" />
    </div>`);

    const onAssetDetected = vi.fn();
    const serialized = serializeAssetNode(el, onAssetDetected) as elementNode;
    const img = findElement(serialized, 'img')!;

    expect(onAssetDetected).toHaveBeenCalledWith({
      element: el.querySelector('img'),
      attr: 'src',
      value: 'https://example.com/image.png',
    });
    expect(img.attributes).toMatchObject({
      rr_captured_src: 'https://example.com/image.png',
    });
    expect(img.attributes.src).toBeUndefined();
  });

  it('emits rr_captured_srcset for captured srcset assets', () => {
    const el = render(`<div>
      <img srcset="https://example.com/team.jpg, https://example.com/team@2x.jpg 2x" />
    </div>`);

    const onAssetDetected = vi.fn();
    const serialized = serializeAssetNode(el, onAssetDetected) as elementNode;
    const img = findElement(serialized, 'img')!;

    expect(onAssetDetected).toHaveBeenCalledWith({
      element: el.querySelector('img'),
      attr: 'srcset',
      value:
        'https://example.com/team.jpg, https://example.com/team@2x.jpg 2x',
    });
    expect(img.attributes).toMatchObject({
      rr_captured_srcset:
        'https://example.com/team.jpg, https://example.com/team@2x.jpg 2x',
    });
  });

  it('does not emit captured assets for blocked nodes', () => {
    const el = render(`<div>
      <img class="blockblock" src="https://example.com/image.png" />
    </div>`);

    const onAssetDetected = vi.fn();
    const serialized = serializeAssetNode(el, onAssetDetected) as elementNode;
    const img = findElement(serialized, 'img')!;

    expect(onAssetDetected).not.toHaveBeenCalled();
    expect(img.attributes.rr_captured_src).toBeUndefined();
    expect(img.attributes.src).toBeUndefined();
  });

  it('detects loaded stylesheet links as captured assets', () => {
    const el = render(`<div>
      <link rel="stylesheet" href="https://example.com/css/style.css" />
    </div>`);
    const link = el.querySelector('link')!;
    Object.defineProperty(link, 'sheet', {
      value: true,
    });

    const onAssetDetected = vi.fn();
    const serialized = serializeAssetNode(el, onAssetDetected) as elementNode;
    const serializedLink = findElement(serialized, 'link')!;

    expect(onAssetDetected).toHaveBeenCalledWith({
      element: link,
      attr: 'href',
      value: 'https://example.com/css/style.css',
    });
    expect(serializedLink.attributes).toMatchObject({
      rr_captured_href: 'https://example.com/css/style.css',
    });
    expect(serializedLink.attributes._cssText).toBeUndefined();
  });

  it('detects inaccessible stylesheet links so record can report error asset status', () => {
    const el = render(`<div>
      <link rel="stylesheet" href="https://example.com/css/missing.css" />
    </div>`);
    const link = el.querySelector('link')!;
    Object.defineProperty(link, 'sheet', {
      value: {
        get cssRules() {
          throw new DOMException('cssRules inaccessible', 'SecurityError');
        },
      },
    });

    const onAssetDetected = vi.fn();
    const serialized = serializeAssetNode(el, onAssetDetected, {
      stylesheets: true,
      origins: ['https://example.com'],
    }) as elementNode;
    const serializedLink = findElement(serialized, 'link')!;

    // Snapshot's contract is detection only: it marks the stylesheet as a
    // captured asset. Fetch failure and capturedAssetStatuses are owned by
    // record's asset manager.
    expect(onAssetDetected).toHaveBeenCalledWith({
      element: link,
      attr: 'href',
      value: 'https://example.com/css/missing.css',
    });
    expect(onAssetDetected.mock.calls[0][0]).not.toHaveProperty('status');
    expect(serializedLink.attributes).toMatchObject({
      rr_captured_href: 'https://example.com/css/missing.css',
    });
    expect(serializedLink.attributes._cssText).toBeUndefined();
  });

  it('detects style elements as stylesheet assets', () => {
    const el = render(`<div>
      <style>body { background: pink; }</style>
    </div>`);

    const onAssetDetected = vi.fn();
    const serialized = serializeAssetNode(el, onAssetDetected) as elementNode;
    const style = findElement(serialized, 'style')!;

    expect(onAssetDetected).toHaveBeenCalledWith({
      element: el.querySelector('style'),
      attr: 'css_text',
      styleId: expect.any(Number),
      value: 'http://localhost:3000/',
    });
    expect(style.attributes.rr_css_text).toContain('#rr_style_el:');
    expect(style.attributes._cssText).toBeUndefined();
  });

  it('does not detect style element assets when stylesheet capture is disabled', () => {
    const el = render(`<div>
      <style>body { background: pink; }</style>
    </div>`);

    const onAssetDetected = vi.fn();
    const serialized = serializeAssetNode(el, onAssetDetected, {
      stylesheets: false,
      origins: ['https://example.com'],
    }) as elementNode;
    const style = findElement(serialized, 'style')!;

    expect(onAssetDetected).not.toHaveBeenCalled();
    expect(style.attributes.rr_css_text).toBeUndefined();
    expect(style.attributes._cssText).toBeUndefined();
  });

  it('does not detect style element assets when inlineStylesheet is disabled', () => {
    const el = render(`<div>
      <style>body { background: pink; }</style>
    </div>`);

    const onAssetDetected = vi.fn();
    const serialized = serializeAssetNode(
      el,
      onAssetDetected,
      {
        origins: ['https://example.com'],
      },
      false,
      false,
    ) as elementNode;
    const style = findElement(serialized, 'style')!;

    expect(onAssetDetected).not.toHaveBeenCalled();
    expect(style.attributes.rr_css_text).toBeUndefined();
    expect(style.attributes._cssText).toBeUndefined();
  });

  it('detects inaccessible style elements so record can report refused asset status', () => {
    const el = render(`<div>
      <style>body { background: pink; }</style>
    </div>`);
    const styleEl = el.querySelector('style')!;
    Object.defineProperty(styleEl, 'sheet', {
      value: {
        get cssRules() {
          throw new DOMException('cssRules inaccessible', 'SecurityError');
        },
      },
    });

    const onAssetDetected = vi.fn();
    const serialized = serializeAssetNode(el, onAssetDetected) as elementNode;
    const style = findElement(serialized, 'style')!;

    // Snapshot's contract is detection only: it marks css_text for capture and
    // preserves the original element. Refused/error status is owned by record's
    // asset manager through capturedAssetStatuses.
    expect(onAssetDetected).toHaveBeenCalledWith({
      element: styleEl,
      attr: 'css_text',
      styleId: expect.any(Number),
      value: 'http://localhost:3000/',
    });
    expect(onAssetDetected.mock.calls[0][0]).not.toHaveProperty('status');
    expect(style.attributes.rr_css_text).toContain('#rr_style_el:');
    expect(style.attributes._cssText).toBeUndefined();
  });

  it('detects media source assets when enabled', () => {
    const el = render(`<div>
      <video><source src="https://example.com/show.mp4" /></video>
      <audio><source src="https://example.com/sound.mp3" /></audio>
    </div>`);

    const onAssetDetected = vi.fn();
    const serialized = serializeAssetNode(el, onAssetDetected, {
      video: true,
      audio: true,
    }) as elementNode;
    const video = findElement(serialized, 'video')!;
    const audio = findElement(serialized, 'audio')!;

    expect(onAssetDetected).toHaveBeenCalledWith({
      element: el.querySelector('video source'),
      attr: 'src',
      value: 'https://example.com/show.mp4',
    });
    expect(onAssetDetected).toHaveBeenCalledWith({
      element: el.querySelector('audio source'),
      attr: 'src',
      value: 'https://example.com/sound.mp3',
    });
    expect((video.childNodes[0] as elementNode).attributes).toMatchObject({
      rr_captured_src: 'https://example.com/show.mp4',
    });
    expect((audio.childNodes[0] as elementNode).attributes).toMatchObject({
      rr_captured_src: 'https://example.com/sound.mp3',
    });
  });
});
