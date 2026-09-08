// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pack } from '@rrweb/packer';
import { tick } from 'svelte';
import { EventType, IncrementalSource } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';
import Player from '../src/Player.svelte';
import * as annotations from '../src/annotations';

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
  it('keeps scrollable notes outside the seek button and prevents note clicks from seeking', async () => {
    const player = await mount();
    player.goto(3000, false);
    await tick();
    const tooltip = target.querySelector('[role="dialog"]');
    expect(tooltip?.closest('button')).toBeNull();
    expect(tooltip?.getAttribute('tabindex')).toBe('0');
    tooltip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    tooltip?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await tick();
    expect(player.getReplayer().getCurrentTime()).toBe(3000);
  });

  it('shows escaped captions on seek and clears them at their end', async () => {
    const player = await mount();
    const region = target.querySelector('[role="status"]');
    expect(region).not.toBeNull();
    expect(region?.textContent?.trim()).toBe('');
    expect(target.querySelector('.rr-player__caption')).toBeNull();
    player.goto(2000, false);
    await tick();
    expect(target.querySelector('[role="status"]')).toBe(region);
    expect(target.querySelector('.rr-player__caption')?.textContent).toBe(
      'Click Save\n<b>project</b>',
    );
    expect(target.querySelector('.rr-player__caption b')).toBeNull();
    player.goto(5000, false);
    await tick();
    expect(target.querySelector('.rr-player__caption')).toBeNull();
    expect(target.querySelector('[role="status"]')).toBe(region);
    expect(region?.textContent?.trim()).toBe('');
    player.goto(2500, false);
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
    expect(target.querySelector('[role="dialog"]')?.textContent).toContain(
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

  it.each([false, true])(
    'keeps unchanged playback ticks out of Player (captions: %s)',
    async (showCaptions) => {
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
      const player = await mount({ showCaptions });
      player.goto(2100, false);
      await tick();
      const updates = vi.spyOn(player.$$, 'update');
      const lookups = vi.spyOn(annotations, 'getActiveCaption');
      player.play();
      lookups.mockClear();
      await vi.advanceTimersByTimeAsync(1000);
      await tick();
      expect(updates).not.toHaveBeenCalled();
      expect(lookups).not.toHaveBeenCalled();
      updates.mockRestore();
      lookups.mockRestore();
    },
  );

  it('restores captions across a later snapshot boundary and clears before the first caption', async () => {
    const events = recording();
    events.splice(3, 0, { ...events[0], timestamp: start + 3000 });
    const player = await mount({ events });
    player.getReplayer().pause(4000);
    await tick();
    expect(target.querySelector('.rr-player__caption')?.textContent).toContain(
      'Click Save',
    );
    player.getReplayer().pause(1000);
    await tick();
    expect(target.querySelector('.rr-player__caption')).toBeNull();
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

  it('agrees with seeking after appending a caption at a queued timestamp', async () => {
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
    const events = recording();
    events.splice(
      2,
      0,
      ...Array.from({ length: 10 }, (_, i) => annotation(2000, String(i))),
    );
    const player = await mount({ events });
    player.play();
    await vi.advanceTimersByTimeAsync(1000);
    player.addEvent(annotation(2000, 'Appended'));
    await vi.advanceTimersByTimeAsync(1500);
    await tick();
    expect(target.querySelector('.rr-player__caption')?.textContent).toBe(
      'Appended',
    );
    player.goto(2500, false);
    await tick();
    expect(target.querySelector('.rr-player__caption')?.textContent).toBe(
      'Appended',
    );
  });

  it('returns focus to the marker when Escape dismisses its focused panel', async () => {
    await mount();
    const marker = target.querySelector<HTMLButtonElement>('.rr-custom-event');
    const panel = target.querySelector<HTMLDivElement>('[role="dialog"]');
    panel?.focus();
    expect(document.activeElement).toBe(panel);
    panel?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await tick();
    expect(document.activeElement).toBe(marker);
    expect(target.querySelector('[role="dialog"]')).toBeNull();
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
    expect(target.querySelector('[role="dialog"]')).not.toBeNull();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await tick();
    expect(target.querySelector('[role="dialog"]')).toBeNull();
    target
      .querySelector('.rr-custom-event')
      ?.dispatchEvent(new Event('mouseenter'));
    await tick();
    expect(target.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('lets marker shortcuts bubble without seeking and dismisses focused notes', async () => {
    const player = await mount();
    player.goto(2000, false);
    await tick();
    const marker = target.querySelector('.rr-custom-event');
    const keys: string[] = [];
    const onKey = (event: KeyboardEvent) => keys.push(event.key);
    window.addEventListener('keydown', onKey);
    try {
      for (const key of ['k', 'ArrowRight', 'Escape']) {
        marker?.dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true }),
        );
      }
      await tick();
      expect(keys).toEqual(['k', 'ArrowRight', 'Escape']);
      expect(player.getReplayer().getCurrentTime()).toBe(2000);
      expect(target.querySelector('[role="dialog"]')).toBeNull();
      marker?.dispatchEvent(new Event('focus'));
      await tick();
      expect(target.querySelector('[role="dialog"]')).not.toBeNull();
      marker?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      await tick();
      expect(target.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      window.removeEventListener('keydown', onKey);
    }
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
