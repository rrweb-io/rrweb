import { stringifyRule } from 'rrweb-snapshot';
import type {
  elementNode,
  serializedNodeWithId,
  adoptedStyleSheetCallback,
  adoptedStyleSheetParam,
  attributeMutation,
  mutationCallBack,
} from '@rrweb/types';
import { StyleSheetMirror } from '../utils';
import type AssetManager from './observers/asset-manager';

export class StylesheetManager {
  private trackedLinkElements: WeakSet<HTMLLinkElement> = new WeakSet();
  private mutationCb: mutationCallBack;
  private adoptedStyleSheetCb: adoptedStyleSheetCallback;
  private assetManager: AssetManager;
  public styleMirror = new StyleSheetMirror();

  constructor(options: {
    mutationCb: mutationCallBack;
    adoptedStyleSheetCb: adoptedStyleSheetCallback;
    assetManager: AssetManager;
  }) {
    this.mutationCb = options.mutationCb;
    this.adoptedStyleSheetCb = options.adoptedStyleSheetCb;
    this.assetManager = options.assetManager;
  }

  public attachLinkElement(
    linkEl: HTMLLinkElement,
    childSn: serializedNodeWithId,
  ) {
    // a mutation rather than an asset event so that we record the timestamp that the stylesheet was loaded
    if (
      '_cssText' in (childSn as elementNode).attributes ||
      'rr_captured_href' in (childSn as elementNode).attributes
    ) {
      this.mutationCb({
        adds: [],
        removes: [],
        texts: [],
        attributes: [
          {
            id: childSn.id,
            attributes: (childSn as elementNode)
              .attributes as attributeMutation['attributes'],
          },
        ],
      });
    }

    this.trackLinkElement(linkEl);
  }

  public trackLinkElement(linkEl: HTMLLinkElement) {
    if (this.trackedLinkElements.has(linkEl)) return;

    this.trackedLinkElements.add(linkEl);
    this.trackStylesheetInLinkElement(linkEl);
  }

  public adoptStyleSheets(
    sheets: CSSStyleSheet[] | readonly CSSStyleSheet[],
    hostId: number,
  ) {
    if (sheets.length === 0) return;
    if (this.assetManager.config.adoptedStylesheetAssets) {
      this.adoptStyleSheetsAsAssets(sheets, hostId);
      return;
    }
    const adoptedStyleSheetData: adoptedStyleSheetParam = {
      id: hostId,
      styleIds: [] as number[],
    };
    const styles: NonNullable<adoptedStyleSheetParam['styles']> = [];
    for (const sheet of sheets) {
      let styleId;
      if (!this.styleMirror.has(sheet)) {
        styleId = this.styleMirror.add(sheet);
        const rules = Array.from(sheet.rules || CSSRule, (r, index) => ({
          rule: stringifyRule(r, sheet.href),
          index,
        }));
        styles.push({ styleId, rules });
      } else styleId = this.styleMirror.getId(sheet);
      adoptedStyleSheetData.styleIds.push(styleId);
    }
    if (styles.length > 0) adoptedStyleSheetData.styles = styles;
    this.adoptedStyleSheetCb(adoptedStyleSheetData);
  }

  private adoptStyleSheetsAsAssets(
    sheets: CSSStyleSheet[] | readonly CSSStyleSheet[],
    hostId: number,
  ) {
    // emit each stylesheet's css content as a separate Asset event (only the
    // first time it is encountered) and reference it by a virtual url. The
    // styleId is embedded in the url, so no styleIds/rules are inlined here.
    const assetUrls: string[] = [];
    for (const sheet of sheets) {
      let url: string;
      if (!this.styleMirror.has(sheet)) {
        const styleId = this.styleMirror.add(sheet);
        const cssText = Array.from(sheet.rules || CSSRule, (r) =>
          stringifyRule(r, sheet.href),
        ).join('');
        url = this.assetManager.captureAdoptedStyleSheet(styleId, cssText);
      } else {
        url = this.assetManager.adoptedStyleSheetURL(
          this.styleMirror.getId(sheet),
        );
      }
      assetUrls.push(url);
    }
    this.adoptedStyleSheetCb({ id: hostId, assetUrls });
  }

  public reset() {
    this.styleMirror.reset();
    this.trackedLinkElements = new WeakSet();
  }

  // TODO: take snapshot on stylesheet reload by applying event listener
  private trackStylesheetInLinkElement(_linkEl: HTMLLinkElement) {
    // linkEl.addEventListener('load', () => {
    //   // re-loaded, maybe take another snapshot?
    // });
  }
}
