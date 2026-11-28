import type { CursorPack } from '../types';
import { cursors } from './cursor-pack';

const TEXT_INPUT = /^(text|search|url|tel|email|password|number)$/;
const TWO_WAY: Record<string, string> = {
  n: 'ns',
  s: 'ns',
  e: 'ew',
  w: 'ew',
  ne: 'nesw',
  sw: 'nesw',
  nw: 'nwse',
  se: 'nwse',
};

/** Cursor keyword the browser would show over target at (x, y) in target's document. */
export function resolveCursor(
  target: Element,
  x: number,
  y: number,
  resolveAuto: boolean,
  pressed: boolean,
): string {
  try {
    const doc = target.ownerDocument;
    let cursor = doc
      .defaultView!.getComputedStyle(target)
      .cursor.split(',')
      .pop()!
      .trim();
    // a target removed by a mutation or navigation has an empty computed style
    if (!cursor) return 'default';
    if (cursor === 'auto')
      cursor = resolveAuto && overText(doc, target, x, y) ? 'text' : 'default';
    return pressed && cursor === 'grab' ? 'grabbing' : cursor;
  } catch {
    return 'default';
  }
}

function overText(doc: Document, el: Element, x: number, y: number) {
  if (
    el.tagName === 'TEXTAREA' ||
    (el.tagName === 'INPUT' &&
      TEXT_INPUT.test((el as HTMLInputElement).type)) ||
    (el as HTMLElement).isContentEditable
  )
    return true;
  // caretPositionFromPoint is missing from TypeScript's DOM lib before 5.5
  const d = doc as Document & {
    caretPositionFromPoint?(x: number, y: number): { offsetNode: Node } | null;
  };
  const node =
    'caretPositionFromPoint' in d
      ? d.caretPositionFromPoint?.(x, y)?.offsetNode
      : doc.caretRangeFromPoint?.(x, y)?.startContainer;
  if (
    node?.nodeType !== Node.TEXT_NODE ||
    !node.textContent?.trim() ||
    node.parentElement?.closest('a,button,select,input,textarea')
  )
    return false;
  // caret APIs snap to the nearest text, so check the point is on it
  const range = doc.createRange();
  range.selectNodeContents(node);
  return Array.from(range.getClientRects()).some(
    (r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom,
  );
}

export const defaultCursorPack: CursorPack = {
  name: 'default',
  resolve({ cursor, pointerType }) {
    const key =
      pointerType === 'pen'
        ? 'pen-tip'
        : cursor.replace(/^(\w\w?)-resize$/, (m, d: string) =>
            TWO_WAY[d] ? `${TWO_WAY[d]}-resize` : m,
          );
    const [url, x, y] = cursors[key] || cursors.default;
    return { url, hotspot: [x, y] };
  },
};
