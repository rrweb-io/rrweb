import type { Page } from 'playwright';
import { EventType, IncrementalSource, type eventWithTime } from '@rrweb/types';
import type { PageWindow } from './frames';

/*
 * Spotting stretches where the picture can't change, so the capture loop can
 * render one frame and repeat it instead of drawing every frame.
 */

// How long the picture keeps changing after an event without another one:
// the mouse tail fades, and the replayer scrolls smoothly.
const MOUSE_TAIL_MS = 500;
const SMOOTH_SCROLL_MS = 1000;

type Status = {
  finished?: boolean;
  current: number;
  speed: number;
  busy: boolean;
};

export function readStatus(page: Page) {
  return page.evaluate((): Status => {
    const w = window as unknown as PageWindow;
    const replayer = w.replayer.getReplayer();
    const doc = document.querySelector('iframe')?.contentDocument;
    const media = doc ? Array.from(doc.querySelectorAll('video, audio')) : [];
    return {
      finished: w.__finished,
      current: replayer.getCurrentTime(),
      speed: replayer.speedService.state.context.timer.speed,
      // Things that change the picture without a replay event.
      busy:
        [document, doc].some((d) =>
          d?.getAnimations().some((a) => a.playState === 'running'),
        ) || media.some((m) => !(m as HTMLMediaElement).paused),
    };
  });
}

/**
 * When each replayer action is due, in ms from the start, and how long after
 * it the picture may keep moving.
 */
export function actionTimes(events: eventWithTime[]) {
  const start = events[0].timestamp;
  const all: number[] = [];
  const settling: Array<[number, number]> = [];
  for (const event of events) {
    const time = event.timestamp - start;
    all.push(time);
    if (
      event.type === EventType.IncrementalSnapshot &&
      event.data.source === IncrementalSource.Scroll
    )
      settling.push([time, SMOOTH_SCROLL_MS]);
    const { positions } = event.data as {
      positions?: { timeOffset: number }[];
    };
    for (const p of positions || []) {
      all.push(time + p.timeOffset);
      settling.push([time + p.timeOffset, MOUSE_TAIL_MS]);
    }
  }
  return { all: all.sort((a, b) => a - b), settling };
}

/**
 * How many frames from `frame` will show the same picture: until the next
 * action is due, if nothing is animating or settling.
 */
export function heldFrames(
  status: Status,
  actions: ReturnType<typeof actionTimes>,
  frame: number,
  time: number,
  fps: number,
) {
  const { current, speed } = status;
  const next = actions.all.find((t) => t > current);
  const settling = actions.settling.some(
    ([t, ms]) => t <= current && (current - t) / speed < ms,
  );
  if (status.busy || settling || next === undefined) return 1;
  const due = time + (next - current) / speed;
  let held = 1;
  while (Math.floor(((frame + held) * 1000) / fps) < due) held++;
  return held;
}
