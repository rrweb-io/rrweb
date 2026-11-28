// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import { EventType, IncrementalSource, MouseInteractions } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';
import Player from '../src/Player.svelte';
import type { PlayerFeatures, PlayerIconContext } from '../src/features';

const start = 1_700_000_000_000;
const events: eventWithTime[] = [
  {
    type: EventType.Meta,
    timestamp: start,
    data: { href: 'https://example.com', width: 400, height: 240 },
  },
  {
    type: EventType.IncrementalSnapshot,
    timestamp: start + 1000,
    data: {
      source: IncrementalSource.Input,
      id: 1,
      text: 'Example',
      isChecked: false,
    },
  },
  {
    type: EventType.IncrementalSnapshot,
    timestamp: start + 2000,
    data: {
      source: IncrementalSource.MouseInteraction,
      type: MouseInteractions.Click,
      id: 1,
      x: 0,
      y: 0,
    },
  },
  {
    type: EventType.Custom,
    timestamp: start + 4000,
    data: { tag: 'End', payload: null },
  },
];

let player: Player;
let target: HTMLElement;
async function mount(
  features: PlayerFeatures,
  inactivePeriodThreshold?: number,
  recording: eventWithTime[] = events,
) {
  target = document.body.appendChild(document.createElement('div'));
  player = new Player({
    target,
    props: {
      events: [...recording],
      autoPlay: false,
      skipInactive: false,
      ...(inactivePeriodThreshold !== undefined && { inactivePeriodThreshold }),
      features,
    },
  });
  await tick();
}
const graph = () => target.querySelector<HTMLButtonElement>('.rr-activity');
const trigger = () =>
  target.querySelector<HTMLButtonElement>('[aria-label="Timeline activity"]');
const getSwitch = (text: string) =>
  target.querySelector<HTMLInputElement>(
    `input[role="switch"][aria-label="${text}"]`,
  );
const layer = (name: string) => target.querySelector(`[data-layer="${name}"]`);

afterEach(() => {
  player?.$destroy();
  target?.remove();
});

it('draws no activity graph unless the host turns it on', async () => {
  await mount({ toolbar: true });
  expect(graph()).toBeNull();
  expect(trigger()).toBeNull();
});

it('adds no pointer tracking for the graph unless it is on', async () => {
  const listen = vi.spyOn(HTMLElement.prototype, 'addEventListener');
  try {
    await mount({ toolbar: true });
    expect(listen.mock.calls.some(([type]) => type === 'pointermove')).toBe(
      false,
    );
  } finally {
    listen.mockRestore();
  }
});

it('leaves out the activity panel when the host turns that control off', async () => {
  target = document.body.appendChild(document.createElement('div'));
  player = new Player({
    target,
    props: {
      events: [...events],
      autoPlay: false,
      skipInactive: false,
      features: { toolbar: true, timeline: { activityGraph: true } },
      controls: { activityGraph: false },
    },
  });
  await tick();
  expect(trigger()).toBeNull();
  expect(graph()).not.toBeNull();
});

it('draws activity that starts an idle stretch', async () => {
  target = document.body.appendChild(document.createElement('div'));
  player = new Player({
    target,
    props: {
      events: [
        events[0],
        { ...events[1], timestamp: start + 15000 },
        { ...events[3], timestamp: start + 30000 },
      ],
      autoPlay: false,
      skipInactive: false,
      features: { timeline: { activityGraph: true } },
    },
  });
  await tick();
  expect(graph()).not.toBeNull();
  expect(layer('inputs')).not.toBeNull();
});

it('does not seek from the graph while skipping inactivity', async () => {
  await mount({ timeline: { activityGraph: true } });
  player.getReplayer().speedService.send({
    type: 'FAST_FORWARD',
    payload: { speed: 8 },
  });
  await tick();
  expect(graph()?.disabled).toBe(true);
});

it('does not seek from the graph during live replay', async () => {
  await mount({ timeline: { activityGraph: true } });
  player.getReplayer().startLive();
  await tick();
  expect(graph()?.disabled).toBe(true);
});

it('limits the graph and its panel to the allowed layers and keeps viewer choices', async () => {
  await mount({
    toolbar: true,
    timeline: { activityGraph: { layers: ['inputs', 'clicks'] } },
  });
  expect(graph()).not.toBeNull();
  expect(layer('inputs')).not.toBeNull();
  expect(layer('clicks')).not.toBeNull();

  trigger()!.click();
  await tick();
  expect(getSwitch('Input events')).not.toBeNull();
  expect(getSwitch('Clicks')).not.toBeNull();
  expect(getSwitch('Scroll')).toBeNull();
  expect(getSwitch('Mouse movement')).toBeNull();

  getSwitch('Input events')!.click();
  await tick();
  expect(layer('inputs')).toBeNull();
  expect(layer('clicks')).not.toBeNull();

  // Turning the whole graph off and on again keeps the layer choice.
  getSwitch('Activity graph')!.click();
  await tick();
  expect(graph()).toBeNull();
  getSwitch('Activity graph')!.click();
  await tick();
  expect(layer('inputs')).toBeNull();
  expect(layer('clicks')).not.toBeNull();
});

