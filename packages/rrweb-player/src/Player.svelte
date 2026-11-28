<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Replayer } from '@rrweb/replay';
  import { unpack } from '@rrweb/packer/unpack';
  import type { eventWithTime } from '@rrweb/types';
  import {
    inlineCss,
    openFullscreen,
    exitFullscreen,
    isFullscreen,
    onFullscreenChange,
    typeOf,
  } from './utils';
  import Controller from './Controller.svelte';
  import type { RRwebPlayerOptions, RRwebPlayerExpose } from './types';

  import type { PlayerFeatures, JumpEvent } from './features';
  import { jumpSeconds } from './features';
  export let features: PlayerFeatures = {};
  const jumpListeners = new Set<(event: JumpEvent) => unknown>();
  export const jump: RRwebPlayerExpose['jump'] = (direction) => {
    controller?.jump(
      direction === 'forward' ? 1 : -1,
      'api',
      jumpSeconds(features.jump),
    );
  };

  export let width: NonNullable<RRwebPlayerOptions['props']['width']>  = 1024;
  export let height: NonNullable<RRwebPlayerOptions['props']['height']> = 576;
  export let maxScale: NonNullable<RRwebPlayerOptions['props']['maxScale']> = 1;
  export let events: RRwebPlayerOptions['props']['events'];
  export let skipInactive: NonNullable<RRwebPlayerOptions['props']['skipInactive']> = true;
  export let autoPlay: NonNullable<RRwebPlayerOptions['props']['autoPlay']> = true;
  export let clickToPlay: NonNullable<RRwebPlayerOptions['props']['clickToPlay']> = false;
  export let showPlayOverlay: NonNullable<RRwebPlayerOptions['props']['showPlayOverlay']> = false;
  // Tracked only for the overlay and the click surface's label, so other
  // players do not re-render on
  // play and pause. A live replay is never paused, and a stalled one counts
  // as paused only when it will not resume.
  let paused = true;
  $: tracksPause = showPlayOverlay || clickToPlay;
  const syncPaused = () => {
    if (tracksPause) paused = replayer.isPaused();
  };
  $: if (tracksPause && replayer) syncPaused();
  // Playing removes the button; keep keyboard focus in the player.
  function playFromOverlay(event: MouseEvent) {
    const root = player.getRootNode() as Document | ShadowRoot;
    const focused = root.activeElement === event.currentTarget;
    controller.play();
    if (focused) player.focus();
  }
  export let speedOption: NonNullable<RRwebPlayerOptions['props']['speedOption']> = [1, 2, 4, 8];
  export let speed: NonNullable<RRwebPlayerOptions['props']['speed']> = 1;
  export let showController: NonNullable<RRwebPlayerOptions['props']['showController']> = true;
  export let showCaptions: NonNullable<RRwebPlayerOptions['props']['showCaptions']> = true;
  export let timelineMarkerColor: NonNullable<RRwebPlayerOptions['props']['timelineMarkerColor']> = 'rgb(73, 80, 246)';
  export let tags: NonNullable<RRwebPlayerOptions['props']['tags']> = {};
  // color of inactive periods indicator
  export let inactiveColor: NonNullable<RRwebPlayerOptions['props']['inactiveColor']> = '#D4D4D4';

  let replayer: Replayer;
  let captionText: string | undefined;

  export const getMirror = () => replayer.getMirror();

  const controllerHeight = 80;
  let player: HTMLElement;
  let frame: HTMLElement;
  let press: { x: number; y: number; id: number } | undefined;
  let dragged = false;

  function startPress(event: PointerEvent) {
    if (event.button !== 0 || !event.isPrimary) return;
    press = { x: event.clientX, y: event.clientY, id: event.pointerId };
    dragged = false;
  }

  function trackPress(event: PointerEvent) {
    if (
      press?.id === event.pointerId &&
      Math.hypot(event.clientX - press.x, event.clientY - press.y) > 4
    ) {
      dragged = true;
    }
  }

  function leavePress(event: PointerEvent) {
    if (press?.id === event.pointerId) dragged = true;
  }

  function finishPress(event: PointerEvent) {
    if (press?.id !== event.pointerId) return;
    trackPress(event);
    press = undefined;
  }

  function cancelPress(event: PointerEvent) {
    if (press?.id !== event.pointerId) return;
    dragged = true;
    press = undefined;
  }

  function handleSurfaceClick(event: MouseEvent) {
    if (!event.detail || !dragged) toggle();
  }

  let fullscreenListener: undefined | (() => void);
  let _width: number = width;
  let _height: number = height;
  let controller: {
    toggle: () => void;
    setSpeed: (speed: number) => void;
    toggleSkipInactive: () => void;
  } & Controller;

  let style: string;
  $: style = inlineCss({
    width: `${width}px`,
    height: `${height}px`,
  });
  let playerStyle: string;
  $: playerStyle = inlineCss({
    width: `${width}px`,
    height: `${height + (showController ? controllerHeight : 0)}px`,
  });

  const updateScale = (
    el: HTMLElement,
    frameDimension: { width: number; height: number },
  ) => {
    const widthScale = width / frameDimension.width;
    const heightScale = height / frameDimension.height;
    const scale = [widthScale, heightScale];
    if (maxScale) scale.push(maxScale);
    el.style.transform =
      `scale(${Math.min(...scale)})` + 'translate(-50%, -50%)';
  };

  export const triggerResize: RRwebPlayerExpose['triggerResize'] = () => {
    updateScale(replayer.wrapper, {
      width: replayer.iframe.offsetWidth,
      height: replayer.iframe.offsetHeight,
    });
  };

  export const toggleFullscreen: RRwebPlayerExpose['toggleFullscreen'] = () => {
    if (player) {
      isFullscreen() ? exitFullscreen() : openFullscreen(player);
    }
  };

  export const addEventListener: RRwebPlayerExpose['addEventListener'] = (
    event: string, handler: (detail: JumpEvent) => unknown,
  ) => {
    if (event === 'ui-jump') {
      jumpListeners.add(handler);
      return () => { jumpListeners.delete(handler); };
    }
    if (event === 'ui-update-current-time' || event === 'ui-update-progress' || event === 'ui-update-player-state') {
      return controller.$on(event, ({ detail }) => (handler as (value: unknown) => unknown)(detail));
    }
    const listener = handler as (detail: unknown) => unknown;
    replayer.on(event, listener);
    return () => { replayer.off(event, listener); };
  };

  export const addEvent: RRwebPlayerExpose['addEvent'] = (event: eventWithTime) => {
    replayer.addEvent(event); // emits 'events-updated' triggering (private) controller.updateMeta
  };
  export const getMetaData: RRwebPlayerExpose['getMetaData'] = () => replayer.getMetaData();
  export const getReplayer: RRwebPlayerExpose['getReplayer'] = () => replayer;

  // by pass controller methods as public API
  export const toggle: RRwebPlayerExpose['toggle'] = () => {
    controller.toggle();
  };
  export const setSpeed: RRwebPlayerExpose['setSpeed'] = (speed: number) => {
    controller.setSpeed(speed);
  };
  export const toggleSkipInactive: RRwebPlayerExpose['toggleSkipInactive'] = () => {
    controller.toggleSkipInactive();
  };
  export const play: RRwebPlayerExpose['play'] = () => {
    controller.play();
  };
  export const pause: RRwebPlayerExpose['pause'] = () => {
    controller.pause();
  };
  export const goto: RRwebPlayerExpose['goto'] = (timeOffset: number, play?: boolean) => {
    controller.goto(timeOffset, play);
  };
  export const playRange: RRwebPlayerExpose['playRange'] = (
    timeOffset: number,
    endTimeOffset: number,
    startLooping = false,
    afterHook: undefined | (() => void) = undefined,
  ) => {
    controller.playRange(timeOffset, endTimeOffset, startLooping, afterHook);
  };

  onMount(() => {
    // runtime type check
    if (speedOption !== undefined && typeOf(speedOption) !== 'array') {
      throw new Error('speedOption must be array');
    }
    speedOption.forEach((item) => {
      if (typeOf(item) !== 'number') {
        throw new Error('item of speedOption must be number');
      }
    });
    if (speedOption.indexOf(speed) < 0) {
      throw new Error(`speed must be one of speedOption,
        current config:
        {
          ...
          speed: ${speed},
          speedOption: [${speedOption.toString()}]
          ...
        }
        `);
    }

    // Player-only props are not Replayer options.
    const { features: _features, ...replayProps } = $$props;
    replayer = new Replayer(events, {
      speed,
      root: frame,
      unpackFn: unpack,
      ...replayProps,
    });

    replayer.on('state-change', syncPaused);
    replayer.on('resize', (dimension) => {
      updateScale(
        replayer.wrapper,
        dimension as { width: number; height: number },
      );
    });

    fullscreenListener = onFullscreenChange(() => {
      if (isFullscreen()) {
        setTimeout(() => {
          _width = width;
          _height = height;
          width = player.offsetWidth;
          height =
            player.offsetHeight - (showController ? controllerHeight : 0);
          updateScale(replayer.wrapper, {
            width: replayer.iframe.offsetWidth,
            height: replayer.iframe.offsetHeight,
          });
        }, 0);
      } else {
        width = _width;
        height = _height;
        updateScale(replayer.wrapper, {
          width: replayer.iframe.offsetWidth,
          height: replayer.iframe.offsetHeight,
        });
      }
    });
  });

  onDestroy(() => {
    replayer?.off('state-change', syncPaused);
    fullscreenListener && fullscreenListener();
  });
