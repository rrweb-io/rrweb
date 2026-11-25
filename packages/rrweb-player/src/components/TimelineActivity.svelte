<script context="module" lang="ts">
  let nextHint = 0;
</script>

<script lang="ts">
  import {createEventDispatcher, onDestroy} from 'svelte';
  import { ACTIVITY_LAYERS } from '../timeline-activity';
  import type {activitySamples, clickMarks} from '../timeline-activity';
  import type {ReplayTimelineScale} from '../timeline-scale';
  import type {ActivityLayer} from '../features';
  import { formatTime } from '../utils';
  import IconOverride from './IconOverride.svelte';
  import type {PlayerIcons} from '../features';
  /** Host icons for the click and page change marks, with the toolbar only. */
  export let icons: PlayerIcons = {};
  export let seekable = true;
  export let scale: ReplayTimelineScale;
  export let samples: ReturnType<typeof activitySamples>;
  export let marks: ReturnType<typeof clickMarks>;
  /** Navigations to a new URL, merged like click marks. */
  export let navigationMarks: ReturnType<typeof clickMarks> = [];
  export let layers: Record<ActivityLayer, boolean>;
  export let currentTime: number;
  /** The player area that shows the graph while hovered below the graph's top. */
  export let container: HTMLElement;
  export let hoverEnabled = true;
  let graph: HTMLButtonElement;
  let bottomHovered = false;
  // The graph shows while the pointer is on it or anywhere below its top edge:
  // the track, the rows around it and the controls. The graph sits just above
  // the track, so this works at any player height.
  function trackHover(event: PointerEvent) {
    bottomHovered = event.pointerType !== 'touch' &&
      (event.composedPath().includes(graph) || event.clientY >= graph.getBoundingClientRect().top);
  }
  const leaveHover = () => { bottomHovered = false; };
  let hoverTarget: HTMLElement | undefined;
  function watchHover(next: HTMLElement | undefined) {
    if (next === hoverTarget) return;
    hoverTarget?.removeEventListener('pointermove', trackHover);
    hoverTarget?.removeEventListener('pointerleave', leaveHover);
    hoverTarget = next;
    next?.addEventListener('pointermove', trackHover);
    next?.addEventListener('pointerleave', leaveHover);
    if (!next) bottomHovered = false;
  }
  $: watchHover(hoverEnabled ? container : undefined);
  onDestroy(() => watchHover(undefined));
  // The keyboard steps are described to keyboard and screen reader users.
  // A hover tooltip would show them to mouse users, for whom Enter does nothing.
  const hintId = `rr-activity-hint-${nextHint++}`;
  let choice: number | null = null;
  $: if (!seekable) choice = null;
  /** With the seek preview on, the graph reports the pointer's place (0-1) to it. */
  export let preview = false;
  /** The previewed time, drawn across the graph. */
  export let previewTime: number | null = null;
  function track(event: PointerEvent) {
    // While a keyboard choice is pending, the pointer does not preview, here
    // or on the timeline below.
    if (choice !== null) {
      event.stopPropagation();
      return;
    }
    if (!preview || !seekable || event.pointerType === 'touch') return;
    const rect = (event.currentTarget as Element).getBoundingClientRect();
    if (!rect.width) return;
    const position = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    dispatch('preview', position);
  }
  // The keyboard choice wins over the pointer while one is being made.
  $: marker = choice ?? (preview && seekable ? previewTime : null);
  const dispatch = createEventDispatcher<{ seek: number; preview: number | null }>();
  // A graph removed under the pointer gets no pointerleave; clear its preview.
  onDestroy(() => { if (preview) dispatch('preview', null); });
  const round = (value:number) => Number(value.toFixed(3));
  function paths(points: typeof samples, enabled: typeof layers) {
    const top = (point: typeof samples[number], count:number) => {
      let sum = 0;
      for (let i=0;i<count;i++) if (enabled[ACTIVITY_LAYERS[i]]) sum += point.layers[i];
      return round(100-94*sum);
    };
    return ACTIVITY_LAYERS.map((key,i) => {
      if (!enabled[key] || !points.some((point) => point.layers[i] > 0)) return '';
      const edge = (n:number) => points.map(p=>round(p.position*1000)+','+top(p,n));
      return 'M'+edge(i+1).join(' L')+' L'+edge(i).reverse().join(' L')+' Z';
    });
  }
  $: bands = paths(samples,layers);
  function key(event: KeyboardEvent) {
    if (!seekable || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    const from = choice ?? currentTime;
    const step = event.shiftKey ? 5000 : 1000;
    const next = {
      ArrowLeft: from - step,
      ArrowRight: from + step,
      Home: 0,
      End: scale.total,
    }[event.key];
    if (event.key === 'Escape' && choice !== null) {
      choice = null;
      event.stopPropagation();
      return;
    }
    if (next === undefined) return;
    event.stopPropagation();
    event.preventDefault();
    choice = Math.max(0, Math.min(scale.total, next));
    // The keyboard choice replaces the pointer preview while it is made.
    if (preview) dispatch('preview', null);
  }
  function click(event: MouseEvent) {
    if (!seekable) return;
    let time = choice;
    if (event.detail) {
      const rect = (event.currentTarget as Element).getBoundingClientRect();
      if (!rect.width) return;
      time = scale.positionToTime((event.clientX - rect.left) / rect.width);
    }
    if (time === null) return;
    choice = null;
    dispatch('seek', time);
  }
</script>
<button bind:this={graph} type="button" disabled={!seekable} class="rr-activity" class:shown={bottomHovered}
  aria-label={!seekable ? 'Replay activity' : choice === null ? 'Seek on activity graph' : `Seek to ${formatTime(choice)} on activity graph`}
  aria-describedby={seekable ? hintId : undefined}
  aria-keyshortcuts={seekable ? 'ArrowLeft ArrowRight Home End Enter' : undefined}
  on:click|stopPropagation={click} on:keydown={key} on:blur={() => choice = null}
  on:pointermove={track} on:pointerleave={() => preview && dispatch('preview', null)}>
  <svg aria-hidden="true" viewBox="0 0 1000 110" preserveAspectRatio="none">
    {#each bands as path, i}
      {#if path}<path data-layer={ACTIVITY_LAYERS[i]} d={path} style:fill="var(--rr-text, #262957)" fill-opacity={[0.17,0.36,0.65][i]} />{/if}
    {/each}
    {#if layers.clicks && !icons.click}
      {#each marks as mark}
        <line data-layer="clicks" x1={1000*mark.from} x2={1000*mark.to+0.001} y1="106" y2="106" style:stroke="var(--rr-text, #242276)" stroke-width="4" stroke-linecap="round" vector-effect="non-scaling-stroke" />
      {/each}
    {/if}
    {#if marker !== null}
      <line x1={1000*scale.timeToPosition(marker)} x2={1000*scale.timeToPosition(marker)} y1="0" y2="110" style:stroke="var(--rr-focus, #4950f6)" stroke-dasharray="4 3" vector-effect="non-scaling-stroke" />
    {/if}
  </svg>
  <!-- Icon marks sit outside the stretched SVG so they keep their shape. A
       burst of clicks that shares one mark gets one icon at its middle. -->
  {#if layers.clicks && icons.click}
    {#each marks as mark}
      <span class="rr-activity__icon rr-activity__click" data-layer="clicks" style:left={`${50*(mark.from+mark.to)}%`}>
        <IconOverride {icons} name="click" />
      </span>
    {/each}
  {/if}
  {#if layers.navigation}
    <!-- Built in, a hollow dot in the click lane, so it reads apart from a click. -->
    {#each navigationMarks as mark}
      <span class="rr-activity__icon rr-activity__page" data-layer="navigation" style:left={`${50*(mark.from+mark.to)}%`}>
        <IconOverride {icons} name="navigation">
          <i class="rr-activity__dot" />
        </IconOverride>
      </span>
    {/each}
  {/if}
</button>
<span id={hintId} hidden>Use the arrow keys to choose a time, then press Enter to seek.</span>
<style>
  .rr-activity {position:absolute;bottom:100%;left:0;width:100%;height:clamp(30px,8vh,80px);margin:0;padding:0;border:0;background:transparent;opacity:0;pointer-events:none;transition:opacity .15s;cursor:crosshair;}
  .rr-activity.shown,
  .rr-activity:focus-visible,
  :global(.rr-progress:focus-within) .rr-activity {
    opacity: 1;
  }
  .rr-activity.shown:not(:disabled),
  .rr-activity:focus-visible:not(:disabled),
  :global(.rr-progress:focus-within) .rr-activity:not(:disabled) {
    pointer-events: auto;
  }
  /* The decorative fade reaches the player edges; graph coordinates and hit target follow the track. */
  .rr-activity::before {
    content: '';
    position: absolute;
    inset: 0 calc(-1 * var(--rr-timeline-inset, 0px));
    background: linear-gradient(
      transparent,
      color-mix(in srgb, var(--rr-surface, #fff) 92%, transparent)
    );
    pointer-events: none;
  }
  .rr-activity > svg {position:relative;display:block;width:100%;height:100%;}
  /* Icon marks are centred on the click lane, which the SVG draws at y=106 of 110. */
  .rr-activity__icon {position:absolute;bottom:calc(100% * 4 / 110);display:flex;transform:translate(-50%, 50%);pointer-events:none;color:var(--rr-text, #262957);}
  /* A ring a little wider than the SVG's 4px click dots. */
  .rr-activity__dot {display:block;box-sizing:border-box;width:7px;height:7px;border-radius:50%;border:1.5px solid currentColor;background:var(--rr-surface, #fff);}
  /* Touch screens cannot hover, so the graph stays visible there, also on
     ones next to a mouse. */
  @media (hover: none), (any-pointer: coarse) {
    .rr-activity { opacity: 1; }
    .rr-activity:not(:disabled) { pointer-events: auto; }
  }
  @media (prefers-reduced-motion:reduce){.rr-activity{transition:none;}}
</style>
