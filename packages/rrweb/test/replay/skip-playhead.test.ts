// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  EventType,
  IncrementalSource,
  MouseInteractions,
  ReplayerEvents,
} from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';
import { Replayer } from '../../src/replay';

let player: Replayer;
beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
      'setTimeout',
      'clearTimeout',
    ],
  });
});
afterEach(() => {
  player?.destroy();
  vi.useRealTimers();
});

const click = (timestamp: number): eventWithTime => ({
  type: EventType.IncrementalSnapshot,
  timestamp,
  data: {
    source: IncrementalSource.MouseInteraction,
    type: MouseInteractions.Click,
    id: -1,
    x: 1,
    y: 1,
  },
});

const custom = (timestamp: number): eventWithTime => ({
  type: EventType.Custom,
  timestamp,
  data: { tag: 'custom', payload: {} },
});

it('recomputes inactivity on play, seek and tempo changes and holds it through a pause', () => {
  player = new Replayer(
    [click(10000), click(130000), click(131000), click(300000)],
    { skipInactive: true },
  );
  player.play(20000);
  expect(player.speedService.state.value).toBe('skipping');
  player.setConfig({ speed: 2 });
  expect(player.speedService.state.value).toBe('skipping');
  // At 16x the threshold is 160 s, longer than this 120 s gap.
  player.setConfig({ speed: 16 });
  expect(player.speedService.state.value).toBe('normal');
  player.setConfig({ speed: 2 });
  expect(player.speedService.state.value).toBe('skipping');
  player.play(120500);
  expect(player.speedService.state.context.timer.speed).toBe(2);
  player.play(125000);
  expect(player.speedService.state.value).toBe('skipping');
  // An in-place pause freezes the skip and holds the playhead; resuming in
  // the gap keeps skipping.
  player.pause();
  expect(player.speedService.state.value).toBe('skipping');
  const pausedAt = player.getCurrentTime();
  vi.advanceTimersByTime(1000);
  expect(player.getCurrentTime()).toBe(pausedAt);
  player.play(player.getCurrentTime());
  expect(player.speedService.state.value).toBe('skipping');
});

it('keeps an active skip when appended events leave its boundary intact', () => {
  player = new Replayer([click(10000), click(130000)], { skipInactive: true });
  const onSkipStart = vi.fn();
  const onSkipEnd = vi.fn();
  player.on(ReplayerEvents.SkipStart, onSkipStart);
  player.on(ReplayerEvents.SkipEnd, onSkipEnd);
  player.play(20000);

  player.addEvent(custom(60000));

  expect(onSkipStart).toHaveBeenCalledTimes(1);
  expect(onSkipEnd).not.toHaveBeenCalled();

  player.addEvent(click(60000));

  // The skip retargets without returning to normal speed in between.
  expect(onSkipStart).toHaveBeenCalledTimes(2);
  expect(onSkipEnd).not.toHaveBeenCalled();
  expect(player.timer.skipEnd).toBe(30000);
});

it('skips the next gap after a skip lands on an interaction', () => {
  player = new Replayer([click(10000), click(130000), click(250000)], {
    skipInactive: true,
  });
  player.play(119900);
  // 100 ms at twice the speed lands on the click within four frames.
  vi.advanceTimersByTime(64);
  expect(player.getCurrentTime()).toBeGreaterThanOrEqual(120000);
  expect(player.speedService.state.value).toBe('skipping');
  // skipEnd counts from the play position (absolute 129,900).
  expect(player.timer.skipEnd).toBe(250000 - 129900);
});

