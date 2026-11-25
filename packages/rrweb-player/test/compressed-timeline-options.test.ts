// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import { EventType, IncrementalSource, MouseInteractions } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';
import Player from '../src/Player.svelte';

const start = 1_700_000_000_000;
const custom = (offset: number, tag: string): eventWithTime => ({
  type: EventType.Custom,
  timestamp: start + offset,
  data: { tag, payload: null },
});
const events: eventWithTime[] = [
  {
    type: EventType.Meta,
    timestamp: start,
    data: { href: 'https://example.com', width: 400, height: 240 },
  },
  {
    type: EventType.IncrementalSnapshot,
    timestamp: start + 10_000,
    data: {
      source: IncrementalSource.MouseInteraction,
      type: MouseInteractions.Click,
      id: 1,
      x: 0,
      y: 0,
    },
  },
  custom(30_000, 'Middle'),
  custom(60_000, 'End'),
];

let player: Player;
let target: HTMLElement;
afterEach(() => {
  player?.$destroy();
  target?.remove();
});

it('compresses only when asked and reprojects markers when switching back to linear time', async () => {
  target = document.body.appendChild(document.createElement('div'));
  player = new Player({
    target,
    props: {
      events: [...events],
      autoPlay: false,
      skipInactive: false,
      inactivePeriodThreshold: 15_000,
      features: { timeline: { compressInactive: { maxIdleShare: 0.4 } } },
    },
  });
  await tick();

  const track = target.querySelector<HTMLElement>('.rr-progress')!;
  vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 500, 18),
  );
  const assertPosition = (idleWidth: number, markerPosition: number) => {
    const idle = track.querySelector<HTMLElement>('.rr-inactive-period');
    const marker = track.querySelector<HTMLElement>('[title="Middle"]')!;
    if (idleWidth === 0) expect(idle).toBeNull();
    else expect(parseFloat(idle!.style.width)).toBeCloseTo(idleWidth);
    expect(parseFloat(marker.style.left)).toBeCloseTo(markerPosition);
    track.dispatchEvent(
      new MouseEvent('click', {
        clientX: (markerPosition / 100) * 500,
        bubbles: true,
      }),
    );
    expect(player.getReplayer().getCurrentTime()).toBeCloseTo(30_000);
  };

  assertPosition(40, 76);
  // Without features.timeline the track is linear, as before this option.
  player.$set({ features: {} });
  await tick();
  assertPosition(0, 50);
});

it('keeps the classic linear timeline unless compression is turned on', async () => {
  target = document.body.appendChild(document.createElement('div'));
  player = new Player({
    target,
    props: {
      events: [
        ...events.slice(0, 2),
        { ...events[1], timestamp: start + 40_000 },
        custom(60_000, 'End'),
      ],
      autoPlay: false,
      skipInactive: false,
      inactivePeriodThreshold: 15_000,
    },
  });
  await tick();

  const track = target.querySelector<HTMLElement>('.rr-progress')!;
  expect(track.querySelector('.rr-inactive-period')).toBeNull();
  // The gap from 10 s to 40 s keeps its real share of a 60 s recording.
  const bar = track.querySelector<HTMLElement>('[title="inactive period"]')!;
  expect(bar.style.height).toBe('4px');
  // Positions keep the classic two-decimal percentages.
  expect(bar.style.left).toBe('16.67%');
  expect(bar.style.width).toBe('50.00%');
  const marker = track.querySelector<HTMLElement>('[title="End"]')!;
  expect(marker.style.left).toBe('100.00%');
});

it('keeps the playhead on its moment when earlier events arrive before playback starts', async () => {
  target = document.body.appendChild(document.createElement('div'));
  player = new Player({
    target,
    props: {
      events: [...events],
      autoPlay: false,
      skipInactive: false,
      features: { timeline: { compressInactive: true }, jump: {} },
    },
  });
  await tick();
  const slider = () =>
    target.querySelector('[aria-label="Playback position"]')!;
  expect(slider().getAttribute('aria-valuenow')).toBe('0');
  player.addEvent(custom(-2000, 'Earlier'));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await tick();
  expect(slider().getAttribute('aria-valuenow')).toBe('2000');
  // Jumps count from that moment too.
  player.jump('forward');
  expect(player.getReplayer().getCurrentTime()).toBe(12000);
});

it('jumps and plays from the playhead moment right after earlier events arrive', async () => {
  const mountPrepended = async () => {
    player?.$destroy();
    target?.remove();
    target = document.body.appendChild(document.createElement('div'));
    player = new Player({
      target,
      props: {
        events: [...events],
        autoPlay: false,
        skipInactive: false,
        features: { timeline: { compressInactive: true }, jump: {} },
      },
    });
    await tick();
    // No frame passes, so the timeline has not caught up yet.
    player.addEvent(custom(-2000, 'Earlier'));
  };
  await mountPrepended();
  player.jump('forward');
  expect(player.getReplayer().getCurrentTime()).toBe(12000);
  await mountPrepended();
  player.play();
  expect(player.getReplayer().getCurrentTime()).toBeGreaterThanOrEqual(2000);
});

