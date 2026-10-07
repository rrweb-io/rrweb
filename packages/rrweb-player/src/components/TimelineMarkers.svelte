<script lang="ts">
  import { onMount, beforeUpdate, afterUpdate, createEventDispatcher, tick } from 'svelte';
  import CustomEventMarker from './CustomEventMarker.svelte';
  import { groupTimelineMarkers, markerKey } from '../timeline-markers';
  import type { DisplayTimelineMarker } from '../timeline-markers';

  export let markers: readonly DisplayTimelineMarker[];
  export let totalTime: number;
  export let activeId: string | null;
  export let defaultColor: string;
  export let disabled: boolean;
  export let dismissalVersion: number;

  let layer: HTMLDivElement;
  let width = 0;
  $: groups = groupTimelineMarkers(markers, totalTime, width);
  $: activeTime = markers.find((marker) => marker.source === 'external' && marker.id === activeId)?.timeOffset;
  const dispatch = createEventDispatcher<{ 'focus-timeline': void }>();

  // Preserve keyboard position when resize/regeneration moves a marker into a group.
  let focused: HTMLElement | null = null;
  beforeUpdate(() => {
    const element = document.activeElement;
    focused = element instanceof HTMLElement && layer?.contains(element) ? element : null;
  });
  afterUpdate(() => {
    if (focused && !focused.isConnected && !layer.contains(document.activeElement)) {
      const key = focused.dataset.markerKey;
      const group = groups.find((group) => group.markers.some((marker) => markerKey(marker) === key));
      const trigger = group && Array.from(layer.querySelectorAll<HTMLButtonElement>('.rr-custom-event'))
        .find((button) => button.dataset.markerKey === markerKey(group.markers[0]) && !button.disabled);
      if (trigger) {
        // Focus opens even a previously dismissed panel; its choices render next tick.
        trigger.focus();
        void tick().then(() => {
          if (document.activeElement !== trigger) return;
          Array.from(layer.querySelectorAll<HTMLButtonElement>('button'))
            .find((button) => button.dataset.markerKey === key && !button.disabled)?.focus();
        });
      } else dispatch('focus-timeline');
    }
  });
  onMount(() => {
    const measure = () => { width = layer.clientWidth; };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(layer);
    return () => observer.disconnect();
  });
</script>

<div bind:this={layer} class="rr-timeline-markers">
  {#each groups as group (markerKey(group.markers[0]))}
    <CustomEventMarker
      {group}
      {activeId}
      {activeTime}
      {defaultColor}
      {disabled}
      {dismissalVersion}
      on:select
      on:focus-timeline
    />
  {/each}
</div>

<style>
  .rr-timeline-markers { position: absolute; inset: 0; pointer-events: none; }
  .rr-timeline-markers :global(.rr-custom-event-container) { pointer-events: auto; }
</style>
