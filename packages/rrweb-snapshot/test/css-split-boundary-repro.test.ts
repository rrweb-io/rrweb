/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { markCssSplits, splitCssText, stringifyStylesheet } from '../src/utils';
import { Window } from 'happy-dom';

function stubStyle(childTexts: string[]) {
  return {
    childNodes: childTexts.map((t) => ({ textContent: t })),
  } as unknown as HTMLStyleElement;
}

function ruleBoundaryOffsets(serialized: string): Set<number> {
  const offsets = new Set<number>([0, serialized.length]);
  let depth = 0;
  let inString: string | null = null;
  for (let i = 0; i < serialized.length; i++) {
    const c = serialized[i];
    if (inString) {
      if (c === inString && serialized[i - 1] !== '\\') inString = null;
      continue;
    }
    if (c === '"' || c === "'") inString = c;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) offsets.add(i + 1);
    }
  }
  return offsets;
}

function everySplitOnBoundary(serialized: string, splits: string[]): boolean {
  const boundaries = ruleBoundaryOffsets(serialized);
  let offset = 0;
  for (let i = 0; i < splits.length - 1; i++) {
    offset += splits[i].length;
    if (!boundaries.has(offset)) return false;
  }
  return true;
}

/*
 * `0px` (authored) always comes out in the rule as `0` so we decided at one point that
 * `normalizeCssString` should also do that transformation while it is stripping whitespace/comments.
 * however, we have to be careful as split search is based on comparing normalized length,
 * so we have to also replace `0p` with `0` (/\b(0)px?/ and not just /\b(0)px/)
 * as otherwise incorrect '.ab{margin:0p' substring will match before we consume the next
 * character 'x' get to correct '.ab{margin:0}' (both have same length)
 * this test exercises that
 */
describe('splitCssText snaps split points to css rule boundaries at record time', () => {
  const childTexts = [
    '.jZkBQE{background:#fff;}',
    '.ab{margin:0px;}',
    '.x[aria-expanded="true"]{width:100%;}',
    '.abc{background-color:rgba(0,0,0,.05);}',
    '.a>.b{margin:0;}',
  ];

  it('real Chromium serialization: whole rules split on boundaries, not mid-declaration', () => {
    const serialized =
      '.jZkBQE { background: rgb(255, 255, 255); }.ab { margin: 0px; }.x[aria-expanded="true"] { width: 100%; }.abc { background-color: rgba(0, 0, 0, 0.05); }.a > .b { margin: 0px; }';
    const splits = splitCssText(serialized, stubStyle(childTexts));

    expect(splits.join('')).toEqual(serialized);
    expect(splits[1]).toEqual('.ab { margin: 0px; }');
    expect(everySplitOnBoundary(serialized, splits)).toBe(true);
  });

  it('happy-dom CSSOM: markCssSplits emits boundary-aligned, splice-safe parts', () => {
    const window = new Window({ url: 'https://localhost:8080' });
    const document = window.document;
    document.head.innerHTML = '<style></style>';
    const style = document.querySelector('style')!;
    for (const t of childTexts) style.appendChild(document.createTextNode(t));

    const serialized = stringifyStylesheet(
      style.sheet as unknown as CSSStyleSheet,
    )!;
    const parts = markCssSplits(
      serialized,
      style as unknown as HTMLStyleElement,
    ).split('/* rr_split */');

    expect(parts.join('')).toEqual(serialized);
    expect(everySplitOnBoundary(serialized, parts)).toBe(true);

    const spliced = [
      ...parts.slice(0, 1),
      '.injected { color: red; }',
      ...parts.slice(1),
    ].join('');
    expect(spliced).not.toContain('0p.injected');
    expect(spliced).toContain('}.injected { color: red; }');
  });

  it('leaves authored mid-rule broken text nodes (browser-split) untouched', () => {
    const serialized = '.a { color: red; }.b { color: green; }';
    const splits = splitCssText(
      serialized,
      stubStyle(['.a { color: red; }.b { col', 'or: green; }']),
    );
    expect(splits.join('')).toEqual(serialized);
    expect(splits[0]).toEqual('.a { color: red; }.b { col');
  });
});
