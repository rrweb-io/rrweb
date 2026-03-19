import type { Mirror } from '@amplitude/rrweb-snapshot';
import type { serializedNodeWithId } from '@amplitude/rrweb-types';
import { NodeType } from '@amplitude/rrweb-types';

/**
 * Type guard: returns true if the node has a `childNodes` array
 * (i.e. it is a Document or Element node).
 */
export function hasChildNodes(
  node: serializedNodeWithId,
): node is serializedNodeWithId & { childNodes: serializedNodeWithId[] } {
  return node.type === NodeType.Document || node.type === NodeType.Element;
}

/**
 * Serializes adopted stylesheets from a Document or ShadowRoot into a single
 * CSS string.  Returns `null` when there are no sheets or no accessible rules.
 */
export function serializeAdoptedStyleSheets(
  root: ShadowRoot | Document,
): string | null {
  const sheets = root.adoptedStyleSheets;
  if (!sheets?.length) return null;
  const parts: string[] = [];
  for (const sheet of sheets) {
    try {
      const rules = sheet.cssRules;
      for (let i = 0; i < rules.length; i++) {
        parts.push(rules[i].cssText);
      }
    } catch {
      // Cross-origin stylesheet – skip
    }
  }
  return parts.length > 0 ? parts.join('\n') : null;
}

/**
 * Returns the next available node ID by reading the Mirror's ID map
 * instead of recursively walking the snapshot tree.
 */
export function getNextIdFromMirror(mirror: Mirror): number {
  const ids = mirror.getIds();
  let max = 0;
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] > max) max = ids[i];
  }
  return max + 1;
}

/**
 * Finds the highest node `id` in a serialized snapshot tree.
 *
 * Prefer `getNextIdFromMirror` when a Mirror is available — it avoids
 * a full tree walk by reading from the Mirror's ID map directly.
 */
export function findMaxId(node: serializedNodeWithId): number {
  let max = node.id;
  if ('childNodes' in node && node.childNodes) {
    for (const child of node.childNodes) {
      const childMax = findMaxId(child);
      if (childMax > max) max = childMax;
    }
  }
  return max;
}

/**
 * Injects adopted stylesheets into a snapshot in a single tree walk:
 *
 * 1. Document-level adopted stylesheets → appended as a `<style>` in `<head>`
 * 2. Shadow DOM adopted stylesheets → prepended as `<style>` in each shadow host
 *
 * This replaces the separate `injectDocumentAdoptedStyles` +
 * `injectAdoptedStyles` calls to avoid walking the tree twice.
 */
export function injectAllAdoptedStyles(
  snap: serializedNodeWithId,
  mirror: Mirror,
  nextId: { value: number },
): void {
  const docCss = serializeAdoptedStyleSheets(document);

  function walk(node: serializedNodeWithId): void {
    // Shadow DOM adopted stylesheets
    if (node.type === NodeType.Element && node.isShadowHost) {
      const domNode = mirror.getNode(node.id) as Element | null;
      if (domNode?.shadowRoot) {
        const cssText = serializeAdoptedStyleSheets(domNode.shadowRoot);
        if (cssText) {
          node.childNodes.unshift({
            type: NodeType.Element,
            tagName: 'style',
            attributes: { _cssText: cssText },
            childNodes: [],
            id: nextId.value++,
            isShadow: true,
          });
        }
      }
    }

    // Document-level adopted stylesheets → inject into <head>
    if (docCss && node.type === NodeType.Element && node.tagName === 'head') {
      node.childNodes.push({
        type: NodeType.Element,
        tagName: 'style',
        attributes: { _cssText: docCss },
        childNodes: [],
        id: nextId.value++,
      });
    }

    if ('childNodes' in node && node.childNodes) {
      for (const child of node.childNodes) {
        walk(child);
      }
    }
  }

  walk(snap);
}

// Keep the individual functions exported for consumers who need them separately

/**
 * Recursively walks a serialized snapshot tree and injects `<style>` nodes
 * for any shadow-host elements whose live ShadowRoot has adopted stylesheets.
 */
export function injectAdoptedStyles(
  node: serializedNodeWithId,
  mirror: Mirror,
  nextId: { value: number },
): void {
  if (node.type === NodeType.Element && node.isShadowHost) {
    const domNode = mirror.getNode(node.id) as Element | null;
    if (domNode?.shadowRoot) {
      const cssText = serializeAdoptedStyleSheets(domNode.shadowRoot);
      if (cssText) {
        node.childNodes.unshift({
          type: NodeType.Element,
          tagName: 'style',
          attributes: { _cssText: cssText },
          childNodes: [],
          id: nextId.value++,
          isShadow: true,
        });
      }
    }
  }
  if ('childNodes' in node && node.childNodes) {
    for (const child of node.childNodes) {
      injectAdoptedStyles(child, mirror, nextId);
    }
  }
}

/**
 * Injects document-level adopted stylesheets into a serialized snapshot tree
 * by appending a `<style>` node to the `<head>` element.
 */
export function injectDocumentAdoptedStyles(
  snap: serializedNodeWithId,
  nextId: { value: number },
): void {
  const docCss = serializeAdoptedStyleSheets(document);
  if (!docCss || !hasChildNodes(snap)) return;

  const html = snap.childNodes.find(
    (n) => n.type === NodeType.Element && n.tagName === 'html',
  );
  if (!html || !hasChildNodes(html)) return;

  const head = html.childNodes.find(
    (n) => n.type === NodeType.Element && n.tagName === 'head',
  );
  if (!head || !hasChildNodes(head)) return;

  head.childNodes.push({
    type: NodeType.Element,
    tagName: 'style',
    attributes: { _cssText: docCss },
    childNodes: [],
    id: nextId.value++,
  });
}
