import 'mocha';
import { expect } from 'chai';
import { absoluteToStylesheet } from '../src/snapshot';

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
