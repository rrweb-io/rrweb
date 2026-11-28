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
  type: EventType.Annotation,
  timestamp: start + offset,
  data: { type: 'caption', text },
});
const timelineMarker = (offset: number, text: string): eventWithTime => ({
  type: EventType.Annotation,
  timestamp: start + offset,
  data: { type: 'timelineMarker', text },
});
const clear = (offset: number): eventWithTime => ({
  type: EventType.Annotation,
  timestamp: start + offset,
  data: { type: 'caption', text: null },
});
const recording = (): eventWithTime[] => [
  {
    type: EventType.Meta,
    timestamp: start,
    data: { href: 'https://example.com', width: 800, height: 400 },
  },
  annotation(2000, 'Click Save\n<b>project</b>'),
  timelineMarker(2000, 'Click Save to create your project.'),
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

describe('player customization', () => {
  const arrow = (element: Element, key = 'ArrowRight') =>
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
  const onScreen = () =>
    vi
      .spyOn(
        target.querySelector<HTMLElement>('.rr-player')!,
        'getBoundingClientRect',
      )
      .mockReturnValue(new DOMRect(0, 0, 400, 360));

  it('adds no jump buttons, shortcuts or click surface unless the host opts in', async () => {
    const player = await mount();
    onScreen();
    player.goto(0, false);

    expect(
      target.querySelector('[aria-label="Forward 10 seconds"]'),
    ).toBeNull();
    expect(target.querySelector('.rr-player__surface')).toBeNull();
    expect(target.querySelector<HTMLElement>('.rr-player')!.tabIndex).toBe(-1);
    expect(arrow(document.body)).toBe(true);
    expect(player.getReplayer().getCurrentTime()).toBe(0);

    // Buttons alone do not claim the arrow keys.
    player.$set({ features: { jump: {} } });
    await tick();
    expect(
      target.querySelector('[aria-label="Forward 10 seconds"]'),
    ).not.toBeNull();
    expect(arrow(document.body)).toBe(true);
    expect(player.getReplayer().getCurrentTime()).toBe(0);
  });

  it('describes configured jumps with their source and supports unsubscribing', async () => {
    const player = await mount({
      features: { jump: { seconds: 2, keyboard: 'player' } },
    });
    const onJump = vi.fn();
    const unsubscribe = player.addEventListener('ui-jump', onJump);
    const root = target.querySelector<HTMLElement>('.rr-player')!;

    player.goto(0, false);
    expect(arrow(document.body)).toBe(true);
    expect(arrow(root)).toBe(false);
    click('[aria-label="Forward 2 seconds"]');
    player.$set({ features: { jump: { seconds: 3, keyboard: 'player' } } });
    player.jump('forward');
    await tick();

    expect(onJump.mock.calls.flat()).toEqual([
      { fromMs: 0, toMs: 2000, source: 'keyboard' },
      { fromMs: 2000, toMs: 4000, source: 'button' },
      { fromMs: 4000, toMs: 7000, source: 'api' },
    ]);
    expect(root.tabIndex).toBe(0);
    unsubscribe();
    player.jump('forward');
    expect(player.getReplayer().getCurrentTime()).toBe(10000);
    expect(onJump).toHaveBeenCalledTimes(3);

    // A listener that unsubscribes and subscribes again during a jump runs
    // once for that jump.
    let calls = 0;
    let stop = () => {};
    const again = () => {
      calls++;
      if (calls > 5) return;
      stop();
      stop = player.addEventListener('ui-jump', again);
    };
    stop = player.addEventListener('ui-jump', again);
    player.jump('back');
    expect(calls).toBe(1);
    stop();

    player.$set({ features: { jump: { seconds: 1 } } });
    await tick();
    expect(
      target.querySelector('[aria-label="Forward 1 second"]'),
    ).not.toBeNull();

    // Without the buttons a host can still jump programmatically.
    player.$set({ features: {} });
    await tick();
    expect(target.querySelector('[aria-label="Back 10 seconds"]')).toBeNull();
    player.jump('back');
    expect(player.getReplayer().getCurrentTime()).toBe(0);
  });

  it('jumps back from the end when the playback clock has advanced past it', async () => {
    const player = await mount({ features: { jump: { seconds: 2 } } });
    const onJump = vi.fn();
    player.addEventListener('ui-jump', onJump);
    const currentTime = vi
      .spyOn(player.getReplayer(), 'getCurrentTime')
      .mockReturnValueOnce(10040);
    try {
      player.jump('back');
      expect(onJump).toHaveBeenCalledWith({
        fromMs: 10000,
        toMs: 8000,
        source: 'api',
      });
    } finally {
      currentTime.mockRestore();
    }
  });

  it('does not jump in liveMode played from an offset', async () => {
    const player = await mount({
      liveMode: true,
      features: { jump: { keyboard: 'page' } },
    });
    const onJump = vi.fn();
    player.addEventListener('ui-jump', onJump);
    player.getReplayer().play(5000);
    await tick();
    player.jump('back');
    expect(onJump).not.toHaveBeenCalled();
    expect(
      target.querySelector<HTMLButtonElement>('[aria-label="Back 10 seconds"]')!
        .disabled,
    ).toBe(true);
  });

  it('does not jump during live replay', async () => {
    const player = await mount({ features: { jump: { keyboard: 'page' } } });
    onScreen();
    const replayer = player.getReplayer();
    const onJump = vi.fn();
    player.addEventListener('ui-jump', onJump);
    replayer.startLive();
    await tick();
    player.jump('forward');

    expect(replayer.service.state.matches('live')).toBe(true);
    expect(onJump).not.toHaveBeenCalled();
    expect(
      target.querySelector<HTMLButtonElement>(
        '[aria-label="Forward 10 seconds"]',
      )!.disabled,
    ).toBe(true);
    expect(arrow(document.body)).toBe(true);
  });

  // Replayer.pause(offset) currently leaves the stall's resume intent set to
  // play, so only the playing case is checked here.
  it('jumps while stalled and resumes playing from the new position', async () => {
    const player = await mount({ features: { jump: { seconds: 2 } } });
    const replayer = player.getReplayer();
    // Holds playback at the jump target until the data is "loaded".
    let loaded = false;
    replayer.addStallController({
      registerEvent() {},
      isStallMarker: () => false,
      stallOnPlay(timeOffset) {
        if (loaded || timeOffset !== 4000) return false;
        // Also records the new offset while an earlier stall is active.
        replayer.stall(timeOffset);
        return true;
      },
      stallOnPause: () => false,
    });
    player.goto(2000, true);
    replayer.stall();
    await tick();

    click('[aria-label="Forward 2 seconds"]');
    expect(replayer.isStalled()).toBe(true);
    expect(replayer.getCurrentTime()).toBe(4000);

    loaded = true;
    replayer.clearStall();
    expect(replayer.isStalled()).toBe(false);
    expect(replayer.isPlaying()).toBe(true);
    expect(replayer.getCurrentTime()).toBeGreaterThanOrEqual(4000);
    expect(replayer.getCurrentTime()).toBeLessThan(4100);
  });

  it('leaves arrows pressed in another player or a dialog to them', async () => {
    const player = await mount({ features: { jump: { keyboard: 'page' } } });
    onScreen();
    player.goto(0, false);
    const otherTarget = document.createElement('div');
    document.body.append(otherTarget);
    const other = new Player({
      target: otherTarget,
      props: {
        events: recording(),
        autoPlay: false,
        features: { jump: { keyboard: 'player' } },
      },
    });
    try {
      await tick();
      const otherForward = otherTarget.querySelector(
        '[aria-label="Forward 10 seconds"]',
      )!;
      expect(arrow(otherForward)).toBe(false);
      expect(player.getReplayer().getCurrentTime()).toBe(0);
      expect(other.getReplayer().getCurrentTime()).toBe(10000);

      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      const inside = document.createElement('button');
      dialog.append(inside);
      target.querySelector('.rr-player')!.append(dialog);
      expect(arrow(inside)).toBe(true);
      expect(player.getReplayer().getCurrentTime()).toBe(0);
    } finally {
      other.$destroy();
      otherTarget.remove();
    }
  });

  it('ignores hidden modals and keeps arrows in dialogs around web components', async () => {
    const player = await mount({ features: { jump: { keyboard: 'page' } } });
    onScreen();
    player.goto(0, false);
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.style.display = 'none';
    document.body.append(modal);
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const host = document.createElement('div');
    const button = document.createElement('button');
    host.attachShadow({ mode: 'open' }).append(button);
    dialog.append(host);
    document.body.append(dialog);
    try {
      expect(arrow(document.body)).toBe(false);
      expect(player.getReplayer().getCurrentTime()).toBe(10000);

      button.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowLeft',
          bubbles: true,
          cancelable: true,
          composed: true,
        }),
      );
      expect(player.getReplayer().getCurrentTime()).toBe(10000);

      modal.style.display = '';
      modal.style.visibility = 'hidden';
      expect(arrow(document.body, 'ArrowLeft')).toBe(false);
      expect(player.getReplayer().getCurrentTime()).toBe(0);
      player.goto(10000, false);

      modal.style.visibility = '';
      modal.style.opacity = '0';
      expect(arrow(document.body, 'ArrowLeft')).toBe(false);
      expect(player.getReplayer().getCurrentTime()).toBe(0);
      player.goto(10000, false);

      modal.style.opacity = '';
      expect(arrow(document.body, 'ArrowLeft')).toBe(true);
      expect(player.getReplayer().getCurrentTime()).toBe(10000);
    } finally {
      modal.remove();
      dialog.remove();
    }
  });

  it('handles shortcuts for a player inside a closed shadow root', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'closed' });
    target = document.createElement('div');
    root.append(target);
    // The controller appears after mount, so its root listener starts then.
    player = new Player({
      target,
      props: {
        events: recording(),
        autoPlay: false,
        skipInactive: false,
        showController: false,
        features: { jump: { keyboard: 'page' } },
      },
    });
    await tick();
    player.$set({ showController: true });
    await tick();
    onScreen();
    player.goto(0, false);
    try {
      // Browsers hide a closed root's elements from listeners outside it;
      // happy-dom does not, so listeners outside the root see the retargeted
      // path here.
      const press = (element: Element) => {
        const event = new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
          cancelable: true,
          composed: true,
        });
        const path = event.composedPath.bind(event);
        // The first call is happy-dom's own, to route the event.
        let routed = false;
        event.composedPath = () => {
          if (!routed) {
            routed = true;
            return path();
          }
          // The window listener's currentTarget is not a node.
          return event.currentTarget instanceof Node
            ? path()
            : [host, document.body, document.documentElement, document, window];
        };
        element.dispatchEvent(event);
      };
      const input = document.createElement('input');
      root.append(input);
      press(input);
      // The input inside the same root keeps its arrows.
      expect(player.getReplayer().getCurrentTime()).toBe(0);
      press(root.querySelector('.rr-player')!);
      expect(player.getReplayer().getCurrentTime()).toBe(10000);
    } finally {
      player.$destroy();
      host.remove();
    }
  });

  it.each([
    ['shown', {}],
    ['hidden', { showController: false, clickToPlay: true }],
  ])(
    'leaves keys pressed in a player inside a closed shadow root to that player, with its controls %s',
    async (_, innerProps) => {
      const pagePlayer = await mount({
        features: { jump: { keyboard: 'page' } },
      });
      onScreen();
      pagePlayer.goto(0, false);
      const host = document.createElement('div');
      document.body.append(host);
      const root = host.attachShadow({ mode: 'closed' });
      const innerTarget = document.createElement('div');
      root.append(innerTarget);
      const inner = new Player({
        target: innerTarget,
        props: { events: recording(), autoPlay: false, ...innerProps },
      });
      await tick();
      try {
        // As in the closed-root test above, listeners outside the root see
        // the retargeted path.
        const event = new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
          cancelable: true,
          composed: true,
        });
        const path = event.composedPath.bind(event);
        let routed = false;
        event.composedPath = () => {
          if (!routed) {
            routed = true;
            return path();
          }
          return event.currentTarget instanceof Node
            ? path()
            : [host, document.body, document.documentElement, document, window];
        };
        root.querySelector('.rr-player')!.dispatchEvent(event);
        expect(pagePlayer.getReplayer().getCurrentTime()).toBe(0);
        // Keys pressed elsewhere on the page still reach the page player.
        expect(arrow(document.body)).toBe(false);
        expect(pagePlayer.getReplayer().getCurrentTime()).toBe(10000);
      } finally {
        inner.$destroy();
        host.remove();
      }
    },
  );

  it('leaves keys pressed in a player nested in a closed root to that player', async () => {
    const outerHost = document.createElement('div');
    document.body.append(outerHost);
    const outerRoot = outerHost.attachShadow({ mode: 'open' });
    const outerTarget = document.createElement('div');
    outerRoot.append(outerTarget);
    const outer = new Player({
      target: outerTarget,
      props: {
        events: recording(),
        autoPlay: false,
        skipInactive: false,
        features: { jump: { keyboard: 'player' } },
      },
    });
    await tick();
    const outerPlayer = outerRoot.querySelector('.rr-player')!;
    const innerHost = document.createElement('div');
    outerPlayer.append(innerHost);
    const innerRoot = innerHost.attachShadow({ mode: 'closed' });
    const innerTarget = document.createElement('div');
    innerRoot.append(innerTarget);
    const inner = new Player({
      target: innerTarget,
      props: { events: recording(), autoPlay: false },
    });
    await tick();
    outer.goto(0, false);
    // Browsers hide the closed root's elements from every listener outside
    // it; happy-dom does not, so this event hides them by hand.
    const press = (element: Element) => {
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      const path = event.composedPath.bind(event);
      let routed = false;
      event.composedPath = () => {
        if (!routed) {
          routed = true;
          return path();
        }
        if (event.currentTarget === innerRoot) return path();
        return path().filter(
          (node) =>
            node !== innerRoot &&
            !(node instanceof Node && node.getRootNode() === innerRoot),
        );
      };
      element.dispatchEvent(event);
    };
    try {
      press(innerRoot.querySelector('.rr-player')!);
      expect(outer.getReplayer().getCurrentTime()).toBe(0);
      // An input in the closed root keeps its arrows too.
      const input = document.createElement('input');
      innerRoot.append(input);
      press(input);
      expect(outer.getReplayer().getCurrentTime()).toBe(0);
      // A key pressed on the outer player itself still jumps it.
      press(outerPlayer);
      expect(outer.getReplayer().getCurrentTime()).toBe(10000);
    } finally {
      inner.$destroy();
      outer.$destroy();
      outerHost.remove();
    }
  });

  it('leaves keys alone for a control focused inside a closed shadow root with no player', async () => {
    const player = await mount({ features: { jump: { keyboard: 'page' } } });
    onScreen();
    player.goto(0, false);
    const host = document.createElement('div');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'closed' });
    const button = document.createElement('button');
    root.append(button);
    // Outside a closed root, the host shows as focused. happy-dom does not
    // hide the key's path, so the test hides the button by hand.
    button.focus();
    const press = (key: string) => {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      const path = event.composedPath.bind(event);
      let routed = false;
      event.composedPath = () => {
        if (!routed) {
          routed = true;
          return path();
        }
        return [
          host,
          document.body,
          document.documentElement,
          document,
          window,
        ];
      };
      return button.dispatchEvent(event);
    };
    try {
      expect(press(' ')).toBe(true);
      expect(player.getReplayer().service.state.value).toBe('paused');
      expect(press('ArrowRight')).toBe(true);
      expect(player.getReplayer().getCurrentTime()).toBe(0);
    } finally {
      button.blur();
      host.remove();
    }
    // Keys on the page itself still reach the player.
    expect(arrow(document.body)).toBe(false);
    expect(player.getReplayer().getCurrentTime()).toBe(10000);
  });

  it('leaves keys alone for an input in the closed root of a tabbable custom element', async () => {
    const player = await mount({ features: { jump: { keyboard: 'page' } } });
    onScreen();
    player.goto(0, false);
    const host = document.createElement('x-editor');
    host.setAttribute('tabindex', '0');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'closed' });
    const input = document.createElement('input');
    root.append(input);
    input.focus();
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    // As above, the test hides the input from listeners outside the root.
    const path = event.composedPath.bind(event);
    let routed = false;
    event.composedPath = () => {
      if (!routed) {
        routed = true;
        return path();
      }
      return [host, document.body, document.documentElement, document, window];
    };
    try {
      expect(input.dispatchEvent(event)).toBe(true);
      expect(player.getReplayer().getCurrentTime()).toBe(0);
    } finally {
      input.blur();
      host.remove();
    }
  });

  it("closes marker panels on Escape from an input in another player's shadow root", async () => {
    await mount();
    const panelTarget = target;
    target
      .querySelector('.rr-custom-event')
      ?.dispatchEvent(new Event('mouseenter'));
    await tick();
    expect(panelTarget.querySelector('[role="dialog"]')).not.toBeNull();
    const host = document.createElement('div');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('div');
    root.append(inner);
    const other = new Player({
      target: inner,
      props: { events: recording(), autoPlay: false, skipInactive: false },
    });
    await tick();
    const input = document.createElement('input');
    root.append(input);
    try {
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          composed: true,
        }),
      );
      await tick();
      expect(panelTarget.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      other.$destroy();
      host.remove();
    }
  });

  it('leaves keys alone for a closed-root control nested in an open app root', async () => {
    // An app in an open shadow root holds a page-shortcut player and a
    // component whose closed root holds a button.
    const appHost = document.createElement('div');
    document.body.append(appHost);
    const appRoot = appHost.attachShadow({ mode: 'open' });
    const playerTarget = document.createElement('div');
    appRoot.append(playerTarget);
    const app = new Player({
      target: playerTarget,
      props: {
        events: recording(),
        autoPlay: false,
        skipInactive: false,
        features: { jump: { keyboard: 'page' } },
      },
    });
    await tick();
    vi.spyOn(
      appRoot.querySelector<HTMLElement>('.rr-player')!,
      'getBoundingClientRect',
    ).mockReturnValue(new DOMRect(0, 0, 400, 360));
    app.goto(0, false);
    const componentHost = document.createElement('div');
    appRoot.append(componentHost);
    const componentRoot = componentHost.attachShadow({ mode: 'closed' });
    const button = document.createElement('button');
    componentRoot.append(button);
    button.focus();
    // Browsers report the component host as the app root's focused element;
    // happy-dom leaves it undefined in nested roots, so the test sets it.
    Object.defineProperty(appRoot, 'activeElement', {
      configurable: true,
      get: () => (componentRoot.activeElement ? componentHost : null),
    });
    // Listeners outside the closed root see its host as the origin.
    const press = (key: string) => {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      const path = event.composedPath.bind(event);
      let routed = false;
      event.composedPath = () => {
        if (!routed) {
          routed = true;
          return path();
        }
        return path().filter(
          (node) =>
            node !== componentRoot &&
            !(node instanceof Node && node.getRootNode() === componentRoot),
        );
      };
      return button.dispatchEvent(event);
    };
    try {
      expect(press(' ')).toBe(true);
      expect(app.getReplayer().service.state.value).toBe('paused');
      expect(press('ArrowRight')).toBe(true);
      expect(app.getReplayer().getCurrentTime()).toBe(0);
      // Keys on the page itself still reach the player.
      button.blur();
      expect(
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'ArrowRight',
            bubbles: true,
            cancelable: true,
          }),
        ),
      ).toBe(false);
      expect(app.getReplayer().getCurrentTime()).toBe(10000);
    } finally {
      app.$destroy();
      appHost.remove();
    }
  });

  it('gives keys pressed in a nested player to that player only', async () => {
    const outer = await mount({ features: { jump: { keyboard: 'player' } } });
    onScreen();
    outer.goto(0, false);
    const innerTarget = document.createElement('div');
    target.querySelector('.rr-player')!.append(innerTarget);
    const inner = new Player({
      target: innerTarget,
      props: {
        events: recording(),
        autoPlay: false,
        skipInactive: false,
        features: { jump: { keyboard: 'player' } },
      },
    });
    try {
      await tick();
      inner.goto(0, false);
      const innerPlayer = innerTarget.querySelector('.rr-player')!;
      expect(arrow(innerPlayer)).toBe(false);
      expect(inner.getReplayer().getCurrentTime()).toBe(10000);
      expect(outer.getReplayer().getCurrentTime()).toBe(0);
    } finally {
      inner.$destroy();
    }
  });

  it('leaves page arrows alone while an ancestor hides the player', async () => {
    const player = await mount({ features: { jump: { keyboard: 'page' } } });
    onScreen();
    player.goto(0, false);
    target.style.opacity = '0';
    expect(arrow(document.body)).toBe(true);
    expect(player.getReplayer().getCurrentTime()).toBe(0);
    target.style.opacity = '';
    expect(arrow(document.body)).toBe(false);
    expect(player.getReplayer().getCurrentTime()).toBe(10000);
  });

  it('takes page arrows only while a single page-shortcut player is visible', async () => {
    const player = await mount({ features: { jump: { keyboard: 'page' } } });
    onScreen();
    player.goto(0, false);
    const otherTarget = document.createElement('div');
    document.body.append(otherTarget);
    const other = new Player({
      target: otherTarget,
      props: {
        events: recording(),
        autoPlay: false,
        features: { jump: { keyboard: 'page' } },
      },
    });
    await tick();
    vi.spyOn(
      otherTarget.querySelector<HTMLElement>('.rr-player')!,
      'getBoundingClientRect',
    ).mockReturnValue(new DOMRect(0, 400, 400, 360));
    other.goto(0, false);
    expect(arrow(document.body)).toBe(true);
    expect(player.getReplayer().getCurrentTime()).toBe(0);
    expect(other.getReplayer().getCurrentTime()).toBe(0);

    // A player whose controller is hidden takes no keys and leaves the page.
    other.$set({ showController: false });
    await tick();
    expect(arrow(document.body)).toBe(false);
    expect(player.getReplayer().getCurrentTime()).toBe(10000);
    player.goto(0, false);
    other.$set({ showController: true });
    await tick();
    expect(arrow(document.body)).toBe(true);
    expect(player.getReplayer().getCurrentTime()).toBe(0);

    other.$destroy();
    otherTarget.remove();
    expect(arrow(document.body)).toBe(false);
    expect(player.getReplayer().getCurrentTime()).toBe(10000);
  });

  it('restarts a finished replay on Play after a forward jump at the end', async () => {
    const player = await mount({ features: { jump: {} } });
    const replayer = player.getReplayer();
    player.goto(10000, false);
    (
      replayer as unknown as { emitter: { emit(type: string): void } }
    ).emitter.emit('finish');
    await tick();
    player.jump('forward');
    player.play();
    expect(replayer.getCurrentTime()).toBeLessThan(1000);
  });

  it.each(['toolbar', 'combobox', 'treegrid'])(
    'leaves arrows to a %s',
    async (role) => {
      const player = await mount({ features: { jump: { keyboard: 'page' } } });
      onScreen();
      player.goto(0, false);
      const widget = document.createElement('div');
      widget.setAttribute('role', role);
      const item = document.createElement('button');
      widget.append(item);
      document.body.append(widget);
      try {
        expect(arrow(item)).toBe(true);
        expect(player.getReplayer().getCurrentTime()).toBe(0);
      } finally {
        widget.remove();
      }
    },
  );

  it('leaves arrows to alert dialogs', async () => {
    const player = await mount({ features: { jump: { keyboard: 'page' } } });
    onScreen();
    player.goto(0, false);
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'alertdialog');
    const confirm = document.createElement('button');
    dialog.append(confirm);
    document.body.append(dialog);
    try {
      expect(arrow(confirm)).toBe(true);
      expect(player.getReplayer().getCurrentTime()).toBe(0);
    } finally {
      dialog.remove();
    }
  });

  it('jumps within events appended in the same frame', async () => {
    const player = await mount({ features: { jump: {} } });
    player.goto(8000, false);
    player.addEvent({
      type: EventType.Custom,
      timestamp: start + 30000,
      data: { tag: 'late', payload: {} },
    });
    player.jump('forward');
    expect(player.getReplayer().getCurrentTime()).toBe(18000);
  });

  it('takes arrows from controls inside the player and, on the page, from other buttons', async () => {
    const player = await mount({ features: { jump: { keyboard: 'player' } } });
    const back = target.querySelector('[aria-label="Back 10 seconds"]')!;
    player.goto(5000, false);
    expect(arrow(back)).toBe(false);
    expect(player.getReplayer().getCurrentTime()).toBe(10000);
    const outside = document.createElement('button');
    target.append(outside);
    expect(arrow(outside, 'ArrowLeft')).toBe(true);
    expect(player.getReplayer().getCurrentTime()).toBe(10000);

    player.$set({ features: { jump: { keyboard: 'page' } } });
    await tick();
    onScreen();
    expect(arrow(outside, 'ArrowLeft')).toBe(false);
    expect(player.getReplayer().getCurrentTime()).toBe(0);
  });
});