it('casts every interaction due in a frame before skipping', () => {
  const first = click(10000);
  const second = click(10010);
  player = new Replayer([custom(9000), first, second, click(130000)], {
    skipInactive: true,
  });
  // A cast is reported after its skip decision, so the order shows which
  // cast started the skip: it must be the second click's.
  const order: string[] = [];
  player.on(ReplayerEvents.EventCast, (event) => {
    if (event === first) order.push('first');
    if (event === second) order.push('second');
  });
  player.on(ReplayerEvents.SkipStart, () => order.push('skip'));
  player.play(1000);
  vi.advanceTimersByTime(16);
  expect(order).toEqual(['first', 'skip', 'second']);
  expect(player.speedService.state.value).toBe('skipping');
});

it('skips the gap after interactions that share a timestamp', () => {
  player = new Replayer(
    [custom(9000), click(10000), click(10000), click(130000)],
    { skipInactive: true },
  );
  player.play(1000);
  vi.advanceTimersByTime(16);
  expect(player.speedService.state.value).toBe('skipping');
  expect(player.timer.skipEnd).toBe(130000 - 10000);
});

it('skips up to an unresolved stall marker and stalls exactly on it', () => {
  const marker = custom(11000);
  player = new Replayer([custom(10000), marker, click(3_610_000)], {
    skipInactive: true,
  });
  player.addStallController({
    registerEvent() {},
    isStallMarker: (event) => event === marker,
    stallOnPlay: () => false,
    stallOnPause: () => false,
  });
  player.play(0);
  expect(player.speedService.state.value).toBe('skipping');
  vi.advanceTimersByTime(16);
  expect(player.isStalled()).toBe(true);
  expect(player.getCurrentTime()).toBe(1000);
});

it('stalls at once after seeking past an unresolved stall marker', () => {
  const marker = custom(11000);
  player = new Replayer([custom(10000), marker, click(3_610_000)], {
    skipInactive: true,
  });
  player.addStallController({
    registerEvent() {},
    isStallMarker: (event) => event === marker,
    stallOnPlay: () => false,
    stallOnPause: () => false,
  });
  player.play(10000);
  vi.advanceTimersByTime(16);
  expect(player.isStalled()).toBe(true);
  expect(player.getCurrentTime()).toBeLessThan(10100);
});

it('resumes skipping once playback passes a resolved stall marker', async () => {
  const marker = custom(11000);
  let resolved = false;
  player = new Replayer([custom(10000), marker, click(3_610_000)], {
    skipInactive: true,
  });
  player.addStallController({
    registerEvent() {},
    isStallMarker: (event) => event === marker && !resolved,
    stallOnPlay: () => false,
    stallOnPause: () => false,
  });
  player.play(0);
  resolved = true;
  await vi.advanceTimersByTimeAsync(1100);
  expect(player.isStalled()).toBe(false);
  expect(player.speedService.state.value).toBe('skipping');
});

it('skips toward an interaction appended right after a skip lands', () => {
  player = new Replayer([click(10000), click(130103)], { skipInactive: true });
  player.play(120000);
  vi.advanceTimersByTime(64);
  expect(player.getCurrentTime()).toBeGreaterThanOrEqual(120103);
  player.addEvent(click(250000));
  expect(player.speedService.state.value).toBe('skipping');
});

it('passes a marker resolved early and stalls exactly on the next one', async () => {
  const first = custom(11000);
  const second = custom(12000);
  let firstResolved = false;
  player = new Replayer([custom(10000), first, second, click(3_610_000)], {
    skipInactive: true,
  });
  player.addStallController({
    registerEvent() {},
    isStallMarker: (event) =>
      (event === first && !firstResolved) || event === second,
    stallOnPlay: () => false,
    stallOnPause: () => false,
  });
  player.play(0);
  firstResolved = true;
  await vi.advanceTimersByTimeAsync(48);
  expect(player.isStalled()).toBe(true);
  expect(player.getCurrentTime()).toBe(2000);
});

