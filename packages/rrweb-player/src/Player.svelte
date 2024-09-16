<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Replayer } from '@saola.ai/replay';
  import { unpack } from '@saola.ai/rrweb-packer/unpack';
  import type { eventWithTime } from '@saola.ai/rrweb-types';
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
    
  export let width: NonNullable<RRwebPlayerOptions['props']['width']>  = 1024;
  export let height: NonNullable<RRwebPlayerOptions['props']['height']> = 576;
  export let maxScale: NonNullable<RRwebPlayerOptions['props']['maxScale']> = 1;
  export let events: RRwebPlayerOptions['props']['events'];
  export let skipInactive: NonNullable<RRwebPlayerOptions['props']['skipInactive']> = true;
  export let autoPlay: NonNullable<RRwebPlayerOptions['props']['autoPlay']> = true;
  export let speedOption: NonNullable<RRwebPlayerOptions['props']['speedOption']> = [1, 2, 4, 8];
  export let speed: NonNullable<RRwebPlayerOptions['props']['speed']> = 1;
  export let showController: NonNullable<RRwebPlayerOptions['props']['showController']> = true;
  export let tags: NonNullable<RRwebPlayerOptions['props']['tags']> = {};
  // color of inactive periods indicator
  export let inactiveColor: NonNullable<RRwebPlayerOptions['props']['inactiveColor']> = '#D4D4D4';

  let replayer: Replayer;

  export const getMirror = () => replayer.getMirror();

  const controllerHeight = 80;
  let player: HTMLElement;
  let frame: HTMLElement;
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

  export const setDims: RRwebPlayerExpose['setDims'] = (iWidth: number, iHeight: number) => {  
    width = iWidth;
    height = iHeight;
  };

  export const setDimsAndScale: RRwebPlayerExpose['setDimsAndScale'] = (iWidth: number, iHeight: number) => {  
    width = iWidth;
    height = iHeight;
    updateScale(replayer.wrapper, {
      width: replayer.iframe.offsetWidth,
      height: replayer.iframe.offsetHeight,
    });
  };

  export const destroy: RRwebPlayerExpose['destroy'] = () => {
    fullscreenListener && fullscreenListener();
  };

  export const toggleFullscreen: RRwebPlayerExpose['toggleFullscreen'] = () => {
    if (player) {
      isFullscreen() ? exitFullscreen() : openFullscreen(player);
    }
  };

  export const addEventListener: RRwebPlayerExpose['addEventListener'] = (
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

  export const addEvent: RRwebPlayerExpose['addEvent'] = (event: eventWithTime) => {
    replayer.addEvent(event);
    controller.triggerUpdateMeta();
    
  };
  export const refreshProgress: RRwebPlayerExpose["refreshProgress"] = () => {
    controller.triggerUpdateProgress();
  }
  
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

    replayer = new Replayer(events, {
      speed,
      root: frame,
      unpackFn: unpack,
      ...$$props,
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
    // This is never called, at least the way we use it in React.
    // exposed a destroy() function which does the same and can be explicitly called.
    fullscreenListener && fullscreenListener();
  });
</script>

<style global>
  @import '@saola.ai/replay/dist/style.css';

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
      {inactiveColor}
      on:fullscreen={() => toggleFullscreen()}
    />
  {/if}
</div>
