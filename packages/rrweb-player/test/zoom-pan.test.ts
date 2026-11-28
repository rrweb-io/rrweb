// @vitest-environment happy-dom
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Replayer } from '@rrweb/replay';
import ZoomPan from '../src/components/ZoomPan.svelte';

let frame: HTMLElement;
let zoomPan: ZoomPan;
let replayerHandlers: Map<string, () => void>;
let live = false;
let currentTime = 0;
let stalled = false;
// The playback clock; a stalled seek reports another time than this.
let clock: number | undefined;

function mount(playing = false) {
  replayerHandlers = new Map();
  live = false;
  currentTime = 0;
  stalled = false;
  clock = undefined;
  frame = document.createElement('div');
  const replay = document.createElement('div');
  const cursor = document.createElement('div');
  cursor.className = 'replayer-mouse';
  replay.append(cursor);
  frame.append(replay);
  document.body.append(frame);
  Object.defineProperties(frame, {
    clientWidth: { value: 400 },
    clientHeight: { value: 300 },
  });
  vi.spyOn(replay, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 800, 480),
  );

  zoomPan = new ZoomPan({
    target: frame,
    props: {
      frame,
      replay,
      zoom: 2,
      followCursor: false,
      replayer: {
        isPlaying: () => playing,
        isStalled: () => stalled,
        service: {
          state: {
            matches: (state: string) => live && state === 'live',
            context: { baselineTime: 0, events: [{ timestamp: 0 }] },
          },
        },
        timer: {
          get timeOffset() {
            return clock ?? currentTime;
          },
        },
        getCurrentTime: () => currentTime,
        on(event: string, handler: () => void) {
          replayerHandlers.set(event, handler);
        },
        off(event: string) {
          replayerHandlers.delete(event);
        },
      } as unknown as Replayer,
    },
  });
  const surface = frame.querySelector<HTMLDivElement>('.rr-player__surface')!;
  const capturedPointers = new Set<number>();
  Object.assign(surface, {
    setPointerCapture: (id: number) => capturedPointers.add(id),
    hasPointerCapture: (id: number) => capturedPointers.has(id),
    releasePointerCapture: (id: number) => capturedPointers.delete(id),
  });
  function pointer(
    type: string,
    x: number,
    y: number,
    pointerId = 1,
    isPrimary = pointerId === 1,
  ) {
    surface.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: x,
        clientY: y,
        pointerId,
        isPrimary,
      }),
    );
    return tick();
  }

  return { replay, cursor, surface, capturedPointers, pointer };
}

afterEach(() => {
  zoomPan.$destroy();
  frame.remove();
  vi.unstubAllGlobals();
});

