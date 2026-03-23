import type {
  serializedNodeWithId,
  fullSnapshotEvent,
} from '@amplitude/rrweb-types';
import { EventType } from '@amplitude/rrweb-types';

export type CachedCheckpoint = {
  /** Recording-relative timestamp (ms from first event) this snapshot was taken at. */
  timestamp: number;
  /** Synthetic FullSnapshot event that can be fed to rebuildFullSnapshot(). */
  event: fullSnapshotEvent & { timestamp: number };
};

/**
 * Maintains a bounded, timestamp-sorted cache of DOM snapshots captured after
 * seek operations. When the replayer seeks to a target time it checks the cache
 * for a snapshot that is:
 *  - more recent than the nearest FullSnapshot in the event stream, AND
 *  - at or before the target time.
 *
 * Restoring from a cached snapshot means only the incremental events between
 * the cache entry and the target time need to be replayed, which can be
 * dramatically fewer than replaying from the original FullSnapshot.
 */
export class SeekCache {
  private entries: CachedCheckpoint[] = [];
  private readonly maxEntries: number;

  constructor(maxEntries = 10) {
    this.maxEntries = maxEntries;
  }

  /**
   * Store a new checkpoint.  Entries are kept sorted by timestamp.
   * When the cache is full the oldest entry is evicted.
   */
  add(
    timestamp: number,
    snapshotNode: serializedNodeWithId,
    initialOffset: { top: number; left: number },
  ): void {
    const event = {
      type: EventType.FullSnapshot,
      data: { node: snapshotNode, initialOffset },
      timestamp,
    } as fullSnapshotEvent & { timestamp: number };

    // Insert in timestamp order (most seeks land near the end, so check last
    // entry first as a fast-path).
    const entry: CachedCheckpoint = { timestamp, event };
    if (
      !this.entries.length ||
      this.entries[this.entries.length - 1].timestamp < timestamp
    ) {
      this.entries.push(entry);
    } else {
      let lo = 0;
      let hi = this.entries.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        if (this.entries[mid].timestamp <= timestamp) lo = mid + 1;
        else hi = mid - 1;
      }
      // Deduplicate: if an entry at this exact timestamp already exists,
      // replace it rather than inserting a second identical-timestamp entry.
      if (lo > 0 && this.entries[lo - 1].timestamp === timestamp) {
        this.entries[lo - 1] = entry;
      } else {
        this.entries.splice(lo, 0, entry);
      }
    }

    if (this.entries.length > this.maxEntries) {
      this.entries.shift(); // evict the oldest
    }
  }

  /**
   * Find the best cached checkpoint for seeking to `targetTime`.
   *
   * The checkpoint must be:
   *  - at or before `targetTime` (we cannot seek forward past the snapshot)
   *  - strictly after `baselineMetaTimestamp` (ensures the snapshot belongs to
   *    the same recording session / checkout as the current seek)
   *
   * Returns `null` on cache miss.
   */
  findBestFor(
    targetTime: number,
    baselineMetaTimestamp: number,
  ): CachedCheckpoint | null {
    // Binary search for the last entry with timestamp <= targetTime.
    let lo = 0;
    let hi = this.entries.length - 1;
    let best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (this.entries[mid].timestamp <= targetTime) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    if (best === -1) return null;

    // Walk backward from `best` to find the latest entry that is also strictly
    // after `baselineMetaTimestamp` (entries with the same timestamp as the
    // original Meta/FullSnapshot are not useful — we'd be doing the same work).
    for (let i = best; i >= 0; i--) {
      if (this.entries[i].timestamp > baselineMetaTimestamp) {
        return this.entries[i];
      }
    }
    return null;
  }

  /** Remove all cached entries (e.g. when a new set of events is loaded). */
  clear(): void {
    this.entries = [];
  }

  get size(): number {
    return this.entries.length;
  }

  /** Expose entries for testing. */
  getEntries(): readonly CachedCheckpoint[] {
    return this.entries;
  }
}
