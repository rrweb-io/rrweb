import type { elementNode, serializedNodeWithId } from 'rrweb-snapshot';
import {
  stringifyRule,
  stringifyStylesheet,
  absoluteToStylesheet,
  getHref,
} from 'rrweb-snapshot';
import type {
  adoptedStyleSheetCallback,
  adoptedStyleSheetParam,
  attributeMutation,
  mutationCallBack,
} from '@rrweb/types';
import { StyleSheetMirror } from '../utils';

export class StylesheetManager {
  private trackedLinkElements: WeakSet<HTMLLinkElement> = new WeakSet();
  private mutationCb: mutationCallBack;
  private adoptedStyleSheetCb: adoptedStyleSheetCallback;
  public styleMirror = new StyleSheetMirror();
  private mirror: Mirror;

  constructor(options: {
    mirror: Mirror;
    mutationCb: mutationCallBack;
    adoptedStyleSheetCb: adoptedStyleSheetCallback;
  }) {
    this.mutationCb = options.mutationCb;
    this.adoptedStyleSheetCb = options.adoptedStyleSheetCb;
    this.mirror = options.mirror;
  }

  public trackLinkElement(linkEl: HTMLLinkElement) {
    if (this.trackedLinkElements.has(linkEl)) return;
    this.trackedLinkElements.add(linkEl);
    this.trackStylesheetInLinkElement(linkEl);
  }

  public adoptStyleSheets(sheets: CSSStyleSheet[], hostId: number) {
    if (sheets.length === 0) return;
    const adoptedStyleSheetData: adoptedStyleSheetParam = {
      id: hostId,
      styleIds: [] as number[],
    };
    const styles: NonNullable<adoptedStyleSheetParam['styles']> = [];
    for (const sheet of sheets) {
      let styleId;
      if (!this.styleMirror.has(sheet)) {
        styleId = this.styleMirror.add(sheet);
        styles.push({
          styleId,
          rules: Array.from(sheet.rules || CSSRule, (r, index) => ({
            rule: stringifyRule(r),
            index,
          })),
        });
      } else styleId = this.styleMirror.getId(sheet);
      adoptedStyleSheetData.styleIds.push(styleId);
    }
    if (styles.length > 0) adoptedStyleSheetData.styles = styles;
    this.adoptedStyleSheetCb(adoptedStyleSheetData);
  }

  public reset() {
    this.styleMirror.reset();
    this.trackedLinkElements = new WeakSet();
  }

  private trackStylesheetInLinkElement(linkEl: HTMLLinkElement) {
    // if <link> is already loaded, it will have .sheet available and that
    // will get serialized in the snapshot. The following is for when that doesn't happen
    linkEl.addEventListener('load', () => {
      if (!linkEl.sheet) {
        return;
      }
      const id = this.mirror.getId(linkEl);
      if (!id) {
        // disappeared? should warn?
        return;
      }
      let _cssText = stringifyStylesheet(linkEl.sheet);
      if (_cssText) {
        _cssText = absoluteToStylesheet(
          _cssText,
          getHref(linkEl.ownerDocument),
        );
        // TODO: compare _cssText with previous emission
        this.mutationCb({
          adds: [],
          removes: [],
          texts: [],
          attributes: [
            {
              id,
              attributes: {
                _cssText,
              },
            },
          ],
        });
      }
    });
  }
}
