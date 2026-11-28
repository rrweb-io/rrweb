// @vitest-environment happy-dom
import { EventType, IncrementalSource, MouseInteractions } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';
import { afterEach, expect, it } from 'vitest';
import { Replayer } from '../../src/replay';
import { adaptiveSkipSpeed } from '../../src/replay/inactivity';

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
// One minute of inactivity before a click.
const events: eventWithTime[] = [
  {
    type: EventType.Custom,
    timestamp: 10000,
    data: { tag: 'start', payload: {} },
  },
  click(70000),
];

let player: Replayer;
afterEach(() => player?.destroy());

it('scales the skip duration with gap length and tempo within the cap', () => {
  expect(adaptiveSkipSpeed(10000, 1, 1000)).toBe(10);
  expect(20000 / adaptiveSkipSpeed(20000, 1, 1000)).toBe(1250);
  expect(5120000 / adaptiveSkipSpeed(5120000, 1, 2000)).toBe(3000);
  expect(adaptiveSkipSpeed(60000, 2, 1000)).toBe(
    2 * adaptiveSkipSpeed(60000, 1, 1000),
  );
  expect(adaptiveSkipSpeed(1500000, 1, 360)).toBe(360);
});

it('keeps the classic skip rate unless adaptiveSkip is set', () => {
  player = new Replayer(events, { skipInactive: true });
  player.play();
  expect(player.timer.speed).toBe(12);
});

it('switches the active skip between the classic and adaptive rates', () => {
  player = new Replayer(events, { skipInactive: true });
  player.play();
  player.setConfig({ adaptiveSkip: true });
  expect(player.timer.speed).toBe(adaptiveSkipSpeed(60000, 1, 360));
  expect(player.timer.speed).toBeGreaterThan(12);
  player.setConfig({ adaptiveSkip: false });
  expect(player.timer.speed).toBe(12);
});

it('keeps the adaptive rate of the whole gap after a seek into it', () => {
  player = new Replayer(events, { skipInactive: true, adaptiveSkip: true });
  player.play(30000);
  expect(player.timer.speed).toBe(adaptiveSkipSpeed(60000, 1, 360));
});

it('applies a changed cap to the adaptive skip at the playhead', () => {
  player = new Replayer(events, {
    skipInactive: true,
    adaptiveSkip: true,
    maxSpeed: 20,
  });
  player.play();
  expect(player.timer.speed).toBe(20);
  const skipEvents: string[] = [];
  player.on('skip-start', () => skipEvents.push('start'));
  player.on('skip-end', () => skipEvents.push('end'));

  player.setConfig({ maxSpeed: 20 });
  expect(skipEvents).toHaveLength(0);
  player.setConfig({ maxSpeed: 5 });
  expect(player.timer.speed).toBe(5);
  player.setConfig({ maxSpeed: 1 });
  expect(player.timer.speed).toBe(1);
  player.setConfig({ maxSpeed: 15 });
  expect(player.timer.speed).toBe(15);
});
