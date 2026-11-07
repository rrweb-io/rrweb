import { type eventWithTime, EventType, ReplayerEvents } from '@rrweb/types';
import type { SegmentFetchFn } from '../types';
import { type StallController, StallEvents } from './stall-controller';
import type { Replayer } from './index';

type SegmentInfo = {
  segmentStart: number;
  keyframe: boolean;
  fetched: boolean;
  fetching: boolean;
  attempts: number;
};

const maxSegmentFetchAttempts = 3;
const maxConcurrentFetches = 3;

export function isSegmentStartMarker(event: eventWithTime): boolean {
  // sent by a server to indicate to request segments from i.e.
  // at what point events become 'missing'
  return event.type === EventType.Custom && event.data.tag === 'segment-start';
}

function markerSegmentStart(event: eventWithTime): number {
  const payload = (event.data as { payload?: { segmentStart?: number } })
    .payload;
  return typeof payload?.segmentStart === 'number'
    ? payload.segmentStart
    : event.timestamp;
}

function markerIsKeyframe(event: eventWithTime): boolean {
  const payload = (event.data as { payload?: { keyframe?: boolean } }).payload;
  return payload?.keyframe === true;
}

export class SegmentController implements StallController {
  private segments = new Map<number, SegmentInfo>();
  private stallTarget: { offset: number; play: boolean } | null = null;

  constructor(
    private replayer: Replayer,
    private fetchEvents: SegmentFetchFn,
    private bufferAheadMs = 30_000,
  ) {
    this.replayer.timer.armNearEnd(this.bufferAheadMs, this.onPrefetchAlarm);
    this.replayer.on(ReplayerEvents.StallStart, this.onStallStart);
    this.replayer.on(ReplayerEvents.StallEnd, this.onStallEnd);
  }

  public isStallMarker(event: eventWithTime): boolean {
    return isSegmentStartMarker(event);
  }

  private timestampFromOffset(timeOffset: number): number {
    return this.replayer.service.state.context.events[0].timestamp + timeOffset;
  }

  private warn(...args: Parameters<typeof console.warn>) {
    if (!this.replayer.config.showWarning) return;
    this.replayer.config.logger.warn(...args);
  }

  public registerEvent(event: eventWithTime) {
    if (isSegmentStartMarker(event)) {
      const segmentStart = markerSegmentStart(event);
      if (!this.segments.has(segmentStart)) {
        this.segments.set(segmentStart, {
          segmentStart,
          keyframe: markerIsKeyframe(event),
          fetched: false,
          fetching: false,
          attempts: 0,
        });
      }
    }
  }

  public stallOnPlay(timeOffset: number): boolean {
    return this.stallIfNeeded(timeOffset, true);
  }

  public stallOnPause(timeOffset: number): boolean {
    return this.stallIfNeeded(timeOffset, false);
  }

  private stallIfNeeded(timeOffset: number, play: boolean): boolean {
    const targetTimestamp = this.timestampFromOffset(timeOffset);
    if (this.neededSegments(targetTimestamp).length === 0) return false;
    this.stallTarget = { offset: timeOffset, play };
    if (this.replayer.service.state.matches('stalled')) {
      this.requestNeededSegments();
    } else {
      this.replayer.service.send({ type: 'STALL' });
    }
    return true;
  }

  private onStallStart = () => {
    if (!this.stallTarget) {
      this.stallTarget = { offset: this.replayer.getCurrentTime(), play: true };
    }
    for (const info of this.segments.values()) {
      info.attempts = 0;
    }
    this.replayer.emit(StallEvents.BufferingStart);
    this.requestNeededSegments();
  };

  private onStallEnd = () => {
    this.stallTarget = null;
    this.replayer.emit(StallEvents.BufferingEnd);
  };

  private onPrefetchAlarm = () => {
    if (!this.replayer.service.state.matches('playing')) return;
    const playhead = this.timestampFromOffset(this.replayer.getCurrentTime());
    const horizon = playhead + this.bufferAheadMs * this.replayer.timer.speed;
    for (const segmentStart of this.sortedSegmentStarts()) {
      if (segmentStart > horizon) break;
      if (segmentStart < playhead) continue;
      this.fetchSegment(segmentStart);
    }
  };

  private requestNeededSegments() {
    if (!this.stallTarget) return;
    const targetTimestamp = this.timestampFromOffset(this.stallTarget.offset);
    const needed = this.neededSegments(targetTimestamp);
    if (needed.length === 0) {
      this.resumeFromStall();
      return;
    }
    const fetchable = needed.filter((segmentStart) =>
      this.canFetch(segmentStart),
    );
    if (fetchable.length === 0 && !this.hasPendingFetches()) {
      this.giveUpStalling();
      return;
    }
    for (const segmentStart of fetchable) {
      this.fetchSegment(segmentStart);
    }
  }