describe('zoomed replay panning', () => {
  it.each(['click', 'drag'] as const)(
    'holds the moving camera on pointerdown before a %s',
    async (gesture) => {
      const frames = new Map<number, FrameRequestCallback>();
      let frameId = 0;
      vi.stubGlobal(
        'requestAnimationFrame',
        (callback: FrameRequestCallback) => {
          frames.set(++frameId, callback);
          return frameId;
        },
      );
      vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
      function animate() {
        const callbacks = [...frames.values()];
        frames.clear();
        callbacks.forEach((callback) => callback(performance.now() + 64));
      }

      const { replay, cursor, surface, pointer } = mount(true);
      Object.defineProperties(replay, {
        offsetWidth: { value: 800 },
        offsetHeight: { value: 480 },
      });
      cursor.style.cssText = 'left: 650px; top: 240px';
      zoomPan.$set({ followCursor: true });
      await tick();
      expect(frames.size).toBe(1);

      await pointer('pointerdown', 100, 100);
      await pointer('pointermove', 103, 100);
      animate();
      expect(replay.style.getPropertyValue('translate')).toBe('0px 0px');

      const toggle = vi.fn();
      zoomPan.$on('toggle', toggle);
      const endX = gesture === 'drag' ? 115 : 103;
      await pointer('pointerup', endX, 100);
      surface.dispatchEvent(new MouseEvent('click', { detail: 1 }));
      animate();

      if (gesture === 'drag') {
        expect(replay.style.getPropertyValue('translate')).toBe('15px 0px');
        expect(toggle).not.toHaveBeenCalled();
      } else {
        expect(replay.style.getPropertyValue('translate')).not.toBe('0px 0px');
        expect(toggle).toHaveBeenCalledOnce();
      }
    },
  );

  it.each(['playing', 'live'] as const)(
    'follows a cursor that moves while the replay is %s',
    async (mode) => {
      const frames = new Map<number, FrameRequestCallback>();
      let frameId = 0;
      vi.stubGlobal(
        'requestAnimationFrame',
        (callback: FrameRequestCallback) => {
          frames.set(++frameId, callback);
          return frameId;
        },
      );
      vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
      const { replay, cursor } = mount(mode === 'playing');
      live = mode === 'live';
      Object.defineProperties(replay, {
        offsetWidth: { value: 800 },
        offsetHeight: { value: 480 },
      });
      cursor.style.cssText = 'left: 400px; top: 240px';
      zoomPan.$set({ followCursor: true });
      await tick();
      expect(replay.style.getPropertyValue('translate')).toBe('0px 0px');

      cursor.setAttribute('style', 'left: 700px; top: 240px');
      // Let the MutationObserver callback run.
      await new Promise((resolve) => setTimeout(resolve));
      for (let i = 0; i < 30 && frames.size; i++) {
        const callbacks = [...frames.values()];
        frames.clear();
        callbacks.forEach((callback) =>
          callback(performance.now() + 64 * (i + 1)),
        );
      }
      expect(replay.style.getPropertyValue('translate')).toBe('-200px 0px');
    },
  );

  it('frames the cursor at once when a stalled seek resumes', async () => {
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++frameId, callback);
      return frameId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    const { replay, cursor } = mount();
    Object.defineProperties(replay, {
      offsetWidth: { value: 800 },
      offsetHeight: { value: 480 },
    });
    cursor.style.cssText = 'left: 400px; top: 240px';
    zoomPan.$set({ followCursor: true });
    await tick();

    // A paused seek to 5 s stalls, then resumes there with the cursor moved.
    currentTime = 5000;
    replayerHandlers.get('stall-start')!();
    cursor.setAttribute('style', 'left: 700px; top: 240px');
    replayerHandlers.get('start')!();
    replayerHandlers.get('pause')!();
    expect(replay.style.getPropertyValue('translate')).toBe('-200px 0px');
  });

  it('frames the cursor once a stall it started during resolves', async () => {
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++frameId, callback);
      return frameId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    const { replay, cursor } = mount();
    Object.defineProperties(replay, {
      offsetWidth: { value: 800 },
      offsetHeight: { value: 480 },
    });
    cursor.style.cssText = 'left: 400px; top: 240px';
    // Zoom starts while a paused seek to 5 s waits for data.
    currentTime = 5000;
    stalled = true;
    zoomPan.$set({ followCursor: true });
    await tick();
    stalled = false;
    cursor.setAttribute('style', 'left: 700px; top: 240px');
    replayerHandlers.get('start')!();
    replayerHandlers.get('pause')!();
    expect(replay.style.getPropertyValue('translate')).toBe('-200px 0px');
  });

  it('keeps the camera framing when playback resumes after buffering', async () => {
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++frameId, callback);
      return frameId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    const { replay, cursor } = mount(true);
    Object.defineProperties(replay, {
      offsetWidth: { value: 800 },
      offsetHeight: { value: 480 },
    });
    cursor.style.cssText = 'left: 650px; top: 240px';
    zoomPan.$set({ followCursor: true });
    await tick();
    // Playback advanced, then a stall interrupts it at the rendered moment.
    currentTime = 3000;
    replayerHandlers.get('stall-start')!();
    const held = replay.style.getPropertyValue('translate');
    replayerHandlers.get('start')!();
    // Resuming there carries on easing toward the cursor instead of jumping.
    expect(replay.style.getPropertyValue('translate')).toBe(held);
    expect(frames.size).toBe(1);
  });

  it('frames the cursor at once when a seek during playback stalls and resumes', async () => {
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++frameId, callback);
      return frameId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    const { replay, cursor } = mount(true);
    Object.defineProperties(replay, {
      offsetWidth: { value: 800 },
      offsetHeight: { value: 480 },
    });
    cursor.style.cssText = 'left: 400px; top: 240px';
    zoomPan.$set({ followCursor: true });
    await tick();
    // goto(500) while playing at 0 stalls until its data arrives. The stall
    // reports the requested 500 ms while the clock stays at 0; a seek this
    // short is still a seek.
    clock = 0;
    currentTime = 500;
    replayerHandlers.get('stall-start')!();
    cursor.setAttribute('style', 'left: 700px; top: 240px');
    replayerHandlers.get('start')!();
    replayerHandlers.get('pause')!();
    expect(replay.style.getPropertyValue('translate')).toBe('-200px 0px');
  });

  it('pans with the arrow keys within the zoomed replay', async () => {
    const { replay, surface } = mount();
    zoomPan.$set({ followCursor: true });
    await tick();
    const key = (k: string) =>
      surface.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: k,
          bubbles: true,
          cancelable: true,
        }),
      );
    expect(key('ArrowLeft')).toBe(false);
    expect(replay.style.getPropertyValue('translate')).toBe('50px 0px');
    for (let i = 0; i < 10; i++) key('ArrowLeft');
    // Clamped to the edge of the zoomed replay.
    expect(replay.style.getPropertyValue('translate')).toBe('200px 0px');
  });

  it('stops moving the camera when the replay stalls', async () => {
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++frameId, callback);
      return frameId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    const { replay, cursor } = mount(true);
    Object.defineProperties(replay, {
      offsetWidth: { value: 800 },
      offsetHeight: { value: 480 },
    });
    cursor.style.cssText = 'left: 650px; top: 240px';
    zoomPan.$set({ followCursor: true });
    await tick();
    expect(frames.size).toBe(1);

    replayerHandlers.get('stall-start')!();
    expect(frames.size).toBe(0);
    cursor.style.left = '700px';
    await tick();
    expect(frames.size).toBe(0);
    expect(replay.style.getPropertyValue('translate')).toBe('0px 0px');
  });

  it('centres only an axis outside the dead zone and holds the camera while paused', async () => {
    const { replay, pointer } = mount();
    Object.defineProperties(replay, {
      offsetWidth: { value: 800 },
      offsetHeight: { value: 480 },
    });
    const cursor = replay.querySelector<HTMLElement>('.replayer-mouse')!;
    cursor.style.cssText = 'left: 650px; top: 250px';
    zoomPan.$set({ followCursor: true });
    await tick();
    expect(replay.style.getPropertyValue('translate')).toBe('-200px 0px');
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    cursor.setAttribute('style', 'left: 0px; top: 250px');
    // Let the observer run, then any animation it scheduled.
    await new Promise((resolve) => setTimeout(resolve, 0));
    for (let i = 0; i < 10 && frames.length; i++)
      frames
        .splice(0)
        .forEach((callback) => callback(performance.now() + 64 * (i + 1)));
    expect(replay.style.getPropertyValue('translate')).toBe('-200px 0px');
    vi.unstubAllGlobals();
    await pointer('pointerdown', 0, 0);
    await pointer('pointermove', 20, 10);
    expect(replay.style.getPropertyValue('translate')).toBe('-180px 10px');
  });

  it('holds capture across successive pointer moves', async () => {
    const { replay, capturedPointers, pointer } = mount();
    await pointer('pointerdown', 100, 100);
    await pointer('pointermove', 120, 110);
    expect(replay.style.getPropertyValue('translate')).toBe('20px 10px');
    expect(capturedPointers.has(1)).toBe(true);

    await pointer('pointermove', 160, 130);
    expect(replay.style.getPropertyValue('translate')).toBe('60px 30px');

    await pointer('pointerup', 160, 130);
    expect(capturedPointers.has(1)).toBe(false);
    await pointer('pointermove', 180, 140);
    expect(replay.style.getPropertyValue('translate')).toBe('60px 30px');
  });

  it('pans by the pointer delta when the embedding page scales the player', async () => {
    const { replay, pointer } = mount();
    vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 200, 150),
    );
    vi.mocked(replay.getBoundingClientRect).mockReturnValue(
      new DOMRect(0, 0, 400, 240),
    );

    await pointer('pointerdown', 50, 50);
    await pointer('pointermove', 80, 70);
    expect(replay.style.getPropertyValue('translate')).toBe('60px 40px');
    await pointer('pointerup', 200, 150);
    expect(replay.style.getPropertyValue('translate')).toBe('200px 90px');
  });

  it('follows the cursor in replay coordinates when the embedding page scales the player', async () => {
    const { replay, cursor } = mount();
    vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 200, 150),
    );
    vi.mocked(replay.getBoundingClientRect).mockReturnValue(
      new DOMRect(0, 0, 400, 240),
    );
    Object.defineProperties(replay, {
      offsetWidth: { value: 800 },
      offsetHeight: { value: 480 },
    });
    cursor.style.cssText = 'left: 550px; top: 140px';

    zoomPan.$set({ followCursor: true });
    await tick();
    expect(replay.style.getPropertyValue('translate')).toBe('-150px 90px');
  });

  it('keeps the first captured pointer when another pointer type is primary', async () => {
    const { replay, capturedPointers, pointer } = mount();
    await pointer('pointerdown', 0, 0);
    await pointer('pointerdown', 10, 10, 2, true);
    await pointer('pointermove', 30, 20);
    expect([...capturedPointers]).toEqual([1]);
    expect(replay.style.getPropertyValue('translate')).toBe('30px 20px');
  });

  it.each(['pointerup', 'pointercancel', 'lostpointercapture'])(
    'holds primary capture when another pointer fires %s',
    async (eventType) => {
      const { replay, capturedPointers, pointer } = mount();
      await pointer('pointerdown', 0, 0);
      await pointer('pointerdown', 10, 10, 2);
      await pointer(eventType, 10, 10, 2);
      expect(capturedPointers.has(1)).toBe(true);
      await pointer('pointermove', 30, 20);
      expect(replay.style.getPropertyValue('translate')).toBe('30px 20px');
    },
  );
});