it('treats a marker removed from the events as resolved', async () => {
  const marker = custom(11000);
  player = new Replayer([custom(10000), marker, click(3_610_000)], {
    skipInactive: true,
  });
  player.addStallController({
    registerEvent() {},
    isStallMarker: (event) => event === marker,
    stallOnPlay: () => false,
    stallOnPause: () => false,
  });
  player.play(0);
  player.events.splice(player.events.indexOf(marker), 1);
  await vi.advanceTimersByTimeAsync(1100);
  expect(player.isStalled()).toBe(false);
  expect(player.speedService.state.value).toBe('skipping');
});

it('lands exactly on the next interaction before advancing at normal speed', () => {
  const interaction = click(130103);
  const afterInteraction = custom(130104);
  player = new Replayer(
    [click(10000), interaction, afterInteraction, custom(131000)],
    { skipInactive: true, speed: 4 },
  );
  const onEventCast = vi.fn();
  player.on(ReplayerEvents.EventCast, onEventCast);
  player.play(120000);
  onEventCast.mockClear();

  vi.advanceTimersByTime(16);

  expect(player.getCurrentTime()).toBe(120103);
  expect(player.timer.speed).toBe(4);
  expect(onEventCast.mock.calls).toEqual([[interaction]]);

  vi.advanceTimersByTime(16);

  expect(player.getCurrentTime()).toBe(120167);
  expect(onEventCast.mock.calls).toEqual([[interaction], [afterInteraction]]);
});

it('does not skip the inactivity after the last interaction', () => {
  player = new Replayer([click(10000), custom(130000)], { skipInactive: true });
  player.play(20000);
  expect(player.speedService.state.value).toBe('normal');
});

it('casts an interaction at the seek position before skipping past it', () => {
  const second = click(130000);
  player = new Replayer([click(10000), second, click(250000)], {
    skipInactive: true,
  });
  const onEventCast = vi.fn();
  player.on(ReplayerEvents.EventCast, onEventCast);
  player.play(120000);
  vi.advanceTimersByTime(16);
  expect(onEventCast).toHaveBeenCalledWith(second);
  expect(player.speedService.state.value).toBe('skipping');
  // The skip now runs from the second click to the third.
  expect(player.timer.skipEnd).toBe(250000 - 130000);
});

it('keeps a seek playing when an earlier skip reaches the recording end', () => {
  player = new Replayer([click(10000), click(130103)], {
    skipInactive: true,
    speed: 4,
  });
  const onFinish = vi.fn();
  player.on(ReplayerEvents.Finish, onFinish);
  player.play(120000);
  vi.advanceTimersByTime(16);
  expect(player.getCurrentTime()).toBe(120103);
  expect(player.timer.speed).toBe(4);

  player.play(20000);
  vi.advanceTimersByTime(51);

  expect(player.service.state.value).toBe('playing');
  expect(player.speedService.state.value).toBe('skipping');
  expect(onFinish).not.toHaveBeenCalled();
});

it('finishes after a late append that does not change the recording end', () => {
  player = new Replayer([click(10000), click(130103)], {
    skipInactive: true,
    speed: 4,
  });
  const onFinish = vi.fn();
  player.on(ReplayerEvents.Finish, onFinish);
  player.play(120000);
  vi.advanceTimersByTime(16);

  player.addEvent(custom(130102));
  vi.advanceTimersByTime(51);

  expect(player.service.state.value).toBe('paused');
  expect(onFinish).toHaveBeenCalledTimes(1);
});

