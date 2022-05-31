import type { Mirror, serializedNodeWithId } from 'rrweb-snapshot';
import type { mutationCallBack } from '../types';

export class StylesheetManager {
  // private stylesheets: WeakMap<HTMLLinkElement, true> = new WeakMap();
  private mutationCb: mutationCallBack;

  constructor(options: { mutationCb: mutationCallBack }) {
    this.mutationCb = options.mutationCb;
  }

  public attachStylesheet(
    linkEl: HTMLLinkElement,
    childSn: serializedNodeWithId,
    mirror: Mirror,
  ) {
    this.mutationCb({
      adds: [
        {
          parentId: mirror.getId(linkEl),
          nextId: null,
          node: childSn,
        },
      ],
      removes: [],
      texts: [],
      attributes: [],
    });
  }
}
