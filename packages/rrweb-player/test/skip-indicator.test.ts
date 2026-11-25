// @vitest-environment happy-dom
import { EventType, IncrementalSource, MouseInteractions } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';
import { tick } from 'svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Player from '../src/Player.svelte';

// A minute of inactivity ends with a click, then two seconds of playback.
const events: eventWithTime[] = [
  {
    type: EventType.Meta,
    timestamp: 10000,
    data: { href: 'https://example.com', width: 800, height: 400 },
  },
  {
    type: EventType.IncrementalSnapshot,
    timestamp: 70000,
    data: {
      source: IncrementalSource.MouseInteraction,
      type: MouseInteractions.Click,
      id: -1,
      x: 1,
      y: 1,
    },
  },
  {
    type: EventType.Custom,
    timestamp: 72000,
    data: { tag: 'end', payload: {} },
  },
];
let target: HTMLDivElement;
let player: Player;
const indicator = () => target.querySelector('.rr-player__skip-indicator');
const status = () => target.querySelector('.rr-player__skip-status');

function mount(props: Record<string, unknown>) {
  target = document.createElement('div');
  document.body.append(target);
  player = new Player({
    target,
    props: { events, autoPlay: false, skipInactive: true, ...props },
  });
}

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
  player?.$destroy();
  target?.remove();
  vi.useRealTimers();
});

it('shows no skip indicator unless showSkipIndicator is set', async () => {
  mount({});
  await tick();
  player.play();
  await tick();
  expect(player.getReplayer().speedService.state.value).toBe('skipping');
  expect(indicator()).toBeNull();
  expect(status()).toBeNull();
});

it('hides the indicator while the replay is stalled', async () => {
  mount({ showSkipIndicator: true });
  await tick();
  player.play();
  await tick();
  expect(indicator()).not.toBeNull();
  expect(status()?.textContent?.trim()).toBe('Skipping inactivity');
  player.getReplayer().stall();
  await tick();
  expect(indicator()).toBeNull();
  expect(status()?.textContent?.trim()).toBe('');
});

it.each([true, false])(
  'shows the indicator only while a skip plays, with showController=%s',
  async (showController) => {
    mount({ showController, showSkipIndicator: true });
    await tick();
    expect(indicator()).toBeNull();
    // A live region present before the skip, so the announcement is read.
    expect(status()?.getAttribute('role')).toBe('status');
    expect(status()?.textContent?.trim()).toBe('');

    player.play();
    await tick();
    expect(indicator()?.getAttribute('aria-hidden')).toBe('true');
    expect(status()?.textContent?.trim()).toBe('Skipping inactivity');

    vi.advanceTimersByTime(1000);
    player.pause();
    await tick();
    expect(indicator()).toBeNull();
    expect(status()?.textContent?.trim()).toBe('');
    const pausedAt = player.getReplayer().getCurrentTime();
    expect(pausedAt).toBeGreaterThan(0);

    player.play();
    await tick();
    expect(indicator()).not.toBeNull();
    expect(player.getReplayer().getCurrentTime()).toBeGreaterThanOrEqual(
      pausedAt,
    );

    // The skip ends at the click; playback goes on at normal speed.
    vi.advanceTimersByTime(6000);
    await tick();
    const replayer = player.getReplayer();
    expect(replayer.getCurrentTime()).toBeGreaterThanOrEqual(60000);
    expect(replayer.getCurrentTime()).toBeLessThan(62000);
    expect(replayer.service.state.value).toBe('playing');
    expect(indicator()).toBeNull();
    expect(status()?.textContent?.trim()).toBe('');
  },
);

it('shows the indicator again when a stalled skip resumes', async () => {
  mount({ showSkipIndicator: true });
  await tick();
  player.play();
  await tick();
  const replayer = player.getReplayer();
  replayer.stall();
  await tick();
  expect(indicator()).toBeNull();
  replayer.play();
  await tick();
  expect(replayer.speedService.state.value).toBe('skipping');
  expect(indicator()).not.toBeNull();
  expect(status()?.textContent?.trim()).toBe('Skipping inactivity');
});

it('keeps the indicator hidden when the skip changes while paused', async () => {
  mount({ showSkipIndicator: true });
  await tick();
  player.play();
  await tick();
  const replayer = player.getReplayer();
  replayer.pause();
  await tick();
  const onSkipStart = vi.fn();
  replayer.on('skip-start', onSkipStart);
  // A lower cap changes the skip speed, which is announced while paused.
  replayer.setConfig({ maxSpeed: 5 });
  expect(replayer.timer.speed).toBe(5);
  expect(onSkipStart).toHaveBeenCalledTimes(1);
  await tick();
  expect(indicator()).toBeNull();
  expect(status()?.textContent?.trim()).toBe('');
});

it('resumes exactly where a pause during a skip stopped', async () => {
  mount({ showSkipIndicator: true });
  await tick();
  const replayer = player.getReplayer();
  let pausedAt: number | undefined;
  // Pausing as an event is cast, before the controller samples the time for
  // that frame, leaves its time a frame behind.
  replayer.on('event-cast', () => {
    if (pausedAt !== undefined) return;
    player.pause();
    pausedAt = replayer.getCurrentTime();
  });
  player.play();
  for (let i = 0; i < 400 && pausedAt === undefined; i++)
    vi.advanceTimersByTime(16);
  await tick();
  expect(pausedAt).toBeGreaterThan(0);
  player.play();
  expect(replayer.getCurrentTime()).toBe(pausedAt);
});

it('shows the indicator while a live replay catches up', async () => {
  mount({ showSkipIndicator: true });
  await tick();
  const replayer = player.getReplayer();
  replayer.startLive();
  replayer.speedService.send({ type: 'FAST_FORWARD', payload: { speed: 4 } });
  await tick();
  expect(indicator()).not.toBeNull();
  expect(status()?.textContent?.trim()).toBe('Skipping inactivity');
});
