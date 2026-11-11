import {
  type eventWithTime,
  type customEvent,
  EventType,
  ReplayerEvents,
  StallEvents,
} from '@rrweb/types';
import type { Replayer, StallController } from '@rrweb/replay';
import type { SegmentFetchFn } from './types';

type SegmentInfo = {
  timestamp: number;
  fetchQuery: string;
  keyframe: boolean;
  fetched: boolean;
  fetching: boolean;
  attempts: number;
};

type SegmentPayload = {
  keyframe?: boolean;
  fetchQuery?: string; // will use the segment start timestamp if omitted
};

type SegmentMarker = customEvent<SegmentPayload> & {
  timestamp: number;
  data: { tag: 'segment-start'; omitFromTimeline: true };
};

const maxSegmentFetchAttempts = 3;
const maxConcurrentFetches = 3;

export function isSegmentStartMarker(
  event: eventWithTime,
): event is SegmentMarker {
  // sent by a server to indicate to request segments from i.e.
  // at what point events become 'missing'
  return event.type === EventType.Custom && event.data.tag === 'segment-start';
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
    return (
      isSegmentStartMarker(event) &&
      !this.segments.get(event.timestamp)?.fetched
    ); // don't stall again if already fetched
  }

  private timestampFromOffset(timeOffset: number): number {
    return this.replayer.events[0].timestamp + timeOffset;
  }

  private warn(...args: unknown[]) {
    if (!this.replayer.config.showWarning) return;
    this.replayer.config.logger.warn(...args);
  }

  public registerEvent(event: eventWithTime) {
    if (isSegmentStartMarker(event)) {
      this.registerSegmentMarker(event);
    }
  }

  private registerSegmentMarker(segmentMarker: SegmentMarker) {
    const {
      timestamp,
      data: { payload },
    } = segmentMarker;
    if (!this.segments.has(timestamp)) {
      const fetchQuery =
        typeof payload?.fetchQuery === 'string'
          ? payload.fetchQuery
          : `from=${timestamp}`;
      this.segments.set(timestamp, {
        timestamp,
        fetchQuery,
        keyframe: payload?.keyframe === true,
        fetched: false,
        fetching: false,
        attempts: 0,
      });
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
    const needed = this.neededSegments(targetTimestamp);
    if (needed.length === 0) return false;
    this.stallTarget = { offset: timeOffset, play };
    if (this.replayer.isStalled()) {
      this.requestSegments(needed);
    } else {
      // synchronously picked up by onStallStart
      this.replayer.stall();
    }
    return true;
  }

  private onStallStart = () => {
    if (!this.stallTarget) {
      this.stallTarget = { offset: this.replayer.getCurrentTime(), play: true };
    }
    // refresh fetch limits when we re-enter a stall e.g.
    // user clicking around timeline after earlier failure
    for (const seg of this.segments.values()) {
      seg.attempts = 0;
    }
    this.replayer.emit(StallEvents.BufferingStart);
    const targetTimestamp = this.timestampFromOffset(this.stallTarget.offset);
    const needed = this.neededSegments(targetTimestamp);
    this.requestSegments(needed);
  };

  private onStallEnd = () => {
    this.stallTarget = null;
    this.replayer.emit(StallEvents.BufferingEnd);
  };

  private onPrefetchAlarm = () => {
    if (!this.replayer.isPlaying()) return;
    const playhead = this.timestampFromOffset(this.replayer.getCurrentTime());
    const horizon = playhead + this.bufferAheadMs * this.replayer.timer.speed;
    for (const seg of this.segments.values()) {
      if (playhead <= seg.timestamp && seg.timestamp <= horizon)
        this.fetchSegment(seg);
    }
  };

  private requestSegments(segments: SegmentInfo[]) {
    if (segments.length === 0) {
      this.resumeFromStall();
      return;
    }
    const fetchable = segments.filter(this.canFetch);
    if (fetchable.length === 0 && !this.hasPendingFetches()) {
      this.giveUpStalling();
      return;
    }
    fetchable.map(this.fetchSegment);
  }

  private giveUpStalling() {
    this.warn('[replayer] buffering aborted: segment fetch failed repeatedly');
    if (this.stallTarget) {
      const targetTimestamp = this.timestampFromOffset(this.stallTarget.offset);
      this.replayer.emit(ReplayerEvents.StallError, {
        segmentStarts: this.neededSegments(targetTimestamp).map(
          (info) => info.timestamp,
        ),
      });
    }
    this.replayer.abortStall();
  }

  private resumeFromStall() {
    const target = this.stallTarget;
    if (!target) return;
    const targetTimestamp = this.timestampFromOffset(target.offset);
    const needed = this.neededSegments(targetTimestamp);
    if (needed.length > 0) {
      this.requestSegments(needed);
      return;
    }
    if (target.play) {
      this.replayer.play(target.offset);
    } else {
      this.replayer.pause(target.offset);
    }
  }

  private extendSchedule() {
    if (!this.replayer.isPlaying()) return;
    this.replayer.reschedule();
  }

  private fetchSegment = (seg: SegmentInfo) => {
    if (!this.canFetch(seg)) return;
    if (this.inFlightFetches() >= maxConcurrentFetches) return;
    seg.attempts += 1;
    seg.fetching = true;
    const { fetchQuery } = seg;
    void this.fetchEvents(fetchQuery)
      .then(
        (batch) => {
          seg.fetching = false;
          if (!this.acceptFetchedBatch(seg, batch)) {
            this.warn('[replayer] empty or out-of-range segment response', {
              fetchQuery,
            });
          }
        },
        (error) => {
          seg.fetching = false;
          this.warn('[replayer] fetchEvents failed', error);
        },
      )
      .then(() => {
        if (this.replayer.isStalled()) {
          this.resumeFromStall();
        } else if (this.replayer.isPlaying()) {
          this.extendSchedule();
        }
      });
  };

  private acceptFetchedBatch(
    seg: SegmentInfo,
    batch: Array<eventWithTime | string>,
  ): boolean {
    const newEvents = batch.map((raw) =>
      this.replayer.config.unpackFn
        ? this.replayer.config.unpackFn(raw as string)
        : (raw as eventWithTime),
    );
    if (newEvents.length === 0) {
      // retry later
      return false;
    }
    seg.fetched = true;
    const fetchCoverage = {
      from: seg.timestamp,
      before: seg.timestamp + 1,
    };
    const toInject: eventWithTime[] = [];
    newEvents.sort((a, b) => a.timestamp - b.timestamp);
    let lastIsSegmentMarker = false;
    for (const newEvent of newEvents) {
      if (isSegmentStartMarker(newEvent)) {
        const cs = newEvent.timestamp;
        if (!lastIsSegmentMarker) {
          fetchCoverage.before = cs;
        }
        this.markFetchedInRange(fetchCoverage);
        fetchCoverage.from = cs;
        if (this.segments.get(cs)?.fetched) {
          // marker already present and fetched
          lastIsSegmentMarker = false;
          continue;
        }
        lastIsSegmentMarker = true;
      } else {
        if (lastIsSegmentMarker) {
          // reject a segment marker followed by events
          // these are deemed 'fetched' so we don't inject
          // the stall marker
          toInject.pop();
        }
        lastIsSegmentMarker = false;
        if (newEvent.timestamp < fetchCoverage.from) {
          // warning? returned an event before requested time
          fetchCoverage.from = newEvent.timestamp;
        } else if (fetchCoverage.before < newEvent.timestamp) {
          fetchCoverage.before = newEvent.timestamp;
        }
      }
      toInject.push(newEvent);
    }
    this.markFetchedInRange(fetchCoverage);
    this.replayer.injectEvents(toInject); // deduplicates in case of overlapping fetches
    return true;
  }

  private markFetchedInRange(fetchCoverage: { from: number; before: number }) {
    const { from, before } = fetchCoverage;
    for (const seg of this.segments.values()) {
      if (from <= seg.timestamp && seg.timestamp < before) {
        seg.fetched = true;
        // we could also remove the marker from replayer.service.state.context.events
        // if casting the custom event after it's been fetched becomes a problem
      }
    }
  }

  private neededSegments(targetTimestamp: number): SegmentInfo[] {
    const priors: SegmentInfo[] = [];
    let lastKeyframeTs = 0;
    for (const seg of this.segments.values()) {
      if (seg.timestamp <= targetTimestamp) {
        if (
          seg.keyframe &&
          (!lastKeyframeTs || lastKeyframeTs < seg.timestamp)
        ) {
          lastKeyframeTs = seg.timestamp;
        }
        if (!seg.fetched) {
          priors.push(seg);
        }
      }
    }
    return priors.filter((p) => lastKeyframeTs <= p.timestamp);
  }

  public canFetch = (seg: SegmentInfo): boolean => {
    if (seg.fetched || seg.fetching) return false;
    return seg.attempts < maxSegmentFetchAttempts;
  };

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
