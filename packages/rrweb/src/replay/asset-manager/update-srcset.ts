import type { RRElement } from 'rrdom';

export function updateSrcset(
  node: Element | RRElement,
  urlToReplace: string,
  newURL: string,
  expectedValue?: string,
): string | null {
  if (typeof expectedValue === 'undefined') {
    const srcsetValue = node.getAttribute('srcset');
    if (!srcsetValue) return null;
    expectedValue = srcsetValue;
  }

  // from https://stackoverflow.com/a/6969486/543604
  const escapedUrlToReplace = urlToReplace.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );
  const matcher = new RegExp(`(?<=^|[\\s,])${escapedUrlToReplace}(?=[\\s,]|$)`);
  const newSrcset = expectedValue.replace(matcher, newURL);

  node.setAttribute('srcset', newSrcset);

  return newSrcset;
}