it('keeps normal speed after a scroll that follows the final mouse batch cast', () => {
  const scroll: eventWithTime = {
    type: EventType.IncrementalSnapshot,
    timestamp: 110000,
    data: { source: IncrementalSource.Scroll, id: -1, x: 0, y: 100 },
  };
  const finalBatch: eventWithTime = {
    type: EventType.IncrementalSnapshot,
    timestamp: 125000,
    data: {
      source: IncrementalSource.MouseMove,
      positions: [
        { id: -1, x: 0, y: 0, timeOffset: -20000 },
        { id: -1, x: 5, y: 5, timeOffset: -10000 },
        { id: -1, x: 10, y: 10, timeOffset: 0 },
      ],
    },
  };
  player = new Replayer([custom(10000), scroll, finalBatch], {
    skipInactive: true,
  });
  const onCast = vi.fn();
  const onSkipStart = vi.fn();
  const onFinish = vi.fn();
  player.on(ReplayerEvents.EventCast, onCast);
  player.on(ReplayerEvents.SkipStart, onSkipStart);
  player.on(ReplayerEvents.Finish, onFinish);

  player.play(94000);
  vi.advanceTimersByTime(1200);
  expect(onCast).toHaveBeenCalledWith(finalBatch);
  expect(onCast).not.toHaveBeenCalledWith(scroll);
  expect(player.timer.speed).toBe(1);

  vi.advanceTimersByTime(5500);
  expect(onCast).toHaveBeenCalledWith(scroll);
  expect(onSkipStart).toHaveBeenCalledTimes(1);
  expect(player.timer.speed).toBe(1);
  expect(player.getCurrentTime()).toBeLessThan(105000);
  expect(onFinish).not.toHaveBeenCalled();

  vi.advanceTimersByTime(15000);
  expect(onFinish).toHaveBeenCalledTimes(1);
});

it('stops on a stall marker even when an event is appended after it', () => {
  const marker = custom(11000);
  player = new Replayer([custom(10000), marker, click(3_610_000)], {
    skipInactive: true,
  });
  player.addStallController({
    registerEvent() {},
    isStallMarker: (event) => event === marker,
    stallOnPlay: () => false,
    stallOnPause: () => false,
  });
  player.play(0);
  player.addEvent(custom(20000));
  vi.advanceTimersByTime(16);
  expect(player.isStalled()).toBe(true);
  expect(player.getCurrentTime()).toBe(1000);
});

it('measures the gap from a late interaction applied behind the playhead', () => {
  player = new Replayer([click(10000), click(35000)], { skipInactive: false });
  player.play(20000);
  player.addEvent(click(29000));
  // From 29 s to 35 s is too short to skip; from 10 s it would not be.
  player.setConfig({ skipInactive: true });
  expect(player.speedService.state.value).toBe('normal');
});

it('casts an interaction at the exact seek position before time moves on', () => {
  const later = custom(130001);
  player = new Replayer([click(10000), click(130000), later], {
    skipInactive: true,
    speed: 4,
  });
  const onEventCast = vi.fn();
  player.on(ReplayerEvents.EventCast, onEventCast);
  player.play(120000);
  vi.advanceTimersByTime(16);
  expect(player.getCurrentTime()).toBe(120000);
  expect(onEventCast).not.toHaveBeenCalledWith(later);
  vi.advanceTimersByTime(16);
  expect(onEventCast).toHaveBeenCalledWith(later);
});

it('keeps skipping when the current speed is set again', () => {
  player = new Replayer([click(10000), click(130000)], { skipInactive: true });
  const onSkipStart = vi.fn();
  const onSkipEnd = vi.fn();
  player.on(ReplayerEvents.SkipStart, onSkipStart);
  player.on(ReplayerEvents.SkipEnd, onSkipEnd);
  player.play(20000);
  player.setConfig({ speed: 1 });
  // The same skip resumes without being announced again.
  expect(onSkipStart).toHaveBeenCalledTimes(1);
  expect(onSkipEnd).not.toHaveBeenCalled();
  expect(player.speedService.state.value).toBe('skipping');
  vi.advanceTimersByTime(16);
  expect(player.getCurrentTime()).toBeGreaterThan(20016);
  // A speed whose threshold is longer than this gap ends the skip, which is
  // announced although the speed setting already left the skip state.
  player.setConfig({ speed: 16 });
  expect(player.speedService.state.value).toBe('normal');
  expect(onSkipEnd).toHaveBeenCalledTimes(1);
  expect(onSkipEnd).toHaveBeenCalledWith({ speed: 16 });
});

