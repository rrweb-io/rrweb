import type { Mirror, serializedNodeWithId } from 'rrweb-snapshot';
import { getCssRuleString } from 'rrweb-snapshot';
import type {
  adoptedStyleSheetCallback,
  mutationCallBack,
  styleSheetRuleCallback,
} from '../types';
import { StyleSheetMirror } from '../utils';

export class StylesheetManager {
  private trackedLinkElements: WeakSet<HTMLLinkElement> = new WeakSet();
  private mutationCb: mutationCallBack;
  private styleRulesCb: styleSheetRuleCallback;
  private adoptedStyleSheetCb: adoptedStyleSheetCallback;
  public styleMirror = new StyleSheetMirror();

  constructor(options: {
    mutationCb: mutationCallBack;
    styleRulesCb: styleSheetRuleCallback;
    adoptedStyleSheetCb: adoptedStyleSheetCallback;
  }) {
    this.mutationCb = options.mutationCb;
    this.styleRulesCb = options.styleRulesCb;
    this.adoptedStyleSheetCb = options.adoptedStyleSheetCb;
  }

  public attachLinkElement(
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

    this.trackLinkElement(linkEl);
  }

  public trackLinkElement(linkEl: HTMLLinkElement) {
    if (this.trackedLinkElements.has(linkEl)) return;

    this.trackedLinkElements.add(linkEl);
    this.trackStylesheetInLinkElement(linkEl);
  }

  public adoptStyleSheets(sheets: CSSStyleSheet[]) {
    for (const sheet of sheets) {
      if (this.styleMirror.has(sheet)) continue;
      const styleId = this.styleMirror.add(sheet);
      const rules = Array.from(sheet.rules || CSSRule);
      this.styleRulesCb({
        adds: rules.map((r) => {
          return {
            rule: getCssRuleString(r),
          };
        }),
        styleId,
      });
    }
  }

  // TODO: take snapshot on stylesheet reload by applying event listener
  private trackStylesheetInLinkElement(linkEl: HTMLLinkElement) {
    // linkEl.addEventListener('load', () => {
    //   // re-loaded, maybe take another snapshot?
    // });
  }
}
