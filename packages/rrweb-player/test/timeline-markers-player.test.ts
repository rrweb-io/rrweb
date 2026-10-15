// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import { EventType } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';
import Player from '../src/main';
import type { TimelineMarkerSelection } from '../src/types';

const start = 1700000000000;
const recording: eventWithTime[] = [
  {
    type: EventType.Meta,
    timestamp: start,
    data: { href: 'https://example.com', width: 800, height: 400 },
  },
  {
    type: EventType.Annotation,
    timestamp: start + 2000,
    data: { type: 'timelineMarker', text: 'Recorded' },
  },
  {
    type: EventType.Custom,
    timestamp: start + 10000,
    data: { tag: 'end', payload: {} },
  },
];
let player: Player;
let target: HTMLDivElement;
async function mount(props = {}) {
  target = document.createElement('div');
  document.body.append(target);
  player = new Player({
    target,
    props: {
      events: recording,
      autoPlay: false,
      skipInactive: false,
      ...props,
    },
  });
  await tick();
  return player;
}
function button(text: string) {
  const found = [...target.querySelectorAll<HTMLButtonElement>('button')].find(
    (el) => el.getAttribute('aria-label') === `Timeline marker: ${text}`,
  );
  if (!found) throw new Error(`Missing marker ${text}`);
  return found;
}
afterEach(() => {
  if (target?.isConnected) player?.$destroy();
  target?.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('external timeline markers', () => {
  it('replaces external markers, preserves recorded events and stable focused buttons', async () => {
    const original = JSON.stringify(recording);
    await mount();
    player.setTimelineMarkers([{ id: 'one', timeOffset: 4000, text: 'First' }]);
    await tick();
    const first = button('First');
    first.focus();
    player.setTimelineMarkers([
      { id: 'one', timeOffset: 4500, text: 'Updated', color: 'red' },
    ]);
    await tick();
    expect(button('Updated')).toBe(first);
    expect(document.activeElement).toBe(first);
    expect(button('Recorded')).toBeTruthy();
    player.setTimelineMarkers([]);
    await tick();
    expect(target.textContent).not.toContain('Updated');
    expect(button('Recorded')).toBeTruthy();
    expect(JSON.stringify(recording)).toBe(original);
  });

  it('rejects invalid replacements atomically and copies supplied values', async () => {
    await mount();
    const markers = [{ id: 'one', timeOffset: 4000, text: 'Original' }];
    player.setTimelineMarkers(markers);
    markers[0].text = 'Mutated';
    await tick();
    expect(button('Original')).toBeTruthy();
    for (const timeOffset of [-1, NaN, Infinity]) {
      expect(() =>
        player.setTimelineMarkers([{ id: 'bad', timeOffset, text: 'Bad' }]),
      ).toThrow();
    }
    expect(() =>
      player.setTimelineMarkers([{ id: '', timeOffset: 1, text: 'Bad' }]),
    ).toThrow();
    expect(() => player.setTimelineMarkers([markers[0], markers[0]])).toThrow();
    await tick();
    expect(button('Original')).toBeTruthy();
  });

  it('notifies selection, preserves pause/play, and clamps default seeking', async () => {
    const selections: TimelineMarkerSelection[] = [];
    await mount({
      onTimelineMarkerSelect: (selection: TimelineMarkerSelection) =>
        selections.push(selection),
      timelineMarkers: [{ id: 'last', timeOffset: 12000, text: 'After end' }],
    });
    button('Recorded').click();
    expect(player.getReplayer().getCurrentTime()).toBe(2000);
    expect(player.getReplayer().service.state.value).toBe('paused');
    expect(selections[0]).toMatchObject({
      source: 'recorded',
      timeOffset: 2000,
      text: 'Recorded',
      defaultPrevented: false,
    });
    button('After end').click();
    expect(player.getReplayer().getCurrentTime()).toBe(10000);
    expect(selections[1]).toMatchObject({
      source: 'external',
      id: 'last',
      timeOffset: 12000,
    });
    player.play();
    button('Recorded').click();
    expect(player.getReplayer().service.state.value).toBe('playing');
  });

  it('lets applications cancel default seeking and play with a lead-in', async () => {
    const selected = vi.fn((selection: TimelineMarkerSelection) => {
      selection.preventDefault();
      player.goto(Math.max(0, selection.timeOffset - 300), true);
    });
    await mount({
      timelineMarkers: [{ id: 'one', timeOffset: 4000, text: 'First' }],
      onTimelineMarkerSelect: selected,
    });
    button('First').click();
    expect(selected).toHaveBeenCalledOnce();
    expect(player.getReplayer().service.state.value).toBe('playing');
    expect(player.getReplayer().getCurrentTime()).toBeGreaterThanOrEqual(3700);
    expect(player.getReplayer().getCurrentTime()).toBeLessThan(3800);
  });

  it('clears removed active IDs and does not accumulate regenerated markers', async () => {
    await mount({
      timelineMarkers: [
        { id: 'one', timeOffset: 4000, text: 'First' },
        { id: 'two', timeOffset: 6000, text: 'Second' },
      ],
    });
    player.setActiveTimelineMarker('two');
    await tick();
    expect(button('Second').getAttribute('aria-current')).toBe('true');
    expect(button('First').getAttribute('aria-current')).toBeNull();
    player.setTimelineMarkers([{ id: 'one', timeOffset: 4000, text: 'First' }]);
    await tick();
    expect(target.querySelector('[aria-current="true"]')).toBeNull();
    for (let revision = 0; revision < 3; revision++)
      player.setTimelineMarkers([
        { id: 'one', timeOffset: 4000, text: 'First' },
      ]);
    await tick();
    expect(target.querySelectorAll('.rr-custom-event')).toHaveLength(2);
  });
});

it('regroups dense recorded/external markers on resize and keeps every member selectable', async () => {
  let resize = () => {};
  const disconnect = vi.fn();
  class TestResizeObserver implements ResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      resize = () => callback([], this);
    }
    observe() {}
    unobserve() {}
    disconnect = disconnect;
  }
  vi.stubGlobal('ResizeObserver', TestResizeObserver);
  const selected: TimelineMarkerSelection[] = [];
  await mount({
    onTimelineMarkerSelect: (selection: TimelineMarkerSelection) => {
      selected.push(selection);
      selection.preventDefault();
    },
  });
  const layer = target.querySelector<HTMLElement>('.rr-timeline-markers')!;
  let width = 100;
  Object.defineProperty(layer, 'clientWidth', { get: () => width });
  player.setTimelineMarkers(
    Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      timeOffset: 2000 + i * 10,
      text: `Step ${i}`,
    })),
  );
  resize();
  await tick();
  expect(target.querySelectorAll('.rr-custom-event')).toHaveLength(2);
  player.goto(0, false);
  button('Step 40').click();
  expect(selected[0]).toMatchObject({
    source: 'external',
    id: '40',
    timeOffset: 2400,
  });
  expect(player.getReplayer().getCurrentTime()).toBe(0);
  button('Step 99').focus();
  width = 10000;
  resize();
  await tick();
  expect(target.querySelectorAll('.rr-custom-event')).toHaveLength(100);
  expect(document.activeElement).toBe(button('Step 99'));
  expect(button('Step 99').type).toBe('button');
  player.setTimelineMarkers([]);
  await tick();
  expect(document.activeElement).toBe(target.querySelector('[role="slider"]'));
  expect(button('Recorded')).toBeTruthy();
  player.$destroy();
  target.remove();
  expect(disconnect).toHaveBeenCalledOnce();
});

