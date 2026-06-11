/**
 * @vitest-environment jsdom
 */
import { bench } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { stringifyStylesheet } from '../src/utils';
import * as CSSOM from 'cssom';

describe('stringifyStylesheet', () => {
  let benchmarkStylesheet: CSSStyleSheet;

  const cssText = fs.readFileSync(
    path.resolve(__dirname, './css/benchmark.css'),
    'utf8',
  );
  benchmarkStylesheet = CSSOM.parse(cssText);
  benchmarkStylesheet.href = 'https://example.com/style.css';

  it.skip('stringify', () => {
    // written just to ensure it's working
    const cssText = '.x { background: url(./relative.jpg) }';
    const styleSheet = CSSOM.parse(cssText);
    styleSheet.href = 'https://example.com/style.css';
    expect(stringifyStylesheet(styleSheet)).toEqual(
      'x {background: url(https://example.com/relative.jpg);}',
    );
  });

  bench(
    'stringify',
    () => {
      stringifyStylesheet(benchmarkStylesheet);
    },
    { time: 1000 },
  );
});
