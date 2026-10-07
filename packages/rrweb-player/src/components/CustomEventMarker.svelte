<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { markerKey } from '../timeline-markers';
  import type { DisplayTimelineMarker, TimelineMarkerGroup } from '../timeline-markers';

  export let group: TimelineMarkerGroup;
  export let activeId: string | null = null;
  export let activeTime: number | undefined = undefined;
  export let defaultColor: string;
  export let disabled = false;
  export let dismissalVersion = 0;

  $: first = group.markers[0];
  $: active = group.markers.find((item) => item.source === 'external' && item.id === activeId);
  $: name = group.markers.length === 1 ? first.label ?? 'Timeline marker' : `${group.markers.length} timeline markers`;
  $: text = first.text;
  $: background = (active ?? first).color ?? defaultColor;
  $: position = `${group.position}%`;
  $: upcoming = activeTime !== undefined && !active && first.timeOffset > activeTime;
  const dispatch = createEventDispatcher<{ select: DisplayTimelineMarker; 'focus-timeline': void }>();
  let dismissed = false;
  let marker: HTMLButtonElement;
  let panel: HTMLDivElement;
  $: if (dismissalVersion) dismiss();

  function dismiss() {
    if (panel?.contains(document.activeElement)) {
      if (disabled) dispatch('focus-timeline');
      else marker.focus();
    }
    dismissed = true;
  }
  $: alignment =
    parseFloat(position) < 20 ? 'left' :
    parseFloat(position) > 80 ? 'right' : 'center';

</script>

<div class="rr-custom-event-container" style:left={position}>
  <button
    bind:this={marker}
    type="button"
    class="rr-custom-event"
    aria-label={`${name}: ${text}`}
    aria-current={active ? 'true' : undefined}
    data-marker-key={markerKey(first)}
    class:rr-custom-event--active={!!active}
    class:rr-custom-event--upcoming={upcoming}
    aria-haspopup="dialog"
    {disabled}
    on:click|stopPropagation={() => dispatch('select', first)}
    on:mouseenter={() => dismissed = false}
    on:focus={() => dismissed = false}
  >
    <span class="rr-custom-event__tick" class:rr-custom-event__tick--group={group.markers.length > 1} style:background />
  </button>
  {#if !dismissed}
    <!-- The nonmodal timeline marker panel needs focus for native scrolling; its clicks must not seek. -->
    <!-- svelte-ignore a11y-no-noninteractive-tabindex a11y-no-noninteractive-element-interactions -->
    <div
      bind:this={panel}
      class="rr-custom-event__timeline-marker-panel"
      class:left={alignment === 'left'}
      class:right={alignment === 'right'}
      role="dialog"
      aria-label={name}
      tabindex="0"
      on:click|stopPropagation
      on:keydown
    >
      <strong>{name}</strong>
      {#if group.markers.length === 1}
        <span>{text}</span>
      {:else}
        {#each group.markers as item (markerKey(item))}
          <button
            type="button"
            class="rr-custom-event__choice"
            data-marker-key={markerKey(item)}
            aria-label={`${item.label ?? 'Timeline marker'}: ${item.text}`}
            aria-current={item.source === 'external' && item.id === activeId ? 'true' : undefined}
            {disabled}
            on:click|stopPropagation={() => dispatch('select', item)}
          >
            <strong>{item.label ?? 'Timeline marker'}</strong>
            <span>{item.text}</span>
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .rr-custom-event-container {
    position: absolute;
    top: 2px;
    transform: translate(-50%, -50%);
    width: 9px;
    height: 24px;
    z-index: 1;
  }

  .rr-custom-event {
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    font: inherit;
  }

  .rr-custom-event-container:hover,
  .rr-custom-event-container:focus-within {
    z-index: 2;
  }

  .rr-custom-event:focus-visible {
    outline: 2px solid rgb(73, 80, 246);
    outline-offset: 2px;
    border-radius: 3px;
  }

  .rr-custom-event:disabled {
    cursor: not-allowed;
  }

  .rr-custom-event__tick {
    display: block;
    width: 4px;
    height: 14px;
    border-radius: 3px;
    margin: auto;
  }

  .rr-custom-event__tick--group { width: 6px; }
  .rr-custom-event--active .rr-custom-event__tick {
    height: 20px;
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
  .rr-custom-event--upcoming { opacity: 0.45; }
  .rr-custom-event:hover, .rr-custom-event:focus-visible { opacity: 1; }
  .rr-custom-event__choice {
    display: block;
    width: 100%;
    border: 0;
    border-radius: 3px;
    padding: 8px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .rr-custom-event__choice:hover, .rr-custom-event__choice:focus-visible,
  .rr-custom-event__choice[aria-current="true"] { background: #414859; }

  .rr-custom-event__timeline-marker-panel {
    display: none;
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    width: var(--rr-timeline-marker-panel-width, 280px);
    box-sizing: border-box;
    padding: 12px 14px;
    background: #242936;
    color: #fff;
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    font: 14px/1.5 system-ui, sans-serif;
    text-align: left;
    white-space: normal;
    overflow-wrap: anywhere;
    max-height: var(--rr-timeline-marker-panel-height, 240px);
    overflow-y: auto;
  }

  .rr-custom-event__timeline-marker-panel strong,
  .rr-custom-event__timeline-marker-panel span {
    display: block;
    white-space: pre-wrap;
  }

  .rr-custom-event__timeline-marker-panel strong {
    margin-bottom: 4px;
  }

  .rr-custom-event__timeline-marker-panel.left {
    left: 0;
    transform: none;
  }

  .rr-custom-event__timeline-marker-panel.right {
    left: auto;
    right: 0;
    transform: none;
  }

  .rr-custom-event-container:hover .rr-custom-event__timeline-marker-panel,
  .rr-custom-event-container:focus-within .rr-custom-event__timeline-marker-panel {
    display: block;
  }
</style>