it('keeps external IDs separate from recorded IDs and safely renders plain text', async () => {
  const selected: TimelineMarkerSelection[] = [];
  await mount({
    onTimelineMarkerSelect: (selection: TimelineMarkerSelection) =>
      selected.push(selection),
  });
  button('Recorded').click();
  const id = selected[0].id;
  player.setTimelineMarkers([
    {
      id,
      timeOffset: 4000,
      label: '<b>label</b>',
      text: '<img src=x onerror=alert(1)>',
    },
  ]);
  await tick();
  expect(target.querySelector('b, img')).toBeNull();
  expect(button('Recorded')).toBeTruthy();
  expect(target.textContent).toContain('<img src=x onerror=alert(1)>');
  player.setTimelineMarkers([]);
  await tick();
  button('Recorded').click();
  expect(selected[1].id).toBe(id);
});

it('validates public $set markers synchronously and keeps later updates working', async () => {
  await mount({
    timelineMarkers: [{ id: 'one', timeOffset: 4000, text: 'Original' }],
    activeTimelineMarker: 'one',
  });
  expect(() =>
    player.$set({
      timelineMarkers: [{ id: 'bad', timeOffset: -1, text: 'Invalid' }],
      showController: false,
    }),
  ).toThrow(TypeError);
  await tick();
  expect(button('Original').getAttribute('aria-current')).toBe('true');
  const replacement = [{ id: 'two', timeOffset: 5000, text: 'Replacement' }];
  player.$set({ timelineMarkers: replacement });
  replacement[0].text = 'Mutated';
  await tick();
  expect(button('Replacement')).toBeTruthy();
  expect(target.querySelector('[aria-current="true"]')).toBeNull();
  player.$set({
    timelineMarkers: [{ id: 'one', timeOffset: 4000, text: 'Returned' }],
  });
  await tick();
  expect(button('Returned').getAttribute('aria-current')).toBeNull();
  player.$set({ showController: false });
  await tick();
  expect(target.querySelector('.rr-controller')).toBeNull();
  player.$set({ showController: true });
  await tick();
  expect(button('Returned')).toBeTruthy();
});

