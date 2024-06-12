import { describe, it, expect } from 'vitest';
import { parse, Rule, Media } from '../src/css';
import { fixSafariColons, escapeImportStatement } from './../src/utils';

describe('css parser', () => {
  it('should save the filename and source', () => {
    const css = 'booty {\n  size: large;\n}\n';
    const ast = parse(css, {
      source: 'booty.css',
    });

    expect(ast.stylesheet!.source).toEqual('booty.css');

    const position = ast.stylesheet!.rules[0].position!;
    expect(position.start).toBeTruthy();
    expect(position.end).toBeTruthy();
    expect(position.source).toEqual('booty.css');
    expect(position.content).toEqual(css);
  });

  it('should throw when a selector is missing', () => {
    expect(() => {
      parse('{size: large}');
    }).toThrow();

    expect(() => {
      parse('b { color: red; }\n{ color: green; }\na { color: blue; }');
    }).toThrow();
  });

  it('should throw when a broken comment is found', () => {
    expect(() => {
      parse('thing { color: red; } /* b { color: blue; }');
    }).toThrow();

    expect(() => {
      parse('/*');
    }).toThrow();

    /* Nested comments should be fine */
    expect(() => {
      parse('/* /* */');
    }).not.toThrow();
  });

  it('should allow empty property value', () => {
    expect(() => {
      parse('p { color:; }');
    }).not.toThrow();
  });

  it('should not throw with silent option', () => {
    expect(() => {
      parse('thing { color: red; } /* b { color: blue; }', { silent: true });
    }).not.toThrow();
  });

  it('should list the parsing errors and continue parsing', () => {
    const result = parse(
      'foo { color= red; } bar { color: blue; } baz {}} boo { display: none}',
      {
        silent: true,
        source: 'foo.css',
      },
    );

    const rules = result.stylesheet!.rules;
    expect(rules.length).toBeGreaterThan(2);

    const errors = result.stylesheet!.parsingErrors!;
    expect(errors.length).toEqual(2);

    expect(errors[0]).toHaveProperty('message');
    expect(errors[0]).toHaveProperty('reason');
    expect(errors[0]).toHaveProperty('filename');
    expect(errors[0]).toHaveProperty('line');
    expect(errors[0]).toHaveProperty('column');
    expect(errors[0]).toHaveProperty('source');
    expect(errors[0].filename).toEqual('foo.css');
  });

  it('should parse selector with comma nested inside ()', () => {
    const result = parse(
      '[_nghost-ng-c4172599085]:not(.fit-content).aim-select:hover:not(:disabled, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--disabled, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--invalid, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--active) { border-color: rgb(84, 84, 84); }',
    );

    expect(result.parent).toEqual(null);

    const rules = result.stylesheet!.rules;
    expect(rules.length).toEqual(1);

    let rule = rules[0] as Rule;
    expect(rule.parent).toEqual(result);
    expect(rule.selectors?.length).toEqual(1);

    let decl = rule.declarations![0];
    expect(decl.parent).toEqual(rule);
  });

  it('parses { and } in attribute selectors correctly', () => {
    const result = parse('foo[someAttr~="{someId}"] { color: red; }');
    const rules = result.stylesheet!.rules;

    expect(rules.length).toEqual(1);

    const rule = rules[0] as Rule;

    expect(rule.selectors![0]).toEqual('foo[someAttr~="{someId}"]');
  });

  it('should set parent property', () => {
    const result = parse(
      'thing { test: value; }\n' +
        '@media (min-width: 100px) { thing { test: value; } }',
    );

    expect(result.parent).toEqual(null);

    const rules = result.stylesheet!.rules;
    expect(rules.length).toEqual(2);

    let rule = rules[0] as Rule;
    expect(rule.parent).toEqual(result);
    expect(rule.declarations!.length).toEqual(1);

    let decl = rule.declarations![0];
    expect(decl.parent).toEqual(rule);

    const media = rules[1] as Media;
    expect(media.parent).toEqual(result);
    expect(media.rules!.length).toEqual(1);

    rule = media.rules![0] as Rule;
    expect(rule.parent).toEqual(media);

    expect(rule.declarations!.length).toEqual(1);
    decl = rule.declarations![0];
    expect(decl.parent).toEqual(rule);
  });

  it('parses : in attribute selectors correctly', () => {
    const out1 = fixSafariColons('[data-foo] { color: red; }');
    expect(out1).toEqual('[data-foo] { color: red; }');

    const out2 = fixSafariColons('[data-foo:other] { color: red; }');
    expect(out2).toEqual('[data-foo\\:other] { color: red; }');

    const out3 = fixSafariColons('[data-aa\\:other] { color: red; }');
    expect(out3).toEqual('[data-aa\\:other] { color: red; }');
  });

  it('parses nested commas in selectors correctly', () => {
    const result = parse(
      `
body > ul :is(li:not(:first-of-type) a:hover, li:not(:first-of-type).active a) {
  background: red;
}
`,
    );
    expect((result.stylesheet!.rules[0] as Rule)!.selectors!.length).toEqual(1);

    const trickresult = parse(
      `
li[attr="weirdly("] a:hover, li[attr="weirdly)"] a {
  background-color: red;
}
`,
    );
    expect(
      (trickresult.stylesheet!.rules[0] as Rule)!.selectors!.length,
    ).toEqual(2);

    const weirderresult = parse(
      `
li[attr="weirder\\"("] a:hover, li[attr="weirder\\")"] a {
  background-color: red;
}
`,
    );
    expect(
      (weirderresult.stylesheet!.rules[0] as Rule)!.selectors!.length,
    ).toEqual(2);

    const commainstrresult = parse(
      `
li[attr="has,comma"] a:hover {
  background-color: red;
}
`,
    );
    expect(
      (commainstrresult.stylesheet!.rules[0] as Rule)!.selectors!.length,
    ).toEqual(1);
  });

  it('parses imports with quotes correctly', () => {
    const out1 = escapeImportStatement({
      cssText: `@import url("/foo.css;900;800"");`,
      href: '/foo.css;900;800"',
      media: {
        length: 0,
      },
      layerName: null,
      supportsText: null,
    } as unknown as CSSImportRule);
    expect(out1).toEqual(`@import url("/foo.css;900;800\\"");`);

    const out2 = escapeImportStatement({
      cssText: `@import url("/foo.css;900;800"") supports(display: flex);`,
      href: '/foo.css;900;800"',
      media: {
        length: 0,
      },
      layerName: null,
      supportsText: 'display: flex',
    } as unknown as CSSImportRule);
    expect(out2).toEqual(
      `@import url("/foo.css;900;800\\"") supports(display: flex);`,
    );

    const out3 = escapeImportStatement({
      cssText: `@import url("/foo.css;900;800"");`,
      href: '/foo.css;900;800"',
      media: {
        length: 1,
        mediaText: 'print, screen',
      },
      layerName: null,
      supportsText: null,
    } as unknown as CSSImportRule);
    expect(out3).toEqual(`@import url("/foo.css;900;800\\"") print, screen;`);

    const out4 = escapeImportStatement({
      cssText: `@import url("/foo.css;900;800"") layer(layer-1);`,
      href: '/foo.css;900;800"',
      media: {
        length: 0,
      },
      layerName: 'layer-1',
      supportsText: null,
    } as unknown as CSSImportRule);
    expect(out4).toEqual(`@import url("/foo.css;900;800\\"") layer(layer-1);`);

    const out5 = escapeImportStatement({
      cssText: `@import url("/foo.css;900;800"") layer;`,
      href: '/foo.css;900;800"',
      media: {
        length: 0,
      },
      layerName: '',
      supportsText: null,
    } as unknown as CSSImportRule);
    expect(out5).toEqual(`@import url("/foo.css;900;800\\"") layer;`);
  });
});
