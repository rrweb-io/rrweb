import type { eventWithTime } from '@rrweb/types';
import type { Replayer, playerConfig } from '@rrweb/replay';
import type { Mirror } from 'rrweb-snapshot';

/** An application-owned point on the replay timeline. Text is always plain text. */
export type TimelineMarker = {
  /** Nonempty ID, unique among this player's external markers. */
  id: string;
  /** Milliseconds from recording start, matching goto(). Must be finite and nonnegative. */
  timeOffset: number;
  text: string;
  /** Accessible name and panel heading. Defaults to "Timeline marker". */
  label?: string;
  /** A CSS color. Defaults to timelineMarkerColor. */
  color?: string;
};

/** Delivered synchronously before default seeking; cancel to implement your own action. */
export type TimelineMarkerSelection = Readonly<TimelineMarker> & {
  readonly source: 'recorded' | 'external';
  readonly defaultPrevented: boolean;
  preventDefault(): void;
};

export type RRwebPlayerOptions = {
  target: HTMLElement;
  props: {
    /**
     * The events to replay.
     * @default `[]`
     */
    events: eventWithTime[];
    /**
     * The width of the replayer
     * @defaultValue `1024`
     */
    width?: number;
    /**
     * The height of the replayer
     * @defaultValue `576`
     */
    height?: number;
    /**
     * The maximum scale of the replayer (1 = 100%). Set to 0 for unlimited
     * @defaultValue `1`
     */
    maxScale?: number;
    /**
     * Whether to autoplay
     * @defaultValue `true`
     */
    autoPlay?: boolean;
    /**
     * The default speed to play at
     * @defaultValue `1`
     */
    speed?: number;
    /**
     * Speed options in UI
     * @defaultValue `[1, 2, 4, 8]`
     */
    speedOption?: number[];
    /**
     * Whether to show the controller UI
     * @defaultValue `true`
     */
    showController?: boolean;
    /**
     * Display timed captions from annotation events.
     * @defaultValue `true`
     */
    showCaptions?: boolean;
    /**
     * Customize the custom events style with a key-value map
     * @defaultValue `{}`
     */
    tags?: Record<string, string>;
    /**
     * Color of timeline marker annotations, as a valid CSS color string.
     * @defaultValue `rgb(73, 80, 246)`
     */
    timelineMarkerColor?: string;
    /** Initial external markers; replacement never changes recorded annotations. */
    timelineMarkers?: readonly TimelineMarker[];
    /** Highlight an external marker by ID, or null for no active marker. */
    activeTimelineMarker?: string | null;
    /** Called for recorded and external markers. preventDefault() cancels seeking. */
    onTimelineMarkerSelect?: (selection: TimelineMarkerSelection) => void;
    /**
     * Customize the color of inactive periods indicator in the progress bar with a valid CSS color string.
     * @defaultValue `#D4D4D4`
     */
    inactiveColor?: string;
  } & Partial<playerConfig>;
};

export type RRwebPlayerExpose = {
  /** Replace all external markers. Pass [] to remove them. Invalid input throws atomically. */
  setTimelineMarkers: (markers: readonly TimelineMarker[]) => void;
  /** Set the active external ID; does not seek or change playback. */
  setActiveTimelineMarker: (id: string | null) => void;
  addEventListener: (
    event: string,
    handler: (params: unknown) => unknown,
  ) => void;
  addEvent: (event: eventWithTime) => void;
  getMetaData: Replayer['getMetaData'];
  getReplayer: () => Replayer;
  getMirror: () => Mirror;
  // getSilly: () => void;
  toggle: () => void;
  setSpeed: (speed: number) => void;
  toggleSkipInactive: () => void;
  toggleFullscreen: () => void;
  triggerResize: () => void;
  $set: (options: { width: number; height: number }) => void;
  play: () => void;
  pause: () => void;
  goto: (timeOffset: number, play?: boolean) => void;
  playRange: (
    timeOffset: number,
    endTimeOffset: number,
    startLooping?: boolean,
    afterHook?: undefined | (() => void),
  ) => void;
};
