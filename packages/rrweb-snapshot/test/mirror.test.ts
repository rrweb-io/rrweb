/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import snapshot from '../src/snapshot';
import { Mirror, registerShadowRoot } from '../src/utils';

describe('Mirror.removeNodeFromMap', () => {
  it.each(['open', 'closed'] as const)(
    'removes light and nested %s shadow trees when an ancestor is removed',
    (mode) => {
      const doc = document.implementation.createHTMLDocument();
      const mirror = new Mirror();
      snapshot(doc, { mirror });
      const remainingIds = mirror.getIds();
      const ancestor = doc.createElement('div');
      const host = doc.createElement('x-box');
      host.textContent = 'Slotted text';
      const shadowRoot = host.attachShadow({ mode });
      if (mode === 'closed') registerShadowRoot(shadowRoot);
      shadowRoot.innerHTML =
        '<style>:host{display:block}</style><span><slot></slot></span>';
      const nestedHost = doc.createElement('x-box');
      const nestedRoot = nestedHost.attachShadow({ mode });
      if (mode === 'closed') registerShadowRoot(nestedRoot);
      nestedRoot.innerHTML = '<b>Nested text</b>';
      shadowRoot.appendChild(nestedHost);
      ancestor.appendChild(host);
      doc.body.appendChild(ancestor);
      snapshot(doc, { mirror });
      expect(mirror.getIds().length).toBeGreaterThan(remainingIds.length);

      ancestor.remove();
      mirror.removeNodeFromMap(ancestor);

      expect(mirror.getIds()).toEqual(remainingIds);
    },
  );

  it.each(['open', 'closed'] as const)(
    're-serializes a removed %s shadow host without a corrupted mirror',
    (mode) => {
      const doc = document.implementation.createHTMLDocument();
      const mirror = new Mirror();
      const host = doc.createElement('x-box');
      const shadowRoot = host.attachShadow({ mode });
      if (mode === 'closed') registerShadowRoot(shadowRoot);
      const child = doc.createElement('span');
      child.textContent = 'Shadow text';
      shadowRoot.appendChild(child);
      doc.body.appendChild(host);
      snapshot(doc, { mirror });
      const childId = mirror.getId(child);
      expect(childId).toBeGreaterThan(0);

      host.remove();
      mirror.removeNodeFromMap(host);

      expect(mirror.getNode(childId)).toBeNull();

      doc.body.appendChild(host);
      snapshot(doc, { mirror });

      const reserializedId = mirror.getId(child);
      expect(reserializedId).toBeGreaterThan(0);
      expect(mirror.getNode(reserializedId)).toBe(child);
    },
  );
});
