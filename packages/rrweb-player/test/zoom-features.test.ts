// @vitest-environment happy-dom
import { EventType } from '@rrweb/types';
import { tick } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Player from '../src/Player.svelte';
import type { PlayerFeatures } from '../src/features';

let player: Player;
let target: HTMLDivElement;

async function mount(
  features: PlayerFeatures,
  props: Record<string, unknown> = {},
) {
  target = document.createElement('div');
  document.body.append(target);
  player = new Player({
    target,
    props: {
      events: [
        {
          type: EventType.Meta,
          timestamp: 1000,
          data: { href: 'https://example.com', width: 800, height: 600 },
        },
        {
          type: EventType.Custom,
          timestamp: 3000,
          data: { tag: 'end', payload: {} },
        },
      ],
      autoPlay: false,
      features,
      ...props,
    },
  });
  await tick();
}

const replay = () => target.querySelector<HTMLElement>('.replayer-wrapper')!;
// happy-dom has no layout, so the tests report the recording's size the way
// the replayer does after it rebuilds the page.
const recordedSize = () =>
  (
    player.getReplayer() as unknown as {
      emitter: { emit(type: string, payload: unknown): void };
    }
  ).emitter.emit('resize', { width: 800, height: 600 });

// Lays the replay out at its recorded size, so a resize of the player itself
// rescales it, as in a browser.
function layOutReplay(width = 800, height = 600) {
  const iframe = player.getReplayer().iframe;
  Object.defineProperty(iframe, 'offsetWidth', {
    value: width,
    configurable: true,
  });
  Object.defineProperty(iframe, 'offsetHeight', {
    value: height,
    configurable: true,
  });
}
const trueSizeLabel = () =>
  target.querySelector<HTMLButtonElement>(
    '[aria-label="Show the replay at its recorded size"]',
  );
const zoomValue = () =>
  target.querySelector('.rr-control-value')?.textContent?.trim();
const zoomSlider = () =>
  target.querySelector<HTMLInputElement>('[aria-label="Replay zoom"]')!;

async function openZoomPanel() {
  target.querySelector<HTMLButtonElement>('[aria-label="Zoom"]')!.click();
  await tick();
}

afterEach(() => {
  player?.$destroy();
  target?.remove();
});

