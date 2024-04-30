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
});