</script>

<style global>
  @import '@rrweb/replay/dist/style.css';

  .rr-player {
    position: relative;
    background: white;
    float: left;
    border-radius: 5px;
    box-shadow: 0 24px 48px rgba(17, 16, 62, 0.12);
  }

  .rr-player__viewport {
    position: relative;
  }

  .rr-player__surface {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    background: transparent;
    border: 0;
    cursor: pointer;
  }

  /* Shows while the pointer is on the replay or the button has focus. Only
     the button takes clicks, so the replay below stays usable. */
  .rr-player__play-overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgb(0 0 0 / 15%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 120ms;
  }
  .rr-player__viewport:hover .rr-player__play-overlay,
  .rr-player__play-overlay:focus-within {
    opacity: 1;
  }
  /* Touch screens, including ones next to a mouse, cannot hover. */
  @media (hover: none), (any-pointer: coarse) {
    .rr-player__play-overlay {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .rr-player__play-overlay {
      transition: none;
    }
  }
  .rr-player__play-overlay > button {
    padding: 8px 12px;
    border: 0;
    border-radius: 8px;
    background: #222;
    color: #fff;
    font: 32px/1 system-ui, sans-serif;
    cursor: pointer;
    pointer-events: auto;
  }
  .rr-player__play-overlay > button:focus-visible {
    outline: 2px solid #4950f6;
    outline-offset: 2px;
  }

  .rr-player__caption {
    bottom: 24px;
    position: absolute;
    left: 8%;
    right: 8%;
    margin: 0 auto;
    width: fit-content;
    max-width: 84%;
    max-height: 45%;
    overflow-y: auto;
    box-sizing: border-box;
    padding: 10px 16px;
    border-radius: 6px;
    background: rgba(24, 29, 40, 0.94);
    color: #fff;
    font: 16px/1.5 system-ui, sans-serif;
    text-align: center;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .rr-player__frame {
    overflow: hidden;
  }

  /* The iframe can still receive input when the Replayer enables interaction. */
  .rr-player__surface + .rr-player__frame {
    position: relative;
    pointer-events: none;
  }

  .replayer-wrapper {
    float: left;
    clear: both;
    transform-origin: top left;
    left: 50%;
    top: 50%;
  }

  .replayer-wrapper > iframe {
    border: none;
  }
</style>

<div
  class="rr-player"
  tabindex={showController && features.jump?.keyboard === 'player'
    ? 0
    : showPlayOverlay
      ? -1
      : undefined}
  bind:this={player}
  style={playerStyle}
  style:--rr-timeline-marker-panel-width={`${Math.min(280, width * 0.7)}px`}
  style:--rr-timeline-marker-panel-height={`${Math.max(48, height - 32)}px`}
>
  <div class="rr-player__viewport" {style}>
    {#if clickToPlay === true}
      <button
        type="button"
        class="rr-player__surface"
        aria-label={paused ? 'Play replay' : 'Pause replay'}
        on:pointerdown={startPress}
        on:pointermove={trackPress}
        on:pointerleave={leavePress}
        on:pointerup={finishPress}
        on:pointercancel={cancelPress}
        on:click={handleSurfaceClick}
      />
    {/if}
    <div class="rr-player__frame" bind:this={frame} {style} />
    {#if showPlayOverlay && paused}
      <div class="rr-player__play-overlay">
        <button type="button" aria-label="Play" on:click={playFromOverlay}
          >▶︎</button
        >
      </div>
    {/if}
    <div role="status" aria-live="polite" aria-atomic="true">
      {#if captionText !== undefined}
        <div class="rr-player__caption">{captionText}</div>
      {/if}
    </div>
  </div>
  {#if replayer}
    <Controller
      bind:this={controller}
      {features}
      playerElement={player}
      on:ui-jump={({ detail }) => [...jumpListeners].forEach(listener => listener(detail))}
      {replayer}
      bind:captionText
      bind:showCaptions
      {showController}
      {autoPlay}
      {speedOption}
      {skipInactive}
      {tags}
      {timelineMarkerColor}
      {inactiveColor}
      on:fullscreen={() => toggleFullscreen()}
    />
  {/if}
</div>