describe('player transport', () => {
  it('jumps without player focus and leaves inputs and the timeline in control', async () => {
    const player = await mount({ features: { jump: { keyboard: 'page' } } });
    const playerElement = target.querySelector<HTMLElement>('.rr-player')!;
    vi.spyOn(playerElement, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 400, 360),
    );
    const arrow = (el: Element, key: string) =>
      el.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );
    arrow(document.body, 'ArrowRight');
    expect(player.getReplayer().getCurrentTime()).toBe(10000);
    expect(player.getReplayer().service.state.value).toBe('paused');
    const input = document.createElement('input');
    target.append(input);
    arrow(input, 'ArrowLeft');
    expect(player.getReplayer().getCurrentTime()).toBe(10000);
    arrow(target.querySelector('[role="slider"]')!, 'ArrowLeft');
    expect(player.getReplayer().getCurrentTime()).toBe(5000);
    click('[aria-label="Back 10 seconds"]');
    expect(player.getReplayer().getCurrentTime()).toBe(0);
    click('[aria-label="Forward 10 seconds"]');
    expect(player.getReplayer().getCurrentTime()).toBe(10000);
  });

  it('plays and pauses on Space with the jump keys, leaving controls their own Space', async () => {
    const press = (el: Element, repeat = false) =>
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: ' ',
          bubbles: true,
          cancelable: true,
          repeat,
        }),
      );
    const state = () => player.getReplayer().service.state.value;

    // Without the jump keys, Space is left to the page.
    let player = await mount({ features: { jump: {} } });
    expect(press(target.querySelector('.rr-player')!)).toBe(true);
    expect(state()).toBe('paused');
    player.$destroy();
    target.remove();

    player = await mount({ features: { jump: { keyboard: 'player' } } });
    const root = target.querySelector('.rr-player')!;
    expect(press(root)).toBe(false);
    expect(state()).toBe('playing');
    // Holding Space down toggles once.
    press(root, true);
    expect(state()).toBe('playing');
    press(root);
    expect(state()).toBe('paused');
    // Space on the player's buttons and fields stays theirs.
    for (const control of [
      target.querySelector('button')!,
      target.querySelector('[role="slider"]')!,
    ]) {
      expect(press(control)).toBe(true);
      expect(state()).toBe('paused');
    }
    // In player scope, Space elsewhere on the page scrolls it as before.
    expect(press(document.body)).toBe(true);
    expect(state()).toBe('paused');
  });

  it('plays and pauses on Space anywhere on the page in page scope', async () => {
    const player = await mount({ features: { jump: { keyboard: 'page' } } });
    vi.spyOn(
      target.querySelector<HTMLElement>('.rr-player')!,
      'getBoundingClientRect',
    ).mockReturnValue(new DOMRect(0, 0, 400, 360));
    const press = (el: Element) =>
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: ' ',
          bubbles: true,
          cancelable: true,
        }),
      );
    expect(press(document.body)).toBe(false);
    expect(player.getReplayer().service.state.value).toBe('playing');
    const button = document.createElement('button');
    document.body.append(button);
    try {
      expect(press(button)).toBe(true);
      expect(player.getReplayer().service.state.value).toBe('playing');
    } finally {
      button.remove();
    }
  });

  it('leaves page arrows available while the player is hidden or the page is editable', async () => {
    const player = await mount({ features: { jump: { keyboard: 'page' } } });
    const playerElement = target.querySelector<HTMLElement>('.rr-player')!;
    vi.spyOn(playerElement, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 400, 360),
    );
    const forward = () =>
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
          cancelable: true,
        }),
      );

    playerElement.style.visibility = 'hidden';
    expect(forward()).toBe(true);
    expect(player.getReplayer().getCurrentTime()).toBeLessThan(10000);

    playerElement.style.visibility = 'visible';
    document.designMode = 'on';
    try {
      expect(forward()).toBe(true);
      expect(player.getReplayer().getCurrentTime()).toBeLessThan(10000);
    } finally {
      document.designMode = 'off';
    }
  });

  it('keeps jumping available while skipping inactivity', async () => {
    vi.useFakeTimers({
      toFake: [
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
        'setTimeout',
        'clearTimeout',
      ],
    });
    const player = await mount({
      skipInactive: true,
      features: { jump: { seconds: 2, keyboard: 'player' } },
    });
    const replayer = player.getReplayer();
    const next = target.querySelector<HTMLButtonElement>(
      '[aria-label="Forward 2 seconds"]',
    )!;
    player.goto(0, true);
    replayer.speedService.send({
      type: 'FAST_FORWARD',
      payload: { speed: 10 },
    });
    await tick();

    expect(next.disabled).toBe(false);
    next.click();
    expect(replayer.getCurrentTime()).toBe(2000);
    // The jump keeps the replay playing, and its clock moves on.
    expect(replayer.service.state.value).toBe('playing');
    vi.advanceTimersByTime(100);
    expect(replayer.getCurrentTime()).toBeGreaterThan(2000);
  });

  it('shows a play button over a paused replay only when asked', async () => {
    let player = await mount();
    expect(target.querySelector('.rr-player__play-overlay')).toBeNull();
    player.$destroy();
    target.remove();

    player = await mount({ showPlayOverlay: true, showController: false });
    const button = () =>
      target.querySelector<HTMLButtonElement>(
        '.rr-player__play-overlay button[aria-label="Play"]',
      );
    expect(button()).not.toBeNull();
    button()!.click();
    await tick();
    expect(player.getReplayer().service.state.value).toBe('playing');
    expect(button()).toBeNull();
    player.pause();
    await tick();
    expect(button()).not.toBeNull();

    // Keyboard focus on the button stays in the player after it plays.
    player.pause();
    await tick();
    button()!.focus();
    button()!.click();
    await tick();
    expect(document.activeElement).toBe(target.querySelector('.rr-player'));
    // A live replay is never paused, so it shows no play button.
    player.pause();
    await tick();
    expect(button()).not.toBeNull();
    player.getReplayer().startLive();
    await tick();
    expect(player.getReplayer().service.state.value).toBe('live');
    expect(button()).toBeNull();

    // Turned on while the replay plays, it stays hidden until a pause.
    player.$destroy();
    target.remove();
    player = await mount({ showController: false });
    player.play();
    player.$set({ showPlayOverlay: true });
    await tick();
    expect(button()).toBeNull();
  });

  it('offers click-to-play without the controller', async () => {
    const player = await mount({
      showController: false,
      clickToPlay: true,
    });
    const surface = target.querySelector<HTMLButtonElement>(
      '.rr-player__surface',
    )!;
    // The only control says what activating it will do.
    expect(surface.getAttribute('aria-label')).toBe('Play replay');
    surface.click();
    await tick();
    expect(player.getReplayer().service.state.value).toBe('playing');
    expect(surface.getAttribute('aria-label')).toBe('Pause replay');
  });

  it('toggles on a surface click and ignores a drag that leaves the surface', async () => {
    const player = await mount({ clickToPlay: true });
    const surface = target.querySelector<HTMLButtonElement>(
      '.rr-player__surface',
    )!;
    const state = () => player.getReplayer().service.state.value;
    const pointer = (type: string, x: number, pointerId = 1) =>
      surface.dispatchEvent(
        new PointerEvent(type, {
          button: 0,
          clientX: x,
          isPrimary: true,
          pointerId,
        }),
      );
    const mouseClick = () =>
      surface.dispatchEvent(new MouseEvent('click', { detail: 1 }));

    pointer('pointerdown', 1);
    pointer('pointerleave', -1);
    pointer('pointerup', 1);
    mouseClick();
    expect(state()).toBe('paused');

    // A drag that stays on the surface, and a release away from the press
    // without a move before it, are not clicks either.
    pointer('pointerdown', 1);
    pointer('pointermove', 20);
    pointer('pointerup', 20);
    mouseClick();
    expect(state()).toBe('paused');
    pointer('pointerdown', 1);
    pointer('pointerup', 30);
    mouseClick();
    expect(state()).toBe('paused');

    pointer('pointerdown', 1);
    pointer('pointercancel', 1, 2);
    pointer('pointerup', 1);
    mouseClick();
    expect(state()).toBe('playing');

    surface.click();
    expect(state()).toBe('paused');
  });
});

