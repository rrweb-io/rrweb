<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Replayer, unpack, mirror } from 'rrweb';
  import type { eventWithTime, playerConfig } from 'rrweb/typings/types';
  import {
    inlineCss,
    openFullscreen,
    exitFullscreen,
    isFullscreen,
    onFullscreenChange,
    typeOf,
  } from './utils';
  import Controller from './Controller.svelte';

  export let width: number = 1024;
  export let height: number = 576;
  export let events: eventWithTime[] = [];
  export let skipInactive: boolean = true;
  export let autoPlay: boolean = true;
  export let triggerFocus: boolean = true;
  export let speedOption: number[] = [1, 2, 4, 8];
  export let showController: boolean = true;
  export let showWarning: boolean = true;
  export let showDebug: boolean = true;
  export let tags: Record<string, string> = {};
  export let mouseTail: playerConfig['mouseTail'] = true;
  export let UNSAFE_replayCanvas: boolean = false;

  export const getMirror = () => mirror;

  const controllerHeight = 80;
  let speed = 1;
  let player: HTMLElement;
  let frame: HTMLElement;
  let replayer: Replayer;
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
    el.style.transform =
      `scale(${Math.min(widthScale, heightScale)})` + 'translate(-50%, -50%)';
  };

  export const toggleFullscreen = () => {
    if (player) {
      isFullscreen() ? exitFullscreen() : openFullscreen(player);
    }
  };

  export const addEventListener = (
    event: string,
    handler: (detail: unknown) => unknown,
  ) => {
    replayer.on(event, handler);
    switch (event) {
      case 'ui-update-current-time':
      case 'ui-update-progress':
      case 'ui-update-player-state':
        controller.$on(event, ({ detail }) => handler(detail));
      default:
        break;
    }
  };

  export const addEvent = (event: eventWithTime) => {
    replayer.addEvent(event);
  };
  export const getMetaData = () => replayer.getMetaData();
  export const getReplayer = () => replayer;

  // by pass controller methods as public API
  export const toggle = () => {
    controller.toggle();
  };
  export const setSpeed = (speed: number) => {
    controller.setSpeed(speed);
  };
  export const toggleSkipInactive = () => {
    controller.toggleSkipInactive();
  };
  export const play = () => {
    controller.play();
  };
  export const pause = () => {
    controller.pause();
  };
  export const goto = (timeOffset: number) => {
    controller.goto(timeOffset);
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

    replayer = new Replayer(events, {
      speed,
      root: frame,
      skipInactive,
      showWarning,
      showDebug,
      triggerFocus,
      unpackFn: unpack,
      mouseTail,
      UNSAFE_replayCanvas,
    });

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
          height = player.offsetHeight;
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
    fullscreenListener && fullscreenListener();
  });
</script>

<style global>
  @import 'rrweb/dist/rrweb.min.css';

  .rr-player {
    position: relative;
    background: white;
    float: left;
    border-radius: 5px;
    box-shadow: 0 24px 48px rgba(17, 16, 62, 0.12);
  }

  .rr-player__frame {
    overflow: hidden;
  }

  :global(.replayer-wrapper) {
    float: left;
    clear: both;
    transform-origin: top left;
    left: 50%;
    top: 50%;
  }

  :global(.replayer-wrapper > iframe) {
    border: none;
  }
</style>

<div class="rr-player" bind:this={player} style={playerStyle}>
  <div class="rr-player__frame" bind:this={frame} {style} />
  {#if replayer}
    <Controller
      bind:this={controller}
      {replayer}
      {showController}
      {autoPlay}
      {speedOption}
      {skipInactive}
      {tags}
      on:fullscreen={() => toggleFullscreen()} />
  {/if}
</div>