it('keeps the caption of the playhead moment when earlier events arrive', async () => {
  const caption = (offset: number, text: string) =>
    ({
      type: EventType.Annotation,
      timestamp: start + offset,
      data: { type: 'caption', text },
    } as eventWithTime);
  target = document.body.appendChild(document.createElement('div'));
  player = new Player({
    target,
    props: {
      events: [events[0], caption(0, 'Start caption'), ...events.slice(1)],
      autoPlay: false,
      skipInactive: false,
      features: { timeline: { compressInactive: true } },
    },
  });
  await tick();
  player.addEvent(caption(-2000, 'Earlier caption'));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await tick();
  expect(target.querySelector('.rr-player__caption')?.textContent).toBe(
    'Start caption',
  );
});

it('keeps a seek made before the timeline catches up with earlier events', async () => {
  target = document.body.appendChild(document.createElement('div'));
  player = new Player({
    target,
    props: {
      events: [...events],
      autoPlay: false,
      skipInactive: false,
      features: { timeline: { compressInactive: true } },
    },
  });
  await tick();
  player.addEvent(custom(-2000, 'Earlier'));
  player.goto(5000, false);
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await tick();
  expect(
    target
      .querySelector('[aria-label="Playback position"]')!
      .getAttribute('aria-valuenow'),
  ).toBe('5000');
});

it('previews where a click on the timeline seeks, only when asked', async () => {
  const mountWith = async (features: Record<string, unknown>) => {
    player?.$destroy();
    target?.remove();
    target = document.body.appendChild(document.createElement('div'));
    player = new Player({
      target,
      props: {
        events: [...events],
        autoPlay: false,
        skipInactive: false,
        features,
      },
    });
    await tick();
    const track = target.querySelector<HTMLElement>('.rr-progress')!;
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 600, 12),
    );
    return track;
  };
  const move = (track: HTMLElement, pointerType = 'mouse') =>
    track.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 150,
        pointerType,
        bubbles: true,
      }),
    );
  const label = () =>
    target.querySelector('.rr-seek-preview__box')?.textContent ?? null;

  const listen = vi.spyOn(HTMLElement.prototype, 'addEventListener');
  let track = await mountWith({ timeline: { compressInactive: true } });
  expect(listen.mock.calls.some(([type]) => type === 'pointermove')).toBe(
    false,
  );
  listen.mockRestore();
  move(track);
  await tick();
  expect(label()).toBeNull();

  track = await mountWith({
    timeline: { compressInactive: true, seekPreview: true },
  });
  move(track);
  await tick();
  const shown = label();
  expect(shown).not.toBeNull();
  track.dispatchEvent(new MouseEvent('click', { clientX: 150, bubbles: true }));
  const seconds = Math.floor(player.getReplayer().getCurrentTime() / 1000);
  expect(shown).toBe(
    `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
      seconds % 60,
    ).padStart(2, '0')}`,
  );

  track.dispatchEvent(new PointerEvent('pointerleave'));
  await tick();
  expect(label()).toBeNull();
  move(track, 'touch');
  await tick();
  expect(label()).toBeNull();
});

it('hatches idle bands in inactiveColor, or in the theme with the toolbar', async () => {
  const hatch = async (features: Record<string, unknown>) => {
    player?.$destroy();
    target?.remove();
    target = document.body.appendChild(document.createElement('div'));
    player = new Player({
      target,
      props: {
        events: [...events],
        autoPlay: false,
        skipInactive: false,
        inactiveColor: '#123456',
        features,
      },
    });
    await tick();
    return target.querySelector<HTMLElement>('.rr-inactive-period')!;
  };
  expect(
    (await hatch({ timeline: { compressInactive: true } })).style.color,
  ).not.toBe('');
  expect(
    (await hatch({ timeline: { compressInactive: true }, toolbar: true })).style
      .color,
  ).toBe('');
});

it('keeps the seek preview true to the timeline when its mapping changes, and off markers', async () => {
  target = document.body.appendChild(document.createElement('div'));
  player = new Player({
    target,
    props: {
      events: [
        ...events,
        {
          type: EventType.Annotation,
          timestamp: start + 30_000,
          data: { type: 'timelineMarker', text: 'A timeline note' },
        } as eventWithTime,
      ].sort((a, b) => a.timestamp - b.timestamp),
      autoPlay: false,
      skipInactive: false,
      features: { timeline: { seekPreview: true } },
    },
  });
  await tick();
  const track = target.querySelector<HTMLElement>('.rr-progress')!;
  vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 600, 12),
  );
  const label = () =>
    target.querySelector('.rr-seek-preview__box')?.textContent ?? null;
  track.dispatchEvent(
    new PointerEvent('pointermove', {
      clientX: 300,
      pointerType: 'mouse',
      bubbles: true,
    }),
  );
  await tick();
  expect(label()).toBe('00:30');

  // Compression changes which moment sits under the same pointer.
  player.$set({
    features: { timeline: { compressInactive: true, seekPreview: true } },
  });
  await tick();
  const shown = label();
  track.dispatchEvent(new MouseEvent('click', { clientX: 300, bubbles: true }));
  const seconds = Math.floor(player.getReplayer().getCurrentTime() / 1000);
  expect(shown).toBe(`00:${String(seconds).padStart(2, '0')}`);
  expect(shown).not.toBe('00:30');

  const marker = target.querySelector<HTMLElement>(
    '.rr-custom-event-container',
  );
  expect(marker).not.toBeNull();
  marker!.dispatchEvent(
    new PointerEvent('pointermove', {
      clientX: 310,
      pointerType: 'mouse',
      bubbles: true,
    }),
  );
  await tick();
  expect(label()).toBeNull();
});

