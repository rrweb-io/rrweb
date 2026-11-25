<script context="module" lang="ts">
  // The trigger buttons of popovers with this label inside root, including
  // any in nested players.
  export function popoverTriggers(root: ParentNode, label: string) {
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        `.rr-toolbar__control[aria-label="${label}"]`,
      ),
    );
  }
  // Whether an element is inside the trigger or panel of that popover.
  export function inPopover(element: Element, label: string): boolean {
    return element.closest(`[aria-label="${label}"]`) !== null;
  }
  // The popover panels open inside root, including any in nested players.
  export function openPopovers(root: ParentNode): Element[] {
    return Array.from(root.querySelectorAll('.rr-control-panel'));
  }
</script>

<script lang="ts">
  import { onMount, tick } from 'svelte';
  import ControlIcon from './ControlIcon.svelte';

  import type { PlayerIcons } from '../features';
  export let icons: PlayerIcons = {};
  export let label: string;
  export let icon: 'speed' | 'zoom' | 'settings' | 'download';
  export let active: 'speed' | 'zoom' | 'settings' | 'download' | null = null;
  $: open = active === icon;
  function setOpen(value: boolean) {
    if (value) active = icon;
    else if (active === icon) active = null;
  }
  export let container: HTMLElement;
  let trigger: HTMLButtonElement;
  let panel: HTMLDivElement;
  let pinned = false;
  let left = 16;
  let bottom = 48;
  let width = 256;
  let maxHeight = 240;

  export function focus() {
    trigger?.focus();
  }
  function getActiveElement() {
    return (trigger?.getRootNode() as Document | ShadowRoot | undefined)?.activeElement;
  }
  function openOnHover(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    const focusedPanel = getActiveElement()?.closest(
      '.rr-control-panel',
    );
    if (
      focusedPanel &&
      focusedPanel !== panel &&
      trigger.parentElement?.contains(focusedPanel)
    )
      return;
    setOpen(true);
  }
  // A mouse may cross the strip between the button and its panel; leaving
  // that area closes a panel the pointer opened, at once.
  // Positions, since a leave event's target is the element being left.
  function overPopover(event: PointerEvent) {
    const within = (box: DOMRect) =>
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom;
    const button = trigger.getBoundingClientRect();
    if (within(button)) return true;
    if (!panel) return false;
    const box = panel.getBoundingClientRect();
    return (
      within(box) ||
      within(
        new DOMRect(
          Math.min(button.left, box.left),
          box.bottom,
          Math.max(button.right, box.right) - Math.min(button.left, box.left),
          button.top - box.bottom,
        ),
      )
    );
  }
  // A panel opened by a click holds focus, which keeps it open.
  function closeAfterHover(event: PointerEvent) {
    if (
      open &&
      event.pointerType === 'mouse' &&
      !overPopover(event) &&
      !panel?.contains(getActiveElement() ?? null)
    )
      setOpen(false);
  }
  function position() {
    if (!container || !trigger) return;
    const frame = container.getBoundingClientRect();
    const button = trigger.getBoundingClientRect();
    const scale = frame.width / container.offsetWidth || 1;
    width = Math.max(0, Math.min(256, container.clientWidth - 32));
    const center = (button.left + button.width / 2 - frame.left) / scale;
    left = Math.max(
      16,
      Math.min(center - width / 2, container.clientWidth - 16 - width),
    );
    bottom = container.clientHeight - (button.top - frame.top) / scale + 8;
    maxHeight = Math.max(0, container.clientHeight - bottom - 16);
  }
  function observe(_node: HTMLElement) {
    position();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(position);
    observer?.observe(container);
    observer?.observe(trigger);
    const toolbar = trigger.parentElement;
    toolbar?.addEventListener('scroll', position);
    return {
      destroy: () => {
        observer?.disconnect();
        toolbar?.removeEventListener('scroll', position);
      },
    };
  }
  async function click() {
    if (open && pinned) {
      if (panel?.contains(getActiveElement() ?? null)) trigger.focus();
      setOpen(false);
      return;
    }
    pinned = true;
    setOpen(true);
    await tick();
    panel?.focus();
  }
  // Set by presses on the trigger or panel. Inside a closed shadow root the
  // document cannot see where a press landed, so it checks this instead.
  let insidePress: Event | undefined;
  const markInside = (event: Event) => {
    insidePress = event;
  };
  function outside(event: PointerEvent) {
    if (!open || event === insidePress) return;
    const path = event.composedPath();
    if (!path.includes(trigger) && !path.includes(panel)) setOpen(false);
  }
  function closeOnBlur(event: FocusEvent) {
    const next = event.relatedTarget;
    if (
      !(next instanceof Node) ||
      (!panel?.contains(next) && !trigger.contains(next))
    )
      setOpen(false);
  }
  function escape(event: KeyboardEvent) {
    if (!open || event.key !== 'Escape' || event.defaultPrevented) return;
    const activeElement = getActiveElement();
    const focusInPanel = panel?.contains(activeElement ?? null);
    if (focusInPanel || activeElement === trigger) event.preventDefault();
    if (focusInPanel) trigger.focus();
    setOpen(false);
  }
  $: if (!open) pinned = false;
  // Listen on the document the player is in, which is not this bundle's own
  // document when a page mounts the player into a same-origin iframe.
  onMount(() => {
    const doc = trigger.ownerDocument;
    doc.addEventListener('pointerdown', outside);
    doc.addEventListener('keydown', escape);
    doc.addEventListener('pointermove', closeAfterHover);
    return () => {
      doc.removeEventListener('pointerdown', outside);
      doc.removeEventListener('keydown', escape);
      doc.removeEventListener('pointermove', closeAfterHover);
    };
  });
</script>

<button
  type="button"
  class="rr-toolbar__control"
  bind:this={trigger}
  on:pointerdown={markInside}
  aria-label={label}
  aria-haspopup="dialog"
  aria-expanded={open}
  class:active={open}
  on:pointerenter={openOnHover}
  on:pointerleave={closeAfterHover}
  on:click={click}
  on:focusout={closeOnBlur}
>
  <ControlIcon {icons} name={icon} />
</button>
{#if open}
  <div
    class="rr-control-panel"
    bind:this={panel}
    on:pointerdown={markInside}
    use:observe
    role="dialog"
    aria-label={label}
    tabindex="-1"
    style:left={`${left}px`}
    style:bottom={`${bottom}px`}
    style:width={`${width}px`}
    style:max-height={`${maxHeight}px`}
    on:pointerleave={closeAfterHover}
    on:focusout={closeOnBlur}
  >
    <h3>{label}</h3>
    <div class="rr-control-panel__body"><slot /></div>
  </div>
{/if}

<style>
  .rr-control-panel {
    position: absolute;
    z-index: 50;
    box-sizing: border-box;
    overflow-y: auto;
    border: 1px solid var(--rr-line);
    border-radius: 8px;
    background: var(--rr-surface);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    color: var(--rr-text);
    box-shadow: 0 8px 24px #11103e24;
    font: 12px/1.5 system-ui, sans-serif;
    text-align: left;
  }
  h3 {
    margin: 0;
    padding: 8px 12px;
    border-bottom: 1px solid var(--rr-line);
    font-size: 12px;
    font-weight: 600;
  }
  .rr-control-panel__body {
    padding: 12px;
  }
</style>
