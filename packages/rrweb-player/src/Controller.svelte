<script context="module" lang="ts">
  // Players whose arrow keys work anywhere on the page, and every mounted
  // player root, keyed by the element each Player passes in.
  const pagePlayers = new Set<HTMLElement>();
  const allPlayers = new WeakSet<HTMLElement>();
  // Keys a widget inside a shadow root owns, as one player's root listener
  // saw them. Window listeners of every player leave these alone, since a
  // closed root hides the widget from them.
  const widgetKeys = new WeakSet<Event>();
  // The innermost player a key was pressed in, as the first root listener
  // to see the key found it. Root listeners run innermost first, and a
  // closed root hides that player from listeners further out, which leave
  // the key to it.
  const claimedBy = new WeakMap<Event, Element>();

  function registerPlayer(
    element: HTMLElement | undefined,
    pageKeys: boolean,
  ): () => void {
    if (!element) return () => undefined;
    allPlayers.add(element);
    if (pageKeys) pagePlayers.add(element);
    return () => {
      allPlayers.delete(element);
      pagePlayers.delete(element);
    };
  }

  // The innermost player around a node, across shadow roots.
  export function playerOf(node: Node): Element | undefined {
    for (
      let current: Node | null = node;
      current;
      current =
        current.parentNode ??
        ((current as ShadowRoot).host as Node | undefined) ??
        null
    ) {
      if (current instanceof HTMLElement && allPlayers.has(current))
        return current;
    }
    return undefined;
  }

  // The innermost player a key was pressed in: the one a shadow root's
  // listener claimed, or else the nearest player on the key's path.
  export function keyOwner(event: Event): Element | undefined {
    return (
      claimedBy.get(event) ??
      event
        .composedPath()
        .find(
          (node): node is HTMLElement =>
            node instanceof HTMLElement && allPlayers.has(node),
        )
    );
  }
</script>

