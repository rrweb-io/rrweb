import 'mocha';
import { expect } from 'chai';
import { absoluteToStylesheet, addHoverClass } from '../src/snapshot';

describe('absolute url to stylesheet', () => {
  const href = 'http://localhost/css/style.css';

  it('can handle same level path', () => {
    expect(absoluteToStylesheet('url("./a.jpg")', href)).to.equal(
      `url('http://localhost/css/a.jpg')`,
    );
  });

  it('can handle parent level path', () => {
    expect(absoluteToStylesheet('url("../a.jpg")', href)).to.equal(
      `url('http://localhost/a.jpg')`,
    );
  });

  it('can handle absolute path', () => {
    expect(absoluteToStylesheet('url("/a.jpg")', href)).to.equal(
      `url('http://localhost/a.jpg')`,
    );
  });

  it('can handle external path', () => {
    expect(
      absoluteToStylesheet('url("http://localhost/a.jpg")', href),
    ).to.equal(`url('http://localhost/a.jpg')`);
  });
});

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
});