it('stalls at the seek position when a marker before it holds playback', () => {
  const marker = custom(11000);
  player = new Replayer(
    [custom(10000), marker, click(20000), click(3_610_000)],
    { skipInactive: true },
  );
  player.addStallController({
    registerEvent() {},
    isStallMarker: (event) => event === marker,
    stallOnPlay: () => false,
    stallOnPause: () => false,
  });
  // Seeks past the click at 20 s, which the marker keeps from being applied.
  player.play(20000);
  vi.advanceTimersByTime(16);
  expect(player.isStalled()).toBe(true);
  expect(player.getCurrentTime()).toBe(20000);
});

it('stops on a stall marker at the start of the gap', () => {
  const marker = custom(10000);
  player = new Replayer([custom(10000), marker, click(3_610_000)], {
    skipInactive: true,
  });
  player.addStallController({
    registerEvent() {},
    isStallMarker: (event) => event === marker,
    stallOnPlay: () => false,
    stallOnPause: () => false,
  });
  player.play(0);
  vi.advanceTimersByTime(16);
  expect(player.isStalled()).toBe(true);
  expect(player.getCurrentTime()).toBe(0);
});

it('keeps an interaction after an early mouse batch as the skip boundary', () => {
  const batch: eventWithTime = {
    type: EventType.IncrementalSnapshot,
    timestamp: 130000,
    data: {
      source: IncrementalSource.MouseMove,
      positions: [
        { id: -1, x: 0, y: 0, timeOffset: -1000 },
        { id: -1, x: 5, y: 5, timeOffset: 0 },
      ],
    },
  };
  const tied = click(130000);
  player = new Replayer([click(10000), batch, tied, click(250000)], {
    skipInactive: true,
  });
  let castAt: number | undefined;
  player.on(ReplayerEvents.EventCast, (event) => {
    if (event === tied) castAt = player.getCurrentTime();
  });
  // The batch runs at 129 s; the click at 130 s ends that one-second gap.
  player.play(118900);
  for (let i = 0; i < 200 && castAt === undefined; i++)
    vi.advanceTimersByTime(16);
  expect(castAt).toBeLessThanOrEqual(120016);
});

it('rechecks the skip when a late interaction shrinks the gap', () => {
  player = new Replayer([click(10000), click(35000)], { skipInactive: true });
  player.play(20000);
  expect(player.speedService.state.value).toBe('skipping');
  player.addEvent(click(29000));
  // Six seconds to the click at 35 s is below the threshold.
  expect(player.speedService.state.value).toBe('normal');
});

it('starts the gap at the interaction that ran last before a seek', () => {
  // The batch is stamped after the click but ran before it.
  const batch: eventWithTime = {
    type: EventType.IncrementalSnapshot,
    timestamp: 110100,
    data: {
      source: IncrementalSource.MouseMove,
      positions: [
        { id: -1, x: 0, y: 0, timeOffset: -200 },
        { id: -1, x: 5, y: 5, timeOffset: 0 },
      ],
    },
  };
  player = new Replayer([custom(10000), click(110000), batch, click(250000)], {
    skipInactive: true,
  });
  player.play(110000);
  // From the click at 110 s to the one at 250 s.
  expect(player.speedService.state.value).toBe('skipping');
});

it('ends a skip on the next interaction to run, even when stamped later', () => {
  const batch: eventWithTime = {
    type: EventType.IncrementalSnapshot,
    timestamp: 130100,
    data: {
      source: IncrementalSource.MouseMove,
      positions: [
        { id: -1, x: 0, y: 0, timeOffset: -200 },
        { id: -1, x: 5, y: 5, timeOffset: 0 },
      ],
    },
  };
  player = new Replayer([click(10000), click(130000), batch, click(250000)], {
    skipInactive: true,
  });
  let castAt: number | undefined;
  player.on(ReplayerEvents.EventCast, (event) => {
    if (event === batch) castAt = player.getCurrentTime();
  });
  player.play(20000);
  // The batch runs at 129.9 s, before the click stamped 130 s.
  expect(player.timer.skipEnd).toBe(129900 - 30000);
  for (let i = 0; i < 400 && castAt === undefined; i++)
    vi.advanceTimersByTime(16);
  expect(castAt).toBe(119900);
});

