// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pack } from '@rrweb/packer';
import { tick } from 'svelte';
import {
  EventType,
  IncrementalSource,
  MouseInteractions,
  NodeType,
} from '@rrweb/types';
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
const replayClick = (offset: number): eventWithTime => ({
  type: EventType.IncrementalSnapshot,
  timestamp: start + offset,
  data: {
    source: IncrementalSource.MouseInteraction,
    type: MouseInteractions.Click,
    id: 1,
    x: 20,
    y: 20,
  },
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
/** Mounts the player with the opt-in toolbar and jump buttons. */
async function mountToolbar(props: Record<string, unknown> = {}) {
  return mount({
    ...props,
    features: { toolbar: true, jump: {}, ...(props.features as object) },
  });
}

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

  it('keeps the classic controls unless the host opts into the toolbar', async () => {
    const player = await mount();
    expect(target.querySelector('.rr-controller__btns')).not.toBeNull();
    expect(
      target.querySelectorAll('.rr-timeline .rr-timeline__time'),
    ).toHaveLength(2);
    expect(target.querySelector('.rr-toolbar')).toBeNull();
    expect(target.querySelector('.rr-player--toolbar')).toBeNull();

    player.$set({ features: { toolbar: true } });
    await tick();
    expect(target.querySelector('.rr-toolbar')).not.toBeNull();
    expect(target.querySelector('.rr-controller__btns')).toBeNull();
    expect(
      target.querySelectorAll('.rr-timeline .rr-timeline__time'),
    ).toHaveLength(0);
    expect(target.querySelector('[role="timer"]')?.textContent).toMatch(
      /00:00\s*\/\s*00:10/,
    );
    // Jump buttons still follow features.jump.
    expect(target.querySelector('[aria-label="Back 10 seconds"]')).toBeNull();
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

describe('player fullscreen', () => {
  let fullscreenElement: Element | null;
  const exitFullscreen = vi.fn(() => Promise.resolve());

  beforeEach(() => {
    fullscreenElement = null;
    exitFullscreen.mockClear();
    Object.defineProperties(document, {
      fullscreen: { configurable: true, get: () => fullscreenElement !== null },
      fullscreenElement: { configurable: true, get: () => fullscreenElement },
      exitFullscreen: { configurable: true, value: exitFullscreen },
    });
  });

  afterEach(() => {
    for (const property of [
      'fullscreen',
      'fullscreenElement',
      'exitFullscreen',
    ]) {
      Reflect.deleteProperty(document, property);
    }
  });

  it('fits fullscreen around the controls and restores the latest embedded size', async () => {
    const player = await mount({ width: 640, height: 360, maxScale: 0 });
    const root = target.querySelector<HTMLElement>('.rr-player')!;
    const viewport = root.querySelector<HTMLElement>('.rr-player__viewport')!;
    Object.defineProperties(root, {
      clientWidth: { value: 1200 },
      clientHeight: { value: 800 },
    });
    // The recording is 800 by 400; the replay scales to fit the viewport.
    const { iframe, wrapper } = player.getReplayer();
    Object.defineProperties(iframe, {
      offsetWidth: { value: 800 },
      offsetHeight: { value: 400 },
    });

    fullscreenElement = root;
    document.dispatchEvent(new Event('fullscreenchange'));
    await tick();
    expect([viewport.style.width, viewport.style.height]).toEqual([
      '1200px',
      '720px',
    ]);
    expect(wrapper.style.transform).toContain('scale(1.5)');

    player.$set({ width: 500, height: 280, showController: false });
    await tick();
    expect([viewport.style.width, viewport.style.height]).toEqual([
      '1200px',
      '800px',
    ]);

    fullscreenElement = null;
    document.dispatchEvent(new Event('fullscreenchange'));
    await tick();
    expect([viewport.style.width, viewport.style.height]).toEqual([
      '500px',
      '280px',
    ]);
    expect(wrapper.style.transform).toContain('scale(0.625)');
  });

  it('keeps the replay scale while a hidden player is resized', async () => {
    const player = await mount();
    const { wrapper } = player.getReplayer();
    // A hidden player has no layout, so the replay frame measures 0 by 0.
    wrapper.style.transform = 'scale(0.8) translate(-50%, -50%)';
    player.$set({ width: 700, height: 400 });
    await tick();
    expect(wrapper.style.transform).toContain('scale(0.8)');
  });

  it('only exits fullscreen when this player owns it', async () => {
    const player = await mount();
    const root = target.querySelector<HTMLElement>('.rr-player')!;
    const requestFullscreen = vi.fn(() => Promise.resolve());
    Object.defineProperty(root, 'requestFullscreen', {
      value: requestFullscreen,
    });

    fullscreenElement = target;
    player.toggleFullscreen();
    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(exitFullscreen).not.toHaveBeenCalled();

    fullscreenElement = root;
    player.toggleFullscreen();
    expect(exitFullscreen).toHaveBeenCalledOnce();
  });
});

describe('timeline activity', () => {
  it('shows a late click while paused and lets the viewer choose a seek time', async () => {
    const player = await mount({
      features: { timeline: { activityGraph: true } },
    });
    player.goto(0, false);
    await tick();
    expect(target.querySelector('.rr-activity')).toBeNull();
    player.addEvent(replayClick(4000));
    // The Replayer reports appended events on the next animation frame.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await tick();
    const graph = target.querySelector<HTMLButtonElement>('.rr-activity')!;
    expect(graph?.querySelector('line')).toBeTruthy();
    graph.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    expect(player.getReplayer().getCurrentTime()).toBe(0);
    graph.click();
    await tick();
    expect(player.getReplayer().getCurrentTime()).toBe(1000);
    expect(player.getReplayer().service.state.value).toBe('paused');
  });

  it('clears the keyboard choice after a pointer seek', async () => {
    const player = await mount({
      events: [...recording(), replayClick(4000)],
      features: { timeline: { activityGraph: true } },
    });
    const graph = target.querySelector<HTMLButtonElement>('.rr-activity')!;
    vi.spyOn(graph, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(80, 0, 400, 60),
    );
    const chooseNext = () =>
      graph.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
        }),
      );
    chooseNext();

    graph.dispatchEvent(
      new MouseEvent('click', { clientX: 180, detail: 1, bubbles: true }),
    );
    await tick();

    expect(player.getReplayer().getCurrentTime()).toBe(2500);
    expect(graph.querySelector('[stroke-dasharray]')).toBeNull();
    chooseNext();
    graph.click();
    expect(player.getReplayer().getCurrentTime()).toBe(3500);
  });

  it('keeps the graph visible as the pointer moves over its upper portion', async () => {
    await mount({
      events: [...recording(), replayClick(4000)],
      features: { timeline: { activityGraph: true } },
    });
    const container = target.querySelector('.rr-player')!;
    const graph = target.querySelector('.rr-activity')!;
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 400, 200),
    );
    // The graph spans 110 to 150, just above the track.
    vi.spyOn(graph, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 110, 400, 40),
    );
    const move = (element: Element, clientY: number) =>
      element.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerType: 'mouse',
          clientY,
        }),
      );
    move(container, 160);
    await tick();
    expect(graph.classList.contains('shown')).toBe(true);

    move(graph, 120);
    await tick();
    expect(graph.classList.contains('shown')).toBe(true);

    move(container, 100);
    await tick();
    expect(graph.classList.contains('shown')).toBe(false);
  });

  it('hides the graph when the only recorded layer is turned off', async () => {
    await mount({
      events: [...recording(), replayClick(4000)],
      features: { toolbar: true, timeline: { activityGraph: true } },
    });
    expect(target.querySelector('.rr-activity')).toBeTruthy();

    click('[aria-label="Timeline activity"]');
    await tick();
    const labels = [...target.querySelectorAll('label')];
    labels
      .find((label) => label.textContent?.trim() === 'Clicks')
      ?.control?.click();
    await tick();

    expect(target.querySelector('.rr-activity')).toBeNull();
    expect(
      target.querySelector('[aria-label="Timeline activity"]'),
    ).toBeTruthy();
  });
});

