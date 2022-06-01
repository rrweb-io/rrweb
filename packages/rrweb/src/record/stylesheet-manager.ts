import type { Mirror, serializedNodeWithId } from 'rrweb-snapshot';
import type { mutationCallBack } from '../types';

export class StylesheetManager {
  private trackedStylesheets: WeakSet<HTMLLinkElement> = new WeakSet();
  private mutationCb: mutationCallBack;

  constructor(options: { mutationCb: mutationCallBack }) {
    this.mutationCb = options.mutationCb;
  }

  public addStylesheet(linkEl: HTMLLinkElement) {
    if (this.trackedStylesheets.has(linkEl)) return;

    this.trackedStylesheets.add(linkEl);
    this.trackStylesheet(linkEl);
  }

  private trackStylesheet(linkEl: HTMLLinkElement) {
    // linkEl.addEventListener('load', () => {
    //   // re-loaded, maybe take another snapshot?
    // });
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
    this.addStylesheet(linkEl);
  }
}
