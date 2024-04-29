import { fixSafariColons, escapeImportStatement } from './../src/utils';

describe('css parser', () => {
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
