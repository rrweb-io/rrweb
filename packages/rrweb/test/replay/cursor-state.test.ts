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
  ids.document = record.mirror.getId(document);
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

  it('follows the current pointer in state mode when touch events are added', async () => {
    const { events, move } = recordPage('<div id="d"></div>');
    const touch = move(800, 'd', IncrementalSource.TouchMove, 5);
    const seen = [];
    // a touch later in the recording
    const loaded = new Replayer([...events, move(100, 'd'), touch], {
      cursor: { mode: 'state' },
    });
    seen.push(mouseOf(loaded).classList.contains('touch-device'));
    // a touch added while paused on a mouse position
    const live = new Replayer([...events, move(100, 'd')], {
      cursor: { mode: 'state' },
    });
    live.pause(150);
    await settle();
    live.addEvent(touch);
    await settle();
    seen.push(mouseOf(live).classList.contains('touch-device'));
    expect(seen).toEqual([false, false]);
  });

  it('forgets the pen when replaying a finished recording', async () => {
    const { events, at, ids, move } = recordPage('<div id="d"></div>');
    const replayer = new Replayer(
      [
        ...events,
        move(100, 'd'),
        at(150, {
          source: IncrementalSource.MouseInteraction,
          type: MouseInteractions.MouseDown,
          id: ids.d,
          x: 20,
          y: 20,
          pointerType: 1, // pen
        }),
        move(200, 'd', IncrementalSource.MouseMove, 30),
      ],
      { cursor: { mode: 'state' } },
    );
    const finished = new Promise((r) => replayer.on('finish', r));
    replayer.play(180);
    await finished;
    const m = mouseOf(replayer);
    const seen = [m.dataset.pointer];
    replayer.pause(110);
    await settle();
    seen.push(m.dataset.pointer);
    expect(seen).toEqual(['pen', 'mouse']);
  });

  it('refreshes a stationary cursor after a sheet is adopted', async () => {
    const { events, ids, at, move } = recordPage(
      '<div id="d" class="c"></div>',
    );
    const adopt = (dt: number, styleId: number) =>
      at(dt, {
        source: IncrementalSource.AdoptedStyleSheet,
        id: ids.document,
        styleIds: [styleId],
        styles: [{ styleId, rules: [{ rule: '.c { cursor: pointer; }' }] }],
      });
    const replayer = new Replayer(
      [...events, move(100, 'd'), adopt(200, 1), adopt(300, 2)],
      { cursor: { mode: 'state' } },
    );
    replayer.pause(150);
    await settle();
    // jsdom ignores adopted sheets in computed style, so count the reads
    const w = replayer.iframe.contentWindow!;
    const read = vi.spyOn(w, 'getComputedStyle');
    const seen = [];
    replayer.pause(250); // a seek adopts the sheet synchronously
    await settle();
    seen.push(read.mock.calls.length);
    replayer.play(250); // playback adopts it from the timer
    await settle(150);
    replayer.pause();
    seen.push(read.mock.calls.length);
    expect(seen).toEqual([1, 2]);
  });

  it('shows the initial cursor after seeking before the first pointer event', async () => {
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
    replayer.pause(210);
    await settle();
    seen.push(m.dataset.cursor);
    replayer.pause(50);
    await settle();
    seen.push(m.dataset.cursor);
    // a refresh still pending from the first seek finds no sample
    replayer.pause(210);
    replayer.pause(50);
    await settle();
    seen.push(m.dataset.cursor);
    expect(seen).toEqual(['grabbing', 'default', 'default']);

    // the touch ring clears too
    const touched = new Replayer(
      [...events, move(100, 'grab', IncrementalSource.TouchMove)],
      { cursor: { mode: 'state' } },
    );
    touched.pause(110);
    await settle();
    const ring = [mouseOf(touched).classList.contains('touch-device')];
    touched.pause(50);
    await settle();
    ring.push(mouseOf(touched).classList.contains('touch-device'));
    expect(ring).toEqual([true, false]);
  });

  it('reports the initial cursor when a seek resets a held cursor', async () => {
    const { events, move, interaction } = recordPage(
      '<div id="grab" style="cursor: grab"></div><div id="d"></div>',
    );
    const replayer = new Replayer(
      [
        ...events,
        move(100, 'grab'),
        interaction(150, 'grab', MouseInteractions.MouseDown),
        move(200, 'grab'),
        interaction(250, 'grab', MouseInteractions.MouseUp),
        move(300, 'd'),
      ],
      { cursor: { mode: 'state' } },
    );
    const changes: string[] = [];
    replayer.on('cursor-change', (s) =>
      changes.push((s as { cursor: string }).cursor),
    );
    for (const t of [210, 50, 310]) {
      replayer.pause(t);
      await settle();
    }
    // the reset reports the arrow, and the arrow it keeps means the default
    // cursor over #d is no change
    expect(changes).toEqual(['grabbing', 'default']);
  });

  it('follows the hovered element into the page a checkout rebuilds', async () => {
    const { events, ids, at, move } = recordPage(
      '<style>.m { cursor: move; }</style><div id="a" style="cursor: pointer"></div>',
    );
    const start = events[0].timestamp;
    const checkout = events.map((e) => ({ ...e, timestamp: start + 200 }));
    const replayer = new Replayer(
      [
        ...events,
        move(100, 'a'),
        ...checkout,
        at(300, {
          source: IncrementalSource.Mutation,
          texts: [],
          attributes: [{ id: ids.a, attributes: { style: null, class: 'm' } }],
          removes: [],
          adds: [],
        }),
      ],
      { cursor: { mode: 'state' } },
    );
    // a seek starts from the checkout and drops the earlier move, so play
    // through it
    replayer.pause(150);
    await settle();
    expect(mouseOf(replayer).dataset.cursor).toBe('pointer');
    replayer.play(150);
    await settle(250);
    replayer.pause();
    expect(mouseOf(replayer).dataset.cursor).toBe('move');
  });

  it('refreshes a stationary cursor when focus changes', async () => {
    const { events, move, interaction } = recordPage('<input id="i">');
    const replayer = new Replayer(
      [
        ...events,
        move(100, 'i'),
        interaction(200, 'i', MouseInteractions.Focus),
        interaction(300, 'i', MouseInteractions.Blur),
      ],
      { cursor: { mode: 'state' } },
    );
    // jsdom matches :focus but leaves :focus rules out of computed style, so
    // stand in for the cascade of an `input:focus { cursor: crosshair }` rule
    const win = replayer.iframe.contentWindow!;
    const computed = win.getComputedStyle.bind(win);
    win.getComputedStyle = (el: Element) =>
      el.matches(':focus')
        ? ({ cursor: 'crosshair' } as CSSStyleDeclaration)
        : computed(el);
    const m = mouseOf(replayer);
    const seen = [];
    for (const t of [150, 250, 350]) {
      replayer.pause(t);
      await settle();
      seen.push(m.dataset.cursor);
    }
    expect(seen).toEqual(['text', 'crosshair', 'text']);
  });

  it('removes the state mode image when switching to dot mode', async () => {
    const { events, ids, at, move } = recordPage(
      '<style id="s"></style><div id="d" class="c" style="cursor: grab"></div>',
    );
    const replayer = new Replayer(
      [
        ...events,
        move(100, 'd'),
        at(200, {
          source: IncrementalSource.StyleSheetRule,
          id: ids.s,
          adds: [{ rule: '.c { cursor: move !important; }', index: 0 }],
        }),
      ],
      { cursor: { mode: 'state' } },
    );
    const m = mouseOf(replayer);
    replayer.pause(150);
    await settle();
    expect(m.dataset.cursor).toBe('grab');
    const changes: string[] = [];
    replayer.on('cursor-change', (s) =>
      changes.push((s as { cursor: string }).cursor),
    );
    replayer.setConfig({ cursor: { mode: 'dot' } });
    replayer.pause(250);
    await settle();
    expect([m.dataset.cursor, m.style.getPropertyValue('--rr-cursor')]).toEqual(
      [undefined, ''],
    );
    expect(changes).toEqual([]);
    // and back to state mode, which shows the arrow until the next pointer event
    replayer.setConfig({ cursor: { mode: 'state' } });
    expect(m.dataset.cursor).toBe('default');
  });
});
