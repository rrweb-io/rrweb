/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import {
  EventType,
  IncrementalSource,
  MouseInteractions,
  type eventWithTime,
} from '@rrweb/types';
import record from '../../src/record';
import { Replayer } from '../../src/replay';
import type { CursorPack } from '../../src/types';

// jsdom has no iframe.sandbox, which the protected rebuild checks
Object.defineProperty(HTMLIFrameElement.prototype, 'sandbox', {
  get(this: HTMLIFrameElement) {
    return (this.getAttribute('sandbox') || '').split(/\s+/).filter(Boolean);
  },
});

// cursor resolution runs in a timeout after the seek or frame
const settle = (ms = 0) => new Promise((r) => setTimeout(r, ms));

// Records html and returns its events with helpers that add events after them.
function recordPage(html: string) {
  document.body.innerHTML = html;
  const events: eventWithTime[] = [];
  const stop = record({ emit: (e) => events.push(e) })!;
  stop();
  const ids: Record<string, number> = {};
  document
    .querySelectorAll('[id]')
    .forEach((el) => (ids[el.id] = record.mirror.getId(el)));
  document.body.innerHTML = '';
  const start = events[0].timestamp;
  const at = (dt: number, data: unknown) =>
    ({
      type: EventType.IncrementalSnapshot,
      timestamp: start + dt,
      data,
    } as eventWithTime);
  const move = (
    dt: number,
    id: string,
    source = IncrementalSource.MouseMove,
    x = 10,
  ) => at(dt, { source, positions: [{ x, y: x, id: ids[id], timeOffset: 0 }] });
  const interaction = (dt: number, id: string, type: MouseInteractions) =>
    at(dt, {
      source: IncrementalSource.MouseInteraction,
      type,
      id: ids[id],
      x: 10,
      y: 10,
    });
  return { events, ids, at, move, interaction };
}

const mouseOf = (replayer: Replayer) =>
  replayer.wrapper.querySelector('.replayer-mouse') as HTMLElement;

describe('replayer cursor state', () => {
  it('keeps the touch ring for the whole session without cursor options', async () => {
    const { events, move, interaction } = recordPage('<div id="d"></div>');
    const replayer = new Replayer([
      ...events,
      // away from later mouse events, which would read as emulated by the touch
      move(50, 'd', IncrementalSource.TouchMove, 5),
      move(100, 'd'),
      interaction(150, 'd', MouseInteractions.MouseDown),
      move(200, 'd'),
    ]);
    const m = mouseOf(replayer);
    const seen = [];
    for (const t of [60, 110, 160]) {
      replayer.pause(t);
      await settle();
      seen.push(m.classList.contains('touch-device'));
    }
    // and during playback, where moves are applied one by one
    replayer.play(160);
    await settle(150);
    replayer.pause();
    seen.push(m.classList.contains('touch-device'));
    expect(seen).toEqual([true, true, true, true]);
  });

  it('releases the press when seeking back before the mouse down', async () => {
    const { events, move, interaction } = recordPage(
      '<div id="grab" style="cursor: grab"></div>',
    );
    const replayer = new Replayer(
      [
        ...events,
        move(100, 'grab'),
        interaction(150, 'grab', MouseInteractions.MouseDown),
        move(200, 'grab'),
      ],
      { cursor: { mode: 'state' } },
    );
    const m = mouseOf(replayer);
    const seen = [];
    for (const t of [210, 120]) {
      replayer.pause(t);
      await settle();
      seen.push(m.dataset.cursor);
    }
    expect(seen).toEqual(['grabbing', 'grab']);
  });

  it('calls the pack for each new target with the same cursor', async () => {
    const { events, move } = recordPage(
      '<div id="a" style="cursor: pointer"></div><div id="b" style="cursor: pointer"></div>',
    );
    const resolve = vi.fn<Parameters<CursorPack['resolve']>, null>(() => null);
    const replayer = new Replayer([...events, move(100, 'a'), move(200, 'b')], {
      cursor: { mode: 'state', pack: { name: 'spy', resolve } },
    });
    const changes: string[] = [];
    replayer.on('cursor-change', (s) =>
      changes.push((s as { cursor: string }).cursor),
    );
    resolve.mockClear(); // the arrow shown before the first pointer event
    for (const t of [110, 210]) {
      replayer.pause(t);
      await settle();
    }
    expect(resolve.mock.calls.map(([s]) => [s.cursor, s.target?.id])).toEqual([
      ['pointer', 'a'],
      ['pointer', 'b'],
    ]);
    // the shape did not change, so cursor-change fires once
    expect(changes).toEqual(['pointer']);
  });

  it('refreshes a stationary cursor after a stylesheet change', async () => {
    const { events, ids, at, move } = recordPage(
      '<style id="s"></style><div id="d" class="c"></div>',
    );
    const rule = (dt: number, cursor: string, index: number) =>
      at(dt, {
        source: IncrementalSource.StyleSheetRule,
        id: ids.s,
        adds: [{ rule: `.c { cursor: ${cursor}; }`, index }],
      });
    const replayer = new Replayer(
      [
        ...events,
        move(100, 'd'),
        rule(200, 'pointer', 0),
        rule(300, 'move', 1),
      ],
      { cursor: { mode: 'state' } },
    );
    const m = mouseOf(replayer);
    const seen = [];
    // seeks apply the rule synchronously
    for (const t of [150, 250]) {
      replayer.pause(t);
      await settle();
      seen.push(m.dataset.cursor);
    }
    // playback applies the rule from the timer
    replayer.play(250);
    await settle(150);
    replayer.pause();
    seen.push(m.dataset.cursor);
    expect(seen).toEqual(['default', 'pointer', 'move']);
  });
});
