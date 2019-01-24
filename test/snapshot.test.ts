import 'mocha';
import { expect } from 'chai';
import { absoluteToStylesheet } from '../src/snapshot';

describe('absolute url to stylesheet', () => {
  const href = 'http://localhost/css/style.css';

  it('cam handle relative path', () => {
    expect(absoluteToStylesheet('url(a.jpg)', href)).to.equal(
      `url('http://localhost/css/a.jpg')`,
    );
  });

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

  it('can handle single quote path', () => {
    expect(absoluteToStylesheet(`url('./a.jpg')`, href)).to.equal(
      `url('http://localhost/css/a.jpg')`,
    );
  });

  it('can handle no quote path', () => {
    expect(absoluteToStylesheet('url(./a.jpg)', href)).to.equal(
      `url('http://localhost/css/a.jpg')`,
    );
  });

  it('can handle multiple no quote paths', () => {
    expect(
      absoluteToStylesheet(
        'background-image: url(images/b.jpg); background: #aabbcc url(images/a.jpg) 50% 50% repeat;',
        href,
      ),
    ).to.equal(
      `background-image: url('http://localhost/css/images/b.jpg'); ` +
        `background: #aabbcc url('http://localhost/css/images/a.jpg') 50% 50% repeat;`,
    );
  });

  it('can handle data url image', () => {
    expect(
      absoluteToStylesheet('url(data:image/gif;base64,ABC)', href),
    ).to.equal('url(data:image/gif;base64,ABC)');
  });

  it('can handle empty path', () => {
    expect(absoluteToStylesheet(`url('')`, href)).to.equal(`url('')`);
  });
});
