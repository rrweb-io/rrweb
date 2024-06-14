/**
 * @jest-environment jsdom
 */
import { JSDOM } from 'jsdom';
import {
  absoluteToStylesheet,
  serializeNodeWithId,
  transformAttribute,
  _isBlockedElement,
  needMaskingText,
} from '../src/snapshot';
import { serializedNodeWithId } from '../src/types';
import { Mirror } from '../src/utils';

describe('absolute url to stylesheet', () => {
  const href = 'http://localhost/css/style.css';

  it('can handle relative path', () => {
    expect(absoluteToStylesheet('url(a.jpg)', href)).toEqual(
      `url(http://localhost/css/a.jpg)`,
    );
  });

  it('can handle same level path', () => {
    expect(absoluteToStylesheet('url("./a.jpg")', href)).toEqual(
      `url("http://localhost/css/a.jpg")`,
    );
  });

  it('can handle parent level path', () => {
    expect(absoluteToStylesheet('url("../a.jpg")', href)).toEqual(
      `url("http://localhost/a.jpg")`,
    );
  });

  it('can handle absolute path', () => {
    expect(absoluteToStylesheet('url("/a.jpg")', href)).toEqual(
      `url("http://localhost/a.jpg")`,
    );
  });

  it('can handle external path', () => {
    expect(absoluteToStylesheet('url("http://localhost/a.jpg")', href)).toEqual(
      `url("http://localhost/a.jpg")`,
    );
  });

  it('can handle single quote path', () => {
    expect(absoluteToStylesheet(`url('./a.jpg')`, href)).toEqual(
      `url('http://localhost/css/a.jpg')`,
    );
  });

  it('can handle no quote path', () => {
    expect(absoluteToStylesheet('url(./a.jpg)', href)).toEqual(
      `url(http://localhost/css/a.jpg)`,
    );
  });

  it('can handle multiple no quote paths', () => {
    expect(
      absoluteToStylesheet(
        'background-image: url(images/b.jpg);background: #aabbcc url(images/a.jpg) 50% 50% repeat;',
        href,
      ),
    ).toEqual(
      `background-image: url(http://localhost/css/images/b.jpg);` +
        `background: #aabbcc url(http://localhost/css/images/a.jpg) 50% 50% repeat;`,
    );
  });

  it('can handle data url image', () => {
    expect(
      absoluteToStylesheet('url(data:image/gif;base64,ABC)', href),
    ).toEqual('url(data:image/gif;base64,ABC)');
    expect(
      absoluteToStylesheet(
        'url(data:application/font-woff;base64,d09GMgABAAAAAAm)',
        href,
      ),
    ).toEqual('url(data:application/font-woff;base64,d09GMgABAAAAAAm)');
  });

  it('preserves quotes around inline svgs with spaces', () => {
    expect(
      absoluteToStylesheet(
        "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath fill='%2328a745' d='M3'/%3E%3C/svg%3E\")",
        href,
      ),
    ).toEqual(
      "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath fill='%2328a745' d='M3'/%3E%3C/svg%3E\")",
    );
    expect(
      absoluteToStylesheet(
        'url(\'data:image/svg+xml;utf8,<svg width="28" height="32" viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg"><path d="M27 14C28" fill="white"/></svg>\')',
        href,
      ),
    ).toEqual(
      'url(\'data:image/svg+xml;utf8,<svg width="28" height="32" viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg"><path d="M27 14C28" fill="white"/></svg>\')',
    );
    expect(
      absoluteToStylesheet(
        'url("data:image/svg+xml;utf8,<svg width="28" height="32" viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg"><path d="M27 14C28" fill="white"/></svg>")',
        href,
      ),
    ).toEqual(
      'url("data:image/svg+xml;utf8,<svg width="28" height="32" viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg"><path d="M27 14C28" fill="white"/></svg>")',
    );
  });
  it('can handle empty path', () => {
    expect(absoluteToStylesheet(`url('')`, href)).toEqual(`url('')`);
  });
});

describe('transformAttribute()', () => {
  it('handles empty attribute value', () => {
    expect(
      transformAttribute(
        document,
        'a',
        'data-loading',
        null,
        document.createElement('span'),
        undefined,
      ),
    ).toBe(null);
    expect(
      transformAttribute(
        document,
        'a',
        'data-loading',
        '',
        document.createElement('span'),
        undefined,
      ),
    ).toBe('');
  });

  it('handles custom masking function', () => {
    const maskAttributeFn = jest
      .fn()
      .mockImplementation((_key, value): string => {
        return value.split('').reverse().join('');
      }) as any;
    expect(
      transformAttribute(
        document,
        'a',
        'data-loading',
        'foo',
        document.createElement('span'),
        maskAttributeFn,
      ),
    ).toBe('oof');
    expect(maskAttributeFn).toHaveBeenCalledTimes(1);
  });
});

