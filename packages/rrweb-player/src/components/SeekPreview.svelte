<script lang="ts">
  import { formatTime } from '../utils';
  /** The replay time a click would seek to. */
  export let time: number;
  /** Where that time sits on the timeline, from 0 to 1. */
  export let position: number;
  /** Shows the time above the line. */
  export let showTime = true;
</script>

<!-- Shows where a click on the timeline would seek. The box above the line
     is the place a preview image could go later. -->
<div class="rr-seek-preview" aria-hidden="true" style:left={`${100 * position}%`}>
  {#if showTime}
    <!-- The box slides along so it stays over the track at both ends. -->
    <span
      class="rr-seek-preview__box"
      style:transform={`translateX(${-100 * position}%)`}
      >{formatTime(time)}</span
    >
  {/if}
</div>

<style>
  .rr-seek-preview {
    position: absolute;
    top: -10px;
    bottom: -10px;
    width: 0;
    border-left: 1px dashed var(--rr-focus, rgb(73, 80, 246));
    pointer-events: none;
    z-index: 1;
  }
  .rr-seek-preview__box {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    padding: 2px 6px;
    border-radius: 999px;
    background: var(--rr-surface, #fff);
    color: var(--rr-text, #11103e);
    box-shadow: 0 0 0 1px var(--rr-line, #dadbe5);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
</style>
