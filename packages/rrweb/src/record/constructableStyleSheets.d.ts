// This informs the TS compiler about constructed stylesheets.
// It can be removed when this is fixed: https://github.com/Microsoft/TypeScript/issues/30022
declare interface DocumentOrShadowRoot {
  adoptedStyleSheets: CSSStyleSheet[];
}

declare interface CSSStyleSheet {
  replace(text: string): void;
  replaceSync(text: string): void;
}
