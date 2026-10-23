/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import snapshot from '../src/snapshot';
import { Mirror } from '../src/utils';

describe('Mirror.removeNodeFromMap', () => {
  it('removes light and nested shadow trees when an ancestor is removed', () => {
    const doc = document.implementation.createHTMLDocument();
    const mirror = new Mirror();
    snapshot(doc, { mirror });
    const remainingIds = mirror.getIds();
    const ancestor = doc.createElement('div');
    const host = doc.createElement('x-box');
    host.textContent = 'Slotted text';
    const shadowRoot = host.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML =
      '<style>:host{display:block}</style><span><slot></slot></span>';
    const nestedHost = doc.createElement('x-box');
    nestedHost.attachShadow({ mode: 'open' }).innerHTML = '<b>Nested text</b>';
    shadowRoot.appendChild(nestedHost);
    ancestor.appendChild(host);
    doc.body.appendChild(ancestor);
    snapshot(doc, { mirror });
    expect(mirror.getIds()).toHaveLength(remainingIds.length + 10);

    ancestor.remove();
    mirror.removeNodeFromMap(ancestor);

    expect(mirror.getIds()).toEqual(remainingIds);
  });

  it('preserves shadow node IDs when a removed host is serialized again', () => {
    const doc = document.implementation.createHTMLDocument();
    const mirror = new Mirror();
    const host = doc.createElement('x-box');
    const shadowRoot = host.attachShadow({ mode: 'open' });
    const child = doc.createElement('span');
    child.textContent = 'Shadow text';
    shadowRoot.appendChild(child);
    doc.body.appendChild(host);
    snapshot(doc, { mirror });
    const childId = mirror.getId(child);
    const childMeta = mirror.getMeta(child);
    expect(childId).toBeGreaterThan(0);

    host.remove();
    mirror.removeNodeFromMap(host);

    expect(mirror.getNode(childId)).toBeNull();
    expect(mirror.getMeta(child)).toBe(childMeta);

    doc.body.appendChild(host);
    snapshot(doc, { mirror });

    expect(mirror.getId(child)).toBe(childId);
    expect(mirror.getNode(childId)).toBe(child);
  });
});
