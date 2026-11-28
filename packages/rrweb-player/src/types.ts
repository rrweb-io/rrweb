import type { eventWithTime } from '@rrweb/types';
import type { Replayer, playerConfig } from '@rrweb/replay';
import type { Mirror } from 'rrweb-snapshot';

import type {
  PlayerControls,
  PlayerFeatures,
  PlayerIcons,
  JumpEvent,
} from './features';

export type RRwebPlayerOptions = {
  target: HTMLElement;
  props: {
    /**
     * The events to replay.
     * @default `[]`
     */
    events: eventWithTime[];
    /**
     * Opt-in player features. Every feature is off unless set.
     * @defaultValue `{}`
     */
    features?: PlayerFeatures;
    /**
     * Toolbar controls to leave out, for example `{ speed: false }`. Applies
     * only with `features.toolbar`.
     * @defaultValue `{}`
     */
    controls?: PlayerControls;
    /**
     * Replacement toolbar icons. Each function returns an SVG element for
     * the named control. Applies only with `features.toolbar`.
     * @defaultValue `{}`
     */
    icons?: PlayerIcons;
    /**
     * The recorded user's IANA time zone, such as `'America/New_York'`. With
     * the toolbar, hovering or focusing the time shows when the recording
     * started in the viewer's local time, and in this time zone when set.
     */
    recordingTimeZone?: string;
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
     * Whether a click on the replay plays or pauses it, with or without the
     * controller. A drag does not count as a click.
     * @defaultValue `false`
     */
    clickToPlay?: boolean;
    /**
     * Whether a paused replay shows a play button over it while the pointer
     * is on the replay. Touch screens show it while paused.
     * @defaultValue `false`
     */
    showPlayOverlay?: boolean;
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
    /**
     * Customize the color of inactive periods indicator in the progress bar with a valid CSS color string.
     * @defaultValue `#D4D4D4`
     */
    inactiveColor?: string;
  } & Partial<playerConfig>;
};

export type RRwebPlayerExpose = {
  /** Jump back or forward by `features.jump.seconds` (default 10). */
  jump: (direction: 'back' | 'forward') => void;
  addEventListener: {
    (event: 'ui-jump', handler: (detail: JumpEvent) => unknown): () => void;
    (event: string, handler: (detail: unknown) => unknown): () => void;
  };
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
  $set: (
    options: Partial<
      Pick<
        RRwebPlayerOptions['props'],
        | 'width'
        | 'height'
        | 'features'
        | 'clickToPlay'
        | 'showPlayOverlay'
        | 'controls'
        | 'icons'
        | 'recordingTimeZone'
      >
    >,
  ) => void;
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
