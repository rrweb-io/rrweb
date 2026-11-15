// Local-only recordings: no network assets, fonts, or wall-clock timestamps.
function fixture(duration, animated) {
  const text = (id, textContent) => ({ type: 3, id, textContent });
  const element = (id, tagName, childNodes = [], attributes = {}) => ({
    type: 2,
    id,
    tagName,
    attributes,
    childNodes,
  });
  const style =
    'body{margin:0;background:white;font:24px monospace}#box{width:100px;height:100px;background:#1470ef}' +
    (animated
      ? '@keyframes slide{from{transform:translateX(0)}to{transform:translateX(400px)}}#box{animation:slide 1s linear infinite alternate}'
      : '');
  const events = [
    {
      type: 4,
      timestamp: 1700000000000,
      data: { href: 'about:blank', width: 640, height: 360 },
    },
    {
      type: 2,
      timestamp: 1700000000000,
      data: {
        initialOffset: { top: 0, left: 0 },
        node: {
          type: 0,
          id: 1,
          childNodes: [
            { type: 1, id: 2, name: 'html', publicId: '', systemId: '' },
            element(3, 'html', [
              element(4, 'head', [element(5, 'style', [text(6, style)])]),
              element(7, 'body', [
                element(8, 'div', [], { id: 'box' }),
                element(9, 'p', [text(10, '0')]),
              ]),
            ]),
          ],
        },
      },
    },
  ];
  for (let t = 20; t <= duration; t += 20) {
    events.push({
      type: 3,
      timestamp: 1700000000000 + t,
      data: {
        source: 0,
        adds: [],
        removes: [],
        attributes: [],
        texts: [{ id: 10, value: String(t) }],
      },
    });
  }
  return events;
}
module.exports = {
  'dom-mutations': fixture(2000, false),
  'css-animation': fixture(2000, true),
};