<script lang="ts">
  import type { playerMetaData } from '@rrweb/types';
  import type { Replayer, SpeedMachineState } from '@rrweb/replay';
  import {
    onMount,
    onDestroy,
    createEventDispatcher,
    afterUpdate,
  } from 'svelte';
  import { formatTime } from './utils';
  import Switch from './components/Switch.svelte';
  import CustomEventMarker from './components/CustomEventMarker.svelte';
  import { parseAnnotationEvent, getActiveCaption } from './annotations';
  import PlayerToolbar from './components/PlayerToolbar.svelte';
  import { createTimelineIndex } from './timeline-index';

  import {
    jumpSeconds,
    type PlayerControls,
    type PlayerFeatures,
    type PlayerIcons,
    type JumpEvent,
  } from './features';
  export let features: PlayerFeatures = {};
  // The Player's root element, which arrow keys are routed by.
  export let playerElement: HTMLElement | undefined = undefined;
  let unregisterPlayer = () => {};
  $: {
    unregisterPlayer();
    unregisterPlayer = registerPlayer(
      playerElement,
      // A hidden controller takes no keys, so it leaves the page to others.
      showController && features.jump?.keyboard === 'page',
    );
  }
  /** The player's `controls` prop: toolbar controls to leave out. */
  export let controlVisibility: PlayerControls = {};
  export let icons: PlayerIcons = {};
  export let recordingTimeZone: string | undefined = undefined;

  /**
   * Saves the events the player holds, including any appended since it
   * loaded, as a JSON file.
   */
  function downloadRecording() {
    const option = features.download;
    if (!option) return;
    const named = typeof option === 'object' ? option.fileName?.trim() : '';
    const started = new Date(replayer.getMetaData().startTime);
    const stamp = Number.isNaN(started.getTime())
      ? 'recording'
      : started.toISOString().replace(/[:.]/g, '-');
    const fileName = named || `rrweb-${stamp}.json`;
    const doc = container?.ownerDocument ?? document;
    const view = doc.defaultView ?? window;
    const url = view.URL.createObjectURL(
      new view.Blob([JSON.stringify(replayer.events)], {
        type: 'application/json',
      }),
    );
    const link = doc.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    // Let the browser start the download before the URL goes away.
    view.setTimeout(() => view.URL.revokeObjectURL(url), 0);
  }
  $: seconds = jumpSeconds(features.jump);
  const dispatch = createEventDispatcher();

  export let replayer: Replayer;
  export let maxZoom = 1;
  export let zoom = 1;
  export let trueZoom = 1;
  export let trueSize = false;
  export let followCursor = true;
  export let showCaptions = true;
  const updateTimeline = createTimelineIndex();
  let timeline = updateTimeline(replayer.events, replayer.config.inactivePeriodThreshold);
  export let captionText: string | undefined = undefined;
  let activeCaptionText: string | undefined;
  // The opt-in toolbar's Annotations switch hides captions and timeline
  // notes together, starting from showCaptions. The classic controls keep
  // timeline notes visible.
  let showMarkers = true;
  $: markersShown = !features.toolbar || (showCaptions && showMarkers);
  $: captionText = showCaptions && markersShown ? activeCaptionText : undefined;
  // Index changes and seeks reconcile state; playback updates come from annotation events.
  $: activeCaptionText = resolveCaption(timeline);

  let captionUpdatePending = false;

  function resolveCaption(index: ReturnType<typeof updateTimeline>) {
    captionUpdatePending = false;
    return getActiveCaption(index.captions, Math.max(0, replayer.getCurrentTime()))?.text;
  }

  function restoreCaption(index: ReturnType<typeof updateTimeline>) {
    activeCaptionText = resolveCaption(index);
  }

  // Whether the recording has captions or timeline notes; once seen it stays
  // true, since a streamed annotation can be cast before it is in the events.
  let hasAnnotations = false;
  $: if (timeline.hasCaptions || timeline.markers.some((marker) => marker.text))
    hasAnnotations = true;

  function detectAnnotation(event: unknown) {
    if (parseAnnotationEvent(event)?.text) hasAnnotations = true;
  }

  function handleAnnotation(event: unknown) {
    const annotation = parseAnnotationEvent(event);
    if (annotation?.type !== 'caption' || captionUpdatePending) return;
    captionUpdatePending = true;
    void Promise.resolve().then(() => {
      if (captionUpdatePending) restoreCaption(timeline);
    });
  }

  function restoreCaptionOnSeek() {
    restoreCaption(timeline);
  }
  let timelineMarkerDismissalVersion = 0;

  function dismissTimelineMarkersOnEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') timelineMarkerDismissalVersion += 1;
  }
  export let showController: boolean;
  export let autoPlay: boolean;
  export let skipInactive: boolean;
  export let speedOption: number[];
  // The toolbar shows the replay's actual speed; the classic controls keep
  // highlighting the first speedOption until one is chosen.
  export let speed = features.toolbar
    ? replayer.config.speed
    : speedOption.length
      ? speedOption[0]
      : 1;
  // Turning the toolbar on later shows the speed the replay is playing at.
  let toolbarShown = !!features.toolbar;
  $: if (!!features.toolbar !== toolbarShown) {
    toolbarShown = !!features.toolbar;
    if (toolbarShown) speed = replayer.config.speed;
  }
  /** The player element; positions the toolbar's panels. */
  export let container: HTMLElement;
  export let fullscreen = false;
  export let tags: Record<string, string> = {};
  export let timelineMarkerColor = 'rgb(73, 80, 246)';
  export let inactiveColor: string;

  let currentTime = 0;
  $: {
    dispatch('ui-update-current-time', { payload: currentTime });
  }
  let timer: number | null = null;
  let isAdvancing = false;
  let playingInUI = false;
  $: {
    dispatch('ui-update-player-state', {
      payload: playingInUI ? 'playing' : 'paused',
    });
  }
  let speedState: 'normal' | 'skipping';
  let progress: HTMLElement;
  let progressSlider: HTMLElement;
  let finished: boolean;

  let pauseAt: number | false = false;
  let onPauseHook: (() => unknown) | null = null;
  let loop: {
    start: number;
    end: number;
  } | null = null;

  let meta: playerMetaData = replayer.getMetaData();
  $: accessibleTime = Math.max(0, Math.min(meta.totalTime, Math.floor(currentTime / 1000) * 1000));
  let percentage: string;
  $: {
    const percent = Math.min(1, currentTime / meta.totalTime);
    percentage = `${100 * percent}%`;
    dispatch('ui-update-progress', { payload: percent });
  }
  type CustomEvent = {
    name: string;
    background: string;
    position: string;
    timeOffset: number;
    timelineMarkerText: string | undefined;
  };

  /**
   * Calculate the tag position (percent) to be displayed on the progress bar.
   * @param startTime - The start time of the session.
   * @param endTime - The end time of the session.
   * @param tagTime - The time of the tag.
   * @returns The position of the tag. unit: percentage
   */
  function position(startTime: number, endTime: number, tagTime: number) {
    const sessionDuration = endTime - startTime;
    if (sessionDuration <= 0) return '0.00';
    const eventDuration = endTime - tagTime;
    const eventPosition = 100 - (eventDuration / sessionDuration) * 100;
    return eventPosition.toFixed(2);
  }

  $: customEvents = timeline.markers.map((marker): CustomEvent => ({
    name: marker.tag ?? 'Timeline marker',
    timeOffset: marker.timestamp - timeline.start,
    timelineMarkerText: marker.text,
    background: marker.tag === undefined ? timelineMarkerColor : tags[marker.tag] || 'rgb(73, 80, 246)',
    position: `${position(timeline.start, timeline.end, marker.timestamp)}%`,
  }));

  let inactivePeriods: {
    name: string;
    background: string;
    position: string;
    width: string;
  }[];
  $: inactivePeriods = timeline.periods.map(([start, end]) => ({
    name: 'inactive period',
    background: inactiveColor,
    position: `${position(timeline.start, timeline.end, start)}%`,
    width:
      timeline.end > timeline.start
        ? `${(((end - start) / (timeline.end - timeline.start)) * 100).toFixed(2)}%`
        : '0.00%',
  }));

  const loopTimer = () => {
    stopTimer();

    function update() {
      currentTime = replayer.getCurrentTime();

      if (pauseAt && currentTime >= pauseAt) {
        if (loop) {
          playRange(loop.start, loop.end, true, undefined);
        } else {
          replayer.pause();
          if (onPauseHook) {
            onPauseHook();
            onPauseHook = null;
          }
        }
      }

      if (currentTime < replayer.getMetaData().totalTime) {
        timer = requestAnimationFrame(update);
      }
    }

    timer = requestAnimationFrame(update);
  };

  const stopTimer = () => {
    if (timer) {
      cancelAnimationFrame(timer);
      timer = null;
    }
  };

  export const toggle = () => {
    if (playingInUI) {
      pause();
    } else {
      play();
    }
  };

  export const play = () => {
    if (playingInUI) {
      return;
    }
    if (finished) {
      replayer.play();
      finished = false;
    } else {
      replayer.play(currentTime);
    }
  };

  export const pause = () => {
    if (!playingInUI) {
      return;
    }
    replayer.pause();
    pauseAt = false;
  };

  export const goto = (timeOffset: number, play?: boolean) => {
    currentTime = timeOffset;
    pauseAt = false;
    finished = false;
    const resumePlaying =
      typeof play === 'boolean' ? play : playingInUI;
    if (resumePlaying) {
      replayer.play(timeOffset);
    } else {
      replayer.pause(timeOffset);
    }
  };

  export const playRange = (
    timeOffset: number,
    endTimeOffset: number,
    startLooping = false,
    afterHook: undefined | (() => void) = undefined,
  ) => {
    if (startLooping) {
      loop = {
        start: timeOffset,
        end: endTimeOffset,
      };
    } else {
      loop = null;
    }
    currentTime = timeOffset;
    pauseAt = endTimeOffset;
    onPauseHook = afterHook || null;
    replayer.play(timeOffset);
  };

  let controls: HTMLElement | undefined;
  const ARROW_KEY_WIDGETS = [
    'input',
    'textarea',
    'select',
    'video',
    'audio',
    '[contenteditable]:not([contenteditable="false"])',
    '[role="slider"]',
    '[role="spinbutton"]',
    '[role="listbox"]',
    '[role="menu"]',
    '[role="menubar"]',
    '[role="radiogroup"]',
    '[role="tablist"]',
    '[role="tree"]',
    '[role="treegrid"]',
    '[role="grid"]',
    '[role="toolbar"]',
    '[role="combobox"]',
    // Dialogs, such as an open timeline note, keep focus and keys.
    'dialog',
    '[role="dialog"]',
    '[role="alertdialog"]',
  ].join(', ');
  // Elements that take focus themselves, without a tabindex.
  const FOCUSABLE =
    'a[href], area[href], button, input, select, textarea, summary, iframe, [contenteditable]:not([contenteditable="false"])';
  // Buttons, links and other controls also act on Space themselves.
  const SPACE_KEY_WIDGETS = [
    ARROW_KEY_WIDGETS,
    'button',
    'a[href]',
    'summary',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="switch"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[role="tab"]',
  ].join(', ');

  // A live replay has no position to jump to. Jumping while stalled is
  // allowed: the replay resumes from the new position once it can.
  let live = false;
  // startLive() enters the live state; liveMode with play(offset) plays live.
  const isLive = () =>
    replayer.service.state.matches('live') || replayer.config.liveMode;

  /**
   * `seconds` lets the player pass the jump length it holds: a prop set with
   * `$set` reaches this component only on Svelte's next update.
   */
  export function jump(
    direction: -1 | 1,
    source: JumpEvent['source'] = 'button',
    seconds = jumpSeconds(features.jump),
  ) {
    if (live) return;
    // meta updates a frame after appended events; read the length now.
    const { totalTime } = replayer.getMetaData();
    const now = Math.max(0, Math.min(totalTime, replayer.getCurrentTime()));
    const toMs = Math.max(
      0,
      Math.min(totalTime, now + direction * seconds * 1000),
    );
    // A jump clamped to where the replay already is leaves it alone, so a
    // finished replay still restarts on Play.
    if (toMs !== now) goto(toMs);
    dispatch('ui-jump', { fromMs: now, toMs, source } satisfies JumpEvent);
  }

  function isVisiblePlayer(element: Element, viewport: Window) {
    if (!isShown(element)) return false;
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.top < viewport.innerHeight &&
      rect.right > 0 &&
      rect.left < viewport.innerWidth
    );
  }

  function isShown(element: Element) {
    if (element.checkVisibility)
      return element.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true });
    const view = element.ownerDocument.defaultView;
    // Visibility is inherited, so the element's own value is enough.
    const visibility = view?.getComputedStyle(element).visibility;
    if (visibility === 'hidden' || visibility === 'collapse') return false;
    // Ancestors hide it with display or opacity, across shadow hosts too.
    for (
      let node: Element | null = element;
      node;
      node = node.parentElement ?? (node.getRootNode() as ShadowRoot).host ?? null
    ) {
      const style = view?.getComputedStyle(node);
      if (style?.display === 'none' || style?.opacity === '0') return false;
    }
    return true;
  }

  // A native dialog opened with show() is not modal and leaves the page's
  // keyboard alone; one opened with showModal() owns it.
  function isModal(element: Element) {
    if (element.localName !== 'dialog') return true;
    try {
      return element.matches(':modal');
    } catch {
      return true;
    }
  }

  // A player inside a shadow root also listens on that root, where the
  // composed path still shows the elements a closed root hides from the
  // window. The window listener leaves keys from inside the host to it.
  let shadowHost: Element | undefined;
  // Keys the root listener already handled. Inside nested closed roots the
  // window cannot see this player's host, so the path check alone misses
  // them.
  const handledByRoot = new WeakSet<Event>();

  function handleRootKeydown(event: KeyboardEvent) {
    handledByRoot.add(event);
    // Only this root sees a widget inside it, so mark the key for players
    // outside even when this one takes no arrows.
    if (onWidget(event)) widgetKeys.add(event);
    if (!claimedBy.has(event)) {
      const nearest = event
        .composedPath()
        .find(
          (node): node is HTMLElement =>
            node instanceof HTMLElement && allPlayers.has(node),
        );
      if (nearest) claimedBy.set(event, nearest);
    }
    handlePageKeydown(event);
  }

  // Inputs, sliders such as the timeline, dialogs and other widgets keep
  // their arrow keys, and controls such as buttons keep Space too. The
  // composed path crosses shadow roots, so a widget inside a web component
  // is still found.
  function onWidget(event: KeyboardEvent) {
    const widgets = event.key === ' ' ? SPACE_KEY_WIDGETS : ARROW_KEY_WIDGETS;
    return event
      .composedPath()
      .some((node) => node instanceof Element && node.matches(widgets));
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (handledByRoot.has(event)) return;
    // A widget's key is left to the widget, but Escape still closes this
    // player's marker panels as it did before.
    if (widgetKeys.has(event)) {
      dismissTimelineMarkersOnEscape(event);
      return;
    }
    if (shadowHost && event.composedPath().includes(shadowHost)) return;
    handlePageKeydown(event);
  }

  // A key pressed inside a closed shadow root reaches listeners outside it
  // with its host as the origin. The host has focus without being focusable itself,
  // so the focused control is hidden in that root and keeps its keys. A
  // custom element may also be tabbable and still hide a focused input, so
  // it keeps its keys either way. A player inside that root handles its own
  // keys through its root listener.
  function fromHiddenFocus(event: KeyboardEvent) {
    const origin = event.composedPath()[0];
    if (!(origin instanceof Element)) return false;
    // The document or shadow root this listener sees the origin in.
    const root = origin.getRootNode() as Document | ShadowRoot;
    const doc = origin.ownerDocument;
    return (
      origin === root.activeElement &&
      origin !== doc.body &&
      origin !== doc.documentElement &&
      (origin.localName.includes('-') ||
        (!origin.hasAttribute('tabindex') && !origin.matches(FOCUSABLE)))
    );
  }

  // A key a deeper root's widget or player claimed, which this listener
  // cannot see.
  function claimedOutOfSight(event: KeyboardEvent) {
    const claimed = claimedBy.get(event);
    return (
      widgetKeys.has(event) && !onWidget(event)
    ) || (!!claimed && !event.composedPath().includes(claimed));
  }

  function handlePageKeydown(event: KeyboardEvent) {
    dismissTimelineMarkersOnEscape(event);
    if (
      claimedOutOfSight(event) ||
      fromHiddenFocus(event) ||
      !showController ||
      !controls ||
      live ||
      !features.jump?.keyboard ||
      event.defaultPrevented ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      (event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowRight' &&
        event.key !== ' ')
    ) {
      return;
    }

    const doc = controls.ownerDocument;
    const player = playerElement;
    if (onWidget(event)) {
      widgetKeys.add(event);
      return;
    }
    // The composed path crosses shadow roots, so a player around a web
    // component is still found.
    const path = event
      .composedPath()
      .filter((node): node is Element => node instanceof Element);
    // Keys pressed inside a player belong to the innermost one, including a
    // player nested inside another.
    const nearest = path.find(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && allPlayers.has(element),
    );
    if (nearest && nearest !== player) return;
    if (!player || !path.includes(player)) {
      if (features.jump?.keyboard === 'player') return;
      if (
        doc.designMode === 'on' ||
        doc.body.isContentEditable ||
        doc.documentElement.isContentEditable
      ) {
        return;
      }
      // An open modal owns the keyboard; a hidden one kept in the page does not.
      const modals = doc.querySelectorAll(
        'dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]',
      );
      if (Array.from(modals).some((modal) => isModal(modal) && isShown(modal)))
        return;
      const viewport = doc.defaultView;
      if (!player || !viewport || !isVisiblePlayer(player, viewport)) return;
      for (const otherPlayer of pagePlayers) {
        if (
          otherPlayer !== player &&
          otherPlayer.ownerDocument === doc &&
          isVisiblePlayer(otherPlayer, viewport)
        ) {
          return;
        }
      }
    }
    event.preventDefault();
    if (event.key === ' ') {
      // Holding Space plays or pauses once.
      if (!event.repeat) toggle();
      return;
    }
    jump(event.key === 'ArrowLeft' ? -1 : 1, 'keyboard');
  }

  const handleProgressClick = (event: MouseEvent) => {
    if (speedState === 'skipping') {
      return;
    }
    progressSlider.focus();
    const progressRect = progress.getBoundingClientRect();
    const x = event.clientX - progressRect.left;
    let percent = x / progressRect.width;
    if (percent < 0) {
      percent = 0;
    } else if (percent > 1) {
      percent = 1;
    }
    const timeOffset = meta.totalTime * percent;
    goto(timeOffset);
  };

  const handleProgressKeydown = (event: KeyboardEvent) => { 
    // Ignore marker keys and the slider event bubbling to the progress wrapper.
    if (event.target !== event.currentTarget) return;
    if (speedState === 'skipping') {
      return;
    }
    let timeOffset: number;
    switch (event.key) {
      case 'ArrowLeft':
        timeOffset = currentTime - 5000;
        break;
      case 'ArrowRight':
        timeOffset = currentTime + 5000;
        break;
      case 'Home':
        timeOffset = 0;
        break;
      case 'End':
        timeOffset = meta.totalTime;
        break;
      default:
        return;
    }
    event.preventDefault();
    goto(Math.max(0, Math.min(meta.totalTime, timeOffset)));
  };

  export const setSpeed = (newSpeed: number) => {
    let needFreeze = playingInUI;
    speed = newSpeed;
    if (needFreeze) {
      replayer.pause();
    }
    replayer.setConfig({ speed });
    if (needFreeze) {
      replayer.play(currentTime);
    }
  };

  export const toggleSkipInactive = () => {
    skipInactive = !skipInactive;
  };

  const updateMeta = () => {
    meta = replayer.getMetaData();
    timeline = updateTimeline(replayer.events, replayer.config.inactivePeriodThreshold);
  };

  // Listens on the player's root even while the controls are hidden, so a
  // player inside a closed root still claims the keys pressed in it.
  function listenOnRoot(node: HTMLElement | undefined) {
    const root = node?.getRootNode();
    if (!root || !('host' in root)) return () => {};
    shadowHost = (root as ShadowRoot).host;
    root.addEventListener('keydown', handleRootKeydown as EventListener);
    return () => {
      root.removeEventListener('keydown', handleRootKeydown as EventListener);
      shadowHost = undefined;
    };
  }
  let stopRootListener = () => {};
  $: {
    stopRootListener();
    stopRootListener = listenOnRoot(playerElement);
  }
  onDestroy(() => stopRootListener());

  onMount(() => {
    replayer.on('annotation', handleAnnotation);
    replayer.on('event-cast', detectAnnotation);
    replayer.on('start', restoreCaptionOnSeek);
    isAdvancing = replayer.isPlaying() && !replayer.isStalled();
    playingInUI = replayer.isPlaying();
    speedState = replayer.speedService.state.value;
    live = isLive();
    replayer.on(
      'state-change',
      (states) => {
        live = isLive();
        playingInUI = replayer.isPlaying();
        const advancing = playingInUI && !replayer.isStalled();
        if (advancing !== isAdvancing) {
          isAdvancing = advancing;
          if (advancing) {
            loopTimer();
          } else {
            stopTimer();
          }
        }
        const { speed } = states as { speed?: SpeedMachineState };
        if (speed?.value && speedState !== speed.value) {
          speedState = speed.value;
        }
      },
    );
    replayer.on('finish', () => {
      finished = true;
      if (onPauseHook) {
        onPauseHook();
        onPauseHook = null;
      }
    });
    replayer.on('events-updated', updateMeta);

    if (autoPlay) {
      replayer.play();
    }
  });

  afterUpdate(() => {
    if (skipInactive !== replayer.config.skipInactive) {
      replayer.setConfig({ skipInactive });
    }
  });

  onDestroy(() => unregisterPlayer());

  onDestroy(() => {
    captionUpdatePending = false;
    replayer.off('annotation', handleAnnotation);
    replayer.off('start', restoreCaptionOnSeek);
    replayer.off('events-updated', updateMeta);
    replayer.off('event-cast', detectAnnotation);
    replayer.pause();
    stopTimer();
  });
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<style>
  .rr-controller.rr-controller--toolbar {
    background: var(--rr-surface);
    color: var(--rr-text);
  }
  /* The timeline uses stronger mixes than the shared track and soft accent,
     so the track and the played part stand out on light and dark surfaces. */
  .rr-controller--toolbar .rr-progress {
    background: color-mix(in srgb, var(--rr-text) 24%, var(--rr-surface));
    border-color: var(--rr-surface);
  }
  .rr-controller--toolbar .rr-progress__step {
    background: color-mix(in srgb, var(--rr-accent) 55%, var(--rr-surface));
  }
  .rr-controller--toolbar .rr-progress__handler {
    background: var(--rr-accent);
  }
  .rr-controller--toolbar .rr-progress__slider:focus-visible {
    outline-color: var(--rr-focus);
  }

  .rr-controller {
    width: 100%;
    height: 80px;
    background: #fff;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    align-items: center;
    border-radius: 0 0 5px 5px;
  }

  /* With the toolbar, the timeline spans the player, inset from its edges. */
  .rr-timeline.rr-timeline--toolbar {
    --rr-timeline-inset: 12px;
    width: 100%;
    box-sizing: border-box;
    padding: 0 var(--rr-timeline-inset);
  }
  .rr-timeline {
    width: 80%;
    display: flex;
    align-items: center;
  }

  .rr-timeline__time {
    display: inline-block;
    width: 100px;
    text-align: center;
    color: #11103e;
  }

  .rr-progress {
    flex: 1;
    height: 12px;
    background: #eee;
    position: relative;
    border-radius: 3px;
    cursor: pointer;
    box-sizing: border-box;
    border-top: solid 4px #fff;
    border-bottom: solid 4px #fff;
  }

  .rr-progress__slider {
    position: absolute;
    inset: -4px 0;
    pointer-events: none;
    border-radius: 3px;
  }
  .rr-progress__slider:focus-visible {
    outline: 2px solid rgb(73, 80, 246);
    outline-offset: 2px;
  }
  .rr-progress.disabled {
    cursor: not-allowed;
  }

  .rr-progress__step {
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background: #e0e1fe;
  }

  .rr-progress__handler {
    width: 20px;
    height: 20px;
    border-radius: 10px;
    position: absolute;
    top: 2px;
    transform: translate(-50%, -50%);
    background: rgb(73, 80, 246);
  }

  .rr-controller__btns {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
  }

  .rr-controller__btns button {
    width: 32px;
    height: 32px;
    display: flex;
    padding: 0;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 50%;
    cursor: pointer;
  }

  /* Jump labels such as "+3600s" are wider than an icon button. */
  .rr-controller__btns button.rr-controller__jump {
    width: auto;
    min-width: 32px;
    padding: 0 6px;
    border-radius: 16px;
  }

  .rr-controller__btns button:active {
    background: #e0e1fe;
  }

  .rr-controller__btns button.active {
    color: #fff;
    background: rgb(73, 80, 246);
  }

  .rr-controller__btns button:disabled {
    cursor: not-allowed;
  }
