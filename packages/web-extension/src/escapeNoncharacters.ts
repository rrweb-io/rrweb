// Chrome refuses to inject a script file that contains a Unicode
// noncharacter ("isn't UTF-8 encoded"). The minifier writes escapes such as
// postcss's "\uFFFE" as raw characters, so turn them back into escapes.
const NONCHARACTERS = /[\uFDD0-\uFDEF\uFFFE\uFFFF]/g;

export function escapeNoncharacters(code: string): string {
  return code.replace(
    NONCHARACTERS,
    (c) => `\\u${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}
