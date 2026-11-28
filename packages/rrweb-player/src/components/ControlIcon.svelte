<script lang="ts">
  import IconOverride from './IconOverride.svelte';
  import type { PlayerIconName, PlayerIcons } from '../features';
  export let name: PlayerIconName;
  export let icons: PlayerIcons = {};
  export let seconds = 10;
  $: jumpLabel = String(seconds);
  $: jumpLabelSize = Math.min(8, 12 / (jumpLabel.length * 0.65));
</script>

<IconOverride {icons} {name} {seconds}>
  {#if name === 'play' || name === 'pause' || name === 'enter-fullscreen' || name === 'exit-fullscreen'}
    <svg width="16" height="16" viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true">
      {#if name === 'play'}
        <path d="M170.65984 896l0-768 640 384zM644.66944 512l-388.66944-233.32864 0 466.65728z" />
      {:else if name === 'pause'}
        <path d="M682.65984 128q53.00224 0 90.50112 37.49888t37.49888 90.50112l0 512q0 53.00224-37.49888 90.50112t-90.50112 37.49888-90.50112-37.49888-37.49888-90.50112l0-512q0-53.00224 37.49888-90.50112t90.50112-37.49888zM341.34016 128q53.00224 0 90.50112 37.49888t37.49888 90.50112l0 512q0 53.00224-37.49888 90.50112t-90.50112 37.49888-90.50112-37.49888-37.49888-90.50112l0-512q0-53.00224 37.49888-90.50112t90.50112-37.49888zM341.34016 213.34016q-17.67424 0-30.16704 12.4928t-12.4928 30.16704l0 512q0 17.67424 12.4928 30.16704t30.16704 12.4928 30.16704-12.4928 12.4928-30.16704l0-512q0-17.67424-12.4928-30.16704t-30.16704-12.4928zM682.65984 213.34016q-17.67424 0-30.16704 12.4928t-12.4928 30.16704l0 512q0 17.67424 12.4928 30.16704t30.16704 12.4928 30.16704-12.4928 12.4928-30.16704l0-512q0-17.67424-12.4928-30.16704t-30.16704-12.4928z" />
      {:else if name === 'exit-fullscreen'}
        <!-- The enter arrows turned inward. -->
        <path d="M600 136c26.4 0 48 21.6 48 48v148.8L870.4 110.4c18.4-18.4 48.8-18.4 68 0 18.4 18.4 18.4 48.8 0 68L716 400h148c26.4 0 48 21.6 48 48s-21.6 48-48 48H600c-26.4 0-48-21.6-48-48V184c0-26.4 21.6-48 48-48zM424 888c-26.4 0-48-21.6-48-48V691.2L153.6 913.6c-18.4 18.4-48.8 18.4-68 0-18.4-18.4-18.4-48.8 0-68L308 624H160c-26.4 0-48-21.6-48-48s21.6-48 48-48h264c26.4 0 48 21.6 48 48v264c0 26.4-21.6 48-48 48z" />
      {:else}
        <path d="M916 380c-26.4 0-48-21.6-48-48L868 223.2 613.6 477.6c-18.4 18.4-48.8 18.4-68 0-18.4-18.4-18.4-48.8 0-68L800 156 692 156c-26.4 0-48-21.6-48-48 0-26.4 21.6-48 48-48l224 0c26.4 0 48 21.6 48 48l0 224C964 358.4 942.4 380 916 380zM231.2 860l108.8 0c26.4 0 48 21.6 48 48s-21.6 48-48 48l-224 0c-26.4 0-48-21.6-48-48l0-224c0-26.4 21.6-48 48-48 26.4 0 48 21.6 48 48L164 792l253.6-253.6c18.4-18.4 48.8-18.4 68 0 18.4 18.4 18.4 48.8 0 68L231.2 860z" />
      {/if}
    </svg>
  {:else}
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {#if name === 'jump-back' || name === 'jump-forward'}
        <g
          transform={name === 'jump-forward' ? 'translate(24 0) scale(-1 1)' : undefined}
        >
          <path d="M3 9a9 9 0 1 1 0 6M3 3v6h6" />
        </g>
        <text
          x="12"
          y="15"
          text-anchor="middle"
          stroke="none"
          fill="currentColor"
          font-size={jumpLabelSize}
          font-weight="600">{jumpLabel}</text
        >
      {:else if name === 'speed'}
        <circle cx="12" cy="14" r="8" /><path d="M9 2h6M12 6V2m6 5 2-2m-8 9 3-4" />
      {:else if name === 'download'}
        <path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" />
      {:else if name === 'settings'}
        <g stroke-width="2">
          <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
          <circle cx="12" cy="12" r="3" />
        </g>
      {/if}
    </svg>
  {/if}
</IconOverride>