it('stops on a marker stored before an early-running mouse batch', () => {
  const marker = custom(130000);
  const batch: eventWithTime = {
    type: EventType.IncrementalSnapshot,
    timestamp: 130100,
    data: {
      source: IncrementalSource.MouseMove,
      positions: [
        { id: -1, x: 0, y: 0, timeOffset: -200 },
        { id: -1, x: 5, y: 5, timeOffset: 0 },
      ],
    },
  };
  player = new Replayer([custom(10000), marker, batch, click(250000)], {
    skipInactive: true,
  });
  player.addStallController({
    registerEvent() {},
    isStallMarker: (event) => event === marker,
    stallOnPlay: () => false,
    stallOnPause: () => false,
  });
  player.play(20000);
  for (let i = 0; i < 400 && !player.isStalled(); i++)
    vi.advanceTimersByTime(16);
  expect(player.isStalled()).toBe(true);
  expect(player.getCurrentTime()).toBe(120000);
});

it('keeps the latest gap start when an overdue mouse batch casts after a click', () => {
  const batch: eventWithTime = {
    type: EventType.IncrementalSnapshot,
    timestamp: 130100,
    data: {
      source: IncrementalSource.MouseMove,
      positions: [
        { id: -1, x: 0, y: 0, timeOffset: -200 },
        { id: -1, x: 5, y: 5, timeOffset: 0 },
      ],
    },
  };
  player = new Replayer([click(10000), click(130000), batch, click(250000)], {
    skipInactive: true,
  });
  // The playhead lands just after the click at 130 s, which leaves 120 s to
  // the next click. The overdue batch casts first, from 129.9 s.
  player.play(120050);
  vi.advanceTimersByTime(16);
  expect(player.speedService.state.value).toBe('skipping');
});

it('lands on a click before a stall marker that holds an early-running batch', () => {
  const target = click(130000);
  const marker = custom(130050);
  const batch: eventWithTime = {
    type: EventType.IncrementalSnapshot,
    timestamp: 130100,
    data: {
      source: IncrementalSource.MouseMove,
      positions: [
        { id: -1, x: 0, y: 0, timeOffset: -200 },
        { id: -1, x: 5, y: 5, timeOffset: 0 },
      ],
    },
  };
  player = new Replayer([click(10000), target, marker, batch, click(250000)], {
    skipInactive: true,
  });
  player.addStallController({
    registerEvent() {},
    isStallMarker: (event) => event === marker,
    stallOnPlay: () => false,
    stallOnPause: () => false,
  });
  let castAt: number | null = null;
  player.on(ReplayerEvents.EventCast, (event) => {
    if (event === target) castAt = player.getCurrentTime();
  });
  player.play(20000);
  for (let i = 0; i < 400 && castAt === null; i++) vi.advanceTimersByTime(16);
  expect(castAt).toBe(120000);
});

it('keeps normal speed when resuming inside a mouse batch that already ran', () => {
  const batch: eventWithTime = {
    type: EventType.IncrementalSnapshot,
    timestamp: 130100,
    data: {
      source: IncrementalSource.MouseMove,
      positions: [
        { id: -1, x: 0, y: 0, timeOffset: -200 },
        { id: -1, x: 5, y: 5, timeOffset: 0 },
      ],
    },
  };
  player = new Replayer([click(10000), batch, click(135000)], {
    skipInactive: true,
  });
  // Plays from 129.88 s past the batch's first position at 129.9 s.
  player.play(119880);
  vi.advanceTimersByTime(48);
  expect(player.speedService.state.value).toBe('normal');
  player.pause();
  player.play(player.getCurrentTime());
  vi.advanceTimersByTime(16);
  // The next click is 5 s after the batch, under the threshold.
  expect(player.speedService.state.value).toBe('normal');
});