it('mounts and selects markers without ResizeObserver', async () => {
  vi.stubGlobal('ResizeObserver', undefined);
  await mount({
    timelineMarkers: [{ id: 'one', timeOffset: 4000, text: 'Fallback' }],
  });
  button('Fallback').click();
  expect(player.getReplayer().getCurrentTime()).toBe(4000);
  player.setTimelineMarkers([
    { id: 'one', timeOffset: 5000, text: 'Updated fallback' },
  ]);
  await tick();
  button('Updated fallback').click();
  expect(player.getReplayer().getCurrentTime()).toBe(5000);
});

it('rejects sparse replacements atomically through both public update paths', async () => {
  await mount({
    timelineMarkers: [{ id: 'one', timeOffset: 4000, text: 'Original' }],
  });
  const sparse = [{ id: 'bad', timeOffset: 3000, text: 'Missing' }];
  delete sparse[0];
  expect(() => player.setTimelineMarkers(sparse)).toThrow(TypeError);
  expect(() => player.$set({ timelineMarkers: sparse })).toThrow(TypeError);
  await tick();
  expect(button('Original')).toBeTruthy();
  player.setTimelineMarkers([
    { id: 'two', timeOffset: 5000, text: 'Recovered' },
  ]);
  player.$set({ width: 640 });
  await tick();
  expect(button('Recovered')).toBeTruthy();
  expect(target.querySelector<HTMLElement>('.rr-player')?.style.width).toBe(
    '640px',
  );
});

it('renders repeated recorded event objects and retains each occurrence when re-added', async () => {
  const selected: TimelineMarkerSelection[] = [];
  const repeatedEvents = [
    recording[0],
    recording[1],
    recording[1],
    recording[2],
  ];
  await mount({
    events: repeatedEvents,
    onTimelineMarkerSelect: (selection: TimelineMarkerSelection) =>
      selected.push(selection),
  });
  const choices = () => [
    ...target.querySelectorAll<HTMLButtonElement>('.rr-custom-event__choice'),
  ];
  expect(choices()).toHaveLength(2);
  choices().forEach((choice) => choice.click());
  expect(new Set(selected.map(({ id }) => id)).size).toBe(2);
  const firstIds = selected.map(({ id }) => id);
  player.addEvent(recording[1]);
  await vi.waitFor(() => expect(choices()).toHaveLength(3));
  selected.length = 0;
  choices().forEach((choice) => choice.click());
  expect(new Set(selected.map(({ id }) => id)).size).toBe(3);
  expect(selected.slice(0, 2).map(({ id }) => id)).toEqual(firstIds);
  expect(selected.every(({ source }) => source === 'recorded')).toBe(true);
  expect(repeatedEvents.filter((event) => event === recording[1])).toHaveLength(
    2,
  );
});
