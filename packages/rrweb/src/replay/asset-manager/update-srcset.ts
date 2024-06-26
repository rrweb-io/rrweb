import type { RRElement } from 'rrdom';

export function updateSrcset(
  node: Element | RRElement,
  urlToReplace: string,
  newURL: string,
): string | void {
  const srcset = node.getAttribute('srcset');
  if (!srcset) return;

  // from https://stackoverflow.com/a/6969486/543604
  const escapedUrlToReplace = urlToReplace.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );
  const matcher = new RegExp(`(?<=^|[\\s,])${escapedUrlToReplace}(?=[\\s,]|$)`);
  const newSrcset = srcset.replace(matcher, newURL);

  node.setAttribute('srcset', newSrcset);

  return newSrcset;
}
