export function getUntaintedChildNodesAccessor(): (
  this: Node,
) => NodeListOf<Node> {
  const original = Object.getOwnPropertyDescriptor(
    Node.prototype,
    'childNodes',
  );
  // eslint-disable-next-line @typescript-eslint/unbound-method, @typescript-eslint/no-non-null-assertion
  const originalGetter = original?.get as (this: Node) => NodeListOf<Node>;
  if (!originalGetter) throw new Error(`Failed to get original getter`);
  try {
    const isUntainted = originalGetter.toString().includes('[native code]');
    if (isUntainted) return originalGetter;
    const iframeEl = document.createElement('iframe');
    document.body.appendChild(iframeEl);
    const win = iframeEl.contentWindow;
    if (!win) return originalGetter;

    const untainted = Object.getOwnPropertyDescriptor(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (win as any).Node.prototype,
      'childNodes',
    );
    // cleanup
    document.body.removeChild(iframeEl);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const untaintedGetter = untainted?.get;
    if (!untaintedGetter) throw new Error('Failed to get untainted getter');
    return untaintedGetter;
  } catch {
    return originalGetter;
  }
}

let untaintedChildNodesAccessor: (this: Node) => NodeListOf<Node>;
export function childNodes(n: Node): NodeListOf<Node> {
  untaintedChildNodesAccessor ||= getUntaintedChildNodesAccessor();

  return untaintedChildNodesAccessor.call(n);
}