  private giveUpStalling() {
    this.warn('[replayer] buffering aborted: segment fetch failed repeatedly');
    if (this.stallTarget) {
      const targetTimestamp = this.timestampFromOffset(this.stallTarget.offset);
      this.replayer.emit(ReplayerEvents.StallError, {
        segmentStarts: this.neededSegments(targetTimestamp),
      });
    }
    this.replayer.service.send({ type: 'PAUSE' });
  }

  private resumeFromStall() {
    const target = this.stallTarget;
    if (!target) return;
    const targetTimestamp = this.timestampFromOffset(target.offset);
    if (this.neededSegments(targetTimestamp).length > 0) {
      this.requestNeededSegments();
      return;
    }
    if (target.play) {
      this.replayer.play(target.offset);
    } else {
      this.replayer.pause(target.offset);
    }
  }

  private extendSchedule() {
    if (!this.replayer.service.state.matches('playing')) return;
    this.replayer.service.send({ type: 'RESCHEDULE' });
  }

  private fetchSegment(segmentStart: number) {
    if (!this.canFetch(segmentStart)) return;
    if (this.inFlightFetches() >= maxConcurrentFetches) return;
    const info = this.segments.get(segmentStart)!;
    info.attempts += 1;
    info.fetching = true;
    void this.fetchEvents(segmentStart)
      .then(
        (batch) => {
          info.fetching = false;
          if (!this.acceptFetchedBatch(segmentStart, batch)) {
            this.warn('[replayer] empty or out-of-range segment response', {
              segmentStart,
            });
          }
        },
        (error) => {
          info.fetching = false;
          this.warn('[replayer] fetchEvents failed', error);
        },
      )
      .then(() => {
        if (this.replayer.service.state.matches('stalled')) {
          this.resumeFromStall();
        } else if (this.replayer.service.state.matches('playing')) {
          this.extendSchedule();
        }
      });
  }

  private acceptFetchedBatch(
    segmentStart: number,
    batch: Array<eventWithTime | string>,
  ): boolean {
    const events = batch.map((raw) =>
      this.replayer.config.unpackFn
        ? this.replayer.config.unpackFn(raw as string)
        : (raw as eventWithTime),
    );
    if (events.length === 0) {
      return false;
    }
    let frontier: number | null = null;
    let frontierEvent: eventWithTime | null = null;
    const toInject: eventWithTime[] = [];
    for (const event of events) {
      if (isSegmentStartMarker(event)) {
        const cs = markerSegmentStart(event);
        if (cs > segmentStart && (frontier === null || cs > frontier)) {
          frontier = cs;
          frontierEvent = event;
        }
        continue;
      }
      toInject.push(event);
    }
    if (frontierEvent && !this.segments.get(frontier!)?.fetched) {
      toInject.push(frontierEvent);
    }
    toInject.sort((a, b) => a.timestamp - b.timestamp);
    this.replayer.injectEvents(toInject);
    const bound =
      frontier ??
      this.sortedSegmentStarts().find((cs) => cs > segmentStart) ??
      Infinity;
    for (const cs of this.sortedSegmentStarts()) {
      if (cs >= segmentStart && cs < bound) {
        this.segments.get(cs)!.fetched = true;
        this.spliceSegmentMarker(cs);
      }
    }
    return true;
  }

  private spliceSegmentMarker(segmentStart: number) {
    const events = this.replayer.service.state.context.events;
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (
        isSegmentStartMarker(event) &&
        markerSegmentStart(event) === segmentStart
      ) {
        events.splice(i, 1);
        return;
      }
    }
  }

  private neededSegments(targetTimestamp: number): number[] {
    const sorted = this.sortedSegmentStarts();
    const index = this.segmentIndexContaining(sorted, targetTimestamp);
    if (index < 0) return [];
    let keyframe = index;
    while (keyframe > 0 && !this.segments.get(sorted[keyframe])!.keyframe) {
      keyframe--;
    }
    const needed: number[] = [];
    for (let i = keyframe; i <= index; i++) {
      const info = this.segments.get(sorted[i])!;
      if (!info.fetched) needed.push(info.segmentStart);
    }
    return needed;
  }

  private segmentIndexContaining(sorted: number[], timestamp: number): number {
    let start = 0;
    let end = sorted.length - 1;
    let result = -1;
    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      if (sorted[mid] <= timestamp) {
        result = mid;
        start = mid + 1;
      } else {
        end = mid - 1;
      }
    }
    return result;
  }

  private sortedSegmentStarts(): number[] {
    return [...this.segments.keys()].sort((a, b) => a - b);
  }

  private canFetch(segmentStart: number): boolean {
    const info = this.segments.get(segmentStart);
    if (!info || info.fetched || info.fetching) return false;
    return info.attempts < maxSegmentFetchAttempts;
  }

  private inFlightFetches(): number {
    let count = 0;
    for (const info of this.segments.values()) {
      if (info.fetching) count += 1;
    }
    return count;
  }

  private hasPendingFetches(): boolean {
    return this.inFlightFetches() > 0;
  }
}
