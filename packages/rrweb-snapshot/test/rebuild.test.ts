import * as fs from 'fs';
import * as path from 'path';
import 'mocha';
import { expect } from 'chai';
import { addHoverClass } from '../src/rebuild';

describe('add hover class to hover selector related rules', () => {
  it('will do nothing to css text without :hover', () => {
    const cssText = 'body { color: white }';
    expect(addHoverClass(cssText)).to.equal(cssText);
  });

  it('can add hover class to css text', () => {
    const cssText = '.a:hover { color: white }';
    expect(addHoverClass(cssText)).to.equal(
      '.a:hover, .a.\\:hover { color: white }',
    );
  });

  it('can add hover class when there is multi selector', () => {
    const cssText = '.a, .b:hover, .c { color: white }';
    expect(addHoverClass(cssText)).to.equal(
      '.a, .b:hover, .b.\\:hover, .c { color: white }',
    );
  });

  it('can add hover class when there is a multi selector with the same prefix', () => {
    const cssText = '.a:hover, .a:hover::after { color: white }';
    expect(addHoverClass(cssText)).to.equal(
      '.a:hover, .a.\\:hover, .a:hover::after, .a.\\:hover::after { color: white }',
    );
  });

  it('can add hover class when :hover is not the end of selector', () => {
    const cssText = 'div:hover::after { color: white }';
    expect(addHoverClass(cssText)).to.equal(
      'div:hover::after, div.\\:hover::after { color: white }',
    );
  });

  it('can add hover class when the selector has multi :hover', () => {
    const cssText = 'a:hover b:hover { color: white }';
    expect(addHoverClass(cssText)).to.equal(
      'a:hover b:hover, a.\\:hover b.\\:hover { color: white }',
    );
  });

  it('will ignore :hover in css value', () => {
    const cssText = '.a::after { content: ":hover" }';
    expect(addHoverClass(cssText)).to.equal(cssText);
  });

  it('benchmark', () => {
    const cssText = fs.readFileSync(
      path.resolve(__dirname, './css/benchmark.css'),
      'utf8',
    );
    const start = process.hrtime();
    addHoverClass(cssText);
    const end = process.hrtime(start);
    const duration = end[0] * 1_000 + end[1] / 1_000_000;
    expect(duration).to.below(100);
  });
});