describe('player annotations', () => {
  it('retains a cast-only annotation across a later unannotated segment', async () => {
    const player = await mountToolbar({
      events: recording().filter(
        (event) => event.type !== EventType.Annotation,
      ),
    });
    click('[aria-label="Replay settings"]');
    await tick();
    const toggle = () => target.querySelector('[aria-label="Annotations"]');
    expect(toggle()).toBeNull();

    // Emit the engine notification without adding the annotation to its public list.
    player
      .getReplayer()
      ['emitter'].emit('event-cast', annotation(1000, 'Order placed'));
    await tick();
    expect(toggle()).not.toBeNull();
    player.addEvent({
      type: EventType.Custom,
      timestamp: start + 12000,
      data: { tag: 'segment-end', payload: {} },
    });
    // The Replayer reports appended events on the next animation frame.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await tick();
    expect(toggle()).not.toBeNull();
  });

  it('keeps annotations hidden across caption prop changes and appended events', async () => {
    const initialEvents = recording().filter(
      (event) => event.type !== EventType.Annotation,
    );
    const player = await mountToolbar({ events: initialEvents });
    click('[aria-label="Replay settings"]');
    await tick();
    const switchControl = () =>
      target.querySelector<HTMLInputElement>(
        '[role="switch"][aria-label="Annotations"]',
      );
    expect(switchControl()).toBeNull();

    player.addEvent(annotation(11000, 'Appended caption'));
    player.addEvent(timelineMarker(11000, 'Appended note'));
    // The Replayer reports appended events on the next animation frame.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await tick();
    player.goto(11000, false);
    await tick();
    expect(switchControl()?.checked).toBe(true);
    expect(target.querySelector('.rr-player__caption')?.textContent).toBe(
      'Appended caption',
    );

    switchControl()?.click();
    player.$set({ showCaptions: false });
    await tick();
    player.$set({ showCaptions: true });
    player.addEvent(timelineMarker(12000, 'Another note'));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await tick();
    expect(switchControl()?.checked).toBe(false);
    expect(target.querySelector('.rr-player__caption')).toBeNull();
    expect(target.querySelector('.rr-custom-event')).toBeNull();
    expect(target.querySelector('[title="ordinary"]')).not.toBeNull();

    switchControl()?.click();
    await tick();
    expect(target.querySelector('.rr-player__caption')?.textContent).toBe(
      'Appended caption',
    );
    expect(target.querySelectorAll('.rr-custom-event')).toHaveLength(2);
  });

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
    player.$set({ showCaptions: true });
    await tick();
    expect(target.querySelector('.rr-player__caption')).not.toBeNull();
    player.$set({ showCaptions: false });
    await tick();
    expect(target.querySelector('.rr-player__caption')).toBeNull();
    expect(target.querySelector('[role="dialog"]')?.textContent).toContain(
      'Click Save',
    );
  });

  it.each([true, false])(
    'toggles all annotations from settings with showCaptions initially %s',
    async (showCaptions) => {
      const player = await mountToolbar({ showCaptions });
      player.goto(2500, false);
      await tick();
      // Captions and timeline notes start in the state the switch shows.
      expect(!!target.querySelector('.rr-player__caption')).toBe(showCaptions);
      expect(!!target.querySelector('.rr-custom-event')).toBe(showCaptions);
      click('[aria-label="Replay settings"]');
      await tick();
      const toggle = target.querySelector<HTMLInputElement>(
        '[role="switch"][aria-label="Annotations"]',
      )!;
      // The switch shows the host's showCaptions instead of overriding it.
      expect(toggle.checked).toBe(showCaptions);
      if (!showCaptions) {
        toggle.click();
        await tick();
        expect(target.querySelector('.rr-player__caption')).not.toBeNull();
      }
      toggle.click();
      await tick();
      expect(target.querySelector('.rr-player__caption')).toBeNull();
      expect(target.querySelector('.rr-custom-event')).toBeNull();
      expect(target.querySelector('[title="ordinary"]')).not.toBeNull();
      toggle.click();
      await tick();
      expect(target.querySelector('.rr-player__caption')).not.toBeNull();
      expect(target.querySelector('.rr-custom-event')).not.toBeNull();
    },
  );

  it('restores classic timeline notes and captions when the toolbar is turned off', async () => {
    const player = await mountToolbar();
    player.goto(2500, false);
    await tick();
    click('[aria-label="Replay settings"]');
    await tick();
    click('[role="switch"][aria-label="Annotations"]');
    await tick();
    expect(target.querySelector('.rr-custom-event')).toBeNull();

    player.$set({ features: {} });
    await tick();
    expect(target.querySelector('.rr-custom-event')).not.toBeNull();
    // The switch also turned captions off; the classic CC button restores them.
    expect(target.querySelector('.rr-player__caption')).toBeNull();
    click('[aria-label="CC captions"]');
    await tick();
    expect(target.querySelector('.rr-player__caption')).not.toBeNull();
  });

  it('leaves out the toolbar controls a host turns off and keeps the rest', async () => {
    const player = await mountToolbar({
      controls: { speed: false, settings: false, time: false },
    });
    expect(target.querySelector('[role="timer"]')).toBeNull();
    expect(target.querySelector('[aria-label="Playback speed"]')).toBeNull();
    expect(target.querySelector('[aria-label="Replay settings"]')).toBeNull();
    expect(target.querySelector('[aria-label="Play"]')).not.toBeNull();
    expect(
      target.querySelector('[aria-label="Back 10 seconds"]'),
    ).not.toBeNull();
    expect(target.querySelector('[aria-label="Fullscreen"]')).not.toBeNull();

    player.$set({ controls: { play: false, jump: false, fullscreen: false } });
    await tick();
    expect(target.querySelector('[role="timer"]')).not.toBeNull();
    expect(target.querySelector('[aria-label="Play"]')).toBeNull();
    expect(target.querySelector('[aria-label="Back 10 seconds"]')).toBeNull();
    expect(target.querySelector('[aria-label="Fullscreen"]')).toBeNull();
    expect(
      target.querySelector('[aria-label="Playback speed"]'),
    ).not.toBeNull();
  });

  it('draws host icons in the toolbar and the built-in ones otherwise', async () => {
    const seen: string[] = [];
    const icon = ({
      name,
      seconds,
      document: doc,
    }: {
      name: string;
      seconds: number;
      document: Document;
    }) => {
      seen.push(`${name}:${seconds}`);
      const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('data-icon', name);
      return svg;
    };
    const player = await mountToolbar({
      icons: { play: icon, 'jump-back': icon },
    });
    const play = target.querySelector('[aria-label="Play"]')!;
    const custom = play.querySelector('svg[data-icon="play"]')!;
    expect(custom.getAttribute('aria-hidden')).toBe('true');
    expect(custom.getAttribute('focusable')).toBe('false');
    expect(seen).toContain('jump-back:10');
    // Icons the host did not replace stay built in.
    expect(
      target.querySelector('[aria-label="Forward 10 seconds"] svg[data-icon]'),
    ).toBeNull();
    expect(
      target.querySelector('[aria-label="Forward 10 seconds"] svg'),
    ).not.toBeNull();

    player.$set({ icons: {} });
    await tick();
    expect(target.querySelector('svg[data-icon]')).toBeNull();
  });

  it('ignores controls and icons without the toolbar', async () => {
    await mount({
      features: { jump: {} },
      controls: { play: false, jump: false },
      icons: {
        play: ({ document: doc }: { document: Document }) =>
          doc.createElementNS('http://www.w3.org/2000/svg', 'svg'),
      },
    });
    expect(target.querySelector('.rr-toolbar')).toBeNull();
    expect(
      target.querySelector('[aria-label="Back 10 seconds"]'),
    ).not.toBeNull();
    expect(target.querySelector('.rr-icon-override')).toBeNull();
  });

  it('runs the timeline across the player with the toolbar only', async () => {
    const player = await mount();
    expect(target.querySelector('.rr-timeline--toolbar')).toBeNull();
    player.$set({ features: { toolbar: true } });
    await tick();
    expect(target.querySelector('.rr-timeline--toolbar')).not.toBeNull();
  });

  it('shows when the recording started on hovering the time', async () => {
    const player = await mountToolbar({ recordingTimeZone: 'Asia/Tokyo' });
    const time = target.querySelector<HTMLElement>('[role="timer"]')!;
    expect(time.tabIndex).toBe(0);
    time.dispatchEvent(new PointerEvent('pointerenter'));
    await tick();
    const tooltip = target.querySelector('[role="tooltip"]')!;
    expect(tooltip.textContent).toContain('Recording started');
    expect(tooltip.textContent).toContain('Your local time');
    expect(tooltip.textContent).toContain('Recorded user’s local time');
    expect(tooltip.textContent).toContain('Asia/Tokyo');
    // The recording starts at the first event, shown in each zone.
    const startIn = (timeZone: string) =>
      new Intl.DateTimeFormat(undefined, {
        timeZone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      }).format(start);
    const viewerZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(tooltip.textContent).toContain(startIn('Asia/Tokyo'));
    expect(tooltip.textContent).toContain(startIn(viewerZone));
    expect(time.getAttribute('aria-describedby')).toBe(tooltip.id);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await tick();
    expect(target.querySelector('[role="tooltip"]')).toBeNull();

    // Leaving closes it at once, unless the pointer moves onto the popup.
    const leave = (from: Element, to: Element | null) =>
      from.dispatchEvent(
        new PointerEvent('pointerleave', { relatedTarget: to }),
      );
    time.dispatchEvent(new PointerEvent('pointerenter'));
    await tick();
    const popup = target.querySelector('[role="tooltip"]')!;
    leave(time, popup);
    await tick();
    expect(target.querySelector('[role="tooltip"]')).toBe(popup);
    leave(popup, document.body);
    await tick();
    expect(target.querySelector('[role="tooltip"]')).toBeNull();
    time.dispatchEvent(new PointerEvent('pointerenter'));
    await tick();
    leave(time, document.body);
    await tick();
    expect(target.querySelector('[role="tooltip"]')).toBeNull();

    // Focus from a click does not keep it open; keyboard focus does.
    time.dispatchEvent(new PointerEvent('pointerenter'));
    time.dispatchEvent(new PointerEvent('pointerdown'));
    time.focus();
    await tick();
    leave(time, document.body);
    await tick();
    expect(target.querySelector('[role="tooltip"]')).toBeNull();
    // A second click on the focused pill fires no focus event; keyboard focus
    // after leaving and coming back still keeps the popup.
    time.dispatchEvent(new PointerEvent('pointerdown'));
    time.blur();
    time.focus();
    await tick();
    leave(time, document.body);
    await tick();
    expect(target.querySelector('[role="tooltip"]')).not.toBeNull();
    time.blur();

    // A tap focuses the pill and keeps the popup until focus moves away,
    // since touch screens send pointerleave right after the tap.
    time.blur();
    time.dispatchEvent(
      new PointerEvent('pointerenter', { pointerType: 'touch' }),
    );
    time.dispatchEvent(
      new PointerEvent('pointerdown', { pointerType: 'touch' }),
    );
    time.focus();
    await tick();
    leave(time, document.body);
    await tick();
    expect(target.querySelector('[role="tooltip"]')).not.toBeNull();
    time.blur();
    await tick();
    expect(target.querySelector('[role="tooltip"]')).toBeNull();

    player.$set({ recordingTimeZone: 'America/New_York' });
    time.dispatchEvent(new PointerEvent('pointerenter'));
    await tick();
    expect(target.querySelector('[role="tooltip"]')!.textContent).toContain(
      startIn('America/New_York'),
    );
    time.dispatchEvent(new PointerEvent('pointerleave'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await tick();

    // An unknown time zone leaves out only that line.
    player.$set({ recordingTimeZone: 'Not/AZone' });
    time.dispatchEvent(new FocusEvent('focus'));
    await tick();
    const again = target.querySelector('[role="tooltip"]')!;
    expect(again.textContent).toContain('Your local time');
    expect(again.textContent).not.toContain('Recorded user’s local time');
  });

  it('keeps the speed slider keys away from page shortcuts in a closed shadow root', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const shadow = host.attachShadow({ mode: 'closed' });
    const inner = document.createElement('div');
    shadow.append(inner);
    const shadowPlayer = new Player({
      target: inner,
      props: {
        events: recording(),
        autoPlay: false,
        features: { toolbar: true, jump: { keyboard: 'page' } },
      },
    });
    try {
      await tick();
      vi.spyOn(
        inner.querySelector<HTMLElement>('.rr-player')!,
        'getBoundingClientRect',
      ).mockReturnValue(new DOMRect(0, 0, 400, 360));
      shadowPlayer.goto(0, false);
      inner
        .querySelector<HTMLButtonElement>('[aria-label="Playback speed"]')!
        .click();
      await tick();
      const slider = inner.querySelector<HTMLInputElement>(
        '[aria-label="Playback speed"][type="range"]',
      )!;
      // Browsers hide a closed root's internals from the page; happy-dom does
      // not, so report the path the page would see once the key leaves it.
      inner.addEventListener(
        'keydown',
        (event) =>
          Object.defineProperty(event, 'composedPath', {
            value: () => [
              host,
              document.body,
              document.documentElement,
              document,
            ],
          }),
        { once: true },
      );
      slider.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
          composed: true,
          cancelable: true,
        }),
      );
      expect(shadowPlayer.getReplayer().getCurrentTime()).toBe(0);
    } finally {
      shadowPlayer.$destroy();
      host.remove();
    }
  });

  it('offers the JSON download and host links in a Download menu', async () => {
    const blobs: Blob[] = [];
    const create = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation((blob) => {
        blobs.push(blob as Blob);
        return 'blob:recording';
      });
    const revoke = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    const names: string[] = [];
    const hrefs: string[] = [];
    const clickLink = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        names.push(this.download);
        hrefs.push(this.getAttribute('href') ?? '');
      });
    const menu = () =>
      target.querySelector('[role="dialog"][aria-label="Download"]');
    const json = () =>
      Array.from(menu()?.querySelectorAll('button') ?? []).find(
        (button) => button.textContent === 'rrweb events (JSON)',
      );
    try {
      let player = await mountToolbar();
      expect(target.querySelector('[aria-label="Download"]')).toBeNull();
      player.$destroy();
      target.remove();

      player = await mountToolbar({ features: { download: true } });
      player.addEvent({
        type: EventType.Custom,
        timestamp: start + 12000,
        data: { tag: 'late', payload: {} },
      });
      // The toolbar button opens the menu; it does not download by itself.
      click('button[aria-label="Download"]');
      await tick();
      expect(names).toEqual([]);
      expect(menu()?.querySelectorAll('li')).toHaveLength(1);
      json()!.click();
      expect(names).toEqual(['rrweb-2023-11-14T22-13-20-000Z.json']);
      // The link points at the blob that holds the events.
      expect(hrefs).toEqual(['blob:recording']);
      const saved = JSON.parse(await blobs[0].text()) as eventWithTime[];
      expect(saved).toHaveLength(recording().length + 1);
      expect(saved.at(-1)?.timestamp).toBe(start + 12000);
      expect(blobs[0].type).toBe('application/json');

      player.$set({
        features: {
          toolbar: true,
          download: {
            fileName: 'session-42.json',
            links: [
              {
                label: 'Video (MP4)',
                href: 'https://example.com/session-42.mp4',
                description: 'Rendered on our servers',
              },
              { label: 'Unsafe', href: ' javascript:alert(1)' },
            ],
          },
        },
      });
      await tick();
      json()!.click();
      expect(names.at(-1)).toBe('session-42.json');
      const links = menu()!.querySelectorAll('a');
      expect(links).toHaveLength(1);
      expect(links[0].getAttribute('href')).toBe(
        'https://example.com/session-42.mp4',
      );
      expect(links[0].target).toBe('_blank');
      expect(links[0].rel).toBe('noopener noreferrer');
      expect(links[0].textContent).toBe('Video (MP4)Rendered on our servers');

      // Links alone, without the JSON item.
      player.$set({
        features: {
          toolbar: true,
          download: {
            json: false,
            links: [{ label: 'Screenshot', href: 'blob:screenshot' }],
          },
        },
      });
      await tick();
      expect(json()).toBeUndefined();
      expect(menu()!.querySelectorAll('a')).toHaveLength(1);

      // Nothing to offer, or the host hides it: no button.
      player.$set({
        features: { toolbar: true, download: { json: false, links: [] } },
      });
      await tick();
      expect(target.querySelector('button[aria-label="Download"]')).toBeNull();
      player.$set({
        features: { toolbar: true, download: true },
        controls: { download: false },
      });
      await tick();
      expect(target.querySelector('[aria-label="Download"]')).toBeNull();
    } finally {
      create.mockRestore();
      revoke.mockRestore();
      clickLink.mockRestore();
    }
  });

  it('keeps the chosen speed when features change', async () => {
    const player = await mount({ speedOption: [1, 2, 4] });
    const active = () => target.querySelector('.rr-controller__btns .active');
    [
      ...target.querySelectorAll<HTMLButtonElement>(
        '.rr-controller__btns button',
      ),
    ]
      .find((button) => button.textContent?.trim() === '4x')!
      .click();
    await tick();
    expect(active()?.textContent?.trim()).toBe('4x');
    player.$set({ features: {} });
    await tick();
    expect(active()?.textContent?.trim()).toBe('4x');
    expect(player.getReplayer().config.speed).toBe(4);
  });

  it('shows the replay speed when the toolbar is turned on later', async () => {
    const player = await mount({ speed: 2, speedOption: [1, 2, 4] });
    player.$set({ features: { toolbar: true } });
    await tick();
    click('[aria-label="Playback speed"]');
    await tick();
    expect(target.querySelector('.rr-control-value')?.textContent).toBe(
      '2.00×',
    );
  });

  it('hides toolbar timeline notes when the host turns captions off', async () => {
    const player = await mountToolbar();
    player.goto(2500, false);
    await tick();
    expect(target.querySelector('.rr-custom-event')).not.toBeNull();
    player.$set({ showCaptions: false });
    await tick();
    expect(target.querySelector('.rr-custom-event')).toBeNull();
    click('[aria-label="Replay settings"]');
    await tick();
    expect(
      target.querySelector<HTMLInputElement>(
        '[role="switch"][aria-label="Annotations"]',
      )!.checked,
    ).toBe(false);
  });

  it('changes the replay speed and skip setting from the toolbar panels', async () => {
    const player = await mountToolbar({ speedOption: [1, 2, 4] });
    const replayer = player.getReplayer();
    click('[aria-label="Playback speed"]');
    await tick();
    const slider = target.querySelector<HTMLInputElement>(
      '[aria-label="Playback speed"][type="range"]',
    )!;
    // Any speed in the range is valid, so custom speed lists keep their ends.
    expect(slider.step).toBe('any');
    slider.value = '4';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(replayer.config.speed).toBe(4);
    expect(replayer.timer.speed).toBe(4);

    click('[aria-label="Replay settings"]');
    await tick();
    const skip = () =>
      target.querySelector<HTMLInputElement>(
        '[role="switch"][aria-label="Skip inactive"]',
      )!;
    const before = replayer.config.skipInactive;
    skip().click();
    await tick();
    expect(replayer.config.skipInactive).toBe(!before);
    skip().click();
    await tick();
    expect(replayer.config.skipInactive).toBe(before);
  });

  it('shows the replay speed in the toolbar from the start', async () => {
    await mountToolbar({ speed: 2 });
    click('[aria-label="Playback speed"]');
    await tick();
    expect(target.querySelector('.rr-control-value')?.textContent).toBe(
      '2.00×',
    );
  });

  it('follows the host showCaptions when the toolbar starts with captions off', async () => {
    const player = await mountToolbar({ showCaptions: false });
    player.goto(2500, false);
    await tick();
    expect(target.querySelector('.rr-custom-event')).toBeNull();
    player.$set({ showCaptions: true });
    await tick();
    expect(target.querySelector('.rr-custom-event')).not.toBeNull();
    expect(target.querySelector('.rr-player__caption')).not.toBeNull();
  });

  it('keeps a panel open when it is pressed inside a closed shadow root', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const shadow = host.attachShadow({ mode: 'closed' });
    const inner = document.createElement('div');
    shadow.append(inner);
    const shadowPlayer = new Player({
      target: inner,
      props: {
        events: recording(),
        autoPlay: false,
        features: { toolbar: true },
      },
    });
    try {
      await tick();
      inner
        .querySelector<HTMLButtonElement>('[aria-label="Playback speed"]')!
        .click();
      await tick();
      const preset = inner.querySelector<HTMLButtonElement>(
        '[aria-label="2× speed"]',
      )!;
      // Browsers hide a closed root's internals from composedPath(), so the
      // document sees only the host. happy-dom does not, so once the press
      // has passed the panel, report the path the document would see.
      const press = new PointerEvent('pointerdown', {
        bubbles: true,
        composed: true,
      });
      inner.addEventListener(
        'pointerdown',
        (event) =>
          Object.defineProperty(event, 'composedPath', {
            value: () => [
              host,
              document.body,
              document.documentElement,
              document,
            ],
          }),
        { once: true },
      );
      expect(inner.querySelector('.rr-control-panel')).not.toBeNull();
      preset.dispatchEvent(press);
      await tick();
      expect(inner.querySelector('.rr-control-panel')).not.toBeNull();
    } finally {
      shadowPlayer.$destroy();
      host.remove();
    }
  });

  it('ignores the result of a prefixed fullscreen request', async () => {
    const player = await mount();
    const element = target.querySelector<HTMLElement>('.rr-player')!;
    Object.assign(element, {
      requestFullscreen: undefined,
      webkitRequestFullscreen: () => undefined,
    });
    expect(() => player.toggleFullscreen()).not.toThrow();
  });

  it('bounds ten-second skips and preserves playback state', async () => {
    const player = await mountToolbar();
    const position = () =>
      target
        .querySelector('[aria-label="Playback position"]')
        ?.getAttribute('aria-valuenow');
    click('[aria-label="Back 10 seconds"]');
    await tick();
    expect(position()).toBe('0');
    click('[aria-label="Forward 10 seconds"]');
    await tick();
    expect(position()).toBe('10000');
    expect(target.querySelector('[aria-label="Play"]')).not.toBeNull();
    click('[aria-label="Forward 10 seconds"]');
    await tick();
    expect(position()).toBe('10000');
    player.goto(1000, true);
    click('[aria-label="Back 10 seconds"]');
    await tick();
    expect(position()).toBe('0');
    expect(target.querySelector('[aria-label="Pause"]')).not.toBeNull();
  });

  it('disables ten-second skips during live playback', async () => {
    const player = await mountToolbar();
    const forward = target.querySelector<HTMLButtonElement>(
      '[aria-label="Forward 10 seconds"]',
    )!;
    const back = target.querySelector<HTMLButtonElement>(
      '[aria-label="Back 10 seconds"]',
    )!;
    expect(forward.disabled).toBe(false);
    expect(back.disabled).toBe(false);
    player.getReplayer().startLive();
    await tick();
    expect(forward.disabled).toBe(true);
    expect(back.disabled).toBe(true);
  });

  it('pins a hover-open popup on click and supports custom speed presets', async () => {
    const player = await mountToolbar({ speedOption: [1, 1.25, 3, 10] });
    const trigger = target.querySelector<HTMLButtonElement>(
      '[aria-label="Playback speed"]',
    )!;
    trigger.dispatchEvent(
      new PointerEvent('pointerenter', { pointerType: 'mouse' }),
    );
    await tick();
    const popup = target.querySelector<HTMLElement>(
      '[role="dialog"][aria-label="Playback speed"]',
    )!;
    expect(popup).not.toBeNull();
    trigger.click();
    await tick();
    expect(document.activeElement).toBe(popup);
    const fractionalPreset = popup.querySelector<HTMLButtonElement>(
      '[aria-label="1.25× speed"]',
    )!;
    expect(fractionalPreset.textContent?.trim()).toBe('1.25');
    fractionalPreset.click();
    await tick();
    expect(player.getReplayer().config.speed).toBe(1.25);
    click('[aria-label="10× speed"]');
    await tick();
    expect(player.getReplayer().config.speed).toBe(10);
    trigger.click();
    await tick();
    expect(
      target.querySelector('[role="dialog"][aria-label="Playback speed"]'),
    ).toBeNull();
  });

  it('keeps a focused popup open on sibling hover and switches on click', async () => {
    await mountToolbar();
    const speedTrigger = target.querySelector<HTMLButtonElement>(
      'button[aria-label="Playback speed"]',
    )!;
    const settingsTrigger = target.querySelector<HTMLButtonElement>(
      'button[aria-label="Replay settings"]',
    )!;
    const dialogs = () =>
      Array.from(target.querySelectorAll('.rr-toolbar [role="dialog"]'));
    const hover = (element: HTMLElement) => {
      element.dispatchEvent(
        new PointerEvent('pointerenter', { pointerType: 'mouse' }),
      );
    };

    hover(speedTrigger);
    await tick();
    hover(settingsTrigger);
    await tick();
    expect(
      dialogs().map((dialog) => dialog.getAttribute('aria-label')),
    ).toEqual(['Replay settings']);

    speedTrigger.click();
    await tick();
    const preset = target.querySelector<HTMLButtonElement>(
      'button[aria-label="2× speed"]',
    )!;
    preset.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    preset.focus();
    hover(settingsTrigger);
    await tick();
    expect(
      dialogs().map((dialog) => dialog.getAttribute('aria-label')),
    ).toEqual(['Playback speed']);
    expect(document.activeElement).toBe(preset);

    settingsTrigger.click();
    await tick();
    expect(
      dialogs().map((dialog) => dialog.getAttribute('aria-label')),
    ).toEqual(['Replay settings']);
    expect(document.activeElement).toBe(dialogs()[0]);
  });

  it('keeps speed controls available while skipping inactivity', async () => {
    const player = await mountToolbar({ skipInactive: true });
    click('button[aria-label="Playback speed"]');
    await tick();
    const dialog = target.querySelector(
      '[role="dialog"][aria-label="Playback speed"]',
    )!;
    const range = dialog.querySelector<HTMLInputElement>(
      'input[type="range"]',
    )!;
    const preset = dialog.querySelector<HTMLButtonElement>(
      'button[aria-label="2× speed"]',
    )!;

    const { speedService } = player.getReplayer();
    speedService.send({ type: 'FAST_FORWARD', payload: { speed: 5 } });
    await tick();
    // Controls stay usable while skipping, as in rrweb-io/rrweb#2020.
    expect(range.disabled).toBe(false);
    expect(preset.disabled).toBe(false);
    preset.click();
    await tick();
    expect(preset.getAttribute('aria-pressed')).toBe('true');

    // A speed change during a playing skip keeps the replay playing.
    const replayer = player.getReplayer();
    replayer.play();
    speedService.send({ type: 'FAST_FORWARD', payload: { speed: 5 } });
    await tick();
    dialog
      .querySelector<HTMLButtonElement>('button[aria-label="1× speed"]')!
      .click();
    await tick();
    expect(replayer.service.state.value).toBe('playing');
    expect(replayer.config.speed).toBe(1);
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

  it('reprojects the paused playhead and exact markers after earlier events arrive', async () => {
    const input = (offset: number): eventWithTime => ({
      type: EventType.IncrementalSnapshot,
      timestamp: start + offset,
      data: {
        source: IncrementalSource.Input,
        id: 1,
        text: '',
        isChecked: false,
      },
    });
    const custom = (offset: number, tag: string): eventWithTime => ({
      type: EventType.Custom,
      timestamp: start + offset,
      data: { tag, payload: {} },
    });
    const player = await mount({
      events: [
        recording()[0],
        {
          type: EventType.FullSnapshot,
          timestamp: start + 9000,
          data: {
            node: {
              id: 1,
              type: NodeType.Document,
              childNodes: [
                {
                  id: 2,
                  type: NodeType.Element,
                  tagName: 'html',
                  attributes: {},
                  childNodes: [],
                },
              ],
            },
            initialOffset: { left: 0, top: 0 },
          },
        },
        input(12000),
        input(13543),
        timelineMarker(13543, 'Mark'),
        custom(72000, 'End'),
      ],
      features: { timeline: { compressInactive: true } },
    });
    const replayer = player.getReplayer();
    // Happy DOM does not expose the sandboxed iframe through frameElement.
    Object.defineProperty(replayer.iframe.contentWindow, 'frameElement', {
      value: replayer.iframe,
    });
    player.goto(13543, false);
    await tick();

    const progress = vi.fn();
    player.addEventListener('ui-update-progress', progress);
    replayer.addEvent(custom(-2000, 'Earlier start'));
    replayer.addEvent(custom(5000, 'inactive period'));
    replayer.addEvent(input(7000));
    replayer.addEvent(input(10500));
    replayer.addEvent(input(21000));
    // The Replayer reports appended events on the next animation frame.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await tick();

    const track = target.querySelector<HTMLElement>('.rr-progress')!;
    const idle = track.querySelectorAll<HTMLElement>('.rr-inactive-period');
    expect(idle).toHaveLength(1);
    expect(parseFloat(idle[0].style.left)).toBeCloseTo(80);
    expect(parseFloat(idle[0].style.width)).toBeCloseTo(20);
    const playhead = track.querySelector<HTMLElement>('.rr-progress__handler')!;
    const annotation = track.querySelector<HTMLElement>(
      '.rr-custom-event-container',
    )!;
    const tag = track.querySelector<HTMLElement>(
      '[title="inactive period"]:not(.rr-inactive-period)',
    )!;
    const markerPosition = (80 * 15543) / 23000;
    expect(parseFloat(annotation.style.left)).toBeCloseTo(markerPosition, 6);
    expect(parseFloat(tag.style.left)).toBeCloseTo((80 * 7000) / 23000, 6);
    expect(parseFloat(playhead.style.left)).toBeCloseTo(markerPosition, 6);
    expect(progress).toHaveBeenLastCalledWith({ payload: 15543 / 74000 });

    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 1000, 12),
    );
    track.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: 900 }),
    );
    expect(replayer.getCurrentTime()).toBeCloseTo(48500, 6);
    click('.rr-custom-event');
    expect(replayer.getCurrentTime()).toBe(15543);
  });

  it('refreshes timeline metadata once for a synchronous batch from both append APIs', async () => {
    const player = await mount();
    const replayer = player.getReplayer();
    const metadata = vi.spyOn(replayer, 'getMetaData');
    player.addEvent(timelineMarker(15000, 'One'));
    replayer.addEvent(timelineMarker(20000, 'Two'));
    player.addEvent(timelineMarker(25000, 'Three'));
    // Appends are reported once, on the next animation frame.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await tick();
    expect(target.querySelectorAll('.rr-custom-event')).toHaveLength(4);
    expect(metadata).toHaveBeenCalledTimes(1);
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
