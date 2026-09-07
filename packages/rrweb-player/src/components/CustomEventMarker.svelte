<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let name: string;
  export let text: string;
  export let background: string;
  export let position: string;
  export let disabled = false;
  export let dismissalVersion = 0;

  const dispatch = createEventDispatcher<{ seek: void }>();
  let dismissed = false;
  $: if (dismissalVersion) dismissed = true;
  $: alignment =
    parseFloat(position) < 20 ? 'left' :
    parseFloat(position) > 80 ? 'right' : 'center';

</script>

<button
  type="button"
  class="rr-custom-event"
  style:left={position}
  aria-label={`${name}: ${text}`}
  {disabled}
  on:click|stopPropagation={() => dispatch('seek')}
  on:mouseenter={() => dismissed = false}
  on:focus={() => dismissed = false}
>
  <span class="rr-custom-event__tick" style:background />
  {#if !dismissed}
    <span
      class="rr-custom-event__note"
      class:left={alignment === 'left'}
      class:right={alignment === 'right'}
      role="tooltip"
    >
      <strong>{name}</strong>
      <span>{text}</span>
    </span>
  {/if}
</button>

<style>
  .rr-custom-event {
    position: absolute;
    top: 2px;
    transform: translate(-50%, -50%);
    width: 20px;
    height: 24px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    z-index: 1;
    font: inherit;
  }

  .rr-custom-event:hover,
  .rr-custom-event:focus-visible {
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
    width: 10px;
    height: 5px;
    margin: auto;
  }

  .rr-custom-event__note {
    display: none;
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    width: var(--rr-note-width, 280px);
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
    max-height: var(--rr-note-height, 240px);
    overflow-y: auto;
  }

  .rr-custom-event__note strong,
  .rr-custom-event__note span {
    display: block;
    white-space: pre-wrap;
  }

  .rr-custom-event__note strong {
    margin-bottom: 4px;
  }

  .rr-custom-event__note.left {
    left: 0;
    transform: none;
  }

  .rr-custom-event__note.right {
    left: auto;
    right: 0;
    transform: none;
  }

  .rr-custom-event:hover .rr-custom-event__note,
  .rr-custom-event:focus-visible .rr-custom-event__note {
    display: block;
  }
</style>
