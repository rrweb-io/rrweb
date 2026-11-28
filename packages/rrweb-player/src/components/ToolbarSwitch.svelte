<script lang="ts">
  export let id: string;
  export let checked: boolean;
  export let label: string;
</script>
<span class="switch">
  <input {id} type="checkbox" role="switch" aria-label={label} bind:checked on:change />
  <span class="track" aria-hidden="true"></span>
</span>
<style>
  .switch {
    --width: 32px;
    --height: 16px;
    --inset: 0px;
    --thumb: calc(var(--height) - 2 * var(--inset));
    position: relative;
    display: inline-flex;
    flex: none;
    width: var(--width);
    height: var(--height);
  }
  input {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    margin: 0;
    cursor: pointer;
    opacity: 0;
  }
  .track::before, .track::after {
    content: '';
    position: absolute;
    border-radius: 999px;
  }
  .track::before {
    inset: 0;
    background: var(--rr-track);
    transition: background .1s ease;
  }
  .track::after {
    top: calc((var(--height) - var(--thumb)) / 2);
    left: var(--inset);
    width: var(--thumb);
    height: var(--thumb);
    background: var(--rr-surface);
    box-shadow: 0 0 0 1px var(--rr-line), 0 2px 5px #0005;
    transition: transform .15s ease;
  }
  input:checked + .track::before {
    background: var(--rr-accent);
  }
  input:checked + .track::after {
    transform: translateX(calc(var(--width) - var(--thumb) - 2 * var(--inset)));
  }
  input:focus-visible + .track::before {
    outline: 2px solid var(--rr-focus);
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    .track::before, .track::after { transition: none; }
  }
</style>
