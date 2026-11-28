<script context="module" lang="ts">
  let nextToolbar = 0;
</script>

<script lang="ts">
  const switchId = `rrweb-switch-${++nextToolbar}`;
  import { createEventDispatcher } from 'svelte';
  import TimePill from './TimePill.svelte';
  import ToolbarSwitch from './ToolbarSwitch.svelte';
  import ControlIcon from './ControlIcon.svelte';
  import ControlPopover from './ControlPopover.svelte';
  import type {
    DownloadLink,
    PlayerControls,
    PlayerFeatures,
    PlayerIcons,
  } from '../features';
  export let features: PlayerFeatures = {};
  /** Controls set to `false` are left out of the toolbar. */
  export let controls: PlayerControls = {};
  export let icons: PlayerIcons = {};
  export let seconds = 10;
  export let fullscreen = false;
  export let container: HTMLElement;
  export let playing: boolean;
  export let canJump: boolean;
  export let currentTime: number;
  export let totalTime: number;
  export let speed: number;
  export let speedOption: number[];
  export let annotations: boolean;
  export let skipInactive: boolean;
  export let hasAnnotations: boolean;
  export let startedAt: number;
  export let recordingTimeZone: string | undefined = undefined;
  const dispatch = createEventDispatcher();
  let panel: 'speed' | 'settings' | 'download' | null = null;
  $: download = typeof features.download === 'object' ? features.download : {};
  $: downloadJson = Boolean(features.download) && download.json !== false;
  // Only links a browser can open safely; a javascript: URL would run.
  $: downloadLinks = features.download
    ? (download.links ?? []).filter((link: DownloadLink) =>
        /^(https?|blob):/i.test(link.href.trim()),
      )
    : [];
  $: showDownload =
    controls.download !== false && (downloadJson || downloadLinks.length > 0);
  $: if (
    (panel === 'speed' && controls.speed === false) ||
    (panel === 'settings' && controls.settings === false) ||
    (panel === 'download' && !showDownload)
  )
    panel = null;
  // The slider spans the host's speedOption list.
  $: minSpeed = Math.min(...speedOption);
  $: maxSpeed = Math.max(...speedOption);
  function changeAnnotations(event: Event) {
    if (event.target instanceof HTMLInputElement)
      dispatch('annotations', event.target.checked);
  }
  function changeSpeed(value: number) {
    dispatch('speed', Math.max(minSpeed, Math.min(maxSpeed, value)));
  }
  // The slider's own keys move it. Inside a closed shadow root, page
  // shortcuts cannot see that the key came from a slider, so stop it here.
  function keepSliderKeys(event: KeyboardEvent) {
    if (/^(Arrow|Home$|End$|Page)/.test(event.key)) event.stopPropagation();
  }
  const jumpLabel = (direction: 'Back' | 'Forward', value: number) =>
    `${direction} ${value} ${value === 1 ? 'second' : 'seconds'}`;
</script>

