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

export class StylesheetManager {
  private trackedLinkElements: WeakSet<HTMLLinkElement> = new WeakSet();
  private mutationCb: mutationCallBack;
  private adoptedStyleSheetCb: adoptedStyleSheetCallback;
  public styleMirror = new StyleSheetMirror();

  constructor(options: {
    mutationCb: mutationCallBack;
    adoptedStyleSheetCb: adoptedStyleSheetCallback;
  }) {
    this.mutationCb = options.mutationCb;
    this.adoptedStyleSheetCb = options.adoptedStyleSheetCb;
  }

  public attachLinkElement(
    linkEl: HTMLLinkElement,
    childSn: serializedNodeWithId,
  ) {
    if ('_cssText' in (childSn as elementNode).attributes)
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
            rule: stringifyRule(r, sheet.href),
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

  /**
   * Cleans up stylesheets associated with a removed node.
   *
   * @param removedNode - The node that was removed from the DOM.
   */
  public cleanupStylesheetsForRemovedNode(removedNode: Node): void {
    try {
      if (removedNode.nodeType === Node.DOCUMENT_NODE) {
        const doc = removedNode as Document;
        if (doc.adoptedStyleSheets) {
          for (const sheet of doc.adoptedStyleSheets) {
            this.styleMirror.remove(sheet);
          }
        }
      }

      if (removedNode.nodeName === 'STYLE') {
        const styleEl = removedNode as HTMLStyleElement;
        if (styleEl.sheet) {
          this.styleMirror.remove(styleEl.sheet);
        }
      }

      if (
        removedNode.nodeName === 'LINK' &&
        (removedNode as HTMLLinkElement).rel === 'stylesheet'
      ) {
        const linkEl = removedNode as HTMLLinkElement;
        if (linkEl.sheet) {
          this.styleMirror.remove(linkEl.sheet);
        }
      }

      if (removedNode.childNodes) {
        removedNode.childNodes.forEach((child) => {
          this.cleanupStylesheetsForRemovedNode(child);
        });
      }
    } catch (e) {
      // Ignore errors
    }
  }

  // TODO: take snapshot on stylesheet reload by applying event listener
  private trackStylesheetInLinkElement(_linkEl: HTMLLinkElement) {
    // linkEl.addEventListener('load', () => {
    //   // re-loaded, maybe take another snapshot?
    // });
  }
}