</style>

{#if showController}
  <div class="rr-controller" class:rr-controller--toolbar={features.toolbar} bind:this={controls}>
    <div class="rr-timeline" class:rr-timeline--toolbar={features.toolbar}>
      {#if !features.toolbar}
        <span class="rr-timeline__time">{formatTime(currentTime)}</span>
      {/if}
      <div
        class="rr-progress"
        class:disabled={speedState === 'skipping'}
        bind:this={progress}
        on:click={handleProgressClick}
        on:keydown={handleProgressKeydown}
      >
        <div
          class="rr-progress__slider"
          bind:this={progressSlider}
          role="slider"
          tabindex="0"
          aria-label="Playback position"
          aria-valuemin="0"
          aria-valuemax={Math.floor(meta.totalTime / 1000) * 1000}
          aria-valuenow={accessibleTime}
          aria-valuetext={`${formatTime(accessibleTime)} of ${formatTime(meta.totalTime)}`}
          aria-disabled={speedState === 'skipping'}
          on:keydown={handleProgressKeydown}
        />
        <div
          class="rr-progress__step"
          style="width: {percentage}"
        />
        {#each inactivePeriods as period}
          <div
            title={period.name}
            style="width: {period.width};height: 4px;position: absolute;background: {period.background};left:
            {period.position};"
          />
        {/each}
        {#each customEvents as event}
          {#if event.timelineMarkerText}
            {#if markersShown}
            <CustomEventMarker
              dismissalVersion={timelineMarkerDismissalVersion}
              name={event.name}
              text={event.timelineMarkerText}
              background={event.background}
              position={event.position}
              disabled={speedState === 'skipping'}
              on:seek={() => goto(event.timeOffset)}
              on:focus-timeline={() => progressSlider.focus()}
            />
            {/if}
          {:else}
            <div
              title={event.name}
              style="width: 10px;height: 5px;position: absolute;top:
              2px;transform: translate(-50%, -50%);background: {event.background};left:
              {event.position};"
            />
          {/if}
        {/each}

        <div class="rr-progress__handler" style="left: {percentage}" />
      </div>
      {#if !features.toolbar}
        <span class="rr-timeline__time">{formatTime(meta.totalTime)}</span>
      {/if}
    </div>
    {#if features.toolbar}
      <PlayerToolbar
        {features}
        startedAt={meta.startTime}
        {recordingTimeZone}
        controls={controlVisibility}
        {icons}
        {seconds}
        {fullscreen}
        {container}
        {currentTime}
        totalTime={meta.totalTime}
        playing={playingInUI}
        canJump={!live}
        {hasAnnotations}
        {speed}
        {speedOption}
        {maxZoom}
        {trueZoom}
        bind:zoom
        bind:trueSize
        bind:followCursor
        annotations={showCaptions && showMarkers}
        bind:skipInactive
        on:toggle={toggle}
        on:fullscreen={() => dispatch('fullscreen')}
        on:download={downloadRecording}
        on:speed={(event) => setSpeed(event.detail)}
        on:annotations={(event) => {
          showMarkers = event.detail;
          showCaptions = event.detail;
        }}
        on:jump={(event) => jump(event.detail < 0 ? -1 : 1)}
      />
    {:else}
    <div class="rr-controller__btns">
      <button on:click={toggle}>
        {#if playingInUI}
          <svg
            class="icon"
            viewBox="0 0 1024 1024"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            width="16"
            height="16"
          >
            <path
              d="M682.65984 128q53.00224 0 90.50112 37.49888t37.49888 90.50112l0
              512q0 53.00224-37.49888 90.50112t-90.50112
              37.49888-90.50112-37.49888-37.49888-90.50112l0-512q0-53.00224
              37.49888-90.50112t90.50112-37.49888zM341.34016 128q53.00224 0
              90.50112 37.49888t37.49888 90.50112l0 512q0 53.00224-37.49888
              90.50112t-90.50112
              37.49888-90.50112-37.49888-37.49888-90.50112l0-512q0-53.00224
              37.49888-90.50112t90.50112-37.49888zM341.34016 213.34016q-17.67424
              0-30.16704 12.4928t-12.4928 30.16704l0 512q0 17.67424 12.4928
              30.16704t30.16704 12.4928 30.16704-12.4928
              12.4928-30.16704l0-512q0-17.67424-12.4928-30.16704t-30.16704-12.4928zM682.65984
              213.34016q-17.67424 0-30.16704 12.4928t-12.4928 30.16704l0 512q0
              17.67424 12.4928 30.16704t30.16704 12.4928 30.16704-12.4928
              12.4928-30.16704l0-512q0-17.67424-12.4928-30.16704t-30.16704-12.4928z"
            />
          </svg>
        {:else}
          <svg
            class="icon"
            viewBox="0 0 1024 1024"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            width="16"
            height="16"
          >
            <path
              d="M170.65984 896l0-768 640 384zM644.66944
              512l-388.66944-233.32864 0 466.65728z"
            />
          </svg>
        {/if}
      </button>
      {#if features.jump}
      <button
        type="button"
        class="rr-controller__jump"
        aria-label={`Back ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`}
        title={`Back ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`}
        disabled={live}
        on:click={() => jump(-1)}
      >−{seconds}s</button>
      <button
        type="button"
        class="rr-controller__jump"
        aria-label={`Forward ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`}
        title={`Forward ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`}
        disabled={live}
        on:click={() => jump(1)}
      >+{seconds}s</button>
      {/if}
      {#each speedOption as s}
        <button
          class:active={s === speed && speedState !== 'skipping'}
          on:click={() => setSpeed(s)}
          disabled={speedState === 'skipping'}
        >
          {s}x
        </button>
      {/each}
      {#if timeline.hasCaptions}
        <button
          type="button"
          class:active={showCaptions}
          aria-label="CC captions"
          aria-pressed={showCaptions}
          title={showCaptions ? 'Hide captions' : 'Show captions'}
          on:click={() => (showCaptions = !showCaptions)}
        >
          CC
        </button>
      {/if}
      <Switch
        id="skip"
        bind:checked={skipInactive}
        disabled={speedState === 'skipping'}
        label="skip inactive"
      />
      <button on:click={() => dispatch('fullscreen')}>
        <svg
          class="icon"
          viewBox="0 0 1024 1024"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink"
          width="16"
          height="16"
        >
          <defs>
            <style type="text/css">
            </style>
          </defs>
          <path
            d="M916 380c-26.4 0-48-21.6-48-48L868 223.2 613.6 477.6c-18.4
            18.4-48.8 18.4-68 0-18.4-18.4-18.4-48.8 0-68L800 156 692 156c-26.4
            0-48-21.6-48-48 0-26.4 21.6-48 48-48l224 0c26.4 0 48 21.6 48 48l0
            224C964 358.4 942.4 380 916 380zM231.2 860l108.8 0c26.4 0 48 21.6 48
            48s-21.6 48-48 48l-224 0c-26.4 0-48-21.6-48-48l0-224c0-26.4 21.6-48
            48-48 26.4 0 48 21.6 48 48L164 792l253.6-253.6c18.4-18.4 48.8-18.4
            68 0 18.4 18.4 18.4 48.8 0 68L231.2 860z"
          />
        </svg>
      </button>
    </div>
    {/if}
  </div>
{/if}
