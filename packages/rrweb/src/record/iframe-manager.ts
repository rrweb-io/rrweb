import { serializedNodeWithId, INode } from 'rrweb-snapshot';
import { mutationCallBack } from '../types';

export class IframeManager {
  private iframes: WeakMap<HTMLIFrameElement, true> = new WeakMap();
  private mutationCb: mutationCallBack;
  private loadListener?: (iframeEl: HTMLIFrameElement) => unknown;

  constructor(options: { mutationCb: mutationCallBack }) {
    this.mutationCb = options.mutationCb;
  }

  public addIframe(iframeEl: HTMLIFrameElement) {
    this.iframes.set(iframeEl, true);
  }

  public addLoadListener(cb: (iframeEl: HTMLIFrameElement) => unknown) {
    this.loadListener = cb;
  }

  public attachIframe(iframeEl: INode, parentId: number, childSn: serializedNodeWithId) {
    this.mutationCb({
      adds: [
        {
          parentId: parentId,
          nextId: null,
          node: childSn,
        },
      ],
      removes: [],
      texts: [],
      attributes: [],
      isAttachIframe: true,
    });
    this.loadListener?.((iframeEl as unknown) as HTMLIFrameElement);
  }
}