describe('player annotations', () => {
  it('keeps scrollable timeline marker panels outside the seek button and prevents timeline marker panel clicks from seeking', async () => {
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

  it('shows captions by default at the recording start when mounted paused', async () => {
    const events: eventWithTime[] = [
      recording()[0],
      annotation(0, 'Intro caption'),
      { ...recording().at(-1)!, timestamp: start + 10000 },
    ];
    await mount({ events, autoPlay: false });
    expect(target.querySelector('.rr-player__caption')?.textContent).toBe(
      'Intro caption',
    );
  });

  it('shows a caption queued before meta immediately when mounted paused', async () => {
    const events: eventWithTime[] = [
      annotation(0, 'Queued intro caption'),
      {
        type: EventType.Meta,
        timestamp: start + 5,
        data: { href: 'https://example.com', width: 800, height: 400 },
      },
      { ...recording().at(-1)!, timestamp: start + 10000 },
    ];
    await mount({ events, autoPlay: false });
    expect(target.querySelector('.rr-player__caption')?.textContent).toBe(
      'Queued intro caption',
    );
  });

  it('toggles captions independently of timeline markers and preserves ordinary markers', async () => {
    const player = await mount({ showCaptions: false });
    player.goto(2500, false);
    await tick();
    expect(target.querySelector('.rr-player__caption')).toBeNull();
    expect(target.querySelector('[role="dialog"]')?.textContent).toContain(
      'Click Save',
    );
    expect(target.querySelector('[title="ordinary"]')).not.toBeNull();
    const captionsToggle = target.querySelector<HTMLButtonElement>(
      'button[aria-label="CC captions"]',
    );
    expect(captionsToggle?.getAttribute('aria-pressed')).toBe('false');
    captionsToggle?.click();
    await tick();
    expect(captionsToggle?.getAttribute('aria-pressed')).toBe('true');
    expect(target.querySelector('.rr-player__caption')).not.toBeNull();
    captionsToggle?.click();
    await tick();
    expect(captionsToggle?.getAttribute('aria-pressed')).toBe('false');
    expect(target.querySelector('.rr-player__caption')).toBeNull();
  });

  it('supports accessible keyboard seeking on the timeline slider', async () => {
    const player = await mount();
    player.goto(3000, false);
    await tick();

    const timeline = target.querySelector<HTMLElement>('[role="slider"]');
    expect(timeline).not.toBeNull();
    expect(timeline?.getAttribute('aria-label')).toBe('Playback position');
    expect(timeline?.tabIndex).toBe(0);
    expect(timeline?.getAttribute('aria-valuemin')).toBe('0');
    expect(timeline?.getAttribute('aria-valuemax')).toBe('10000');
    expect(timeline?.getAttribute('aria-valuenow')).toBe('3000');
    const marker = target.querySelector<HTMLElement>('.rr-custom-event');
    expect(timeline?.contains(marker)).toBe(false);

    const press = async (key: string, handled: boolean) => {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      });
      timeline?.dispatchEvent(event);
      await tick();
      expect(event.defaultPrevented).toBe(handled);
    };

    await press('ArrowRight', true);
    expect(player.getReplayer().getCurrentTime()).toBe(8000);
    expect(timeline?.getAttribute('aria-valuenow')).toBe('8000');
    await press('ArrowRight', true);
    expect(player.getReplayer().getCurrentTime()).toBe(10000);
    await press('ArrowRight', true);
    expect(player.getReplayer().getCurrentTime()).toBe(10000);
    await press('ArrowLeft', true);
    expect(player.getReplayer().getCurrentTime()).toBe(5000);
    await press('Home', true);
    expect(player.getReplayer().getCurrentTime()).toBe(0);
    await press('ArrowLeft', true);
    expect(player.getReplayer().getCurrentTime()).toBe(0);
    await press('End', true);
    expect(player.getReplayer().getCurrentTime()).toBe(10000);

    await press('x', false);
    expect(player.getReplayer().getCurrentTime()).toBe(10000);
    const descendantKey = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
      cancelable: true,
    });
    marker?.dispatchEvent(descendantKey);
    await tick();
    expect(descendantKey.defaultPrevented).toBe(false);
    expect(player.getReplayer().getCurrentTime()).toBe(10000);
  });

  it('seeks to the exact recording end with a whole-second accessible range', async () => {
    const events = recording();
    events[events.length - 1] = {
      ...events.at(-1)!,
      timestamp: start + 10543,
    };
    const player = await mount({ events });
    const timeline = target.querySelector<HTMLElement>('[role="slider"]');
    expect(timeline?.getAttribute('aria-valuemax')).toBe('10000');

    timeline?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'End',
        bubbles: true,
        cancelable: true,
      }),
    );
    await tick();

    expect(player.getReplayer().getCurrentTime()).toBe(10543);
    expect(timeline?.getAttribute('aria-valuenow')).toBe('10000');
  });

  it('focuses the timeline slider after scrubbing so keyboard seeking works', async () => {
    const player = await mount();
    const progress = target.querySelector<HTMLElement>('.rr-progress');
    const timeline = target.querySelector<HTMLElement>('[role="slider"]');
    expect(progress).not.toBeNull();
    expect(timeline).not.toBeNull();
    if (!progress || !timeline) return;

    vi.spyOn(progress, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 100,
    } as DOMRect);
    progress.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: 20 }),
    );
    await tick();

    expect(player.getReplayer().getCurrentTime()).toBe(2000);
    expect(document.activeElement).toBe(timeline);

    timeline.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      }),
    );
    await tick();
    expect(player.getReplayer().getCurrentTime()).toBe(7000);
  });

  it('reports the floored whole-second timeline value while keeping exact replay time', async () => {
    const player = await mount();
    const timeline = target.querySelector<HTMLElement>('[role="slider"]');

    player.goto(3000, false);
    await tick();
    expect(timeline?.getAttribute('aria-valuenow')).toBe('3000');
    player.goto(3100, false);
    await tick();
    expect(player.getReplayer().getCurrentTime()).toBe(3100);
    expect(timeline?.getAttribute('aria-valuenow')).toBe('3000');
    player.goto(3200, false);
    await tick();
    expect(player.getReplayer().getCurrentTime()).toBe(3200);
    expect(timeline?.getAttribute('aria-valuenow')).toBe('3000');
    player.goto(4000, false);
    await tick();
    expect(player.getReplayer().getCurrentTime()).toBe(4000);
    expect(timeline?.getAttribute('aria-valuenow')).toBe('4000');
  });

  it('seeks exactly to a timeline marker and supports captions without controls', async () => {
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
    const updated = new Promise((r) =>
      player.getReplayer().on('events-updated', () => r(undefined)),
    );
    player.addEvent(annotation(7000, 'Added later'));
    player.addEvent(timelineMarker(7000, 'A new timeline marker'));
    await updated;
    await tick();
    await tick();
    player.goto(7000, false);
    await tick();
    expect(target.querySelectorAll('.rr-custom-event')).toHaveLength(2);
    expect(target.querySelector('.rr-player__caption')?.textContent).toBe(
      'Added later',
    );
  });

  async function expectPausedCaptionUpdate(
    addedEvent: eventWithTime,
    expectedCaption: string | null,
  ) {
    const endSnapshot: eventWithTime = {
      ...recording().at(-1)!,
      timestamp: start + 10000,
    };
    const player = await mount({
      events: [
        recording()[0],
        annotation(1000, 'Existing caption'),
        endSnapshot,
      ],
    });
    player.getReplayer().pause(7000);
    await tick();
    expect(target.querySelector('.rr-player__caption')?.textContent).toBe(
      'Existing caption',
    );

    const updated = new Promise((r) =>
      player.getReplayer().on('events-updated', () => r(undefined)),
    );
    player.addEvent(addedEvent);
    await updated;
    await tick();
    await tick();

    expect(player.getReplayer().getCurrentTime()).toBe(7000);
    expect(
      target.querySelector('.rr-player__caption')?.textContent ?? null,
    ).toBe(expectedCaption);
  }

  it('refreshes a paused caption when a caption is appended before the playhead', async () => {
    await expectPausedCaptionUpdate(
      annotation(6000, 'Updated caption'),
      'Updated caption',
    );
  });

  it('refreshes a paused caption when a caption is appended at the playhead', async () => {
    await expectPausedCaptionUpdate(
      annotation(7000, 'Updated caption'),
      'Updated caption',
    );
  });

  it('clears a paused caption when a clear event is appended before the playhead', async () => {
    await expectPausedCaptionUpdate(clear(6000), null);
  });

  it('clears a paused caption when a clear event is appended at the playhead', async () => {
    await expectPausedCaptionUpdate(clear(7000), null);
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

  it('coalesces caption lookups when seeking across 100,000 captions', async () => {
    const events = [
      recording()[0],
      ...Array.from({ length: 100000 }, (_, i) => annotation(i + 1, String(i))),
      { ...recording().at(-1)!, timestamp: start + 100001 },
    ];
    const player = await mount({ events });
    const lookups = vi.spyOn(annotations, 'getActiveCaption');
    try {
      player.goto(100000, false);
      await tick();
      expect(target.querySelector('.rr-player__caption')?.textContent).toBe(
        '99999',
      );
      expect(lookups).toHaveBeenCalledTimes(1);
    } finally {
      lookups.mockRestore();
    }
  });

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

  it('returns focus to the timeline when Escape dismisses a panel during skipping', async () => {
    const player = await mount();
    player.goto(2000, false);
    await tick();
    const marker = target.querySelector<HTMLButtonElement>('.rr-custom-event');
    const panel = target.querySelector<HTMLDivElement>('[role="dialog"]');
    const timeline = target.querySelector<HTMLElement>('[role="slider"]');

    panel?.focus();
    expect(document.activeElement).toBe(panel);
    player.getReplayer().speedService.send({
      type: 'FAST_FORWARD',
      payload: { speed: 5 },
    });
    await tick();
    expect(player.getReplayer().speedService.state.value).toBe('skipping');
    expect(marker?.disabled).toBe(true);

    panel?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await tick();

    expect(target.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(timeline);
    expect(player.getReplayer().getCurrentTime()).toBe(2000);
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
      events: recording().filter(
        (event) => event.type !== EventType.Annotation,
      ),
    });
    expect(target.querySelector('button[aria-pressed]')).toBeNull();
  });

  it('dismisses hover timeline marker panels with Escape even when the marker is not focused', async () => {
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

  it('lets marker shortcuts bubble without seeking and dismisses focused timeline marker panels', async () => {
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

  it('shows timeline markers without a CC toggle when no caption set events exist', async () => {
    await mount({
      events: [
        recording()[0],
        timelineMarker(2000, 'Just a timeline marker'),
        clear(5000),
      ],
    });
    expect(target.querySelectorAll('.rr-custom-event')).toHaveLength(1);
    expect(target.querySelector('button[aria-pressed]')).toBeNull();
  });

  it('colors annotation markers separately from custom event tags', async () => {
    await mount({
      timelineMarkerColor: 'red',
      tags: { annotation: 'blue', ordinary: 'green' },
    });
    expect(
      (target.querySelector('.rr-custom-event__tick') as HTMLElement).style
        .background,
    ).toBe('red');
    expect(
      (target.querySelector('[title="ordinary"]') as HTMLElement).style
        .background,
    ).toBe('green');
  });

  it('emits annotation events separately from custom events during seeks', async () => {
    const player = await mount();
    const seen: eventWithTime[] = [];
    const custom: eventWithTime[] = [];
    player
      .getReplayer()
      .on('annotation', (event) => seen.push(event as eventWithTime));
    player
      .getReplayer()
      .on('custom-event', (event) => custom.push(event as eventWithTime));
    player.goto(6500, false);
    expect(
      seen.map(({ type, timestamp, data }) => ({ type, timestamp, data })),
    ).toEqual([
      annotation(2000, 'Click Save\n<b>project</b>'),
      timelineMarker(2000, 'Click Save to create your project.'),
      clear(5000),
    ]);
    expect(
      custom.map(({ type, timestamp, data }) => ({ type, timestamp, data })),
    ).toEqual([recording()[4]]);
  });

  it('never creates timeline markers for caption set, clear, or invalid annotation events', async () => {
    const player = await mount();
    expect(target.querySelectorAll('.rr-custom-event')).toHaveLength(1);
    expect(target.querySelector('[title="annotation"]')).toBeNull();
    player.addEvent({
      type: EventType.Annotation,
      timestamp: start + 7000,
      data: { type: 'caption', text: 123 } as never,
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