describe('isBlockedElement()', () => {
  const subject = (html: string, opt: any = {}) =>
    _isBlockedElement(
      render(html),
      'rr-block',
      opt.blockSelector,
      opt.unblockSelector,
    );

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
  const serializeNode = (node: Node): serializedNodeWithId | null => {
    return serializeNodeWithId(node, {
      doc: document,
      mirror: new Mirror(),
      blockClass: 'blockblock',
      blockSelector: null,
      unblockSelector: null,
      maskAllText: false,
      maskTextClass: 'maskmask',
      unmaskTextClass: 'unmaskmask',
      maskTextSelector: null,
      unmaskTextSelector: null,
      skipChild: false,
      inlineStylesheet: true,
      maskAttributeFn: undefined,
      maskTextFn: undefined,
      maskInputFn: undefined,
      slimDOMOptions: {},
    });
  };

  const render = (html: string): HTMLStyleElement => {
    document.write(html);
    return document.querySelector('style')!;
  };

  it('should serialize all rules of stylesheet when the sheet has a single child node', () => {
    const styleEl = render(`<style>body { color: red; }</style>`);
    styleEl.sheet?.insertRule('section { color: blue; }');
    expect(serializeNode(styleEl.childNodes[0])).toMatchObject({
      isStyle: true,
      rootId: undefined,
      textContent: 'section {color: blue;}body {color: red;}',
      type: 3,
    });
  });

  it('should serialize individual text nodes on stylesheets with multiple child nodes', () => {
    const styleEl = render(`<style>body { color: red; }</style>`);
    styleEl.append(document.createTextNode('section { color: blue; }'));
    expect(serializeNode(styleEl.childNodes[1])).toMatchObject({
      isStyle: true,
      rootId: undefined,
      textContent: 'section { color: blue; }',
      type: 3,
    });
  });
});

describe('iframe', () => {
  const serializeNode = (node: Node): serializedNodeWithId | null => {
    return serializeNodeWithId(node, {
      doc: document,
      mirror: new Mirror(),
      blockClass: 'blockblock',
      blockSelector: null,
      unblockSelector: null,
      maskAllText: false,
      maskTextClass: 'maskmask',
      unmaskTextClass: null,
      maskTextSelector: null,
      unmaskTextSelector: null,
      skipChild: false,
      inlineStylesheet: true,
      maskAttributeFn: undefined,
      maskTextFn: undefined,
      maskInputFn: undefined,
      slimDOMOptions: {},
      newlyAddedElement: false,
    });
  };

  const render = (html: string): HTMLDivElement => {
    document.write(html);
    return document.querySelector('iframe')!;
  };

  it('serializes', () => {
    // Not sure how to trigger condition where we can't access
    // `iframe.contentDocument` due to CORS. Ideally it should have `rr_src`
    // attribute
    const el = render(`<iframe src="https://example.dev"/>`);
    expect(serializeNode(el)).toMatchObject({
      attributes: {},
    });
  });

  it('can be blocked', () => {
    const el = render(`<iframe class="blockblock" src="https://example.dev"/>`);
    expect(serializeNode(el)).toMatchObject({
      attributes: {
        class: 'blockblock',
        rr_height: '0px',
        rr_width: '0px',
      },
    });
  });
});