describe('replay zoom', () => {
  it('leaves the replay unzoomable unless features.zoom is set', async () => {
    await mount({ toolbar: true });
    player.setZoom(3);
    await tick();
    expect(replay().style.getPropertyValue('scale')).toBe('');
    expect(target.querySelector('.rr-player__surface')).toBeNull();
    expect(target.querySelector('[aria-label="Zoom"]')).toBeNull();
  });

  it('leaves the replay styles alone for click-to-play without zoom', async () => {
    await mount({}, { clickToPlay: true });
    expect(target.querySelector('.rr-player__surface')).not.toBeNull();
    expect(replay().style.getPropertyValue('scale')).toBe('');
    expect(replay().style.getPropertyValue('translate')).toBe('');
  });

  it('keeps focus in the player when Escape fits a focused viewport', async () => {
    await mount({ toolbar: true, zoom: {} });
    player.setZoom(2);
    await tick();
    const surface = target.querySelector<HTMLElement>('.rr-player__surface')!;
    surface.focus();
    surface.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await tick();
    expect(target.querySelector('.rr-player__surface')).toBeNull();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Zoom');
  });

  it('keeps focus on the surface when clickToPlay changes while zoomed', async () => {
    await mount({ toolbar: true, zoom: {} }, { clickToPlay: true });
    player.setZoom(2);
    await tick();
    const surface = () =>
      target.querySelector<HTMLElement>('.rr-player__surface')!;
    surface().focus();
    for (const clickToPlay of [false, true]) {
      player.$set({ clickToPlay });
      await tick();
      await tick();
      expect(surface().localName).toBe(clickToPlay ? 'button' : 'div');
      expect(document.activeElement).toBe(surface());
    }
  });

  it('turns cursor following off when the viewer pans with the keyboard', async () => {
    await mount({ toolbar: true, zoom: {} });
    player.setZoom(2);
    await tick();
    target.querySelector('.rr-player__surface')!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        bubbles: true,
        cancelable: true,
      }),
    );
    await openZoomPanel();
    expect(
      target.querySelector<HTMLInputElement>('[aria-label="Follow cursor"]')!
        .checked,
    ).toBe(false);
  });

  it('keeps focus in the player when setZoom(1) removes the viewport', async () => {
    await mount({ toolbar: true, zoom: {} });
    player.setZoom(2);
    await tick();
    target.querySelector<HTMLElement>('.rr-player__surface')!.focus();
    player.setZoom(1);
    await tick();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Zoom');
  });

  it('leaves focus on another control when setZoom(1) removes the viewport', async () => {
    await mount({ toolbar: true, zoom: {} });
    player.setZoom(2);
    await tick();
    const play = target.querySelector<HTMLElement>(
      '[aria-label="Play"], [aria-label="Pause"]',
    )!;
    play.focus();
    player.setZoom(1);
    await tick();
    expect(document.activeElement).toBe(play);
  });

  it.each([
    ['lowers the maximum to 1', { toolbar: true, zoom: { max: 1 } }],
    ['turns zoom off', { toolbar: true }],
  ])('keeps focus in the player when the host %s', async (_, features) => {
    await mount({ toolbar: true, zoom: { max: 2 } });
    player.setZoom(2);
    await tick();
    target.querySelector<HTMLElement>('.rr-player__surface')!.focus();
    player.$set({ features });
    await tick();
    expect(document.activeElement).toBe(target.querySelector('.rr-player'));
  });

  it('keeps focus in a player inside a shadow root', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    target = document.createElement('div');
    shadow.append(target);
    player = new Player({
      target,
      props: {
        events: [
          {
            type: EventType.Meta,
            timestamp: 1000,
            data: { href: 'https://example.com', width: 800, height: 600 },
          },
          {
            type: EventType.Custom,
            timestamp: 3000,
            data: { tag: 'end', payload: {} },
          },
        ],
        autoPlay: false,
        features: { toolbar: true, zoom: {} },
      },
    });
    try {
      await tick();
      player.setZoom(2);
      await tick();
      target.querySelector<HTMLElement>('.rr-player__surface')!.focus();
      player.fit();
      await tick();
      expect(shadow.activeElement?.getAttribute('aria-label')).toBe('Zoom');
    } finally {
      player.$destroy();
      host.remove();
    }
  });

  it('keeps focus in the player when the host removes the Zoom panel', async () => {
    await mount({ toolbar: true, zoom: {} });
    await openZoomPanel();
    target.querySelector<HTMLElement>('[aria-label="Replay zoom"]')!.focus();
    player.$set({ features: { toolbar: true } });
    await tick();
    expect(document.activeElement).toBe(target.querySelector('.rr-player'));
  });

  it('keeps focus in the player when the host hides the controller', async () => {
    await mount({ toolbar: true, zoom: {} });
    await openZoomPanel();
    target.querySelector<HTMLElement>('[aria-label="Replay zoom"]')!.focus();
    player.$set({ showController: false });
    await tick();
    expect(document.activeElement).toBe(target.querySelector('.rr-player'));
  });

  it('keeps Fit usable while the replay already fits', async () => {
    await mount({ toolbar: true, zoom: {} });
    await openZoomPanel();
    const fit = target.querySelector<HTMLButtonElement>(
      '[aria-label="Fit replay to window"]',
    )!;
    // A focused button that turns disabled loses focus, closing the panel.
    expect(fit.disabled).toBe(false);
    fit.focus();
    fit.click();
    await tick();
    expect(document.activeElement).toBe(fit);
  });

  it('keeps focus in the player when the host turns click-to-play off', async () => {
    await mount({}, { clickToPlay: true });
    target.querySelector<HTMLElement>('.rr-player__surface')!.focus();
    player.$set({ clickToPlay: false });
    await tick();
    expect(target.querySelector('.rr-player__surface')).toBeNull();
    expect(document.activeElement).toBe(target.querySelector('.rr-player'));
  });

  it('plays from a click on the zoomed replay only with clickToPlay', async () => {
    const clickZoomed = async () => {
      player.setZoom(2);
      await tick();
      target
        .querySelector<HTMLElement>('.rr-player__surface')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await tick();
      return player.getReplayer().service.state.value;
    };
    await mount({ zoom: {} });
    expect(await clickZoomed()).toBe('paused');
    player.$destroy();
    target.remove();
    await mount({ zoom: {} }, { clickToPlay: true });
    expect(await clickZoomed()).toBe('playing');
  });

  it('describes a pan-only zoom surface and labels click-to-play by state', async () => {
    await mount({ zoom: {} });
    player.setZoom(2);
    await tick();
    let surface = target.querySelector<HTMLElement>('.rr-player__surface')!;
    // Without click-to-play it only pans, so it is no button.
    expect(surface.tagName).toBe('DIV');
    expect(surface.getAttribute('role')).toBe('group');
    expect(surface.tabIndex).toBe(0);
    const hint = target.querySelector(
      `#${surface.getAttribute('aria-describedby')}`,
    );
    expect(hint?.textContent).toContain('Arrow keys move the view');

    player.$destroy();
    target.remove();
    await mount({ zoom: {} }, { clickToPlay: true });
    player.setZoom(2);
    await tick();
    surface = target.querySelector<HTMLElement>('.rr-player__surface')!;
    expect(surface.tagName).toBe('BUTTON');
    expect(surface.getAttribute('aria-label')).toBe('Play replay');
    surface.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(surface.getAttribute('aria-label')).toBe('Pause replay');
  });

  it('reaches the configured maximum on the slider', async () => {
    await mount({ toolbar: true, zoom: { max: 1.05 } });
    await openZoomPanel();
    const slider = target.querySelector<HTMLInputElement>(
      '[aria-label="Replay zoom"]',
    )!;
    expect(slider.step).toBe('1');
    slider.value = '105';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(replay().style.getPropertyValue('scale')).toBe('1.05');
  });

  it('keeps focus in the player without the toolbar', async () => {
    await mount({ zoom: {} });
    player.setZoom(2);
    await tick();
    const surface = target.querySelector<HTMLElement>('.rr-player__surface')!;
    surface.focus();
    surface.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await tick();
    expect(document.activeElement).toBe(target.querySelector('.rr-player'));
  });

  it('leaves out the Zoom panel when the host turns that control off', async () => {
    await mount({ toolbar: true, zoom: {} });
    player.$set({ controls: { zoom: false } });
    await tick();
    expect(target.querySelector('[aria-label="Zoom"]')).toBeNull();
    player.setZoom(2);
    await tick();
    expect(replay().style.getPropertyValue('scale')).toBe('2');
  });

  it('zooms up to the configured maximum and follows a lowered one', async () => {
    await mount({ toolbar: true, zoom: { max: 2.5 } });
    player.setZoom(5);
    await tick();
    expect(replay().style.getPropertyValue('scale')).toBe('2.5');

    await openZoomPanel();
    const slider = target.querySelector<HTMLInputElement>(
      '[aria-label="Replay zoom"]',
    )!;
    expect(slider.max).toBe('250');

    player.$set({ features: { toolbar: true, zoom: { max: 1.5 } } });
    await tick();
    expect(replay().style.getPropertyValue('scale')).toBe('1.5');

    player.$set({ features: { toolbar: true } });
    await tick();
    expect(target.querySelector('.rr-player__surface')).toBeNull();
    expect(replay().style.getPropertyValue('scale')).toBe('');
    expect(target.querySelector('[aria-label="Zoom"]')).toBeNull();
  });

  it('keeps the viewer follow choice through fit and option updates', async () => {
    await mount({ toolbar: true, zoom: { follow: false } });
    await openZoomPanel();
    const follow = () =>
      target.querySelector<HTMLInputElement>('[aria-label="Follow cursor"]')!;
    expect(follow().checked).toBe(false);
    follow().click();
    await tick();
    expect(follow().checked).toBe(true);

    player.setZoom(2);
    player.fit();
    player.$set({
      features: { toolbar: true, zoom: { max: 3, follow: false } },
    });
    await tick();
    expect(replay().style.getPropertyValue('scale')).toBe('');
    expect(follow().checked).toBe(true);
  });

  it('returns to Fit with Escape from inside the player', async () => {
    await mount({ toolbar: true, zoom: {} });
    await openZoomPanel();
    const slider = target.querySelector<HTMLInputElement>(
      '[aria-label="Replay zoom"]',
    )!;
    slider.value = '200';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(replay().style.getPropertyValue('scale')).toBe('2');

    // The first Escape closes the open panel and leaves the zoom alone.
    slider.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await tick();
    expect(replay().style.getPropertyValue('scale')).toBe('2');

    const play = target.querySelector<HTMLButtonElement>(
      '[aria-label="Play"]',
    )!;
    play.focus();
    play.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await tick();
    expect(replay().style.getPropertyValue('scale')).toBe('');
    expect(replay().style.getPropertyValue('translate')).toBe('');
  });

  it('leaves Escape in a player nested in a shadow root to that player', async () => {
    await mount({ toolbar: true, zoom: {} });
    player.setZoom(2);
    await tick();
    const host = document.createElement('div');
    target.querySelector('.rr-player')!.append(host);
    const root = host.attachShadow({ mode: 'open' });
    const innerTarget = document.createElement('div');
    root.append(innerTarget);
    const inner = new Player({
      target: innerTarget,
      props: {
        events: [
          {
            type: EventType.Meta,
            timestamp: 1000,
            data: { href: 'https://example.com', width: 800, height: 600 },
          },
          {
            type: EventType.Custom,
            timestamp: 3000,
            data: { tag: 'end', payload: {} },
          },
        ],
        autoPlay: false,
        features: { toolbar: true },
      },
    });
    await tick();
    try {
      root.querySelector('[aria-label="Play"]')!.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          composed: true,
        }),
      );
      await tick();
      expect(replay().style.getPropertyValue('scale')).toBe('2');
      // Escape on the outer player's own controls still fits it.
      target
        .querySelector('.rr-toolbar [aria-label="Play"]')!
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        );
      await tick();
      expect(replay().style.getPropertyValue('scale')).toBe('');
    } finally {
      inner.$destroy();
    }
  });

  it('fits on Escape while only a nested player has a panel open', async () => {
    await mount({ toolbar: true, zoom: {} });
    player.setZoom(2);
    await tick();
    const innerTarget = document.createElement('div');
    target.querySelector('.rr-player')!.append(innerTarget);
    const inner = new Player({
      target: innerTarget,
      props: {
        events: [
          {
            type: EventType.Meta,
            timestamp: 1000,
            data: { href: 'https://example.com', width: 800, height: 600 },
          },
          {
            type: EventType.Custom,
            timestamp: 3000,
            data: { tag: 'end', payload: {} },
          },
        ],
        autoPlay: false,
        features: { toolbar: true },
      },
    });
    await tick();
    try {
      innerTarget
        .querySelector<HTMLButtonElement>(
          '.rr-toolbar__control[aria-label="Playback speed"]',
        )!
        .click();
      await tick();
      expect(innerTarget.querySelector('.rr-control-panel')).not.toBeNull();
      const outerPlay = Array.from(
        target.querySelectorAll<HTMLElement>('[aria-label="Play"]'),
      ).find((button) => !innerTarget.contains(button))!;
      outerPlay.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      await tick();
      expect(replay().style.getPropertyValue('scale')).toBe('');
    } finally {
      inner.$destroy();
    }
  });

  it('leaves focus in a nested zoomed player when the outer one fits', async () => {
    await mount({ toolbar: true, zoom: {} });
    player.setZoom(2);
    await tick();
    const innerTarget = document.createElement('div');
    target.querySelector('.rr-player__viewport')!.append(innerTarget);
    const inner = new Player({
      target: innerTarget,
      props: {
        events: [
          {
            type: EventType.Meta,
            timestamp: 1000,
            data: { href: 'https://example.com', width: 800, height: 600 },
          },
          {
            type: EventType.Custom,
            timestamp: 3000,
            data: { tag: 'end', payload: {} },
          },
        ],
        autoPlay: false,
        features: { toolbar: true, zoom: {} },
      },
    });
    await tick();
    try {
      inner.setZoom(2);
      await tick();
      const innerSurface = innerTarget.querySelector<HTMLElement>(
        '.rr-player__surface',
      )!;
      innerSurface.focus();
      player.fit();
      await tick();
      expect(document.activeElement).toBe(innerSurface);
    } finally {
      inner.$destroy();
    }
  });

  it('offers True size, which shows the recording at its recorded size', async () => {
    // An 800x600 recording fitted into 400x300 is shown at half size.
    await mount({ toolbar: true, zoom: {} }, { width: 400, height: 300 });
    recordedSize();
    await openZoomPanel();
    const trueSize = () =>
      target.querySelector<HTMLButtonElement>(
        '[aria-label="Show the replay at its recorded size"]',
      );
    const value = () =>
      target.querySelector('.rr-control-value')?.textContent?.trim();
    const slider = () =>
      target.querySelector<HTMLInputElement>('[aria-label="Replay zoom"]')!;

    trueSize()!.click();
    await tick();
    expect(replay().style.getPropertyValue('scale')).toBe('2');
    expect(value()).toBe('True size · 200%');
    expect(trueSize()!.getAttribute('aria-pressed')).toBe('true');
    expect(slider().getAttribute('aria-valuetext')).toBe('True size');

    // It keeps the recorded size when the player is resized.
    player.$set({ width: 200, height: 150 });
    await tick();
    recordedSize();
    await tick();
    expect(replay().style.getPropertyValue('scale')).toBe('4');

    // Another zoom choice leaves True size.
    slider().value = '150';
    slider().dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(value()).toBe('150%');
    expect(trueSize()!.getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps focus in the panel when the True size label goes away', async () => {
    await mount({ toolbar: true, zoom: {} }, { width: 400, height: 300 });
    recordedSize();
    await openZoomPanel();
    const label = target.querySelector<HTMLButtonElement>(
      '[aria-label="Show the replay at its recorded size"]',
    )!;
    label.focus();
    label.click();
    await tick();
    // At 800x600 the recording fits at its own size, so the label goes.
    player.$set({ width: 800, height: 600 });
    await tick();
    recordedSize();
    await tick();
    expect(
      target.querySelector(
        '[aria-label="Show the replay at its recorded size"]',
      ),
    ).toBeNull();
    expect(document.activeElement).toBe(
      target.querySelector('[aria-label="Replay zoom"]'),
    );
  });

  it('follows a resize of the player itself at True size', async () => {
    await mount({ toolbar: true, zoom: {} }, { width: 400, height: 300 });
    recordedSize();
    // With layout, a resize of the player rescales the replay from the
    // iframe's own size, with no resize event from the replayer.
    const iframe = player.getReplayer().iframe;
    Object.defineProperty(iframe, 'offsetWidth', { value: 800 });
    Object.defineProperty(iframe, 'offsetHeight', { value: 600 });
    await openZoomPanel();
    target
      .querySelector<HTMLButtonElement>(
        '[aria-label="Show the replay at its recorded size"]',
      )!
      .click();
    await tick();
    expect(replay().style.getPropertyValue('scale')).toBe('2');
    player.$set({ width: 200, height: 150 });
    await tick();
    expect(replay().style.getPropertyValue('scale')).toBe('4');
    player.$set({ width: 320, height: 240 });
    await tick();
    expect(replay().style.getPropertyValue('scale')).toBe('2.5');
  });

  it('marks true size on the slider, with its label under the mark', async () => {
    await mount({ toolbar: true, zoom: {} }, { width: 400, height: 300 });
    recordedSize();
    await openZoomPanel();
    // True size is 2 on a 1 to 4 slider: a third of the way along.
    const mark = target.querySelector<HTMLElement>('.rr-zoom-mark')!;
    expect(Number(mark.style.getPropertyValue('--rr-mark-at'))).toBeCloseTo(
      1 / 3,
    );
    expect(trueSizeLabel()!.style.getPropertyValue('--rr-mark-at')).toBe(
      mark.style.getPropertyValue('--rr-mark-at'),
    );
    expect(target.querySelector('.rr-zoom-max')?.textContent).toBe('4×');
    // Fit stays on the left, and nothing else sits beside the slider.
    const range = target.querySelector('.rr-control-range')!;
    expect(range.firstElementChild?.textContent).toBe('Fit');
    expect(range.lastElementChild?.className).toContain('rr-zoom-max');
    trueSizeLabel()!.click();
    await tick();
    expect(trueSizeLabel()!.getAttribute('aria-pressed')).toBe('true');
    expect(replay().style.getPropertyValue('scale')).toBe('2');
  });

  it('snaps a drag that ends near the mark to true size, but not a key step', async () => {
    await mount({ toolbar: true, zoom: {} }, { width: 400, height: 300 });
    recordedSize();
    await openZoomPanel();
    const slide = (value: number) => {
      zoomSlider().value = String(value);
      zoomSlider().dispatchEvent(new Event('input', { bubbles: true }));
    };
    // Moves during the drag follow the pointer, through and around the mark.
    zoomSlider().dispatchEvent(new Event('pointerdown'));
    slide(205);
    await tick();
    expect(zoomValue()).toBe('205%');
    slide(208);
    await tick();
    zoomSlider().dispatchEvent(new Event('pointerup'));
    await tick();
    expect(zoomValue()).toBe('True size · 200%');
    expect(zoomSlider().value).toBe('200');
    expect(replay().style.getPropertyValue('scale')).toBe('2');
    // The arrow keys step one percent at a time, past the mark.
    slide(201);
    await tick();
    expect(zoomValue()).toBe('201%');
    expect(trueSizeLabel()!.getAttribute('aria-pressed')).toBe('false');
    // A drag that ends away from it is left where it ends.
    zoomSlider().dispatchEvent(new Event('pointerdown'));
    slide(260);
    zoomSlider().dispatchEvent(new Event('pointerup'));
    await tick();
    expect(zoomValue()).toBe('260%');
  });

  it('leaves out True size when the host turns it off', async () => {
    await mount(
      { toolbar: true, zoom: { trueSize: false } },
      { width: 400, height: 300 },
    );
    recordedSize();
    await openZoomPanel();
    expect(trueSizeLabel()).toBeNull();
    expect(target.querySelector('.rr-zoom-mark')).toBeNull();
    expect(target.querySelector('.rr-zoom-max')?.textContent).toBe('4×');
  });

  it('applies a True size zoom that a resize brings back above Fit', async () => {
    await mount({ toolbar: true, zoom: {} }, { width: 400, height: 300 });
    recordedSize();
    await openZoomPanel();
    trueSizeLabel()!.click();
    await tick();
    // The recording shrinks to the player's size: true size is now Fit.
    (
      player.getReplayer() as unknown as {
        emitter: { emit(type: string, payload: unknown): void };
      }
    ).emitter.emit('resize', { width: 400, height: 300 });
    await tick();
    expect(target.querySelector('.rr-player__surface')).toBeNull();
    // Then the player shrinks: the zoom is 2 again and shows.
    layOutReplay(400, 300);
    player.$set({ width: 200, height: 150 });
    await tick();
    expect(target.querySelector('.rr-player__surface')).not.toBeNull();
    expect(replay().style.getPropertyValue('scale')).toBe('2');
  });

  it('describes the zoom it shows when a lower maximum holds it below true size', async () => {
    await mount({ toolbar: true, zoom: {} }, { width: 400, height: 300 });
    recordedSize();
    await openZoomPanel();
    trueSizeLabel()!.click();
    await tick();
    player.$set({ features: { toolbar: true, zoom: { max: 1.5 } } });
    await tick();
    expect(replay().style.getPropertyValue('scale')).toBe('1.5');
    expect(zoomValue()).toBe('150%');
    expect(zoomSlider().getAttribute('aria-valuetext')).toBe(
      '150% of fitted size',
    );
    // With the maximum back, True size returns to the recorded size.
    player.$set({ features: { toolbar: true, zoom: {} } });
    await tick();
    expect(replay().style.getPropertyValue('scale')).toBe('2');
    expect(zoomValue()).toBe('True size · 200%');
  });

  it('stays at Fit for True size where the fitted replay is already larger', async () => {
    await mount(
      { toolbar: true, zoom: {} },
      { width: 400, height: 300, maxScale: 0 },
    );
    recordedSize();
    await openZoomPanel();
    trueSizeLabel()!.click();
    await tick();
    // The player grows past the recorded size, which maxScale 0 allows.
    layOutReplay();
    player.$set({ width: 1600, height: 1200 });
    await tick();
    expect(target.querySelector('.rr-player__surface')).toBeNull();
    expect(zoomValue()).toBe('Fit');
    expect(zoomSlider().value).toBe('100');
  });

  it('lets Escape leave True size while it equals Fit', async () => {
    await mount({ toolbar: true, zoom: {} }, { width: 400, height: 300 });
    recordedSize();
    await openZoomPanel();
    trueSizeLabel()!.click();
    await tick();
    layOutReplay();
    player.$set({ width: 800, height: 600 });
    await tick();
    target.querySelector<HTMLButtonElement>('[aria-label="Zoom"]')!.click();
    await tick();
    expect(target.querySelector('.rr-control-panel')).toBeNull();
    target
      .querySelector('.rr-player')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    await tick();
    // Shrinking the player again stays at Fit.
    player.$set({ width: 400, height: 300 });
    await tick();
    expect(target.querySelector('.rr-player__surface')).toBeNull();
  });

  it('leaves out True size when it is beyond the maximum zoom or no larger than Fit', async () => {
    await mount(
      { toolbar: true, zoom: { max: 1.5 } },
      { width: 400, height: 300 },
    );
    recordedSize();
    await openZoomPanel();
    expect(
      target.querySelector(
        '[aria-label="Show the replay at its recorded size"]',
      ),
    ).toBeNull();
    player.$destroy();
    target.remove();

    // A recording that fits at its own size is already at true size.
    await mount({ toolbar: true, zoom: {} }, { width: 800, height: 600 });
    recordedSize();
    await openZoomPanel();
    expect(
      target.querySelector(
        '[aria-label="Show the replay at its recorded size"]',
      ),
    ).toBeNull();
  });
});