it('stays at normal speed when a SkipStart listener turns skipping off', async () => {
  const marker = custom(11000);
  let resolved = false;
  player = new Replayer([custom(10000), marker, click(3_610_000)], {
    skipInactive: true,
  });
  player.addStallController({
    registerEvent() {},
    isStallMarker: (event) => event === marker && !resolved,
    stallOnPlay: () => false,
    stallOnPause: () => false,
  });
  let starts = 0;
  player.on(ReplayerEvents.SkipStart, () => {
    starts += 1;
    player.setConfig({ skipInactive: false });
  });
  player.play(0);
  expect(starts).toBe(1);
  resolved = true;
  await vi.advanceTimersByTimeAsync(2000);
  expect(player.speedService.state.value).toBe('normal');
  expect(starts).toBe(1);
  expect(player.getCurrentTime()).toBeLessThan(10_000);
});

it('casts an interaction stamped with the first event at its own time', async () => {
  const first = click(10000);
  player = new Replayer([custom(10000), first, click(3_610_000)], {
    skipInactive: true,
  });
  let castAt: number | null = null;
  player.on(ReplayerEvents.EventCast, (event) => {
    if (event === first) castAt = player.getCurrentTime();
  });
  player.play(0);
  await vi.advanceTimersByTimeAsync(16);
  // It runs on the first frame at normal speed, not partway into a skip.
  expect(castAt).not.toBeNull();
  expect(castAt!).toBeLessThanOrEqual(16);
  // The gap after it is skipped.
  await vi.advanceTimersByTimeAsync(32);
  expect(player.speedService.state.value).toBe('skipping');
});

it('treats a late interaction at the first event as applied', async () => {
  player = new Replayer([custom(10000), click(3_610_000)], {
    skipInactive: true,
  });
  player.play(0);
  await vi.advanceTimersByTimeAsync(16);
  expect(player.speedService.state.value).toBe('skipping');
  // Applied at once, since it is stamped behind the playhead.
  player.addEvent(click(10000));
  player.setConfig({ speed: 2 });
  expect(player.speedService.state.value).toBe('skipping');
});

// Moves from 20 s to 20.5 s, then 9.7 s of inactivity to a click at 30.2 s.
const straddlingBatch = (): eventWithTime => ({
  type: EventType.IncrementalSnapshot,
  timestamp: 20500,
  data: {
    source: IncrementalSource.MouseMove,
    positions: [
      { id: -1, x: 0, y: 0, timeOffset: -500 },
      { id: -1, x: 5, y: 5, timeOffset: 0 },
    ],
  },
});

it('measures the gap after a mouse batch from its last sample', () => {
  player = new Replayer([click(15000), straddlingBatch(), click(30200)], {
    skipInactive: true,
  });
  player.play(4900);
  vi.advanceTimersByTime(200);
  // From the batch's first sample the gap would be 10.2 s and skip.
  expect(player.speedService.state.value).toBe('normal');
});

it('measures the gap from the last sample of a batch before a seek', () => {
  player = new Replayer([click(15000), straddlingBatch(), click(30200)], {
    skipInactive: true,
  });
  // Inside the batch, then just after it.
  player.play(5200);
  expect(player.speedService.state.value).toBe('normal');
  player.play(5600);
  expect(player.speedService.state.value).toBe('normal');
});

it('measures the gap from the last sample of a late mouse batch', () => {
  player = new Replayer([click(10000), click(30200)], { skipInactive: true });
  player.play(11000);
  expect(player.speedService.state.value).toBe('skipping');
  player.addEvent(straddlingBatch());
  expect(player.speedService.state.value).toBe('normal');
});
