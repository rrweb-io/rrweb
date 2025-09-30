import type {
  serializedNodeWithId,
  adoptedStyleSheetCallback,
  mutationCallBack,
} from '@newrelic/rrweb-types';
import { StyleSheetMirror } from '../utils';
export declare class StylesheetManager {
  private trackedLinkElements;
  private mutationCb;
  private adoptedStyleSheetCb;
  styleMirror: StyleSheetMirror;
  constructor(options: {
    mutationCb: mutationCallBack;
    adoptedStyleSheetCb: adoptedStyleSheetCallback;
  });
  attachLinkElement(
    linkEl: HTMLLinkElement,
    childSn: serializedNodeWithId,
  ): void;
  trackLinkElement(linkEl: HTMLLinkElement): void;
  adoptStyleSheets(
    sheets: CSSStyleSheet[] | readonly CSSStyleSheet[],
    hostId: number,
  ): void;
  reset(): void;
  private trackStylesheetInLinkElement;
}