describe('scrollTop/scrollLeft', () => {
  const serializeNode = (node: Node): serializedNodeWithId | null => {
    return serializeNodeWithId(node, {
      doc: document,
      mirror: new Mirror(),
      blockClass: 'blockblock',
      blockSelector: null,
      unblockSelector: null,
      maskAllText: false,
      maskTextClass: 'maskmask',
      unmaskTextClass: 'unmaskmask',
      maskTextSelector: null,
      unmaskTextSelector: null,
      skipChild: false,
      inlineStylesheet: true,
      maskAttributeFn: undefined,
      maskTextFn: undefined,
      maskInputFn: undefined,
      slimDOMOptions: {},
      newlyAddedElement: false,
    });
  };

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

describe('needMaskingText', () => {
  const render = (html: string): HTMLDivElement => {
    document.write(html);
    return document.querySelector('div')!;
  };

  it('should not mask by default', () => {
    const el = render(`<div class='foo'>Lorem ipsum</div>`);
    expect(
      needMaskingText(el, 'maskmask', null, 'unmaskmask', null, false),
    ).toEqual(false);
  });

  it('should mask if the masking class is matched', () => {
    const el = render(`<div class='foo maskmask'>Lorem ipsum</div>`);
    expect(
      needMaskingText(el, 'maskmask', null, 'unmaskmask', null, false),
    ).toEqual(true);
    expect(
      needMaskingText(el, /^maskmask$/, null, /^unmaskmask$/, null, false),
    ).toEqual(true);
  });

  it('should mask if the masking class is matched on an ancestor', () => {
    const el = render(
      `<div class='foo maskmask'><span>Lorem ipsum</span></div>`,
    );
    expect(
      needMaskingText(
        el.children[0],
        'maskmask',
        null,
        'unmaskmask',
        null,
        false,
      ),
    ).toEqual(true);
    expect(
      needMaskingText(
        el.children[0],
        /^maskmask$/,
        null,
        /^unmaskmask$/,
        null,
        false,
      ),
    ).toEqual(true);
  });

  it('should mask if the masking selector is matched', () => {
    const el = render(`<div class='foo'>Lorem ipsum</div>`);
    expect(
      needMaskingText(el, 'maskmask', '.foo', 'unmaskmask', null, false),
    ).toEqual(true);
  });

  it('should mask if the masking selector is matched on an ancestor', () => {
    const el = render(`<div class='foo'><span>Lorem ipsum</span></div>`);
    expect(
      needMaskingText(
        el.children[0],
        'maskmask',
        '.foo',
        'unmaskmask',
        null,
        false,
      ),
    ).toEqual(true);
  });

  it('should mask by default', () => {
    const el = render(`<div class='foo'>Lorem ipsum</div>`);
    expect(
      needMaskingText(el, 'maskmask', null, 'unmaskmask', null, true),
    ).toEqual(true);
  });

  it('should not mask if the un-masking class is matched', () => {
    const el = render(`<div class='foo unmaskmask'>Lorem ipsum</div>`);
    expect(
      needMaskingText(el, 'maskmask', null, 'unmaskmask', null, true),
    ).toEqual(false);
    expect(
      needMaskingText(el, /^maskmask$/, null, /^unmaskmask$/, null, true),
    ).toEqual(false);
  });

  it('should not mask if the un-masking class is matched on an ancestor', () => {
    const el = render(
      `<div class='foo unmaskmask'><span>Lorem ipsum</span></div>`,
    );
    expect(
      needMaskingText(
        el.children[0],
        'maskmask',
        null,
        'unmaskmask',
        null,
        true,
      ),
    ).toEqual(false);
    expect(
      needMaskingText(
        el.children[0],
        /^maskmask$/,
        null,
        /^unmaskmask$/,
        null,
        true,
      ),
    ).toEqual(false);
  });

  it('should mask if the masking class is more specific than the unmasking class', () => {
    const el = render(
      `<div class='unmaskmask'><div class='maskmask'><span>Lorem ipsum</span><div></div>`,
    );
    expect(
      needMaskingText(
        el.children[0].children[0],
        'maskmask',
        null,
        'unmaskmask',
        null,
        false,
      ),
    ).toEqual(true);
    expect(
      needMaskingText(
        el.children[0].children[0],
        /^maskmask$/,
        null,
        /^unmaskmask$/,
        null,
        false,
      ),
    ).toEqual(true);
  });

  it('should not mask if the unmasking class is more specific than the masking class', () => {
    const el = render(
      `<div class='maskmask'><div class='unmaskmask'><span>Lorem ipsum</span><div></div>`,
    );
    expect(
      needMaskingText(
        el.children[0].children[0],
        'maskmask',
        null,
        'unmaskmask',
        null,
        false,
      ),
    ).toEqual(false);
    expect(
      needMaskingText(
        el.children[0].children[0],
        /^maskmask$/,
        null,
        /^unmaskmask$/,
        null,
        false,
      ),
    ).toEqual(false);
  });

  it('should not mask if the unmasking selector is matched', () => {
    const el = render(`<div class='foo'>Lorem ipsum</div>`);
    expect(
      needMaskingText(el, 'maskmask', null, 'unmaskmask', '.foo', true),
    ).toEqual(false);
  });

  it('should not mask if the unmasking selector is matched on an ancestor', () => {
    const el = render(`<div class='foo'><span>Lorem ipsum</span></div>`);
    expect(
      needMaskingText(
        el.children[0],
        'maskmask',
        null,
        'unmaskmask',
        '.foo',
        true,
      ),
    ).toEqual(false);
  });

  it('should mask if the masking selector is more specific than the unmasking selector', () => {
    const el = render(
      `<div class='foo'><div class='bar'><span>Lorem ipsum</span><div></div>`,
    );
    expect(
      needMaskingText(
        el.children[0].children[0],
        'maskmask',
        '.bar',
        'unmaskmask',
        '.foo',
        false,
      ),
    ).toEqual(true);
  });

  it('should not mask if the unmasking selector is more specific than the masking selector', () => {
    const el = render(
      `<div class='bar'><div class='foo'><span>Lorem ipsum</span><div></div>`,
    );
    expect(
      needMaskingText(
        el.children[0].children[0],
        'maskmask',
        '.bar',
        'unmaskmask',
        '.foo',
        false,
      ),
    ).toEqual(false);
  });

  describe('enforced masking', () => {
    it.each([
      'current-password',
      'new-password',
      'cc-number',
      'cc-exp',
      'cc-exp-month',
      'cc-exp-year',
      'cc-csc',
    ])('enforces masking for autocomplete="%s"', (autocompleteValue) => {
      document.write(
        `<input autocomplete='${autocompleteValue}' value='initial' class='unmaskmask'></input>`,
      );
      const el = document.querySelector('input')!;
      expect(
        needMaskingText(el, 'maskmask', '.foo', 'unmaskmask', null, false),
      ).toEqual(true);
    });

    it('does not mask other autocomplete values', () => {
      document.write(
        `<input autocomplete='name' value='initial' class='unmaskmask'></input>`,
      );
      const el = document.querySelector('input')!;
      expect(
        needMaskingText(el, 'maskmask', '.foo', 'unmaskmask', null, false),
      ).toEqual(false);
    });
  });
});