<div class="rr-toolbar" role="group" aria-label="Replay controls">
  {#if controls.play !== false}
    <button
      type="button"
      class="rr-toolbar__control"
      aria-label={playing ? 'Pause' : 'Play'}
      title={playing ? 'Pause' : 'Play'}
      on:click={() => dispatch('toggle')}
      ><ControlIcon {icons} name={playing ? 'pause' : 'play'} /></button
    >
  {/if}
  {#if features.jump && controls.jump !== false}
    <button
      type="button"
      class="rr-toolbar__control"
      aria-label={jumpLabel('Back', seconds)}
      title={jumpLabel('Back', seconds)}
      disabled={!canJump}
      on:click={() => dispatch('jump', -1)}
      ><ControlIcon {icons} {seconds} name="jump-back" /></button
    >
    <button
      type="button"
      class="rr-toolbar__control"
      aria-label={jumpLabel('Forward', seconds)}
      title={jumpLabel('Forward', seconds)}
      disabled={!canJump}
      on:click={() => dispatch('jump', 1)}
      ><ControlIcon {icons} {seconds} name="jump-forward" /></button
    >
  {/if}
  {#if controls.time !== false}
    <TimePill {container} {currentTime} {totalTime} {startedAt} {recordingTimeZone} />
  {/if}
  <div class="rr-control-spacer" />
  {#if controls.speed !== false}
  <ControlPopover
    {icons}
    label="Playback speed"
    icon="speed"
    {container}
    bind:active={panel}
  >
    <p class="rr-control-value" aria-live="polite">{speed.toFixed(2)}×</p>
    <div class="rr-control-range">
      <button
        type="button"
        aria-label="Decrease playback speed"
        disabled={speed <= minSpeed}
        on:click={() => changeSpeed(speed - 0.25)}>−</button
      >
      <input
        type="range"
        min={minSpeed}
        max={maxSpeed}
        step="any"
        value={speed}
        aria-label="Playback speed"
        aria-valuetext={`${speed.toFixed(2)} times`}
        on:input={(event) => changeSpeed(Number(event.currentTarget.value))}
        on:keydown={keepSliderKeys}
      />
      <button
        type="button"
        aria-label="Increase playback speed"
        disabled={speed >= maxSpeed}
        on:click={() => changeSpeed(speed + 0.25)}>+</button
      >
    </div>
    <div class="rr-speed-presets">
      {#each speedOption as value}
        <div>
          <button
            type="button"
            aria-label={`${value}× speed`}
            aria-pressed={speed === value}
            on:click={() => changeSpeed(value)}
            ><span class:normal={value === 1}
              >{Number.isInteger(value) ? value.toFixed(1) : value}</span
            ></button
          >{#if value === 1}<small>Normal</small>{/if}
        </div>
      {/each}
    </div>
  </ControlPopover>
  {/if}
  {#if controls.settings !== false}
  <ControlPopover
    {icons}
    label="Replay settings"
    icon="settings"
    {container}
    bind:active={panel}
  >
    {#if hasAnnotations}
      <label for={switchId + '-annotations'} class="rr-setting"
        ><span>Annotations<small>Captions and timeline notes</small></span
        ><ToolbarSwitch
          id={switchId + '-annotations'}
          label="Annotations"
          checked={annotations}
          on:change={changeAnnotations}
        /></label
      >
    {/if}
    <label for={switchId + '-skip-inactive'} class="rr-setting"
      ><span>Skip inactive</span><ToolbarSwitch
        id={switchId + '-skip-inactive'}
        label="Skip inactive"
        bind:checked={skipInactive}
      /></label
    >
  </ControlPopover>
  {/if}
  {#if showDownload}
  <ControlPopover
    {icons}
    label="Download"
    icon="download"
    {container}
    bind:active={panel}
  >
    <ul class="rr-downloads">
      {#if downloadJson}
        <li>
          <button type="button" on:click={() => dispatch('download')}
            >rrweb events (JSON)</button
          >
        </li>
      {/if}
      {#each downloadLinks as link}
        <li>
          <a href={link.href} target="_blank" rel="noopener noreferrer"
            >{link.label}{#if link.description}<small>{link.description}</small
              >{/if}</a
          >
        </li>
      {/each}
    </ul>
  </ControlPopover>
  {/if}
  {#if controls.fullscreen !== false}
    <button
      type="button"
      class="rr-toolbar__control"
      aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      on:click={() => dispatch('fullscreen')}
      ><ControlIcon
        {icons}
        name={fullscreen ? 'exit-fullscreen' : 'enter-fullscreen'}
      /></button
    >
  {/if}
</div>

<style>
  .rr-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    box-sizing: border-box;
    padding: 4px 12px;
    /* Popovers are positioned against an ancestor outside the scrolling row. */
    overflow-x: auto;
    color: var(--rr-text);
    font: 12px/1.5 system-ui, sans-serif;
  }
  .rr-toolbar :global(button) {
    padding: 0;
    border: 0;
    color: inherit;
    font: inherit;
    background: none;
    cursor: pointer;
  }
  .rr-toolbar :global(.rr-toolbar__control) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: 50%;
  }
  .rr-toolbar :global(button:hover),
  .rr-toolbar :global(button:active),
  .rr-toolbar :global(button.active) {
    background: var(--rr-accent-soft);
  }
  .rr-toolbar :global(button:focus-visible),
  .rr-toolbar :global(input:focus-visible) {
    outline: 2px solid var(--rr-focus);
    outline-offset: 2px;
  }
  .rr-toolbar :global(button:disabled) {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .rr-control-spacer {
    flex: 1;
    min-width: 0;
  }
  .rr-control-value {
    margin: 0 0 4px;
    text-align: center;
    font-size: 16px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .rr-control-range {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .rr-control-range button {
    min-width: 28px;
    height: 28px;
    border-radius: 999px;
    background: var(--rr-subtle);
  }
  /* Drawn from the theme so it matches dark surfaces too. */
  input[type='range'] {
    min-width: 0;
    flex: 1;
    height: 32px;
    margin: 0;
    background: transparent;
    accent-color: var(--rr-accent);
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
  }
  input[type='range']::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 999px;
    background: var(--rr-track);
  }
  input[type='range']::-moz-range-track {
    height: 4px;
    border-radius: 999px;
    background: var(--rr-track);
  }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    margin-top: -5px;
    border: 2px solid var(--rr-surface);
    border-radius: 50%;
    background: var(--rr-accent);
  }
  input[type='range']::-moz-range-thumb {
    width: 10px;
    height: 10px;
    border: 2px solid var(--rr-surface);
    border-radius: 50%;
    background: var(--rr-accent);
  }
  .rr-speed-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
    text-align: center;
  }
  .rr-speed-presets div {
    flex: 1;
    min-width: 40px;
  }
  .rr-speed-presets button {
    width: 100%;
    padding: 6px 0;
    background: var(--rr-subtle);
    border-radius: 999px;
    font-size: 11px;
  }
  .rr-speed-presets button[aria-pressed='true'] {
    background: var(--rr-accent-soft);
  }
  .normal {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  small {
    display: block;
    margin-top: 4px;
    color: var(--rr-muted);
    font-size: 10px;
  }
  .rr-setting {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    cursor: pointer;
  }
  .rr-downloads {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .rr-downloads button,
  .rr-downloads a {
    display: block;
    width: 100%;
    padding: 8px;
    border: 0;
    border-radius: 6px;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
  }
  .rr-downloads button:hover,
  .rr-downloads a:hover {
    background: var(--rr-subtle);
  }
  .rr-downloads button:focus-visible,
  .rr-downloads a:focus-visible {
    outline: 2px solid var(--rr-focus);
    outline-offset: -2px;
  }
  .rr-setting + .rr-setting {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--rr-line);
  }
  @container (max-width: 440px) {
    .rr-toolbar {
      gap: 0;
      padding-inline: 8px;
    }
  }
</style>