it('marks a move to a new URL with a dot, also with no other activity', async () => {
  const pages: eventWithTime[] = [
    events[0],
    {
      type: EventType.Meta,
      timestamp: start + 2000,
      data: { href: 'https://example.com/next', width: 400, height: 240 },
    },
    events[3],
  ];
  await mount(
    {
      toolbar: true,
      timeline: { activityGraph: { layers: ['navigation', 'clicks'] } },
    },
    undefined,
    pages,
  );
  const line = layer('navigation');
  expect(line).not.toBeNull();
  expect(parseFloat((line as HTMLElement).style.left)).toBeCloseTo(50);
  expect(layer('clicks')).toBeNull();

  trigger()!.click();
  await tick();
  getSwitch('Page changes')!.click();
  await tick();
  // With its only layer hidden, the graph has nothing left to draw.
  expect(graph()).toBeNull();
});

it('leaves navigation out unless the host allows it', async () => {
  const pages: eventWithTime[] = [
    ...events.slice(0, 3),
    {
      type: EventType.Meta,
      timestamp: start + 3000,
      data: { href: 'https://example.com/next', width: 400, height: 240 },
    },
    events[3],
  ];
  await mount(
    { toolbar: true, timeline: { activityGraph: { layers: ['clicks'] } } },
    undefined,
    pages,
  );
  expect(layer('clicks')).not.toBeNull();
  expect(layer('navigation')).toBeNull();
  trigger()!.click();
  await tick();
  expect(getSwitch('Page changes')).toBeNull();
});

it('draws host icons for the click and page change marks with the toolbar only', async () => {
  const pages: eventWithTime[] = [
    ...events.slice(0, 3),
    {
      type: EventType.Meta,
      timestamp: start + 3000,
      data: { href: 'https://example.com/next', width: 400, height: 240 },
    },
    events[3],
  ];
  const icon = ({ name, document: doc }: PlayerIconContext) => {
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('data-icon', name);
    return svg;
  };
  target = document.body.appendChild(document.createElement('div'));
  player = new Player({
    target,
    props: {
      events: pages,
      autoPlay: false,
      features: { toolbar: true, timeline: { activityGraph: true } },
      icons: { click: icon, navigation: icon },
    },
  });
  await tick();
  // Each mark is the host's icon, placed at its time.
  const click = layer('clicks') as HTMLElement;
  expect(click.querySelector('svg[data-icon="click"]')).not.toBeNull();
  expect(parseFloat(click.style.left)).toBeCloseTo(50);
  expect(graph()!.querySelector('line[data-layer="clicks"]')).toBeNull();
  const page = layer('navigation') as HTMLElement;
  expect(page.querySelector('svg[data-icon="navigation"]')).not.toBeNull();
  expect(page.querySelector('.rr-activity__dot')).toBeNull();
  expect(parseFloat(page.style.left)).toBeCloseTo(75);
  // The panel's swatches match the marks.
  trigger()!.click();
  await tick();
  for (const name of ['click', 'navigation'])
    expect(
      target.querySelector(`.rr-swatch svg[data-icon="${name}"]`),
    ).not.toBeNull();

  // Without the toolbar the built-in marks stay, as for the other icons.
  player.$set({ features: { timeline: { activityGraph: true } } });
  await tick();
  expect(target.querySelector('svg[data-icon]')).toBeNull();
  expect(graph()!.querySelector('line[data-layer="clicks"]')).not.toBeNull();
  expect(
    layer('navigation')!.querySelector('.rr-activity__dot'),
  ).not.toBeNull();
});

it('shows the graph while the pointer is anywhere below its top, at any player height', async () => {
  await mount({ toolbar: true, timeline: { activityGraph: true } });
  const player = target.querySelector<HTMLElement>('.rr-player')!;
  const button = graph()!;
  // A tall player whose graph sits well above its bottom quarter, as when
  // rows below the track push the timeline up.
  vi.spyOn(player, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 800, 1000),
  );
  vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 600, 800, 60),
  );
  const hoverAt = async (clientY: number) => {
    player.dispatchEvent(
      new PointerEvent('pointermove', { clientY, pointerType: 'mouse' }),
    );
    await tick();
    return button.classList.contains('shown');
  };
  // Over the track, just below the graph and above the bottom quarter.
  expect(await hoverAt(670)).toBe(true);
  expect(await hoverAt(990)).toBe(true);
  // Over the replay, above the graph.
  expect(await hoverAt(590)).toBe(false);
  player.dispatchEvent(new PointerEvent('pointerleave'));
  await tick();
  expect(button.classList.contains('shown')).toBe(false);
});

