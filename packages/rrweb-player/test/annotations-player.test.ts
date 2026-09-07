// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pack } from '@rrweb/packer';
import { tick } from 'svelte';
import { EventType, IncrementalSource } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';
import Player from '../src/Player.svelte';

const start = 1700000000000;
const annotation = (offset: number, text: string): eventWithTime => ({
  type: EventType.Custom,
  timestamp: start + offset,
  data: { tag: 'annotation', payload: { kind: 'caption', text } },
});
const note = (offset: number, text: string): eventWithTime => ({
  type: EventType.Custom,
  timestamp: start + offset,
  data: { tag: 'annotation', payload: { kind: 'note', text } },
});
const clear = (offset: number): eventWithTime => ({
  type: EventType.Custom,
  timestamp: start + offset,
  data: { tag: 'annotation', payload: { kind: 'caption', action: 'clear' } },
});
const recording = (): eventWithTime[] => [
  {
    type: EventType.Meta,
    timestamp: start,
    data: { href: 'https://example.com', width: 800, height: 400 },
  },
  annotation(2000, 'Click Save\n<b>project</b>'),
  note(2000, 'Click Save to create your project.'),
  clear(5000),
  {
    type: EventType.Custom,
    timestamp: start + 6000,
    data: { tag: 'ordinary', payload: { text: 'unrelated' } },
  },
  {
    type: EventType.IncrementalSnapshot,
    timestamp: start + 10000,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [],
      adds: [],
    },
  },
];
let player: Player | undefined;
let target: HTMLDivElement;
async function mount(props = {}) {
  target = document.createElement('div');
  document.body.append(target);
  player = new Player({
    target,
    props: {
      events: recording(),
      autoPlay: false,
      skipInactive: false,
      showCaptions: true,
      ...props,
    },
  });
  await tick();
  return player;
}
function click(selector: string) {
  const element = target.querySelector(selector);
  expect(element).toBeInstanceOf(HTMLElement);
  if (element instanceof HTMLElement) element.click();
}
afterEach(() => {
  player?.$destroy();
  target?.remove();
  vi.useRealTimers();
});

describe('player annotations', () => {
  it('shows escaped captions on seek and clears them at their end', async () => {
    const player = await mount();
    expect(target.querySelector('.rr-player__caption')).toBeNull();
    player.goto(2000, false);
    await tick();
    expect(target.querySelector('.rr-player__caption')?.textContent).toBe(
      'Click Save\n<b>project</b>',
    );
    expect(target.querySelector('.rr-player__caption b')).toBeNull();
    player.goto(5000, false);
    await tick();
    expect(target.querySelector('.rr-player__caption')).toBeNull();
    player.goto(2500, false);
    await tick();
    expect(target.querySelector('.rr-player__caption')?.textContent).toContain(
      'Click Save',
    );
    player.setSpeed(4);
    await tick();
    expect(target.querySelector('.rr-player__caption')?.textContent).toContain(
      'Click Save',
    );
  });

  it('toggles captions independently of notes and preserves ordinary markers', async () => {
    const player = await mount({ showCaptions: false });
    player.goto(2500, false);
    await tick();
    expect(target.querySelector('.rr-player__caption')).toBeNull();
    expect(target.querySelector('[role="tooltip"]')?.textContent).toContain(
      'Click Save',
    );
    expect(target.querySelector('[title="ordinary"]')).not.toBeNull();
    click('button[aria-label="Show captions"]');
    await tick();
    expect(target.querySelector('.rr-player__caption')).not.toBeNull();
    click('button[aria-label="Hide captions"]');
    await tick();
    expect(target.querySelector('.rr-player__caption')).toBeNull();
  });

  it('seeks exactly to a note and supports captions without controls', async () => {
    const player = await mount();
    click('.rr-custom-event');
    await tick();
    expect(player.getReplayer().getCurrentTime()).toBe(2000);
    expect(target.querySelector('.rr-player__caption')).not.toBeNull();
    player.$set({ showController: false });
    await tick();
    expect(target.querySelector('.rr-controller')).toBeNull();
    expect(target.querySelector('.rr-player__caption')).not.toBeNull();
  });

  it('refreshes annotations when events are added after mounting', async () => {
    const player = await mount();
    player.addEvent(annotation(7000, 'Added later'));
    player.addEvent(note(7000, 'A new note'));
    await Promise.resolve();
    await tick();
    await tick();
    player.goto(7000, false);
    await tick();
    expect(target.querySelectorAll('.rr-custom-event')).toHaveLength(2);
    expect(target.querySelector('.rr-player__caption')?.textContent).toBe(
      'Added later',
    );
  });

  it('follows playback speed and freezes captions while paused', async () => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'Date',
        'performance',
      ],
    });
    const player = await mount();
    player.play();
    await vi.advanceTimersByTimeAsync(2500);
    await tick();
    expect(target.querySelector('.rr-player__caption')?.textContent).toContain(
      'Click Save',
    );
    player.pause();
    await vi.advanceTimersByTimeAsync(5000);
    await tick();
    expect(target.querySelector('.rr-player__caption')?.textContent).toContain(
      'Click Save',
    );
    player.setSpeed(4);
    player.play();
    await vi.advanceTimersByTimeAsync(750);
    await tick();
    expect(target.querySelector('.rr-player__caption')).toBeNull();
  });

  it('reads annotations from packed events', async () => {
    const player = await mount({
      events: recording().map((event) => pack(event)),
    });
    player.goto(2000, false);
    await tick();
    expect(target.querySelector('.rr-player__caption')?.textContent).toContain(
      'Click Save',
    );
  });

  it('omits the caption toggle when there are no annotations', async () => {
    await mount({
      events: recording().filter((event) => event.type !== EventType.Custom),
    });
    expect(target.querySelector('button[aria-pressed]')).toBeNull();
  });

  it('dismisses hover notes with Escape even when the marker is not focused', async () => {
    await mount();
    expect(target.querySelector('[role="tooltip"]')).not.toBeNull();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await tick();
    expect(target.querySelector('[role="tooltip"]')).toBeNull();
    target
      .querySelector('.rr-custom-event')
      ?.dispatchEvent(new Event('mouseenter'));
    await tick();
    expect(target.querySelector('[role="tooltip"]')).not.toBeNull();
  });

  it('shows notes without a CC toggle when no caption set events exist', async () => {
    await mount({
      events: [recording()[0], note(2000, 'Just a note'), clear(5000)],
    });
    expect(target.querySelectorAll('.rr-custom-event')).toHaveLength(1);
    expect(target.querySelector('button[aria-pressed]')).toBeNull();
  });

  it('never creates timeline markers for caption set, clear, or invalid annotation events', async () => {
    const player = await mount();
    expect(target.querySelectorAll('.rr-custom-event')).toHaveLength(1);
    expect(target.querySelector('[title="annotation"]')).toBeNull();
    player.addEvent({
      type: EventType.Custom,
      timestamp: start + 7000,
      data: {
        tag: 'annotation',
        payload: { kind: 'caption', action: 'invalid', text: 'Wrong' },
      },
    });
    await Promise.resolve();
    await tick();
    await tick();
    player.goto(7000, false);
    await tick();
    expect(target.querySelector('.rr-player__caption')).toBeNull();
    expect(target.querySelector('[title="annotation"]')).toBeNull();
  });
});
