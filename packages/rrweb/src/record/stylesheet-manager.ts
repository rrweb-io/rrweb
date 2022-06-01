import type { Mirror, serializedNodeWithId } from 'rrweb-snapshot';
import type { mutationCallBack } from '../types';

export class StylesheetManager {
  // private stylesheets: WeakMap<HTMLLinkElement, true> = new WeakMap();
  private trackedStylesheets: WeakSet<HTMLLinkElement> = new WeakSet();
  private mutationCb: mutationCallBack;
  private loadListener?: (linkEl: HTMLLinkElement) => unknown;

  constructor(options: { mutationCb: mutationCallBack }) {
    this.mutationCb = options.mutationCb;
  }

  public addStylesheet(linkEl: HTMLLinkElement) {
    console.log('add stylesheet!', this.trackedStylesheets.has(linkEl));
    if (this.trackedStylesheets.has(linkEl)) return;

    this.trackStylesheet(linkEl);
    this.trackedStylesheets.add(linkEl);
  }

  public addLoadListener(cb: (linkEl: HTMLLinkElement) => unknown) {
    this.loadListener = cb;
  }

  public attributeMutation(
    linkEl: HTMLLinkElement,
    oldValue: string | null,
    newValue: string | null,
  ) {
    console.log(
      'attributeMutation',
      JSON.stringify(oldValue),
      JSON.stringify(newValue),
      // linkEl.sheet,
      // linkEl.sheet?.cssRules[0]?.cssText,
    );

    // this.mutationCb({
    //   adds: [],
    //   removes: [],
    //   texts: [],
    //   attributes: [
    //     {
    //       id: mirror.getId(linkEl),
    //       attributes,
    //     },
    //   ],
    // });
  }

  private trackStylesheet(linkEl: HTMLLinkElement) {
    linkEl.addEventListener('load', () => {
      console.log('trackStylesheet', linkEl.sheet);
    });
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
    this.trackStylesheet(linkEl);
    // this.loadListener?.(linkEl);

    // wrappedEmit(
    //   wrapEvent({
    //     type: EventType.IncrementalSnapshot,
    //     data: {
    //       source: IncrementalSource.Mutation,
    //       adds: [
    //         {
    //           parentId: mirror.getId(linkEl.parentElement),
    //           nextId: null,
    //           node: childSn,
    //         },
    //       ],
    //       removes: [],
    //       texts: [],
    //       attributes: [
    //         // {
    //         //   id: childSn.id,
    //         //   attributes: {
    //         //     href: null,
    //         //     _cssText: childSn.attributes._cssText,
    //         //   },
    //         // },
    //       ],
    //     },
    //   }),
    // );
  }
}