it('offers no panel when none of the allowed layers was recorded', async () => {
  await mount({
    toolbar: true,
    timeline: { activityGraph: { layers: ['scroll'] } },
  });
  expect(graph()).toBeNull();
  expect(trigger()).toBeNull();
});

it('uses the same timeline projection for the click mark and graph seeking', async () => {
  await mount({ timeline: { activityGraph: { layers: ['clicks'] } } }, 1200);
  player.$set({
    features: {
      timeline: {
        activityGraph: { layers: ['clicks'] },
        compressInactive: { maxIdleShare: 0.2 },
      },
    },
  });
  await tick();

  const button = graph()!;
  vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 1000, 60),
  );
  const assertPosition = (position: number) => {
    const mark = Number(button.querySelector('line')?.getAttribute('x1'));
    expect(mark).toBeCloseTo(position);
    button.dispatchEvent(
      new MouseEvent('click', { clientX: mark, detail: 1, bubbles: true }),
    );
    expect(player.getReplayer().getCurrentTime()).toBeCloseTo(2000);
  };
  assertPosition(800);

  player.$set({
    features: { timeline: { activityGraph: { layers: ['clicks'] } } },
  });
  await tick();
  assertPosition(500);
});

it('runs the seek preview across the graph only when it is on', async () => {
  const hoverGraph = async () => {
    const button = graph()!;
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 400, 60),
    );
    button.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 200, pointerType: 'mouse' }),
    );
    await tick();
    return button;
  };
  await mount({ timeline: { activityGraph: true } });
  let button = await hoverGraph();
  expect(button.querySelector('svg line[stroke-dasharray]')).toBeNull();
  expect(target.querySelector('.rr-seek-preview')).toBeNull();

  player.$destroy();
  target.remove();
  await mount({ timeline: { activityGraph: true, seekPreview: true } });
  button = await hoverGraph();
  expect(button.querySelectorAll('svg line[stroke-dasharray]')).toHaveLength(1);
  expect(target.querySelector('.rr-seek-preview__box')?.textContent).toBe(
    '00:02',
  );

  button.dispatchEvent(new PointerEvent('pointerleave'));
  await tick();
  expect(target.querySelector('.rr-seek-preview')).toBeNull();
  expect(button.querySelector('svg line[stroke-dasharray]')).toBeNull();

  // Choosing a time with the keyboard replaces the pointer preview.
  button = await hoverGraph();
  expect(target.querySelector('.rr-seek-preview')).not.toBeNull();
  button.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    }),
  );
  await tick();
  expect(target.querySelector('.rr-seek-preview')).toBeNull();
  expect(button.querySelectorAll('svg line[stroke-dasharray]')).toHaveLength(1);
  // Moving the pointer then keeps the keyboard choice, so Enter and the
  // marker agree.
  button.dispatchEvent(
    new PointerEvent('pointermove', {
      clientX: 380,
      pointerType: 'mouse',
      bubbles: true,
    }),
  );
  await tick();
  expect(target.querySelector('.rr-seek-preview')).toBeNull();
});

it('clears the graph preview when the host turns the graph off under the pointer', async () => {
  await mount({ timeline: { activityGraph: true, seekPreview: true } });
  const button = graph()!;
  vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 400, 60),
  );
  button.dispatchEvent(
    new PointerEvent('pointermove', { clientX: 200, pointerType: 'mouse' }),
  );
  await tick();
  expect(target.querySelector('.rr-seek-preview')).not.toBeNull();
  player.$set({ features: { timeline: { seekPreview: true } } });
  await tick();
  expect(graph()).toBeNull();
  expect(target.querySelector('.rr-seek-preview')).toBeNull();
});

it('describes the keyboard steps to keyboard users only, with no hover tooltip', async () => {
  await mount({ timeline: { activityGraph: true } });
  const button = graph()!;
  // A hover tooltip would offer Enter to mouse users, for whom it does nothing.
  expect(button.hasAttribute('title')).toBe(false);
  const hint = document.getElementById(
    button.getAttribute('aria-describedby') ?? '',
  );
  expect(hint?.textContent).toBe(
    'Use the arrow keys to choose a time, then press Enter to seek.',
  );
  expect(hint?.hidden).toBe(true);
  expect(button.getAttribute('aria-keyshortcuts')).toBe(
    'ArrowLeft ArrowRight Home End Enter',
  );

  // While the graph cannot seek, it offers no keyboard steps.
  player.getReplayer().speedService.send({
    type: 'FAST_FORWARD',
    payload: { speed: 8 },
  });
  await tick();
  expect(button.hasAttribute('aria-describedby')).toBe(false);
  expect(button.hasAttribute('aria-keyshortcuts')).toBe(false);
});
