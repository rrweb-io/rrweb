import type { RRElement } from 'rrdom/es';

export function updateSrcset(
  node: Element | RRElement,
  urlToReplace: string,
  newURL: string,
  expectedValue?: string,
): string | undefined {
  if (typeof expectedValue === 'undefined') {
    expectedValue = node.getAttribute('srcset');
    if (!expectedValue) return undefined;
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