it('drops the seek preview when the controller is hidden and shown again', async () => {
  target = document.body.appendChild(document.createElement('div'));
  player = new Player({
    target,
    props: {
      events: [...events],
      autoPlay: false,
      skipInactive: false,
      features: { timeline: { seekPreview: true } },
    },
  });
  await tick();
  const track = () => target.querySelector<HTMLElement>('.rr-progress')!;
  vi.spyOn(track(), 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 600, 12),
  );
  track().dispatchEvent(
    new PointerEvent('pointermove', {
      clientX: 300,
      pointerType: 'mouse',
      bubbles: true,
    }),
  );
  await tick();
  expect(target.querySelector('.rr-seek-preview__box')).not.toBeNull();
  player.$set({ showController: false });
  await tick();
  player.$set({ showController: true });
  await tick();
  expect(target.querySelector('.rr-seek-preview__box')).toBeNull();
});

it('drops the seek preview when the track resizes and keeps its box on the track', async () => {
  let resized: (() => void) | undefined;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resized = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  try {
    target = document.body.appendChild(document.createElement('div'));
    player = new Player({
      target,
      props: {
        events: [...events],
        autoPlay: false,
        skipInactive: false,
        features: { timeline: { seekPreview: true } },
      },
    });
    await tick();
    const track = target.querySelector<HTMLElement>('.rr-progress')!;
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 600, 12),
    );
    const box = () =>
      target.querySelector<HTMLElement>('.rr-seek-preview__box');
    const move = (clientX: number) =>
      track.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX,
          pointerType: 'mouse',
          bubbles: true,
        }),
      );
    const anchor = () =>
      target.querySelector<HTMLElement>('.rr-seek-preview')!.style.left;
    move(0);
    await tick();
    expect([anchor(), box()!.style.transform]).toEqual([
      '0%',
      'translateX(0%)',
    ]);
    move(150);
    await tick();
    expect([anchor(), box()!.style.transform]).toEqual([
      '25%',
      'translateX(-25%)',
    ]);
    move(600);
    await tick();
    expect([anchor(), box()!.style.transform]).toEqual([
      '100%',
      'translateX(-100%)',
    ]);
    resized!();
    await tick();
    expect(box()).toBeNull();
  } finally {
    vi.unstubAllGlobals();
  }
});

it('shows the seek preview exactly while a click on the track seeks', async () => {
  target = document.body.appendChild(document.createElement('div'));
  player = new Player({
    target,
    props: {
      events: [...events],
      autoPlay: false,
      skipInactive: false,
      features: { timeline: { seekPreview: true } },
    },
  });
  await tick();
  const track = target.querySelector<HTMLElement>('.rr-progress')!;
  vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 600, 12),
  );
  const replayer = player.getReplayer();
  const previewThenClick = async () => {
    replayer.pause(0);
    track.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 300, pointerType: 'mouse' }),
    );
    await tick();
    const previewed = target.querySelector('.rr-seek-preview') !== null;
    track.dispatchEvent(new MouseEvent('click', { clientX: 300 }));
    await tick();
    return { previewed, seeked: replayer.getCurrentTime() > 0 };
  };

  // Not skipping: the line shows and the click seeks.
  expect(await previewThenClick()).toEqual({ previewed: true, seeked: true });

  // While skipping, the line and the click agree, whichever way the
  // track goes.
  replayer.speedService.send({ type: 'FAST_FORWARD', payload: { speed: 5 } });
  await tick();
  const skipping = await previewThenClick();
  expect(skipping.previewed).toBe(skipping.seeked);
});

it('shows the seek line without its time when time is off', async () => {
  target = document.body.appendChild(document.createElement('div'));
  player = new Player({
    target,
    props: {
      events,
      autoPlay: false,
      features: { timeline: { seekPreview: { time: false } } },
    },
  });
  await tick();
  const track = target.querySelector<HTMLElement>('.rr-progress')!;
  vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 600, 12),
  );
  const hover = async () => {
    track.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 300,
        pointerType: 'mouse',
        bubbles: true,
      }),
    );
    await tick();
    return [
      !!target.querySelector('.rr-seek-preview'),
      target.querySelector('.rr-seek-preview__box')?.textContent ?? null,
    ];
  };
  const seen = [await hover()];
  player.$set({ features: { timeline: { seekPreview: {} } } });
  await tick();
  seen.push(await hover());
  expect(seen).toEqual([
    [true, null],
    [true, '00:30'],
  ]);
});
