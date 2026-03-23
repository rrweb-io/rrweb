/**
 * Unit tests for SeekCache.
 *
 * No browser required — pure data-structure logic.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { SeekCache } from '../src/replay/seek-cache';
import { EventType } from '@amplitude/rrweb-types';
import type { serializedNodeWithId } from '@amplitude/rrweb-types';

// Minimal serialized node used as a placeholder in cache entries.
const dummyNode = (): serializedNodeWithId =>
  ({
    type: 0,
    childNodes: [],
    id: 1,
  } as unknown as serializedNodeWithId);

const offset = { top: 0, left: 0 };

describe('SeekCache', () => {
  let cache: SeekCache;

  beforeEach(() => {
    cache = new SeekCache(5);
  });

  // ---------------------------------------------------------------------------
  // add() / size / getEntries()
  // ---------------------------------------------------------------------------

  it('starts empty', () => {
    expect(cache.size).toBe(0);
    expect(cache.getEntries()).toHaveLength(0);
  });

  it('stores a single entry', () => {
    cache.add(1000, dummyNode(), offset);
    expect(cache.size).toBe(1);
  });

  it('keeps entries sorted by timestamp (ascending insertion)', () => {
    cache.add(1000, dummyNode(), offset);
    cache.add(2000, dummyNode(), offset);
    cache.add(3000, dummyNode(), offset);
    const ts = cache.getEntries().map((e) => e.timestamp);
    expect(ts).toEqual([1000, 2000, 3000]);
  });

  it('keeps entries sorted by timestamp (descending insertion)', () => {
    cache.add(3000, dummyNode(), offset);
    cache.add(2000, dummyNode(), offset);
    cache.add(1000, dummyNode(), offset);
    const ts = cache.getEntries().map((e) => e.timestamp);
    expect(ts).toEqual([1000, 2000, 3000]);
  });

  it('keeps entries sorted by timestamp (random insertion)', () => {
    cache.add(2000, dummyNode(), offset);
    cache.add(5000, dummyNode(), offset);
    cache.add(1000, dummyNode(), offset);
    cache.add(3000, dummyNode(), offset);
    const ts = cache.getEntries().map((e) => e.timestamp);
    expect(ts).toEqual([1000, 2000, 3000, 5000]);
  });

  it('evicts the oldest entry when capacity is exceeded', () => {
    for (let i = 1; i <= 6; i++) cache.add(i * 1000, dummyNode(), offset);
    expect(cache.size).toBe(5);
    // Oldest (1000) should be gone; newest five should remain.
    const ts = cache.getEntries().map((e) => e.timestamp);
    expect(ts).toEqual([2000, 3000, 4000, 5000, 6000]);
  });

  it('evicts correctly when new entry is inserted before existing ones', () => {
    // Fill to capacity with timestamps 2000..6000.
    for (let i = 2; i <= 6; i++) cache.add(i * 1000, dummyNode(), offset);
    // Insert an older timestamp — it should be inserted at position 0, then
    // immediately evicted as the oldest.
    cache.add(500, dummyNode(), offset);
    expect(cache.size).toBe(5);
    const ts = cache.getEntries().map((e) => e.timestamp);
    expect(ts).toEqual([2000, 3000, 4000, 5000, 6000]);
  });

  it('allows duplicate timestamps', () => {
    cache.add(1000, dummyNode(), offset);
    cache.add(1000, dummyNode(), offset);
    expect(cache.size).toBe(2);
  });

  it('synthesizes a proper fullSnapshotEvent', () => {
    const node = dummyNode();
    cache.add(5000, node, { top: 10, left: 20 });
    const entry = cache.getEntries()[0];
    expect(entry.event.type).toBe(EventType.FullSnapshot);
    expect(entry.event.timestamp).toBe(5000);
    expect(entry.event.data.node).toBe(node);
    expect(entry.event.data.initialOffset).toEqual({ top: 10, left: 20 });
  });

  // ---------------------------------------------------------------------------
  // clear()
  // ---------------------------------------------------------------------------

  it('clear() removes all entries', () => {
    cache.add(1000, dummyNode(), offset);
    cache.add(2000, dummyNode(), offset);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // findBestFor()
  // ---------------------------------------------------------------------------

  it('returns null for an empty cache', () => {
    expect(cache.findBestFor(5000, 0)).toBeNull();
  });

  it('returns null when all entries are after targetTime', () => {
    cache.add(3000, dummyNode(), offset);
    cache.add(4000, dummyNode(), offset);
    expect(cache.findBestFor(2000, 0)).toBeNull();
  });

  it('returns null when all entries are at or before baselineMetaTimestamp', () => {
    cache.add(1000, dummyNode(), offset);
    cache.add(2000, dummyNode(), offset);
    // baselineMetaTimestamp = 2000 → entries must be STRICTLY after it
    expect(cache.findBestFor(5000, 2000)).toBeNull();
  });

  it('returns the best (newest) entry at or before targetTime and after baseline', () => {
    cache.add(1000, dummyNode(), offset);
    cache.add(2000, dummyNode(), offset);
    cache.add(3000, dummyNode(), offset);
    cache.add(4000, dummyNode(), offset);
    // targetTime=3500, baseline=0 → best is t=3000
    const hit = cache.findBestFor(3500, 0);
    expect(hit).not.toBeNull();
    expect(hit!.timestamp).toBe(3000);
  });

  it('includes an entry exactly at targetTime', () => {
    cache.add(2000, dummyNode(), offset);
    cache.add(3000, dummyNode(), offset);
    const hit = cache.findBestFor(3000, 0);
    expect(hit!.timestamp).toBe(3000);
  });

  it('excludes an entry exactly at baselineMetaTimestamp (must be strictly after)', () => {
    cache.add(1000, dummyNode(), offset);
    cache.add(2000, dummyNode(), offset);
    // baseline = 2000: both t=2000 (not strictly after) and t=1000 (< baseline)
    // are excluded → cache miss.
    expect(cache.findBestFor(5000, 2000)).toBeNull();
  });

  it('includes an entry whose timestamp is one ms after baselineMetaTimestamp', () => {
    cache.add(1000, dummyNode(), offset);
    cache.add(2000, dummyNode(), offset);
    // baseline = 1999: t=2000 IS strictly after → returned.
    const hit = cache.findBestFor(5000, 1999);
    expect(hit!.timestamp).toBe(2000);
  });

  it('skips entries ≤ baseline and returns the next valid one', () => {
    cache.add(500, dummyNode(), offset);   // baseline guard: 500 ≤ 1000, excluded
    cache.add(1500, dummyNode(), offset);  // > 1000 AND ≤ 3000 → candidate
    cache.add(2500, dummyNode(), offset);  // > 1000 AND ≤ 3000 → best candidate
    cache.add(4000, dummyNode(), offset);  // > targetTime=3000, excluded
    const hit = cache.findBestFor(3000, 1000);
    expect(hit!.timestamp).toBe(2500);
  });

  it('returns null when only entry at targetTime equals baseline', () => {
    cache.add(1000, dummyNode(), offset);
    expect(cache.findBestFor(1000, 1000)).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // checkout boundary: entries from a prior session are excluded
  // ---------------------------------------------------------------------------

  it('excludes entries from a prior checkout session', () => {
    // Simulate: first session 0–30s, checkout at 30s, second session 30–60s.
    cache.add(10_000, dummyNode(), offset); // session 1
    cache.add(20_000, dummyNode(), offset); // session 1
    // After checkout, baselineMetaTimestamp = 30_000.
    // Seek target = 50_000.
    expect(cache.findBestFor(50_000, 30_000)).toBeNull();
  });

  it('uses entries from the current session after a checkout', () => {
    cache.add(10_000, dummyNode(), offset); // session 1 — excluded
    cache.add(40_000, dummyNode(), offset); // session 2 — included
    const hit = cache.findBestFor(50_000, 30_000);
    expect(hit!.timestamp).toBe(40_000);
  });
});
