<script context="module" lang="ts">
  let nextHint = 0;

  // Whether an element is the viewport surface this component draws.
  export function isZoomSurface(element: Element | null | undefined): boolean {
    return !!element?.classList.contains('rr-player__surface');
  }
</script>

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
  import type { Replayer } from '@rrweb/replay';
  import { followReplayCursor, getFrameScale } from '../cursor-camera';
  export let clickToPlay = true;
  /** Whether the replay is paused, for the click-to-play label. */
  export let paused = true;
  const hintId = `rrweb-zoom-hint-${++nextHint}`;
  // A drag that started on the surface is not a click.
  function click(event: MouseEvent) {
    if (clickToPlay && (!event.detail || !dragged)) dispatch('toggle');
  }
  export let frame: HTMLElement;
  export let replay: HTMLElement;
  export let replayer: Replayer;
  export let zoom = 1;
  export let followCursor = true;
  const dispatch = createEventDispatcher();
  let pan = {x:0, y:0};
  let surface: HTMLElement;
  let press: {id:number; x:number; y:number; lastX:number; lastY:number} | null = null;
  let dragged = false;
  let stopFollowing: (()=>void) | undefined;
  function clamp(point: typeof pan) {
    if (zoom <= 1) return { x: 0, y: 0 };
    const { width, height } = replay.getBoundingClientRect();
    const scale = getFrameScale(frame);
    const x = Math.max(0, (width / scale.x - frame.clientWidth) / 2);
    const y = Math.max(0, (height / scale.y - frame.clientHeight) / 2);
    return {
      x: Math.max(-x, Math.min(x, point.x)),
      y: Math.max(-y, Math.min(y, point.y)),
    };
  }
  // At the fitted size the replay keeps its own styles.
  function paint(point: typeof pan) {
    pan = point;
    if (zoom <= 1) replay.style.removeProperty('translate');
    else replay.style.setProperty('translate', `${pan.x}px ${pan.y}px`);
  }
  function stopCamera() {
    stopFollowing?.();
    stopFollowing = undefined;
  }
  function syncZoom(value: number) {
    if (value <= 1) replay.style.removeProperty('scale');
    else replay.style.setProperty('scale', String(value));
    paint(clamp(pan));
  }
  function syncCamera(value: number, follow: boolean, holdingPointer: boolean) {
    stopCamera();
    if (follow && value > 1 && !holdingPointer) {
      stopFollowing = followReplayCursor(
        frame,
        replay,
        replayer,
        () => pan,
        paint,
        clamp,
      );
    }
  }
  $: holdingPointer = press !== null;
  $: syncZoom(zoom);
  $: syncCamera(zoom, followCursor, holdingPointer);
  onMount(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => paint(clamp(pan)));
    observer.observe(frame); observer.observe(replay);
    return () => observer.disconnect();
  });
  onDestroy(() => {
    stopCamera();
    replay.style.removeProperty('scale');
    replay.style.removeProperty('translate');
  });
  function down(e: PointerEvent) {
    if (e.button !== 0 || !e.isPrimary) return;
    if (press && surface.hasPointerCapture?.(press.id)) return;
    dragged = false;
    press = {id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY};
    if (zoom > 1) {
      // Hold the camera before the pointer crosses the drag threshold.
      stopCamera();
      surface.focus({ preventScroll: true });
      surface.setPointerCapture(e.pointerId);
    }
  }
  function move(e: PointerEvent) {
    if (!press || e.pointerId !== press.id) return;
    const threshold = zoom > 1 ? 5 : 4;
    if (!dragged && Math.hypot(e.clientX-press.x,e.clientY-press.y) <= threshold) return;
    dragged = true;
    if (zoom > 1) {
      followCursor = false;
      const scale = getFrameScale(frame);
      paint(
        clamp({
          x: pan.x + (e.clientX - press.lastX) / scale.x,
          y: pan.y + (e.clientY - press.lastY) / scale.y,
        }),
      );
    }
    press.lastX=e.clientX; press.lastY=e.clientY;
  }
  function leave(e: PointerEvent) {
    if (press?.id === e.pointerId && !surface.hasPointerCapture?.(e.pointerId)) {
      dragged = true;
      press = null;
    }
  }
  function end(e: PointerEvent) {
    if (!press || e.pointerId !== press.id) return;
    if (e.type === 'pointerup') move(e);
    else dragged = true;
    press = null;
    if (surface.hasPointerCapture?.(e.pointerId)) surface.releasePointerCapture(e.pointerId);
  }
  // clickToPlay swaps the surface between a button and a div, so focus moves
  // to the new element.
  let surfaceClicks = clickToPlay;
  $: if (surface && clickToPlay !== surfaceClicks) {
    surfaceClicks = clickToPlay;
    const root = surface.getRootNode() as Document | ShadowRoot;
    if (root.activeElement === surface) tick().then(() => surface?.focus());
  }
  function keydown(e: KeyboardEvent) {
    if (zoom <= 1 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const delta = {ArrowLeft:[50,0],ArrowRight:[-50,0],ArrowUp:[0,50],ArrowDown:[0,-50]}[e.key];
    if (!delta) return;
    e.preventDefault(); followCursor = false;
    paint(clamp({ x: pan.x + delta[0], y: pan.y + delta[1] }));
  }
</script>
<!-- With click-to-play the surface is a button. Without it, it only pans,
     so it is a focusable group that describes its keys. -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex a11y-no-static-element-interactions -->
<svelte:element this={clickToPlay ? 'button' : 'div'} type={clickToPlay ? 'button' : undefined}
  role={clickToPlay ? undefined : 'group'} tabindex={clickToPlay ? undefined : 0}
  aria-roledescription={clickToPlay ? undefined : 'zoomed replay'}
  class="rr-player__surface" class:clickable={clickToPlay} class:zoomed={zoom > 1} bind:this={surface}
  aria-label={clickToPlay ? (paused ? 'Play replay' : 'Pause replay') : 'Zoomed replay'}
  aria-describedby={zoom > 1 ? hintId : undefined} on:pointerdown={down} on:pointermove={move}
  on:pointerleave={leave} on:pointerup={end} on:pointercancel={end} on:lostpointercapture={end}
  on:keydown={keydown} on:click={click} />
{#if zoom > 1}
  <span id={hintId} class="rr-zoom-hint">Arrow keys move the view. Escape fits the replay.</span>
{/if}
<style>
  .rr-player__surface {position:absolute;inset:0;width:100%;height:100%;padding:0;background:transparent;border:0;}
  .clickable {cursor:pointer;}
  .zoomed {cursor:grab;touch-action:none;user-select:none;}
  .zoomed:active {cursor:grabbing;}
  .rr-zoom-hint {position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;}
</style>
