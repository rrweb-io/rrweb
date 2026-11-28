<script context="module" lang="ts">
  let nextId = 0;

  function formatStart(timestamp: number, timeZone?: string) {
    if (!timeZone || !Number.isFinite(timestamp)) return null;
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      }).format(timestamp);
    } catch {
      // An unknown time zone name shows nothing for that line.
      return null;
    }
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { formatTime } from '../utils';

  export let currentTime: number;
  export let totalTime: number;
  /** When the recording started, as an epoch timestamp. */
  export let startedAt: number;
  /** The recorded user's IANA time zone, if the host knows it. */
  export let recordingTimeZone: string | undefined = undefined;
  export let container: HTMLElement;

  const id = `rrweb-recording-start-${++nextId}`;
  const viewerZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  $: viewerStart = formatStart(startedAt, viewerZone);
  $: userStart = formatStart(startedAt, recordingTimeZone);
  $: hasStart = Boolean(viewerStart || userStart);

  let trigger: HTMLElement;
  let open = false;
  // Keyboard focus keeps the popup open; focus from a click does not, so the
  // popup still closes when the pointer leaves.
  let focused = false;
  let pressed = false;
  let tooltip: HTMLElement | undefined;
  let left = 0;
  let bottom = 0;
  let width = 0;

  function position() {
    if (!trigger || !container) return;
    const frame = container.getBoundingClientRect();
    const pill = trigger.getBoundingClientRect();
    const scale = frame.width / container.offsetWidth || 1;
    width = Math.max(0, Math.min(236, container.clientWidth - 16));
    left = Math.max(
      8,
      Math.min(
        (pill.left + pill.width / 2 - frame.left) / scale - width / 2,
        container.clientWidth - width - 8,
      ),
    );
    bottom = (frame.bottom - pill.top) / scale + 8;
  }
  function show() {
    position();
    open = true;
  }
  // Closes at once, unless the pointer moves between the time and the popup.
  // The popup reaches down over the gap between them, so crossing it stays
  // on the popup.
  function leave(event: PointerEvent) {
    const next = event.relatedTarget;
    if (
      next instanceof Node &&
      (trigger.contains(next) || tooltip?.contains(next))
    )
      return;
    if (!focused) open = false;
  }
  function observe(_node: HTMLElement) {
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(position);
    observer?.observe(container);
    const row = trigger.parentElement;
    row?.addEventListener('scroll', position);
    return {
      destroy() {
        observer?.disconnect();
        row?.removeEventListener('scroll', position);
      },
    };
  }
  // Escape closes the popup, wherever focus is in the player's document.
  onMount(() => {
    const doc = trigger.ownerDocument;
    const close = (event: KeyboardEvent) => {
      if (open && event.key === 'Escape') open = false;
    };
    doc.addEventListener('keydown', close);
    return () => doc.removeEventListener('keydown', close);
  });
</script>

<!-- The time is focusable so keyboard users can read when the recording started. -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
  class="rr-time-pill"
  role="timer"
  aria-label="Replay time"
  bind:this={trigger}
  tabindex={hasStart ? 0 : undefined}
  aria-describedby={open ? id : undefined}
  on:pointerenter={show}
  on:pointerleave={leave}
  on:pointerdown={(event) => (pressed = event.pointerType !== 'touch')}
  on:focus={() => {
    focused = !pressed;
    pressed = false;
    show();
  }}
  on:blur={() => {
    focused = false;
    pressed = false;
    if (!trigger.matches(':hover') && !tooltip?.matches(':hover')) open = false;
  }}
>
  <span class="rr-timeline__time">{formatTime(Math.max(0, currentTime))}</span>
  / <span class="rr-timeline__time">{formatTime(totalTime)}</span>
</div>
{#if open && hasStart}
  <div
    {id}
    role="tooltip"
    class="rr-start-tooltip"
    bind:this={tooltip}
    use:observe
    style:left={`${left}px`}
    style:bottom={`${bottom}px`}
    style:width={`${width}px`}
    on:pointerleave={leave}
  >
    <strong class="tooltip-title">Recording started</strong>
    <dl>
      {#if userStart}<dt>Recorded user’s local time</dt><dd>{userStart} · {recordingTimeZone}</dd>{/if}
      {#if viewerStart}<dt>Your local time</dt><dd>{viewerStart} · {viewerZone}</dd>{/if}
    </dl>
  </div>
{/if}

<style>
  .rr-time-pill {
    display: flex;
    flex-shrink: 0;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 999px;
    background: var(--rr-subtle);
    white-space: nowrap;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
  .rr-time-pill:focus-visible {
    outline: 2px solid var(--rr-focus);
    outline-offset: 2px;
  }
  @container (max-width: 440px) {
    .rr-time-pill {
      padding: 4px;
    }
  }
  .rr-start-tooltip {
    position: absolute;
    z-index: 50;
    box-sizing: border-box;
    border: 1px solid var(--rr-line);
    border-radius: 8px;
    background: var(--rr-surface);
    color: var(--rr-text);
    box-shadow: 0 8px 24px #11103e24;
    overflow-wrap: anywhere;
    font-size: 12px;
  }
  /* Covers the gap down to the time, so the pointer can cross it. */
  .rr-start-tooltip::after {
    content: '';
    position: absolute;
    inset: 100% 0 -9px;
  }
  .tooltip-title {
    display: block;
    padding: 8px 12px;
    border-bottom: 1px solid var(--rr-line);
  }
  dl {
    margin: 0;
    padding: 10px 12px;
  }
  dt {
    margin-top: 8px;
    font-size: 11px;
    color: var(--rr-muted);
  }
  dt:first-child {
    margin-top: 0;
  }
  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
  }
</style>
