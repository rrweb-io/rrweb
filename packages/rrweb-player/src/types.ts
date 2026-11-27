import type { eventWithTime } from '@rrweb/types';
import type { Replayer, playerConfig } from '@rrweb/replay';
import type { Mirror } from 'rrweb-snapshot';

export type CaptionPosition =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'left'
  | 'center'
  | 'right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right';

export type CaptionStyle = {
  /**
   * Where captions sit in the replay viewport.
   * @defaultValue `'bottom'`
   */
  position?: CaptionPosition;
  /**
   * Caption font size, as a valid CSS length such as `20px` or `1.25rem`.
   * @defaultValue `16px`
   */
  fontSize?: string;
  /**
   * Caption text color, as a valid CSS color string.
   * @defaultValue `#fff`
   */
  color?: string;
  /**
   * Caption background, as a valid CSS color string. Use an alpha value or
   * `transparent` to let the replay show through.
   * @defaultValue `rgba(24, 29, 40, 0.94)`
   */
  background?: string;
  /**
   * Outline color drawn around each letter, like film subtitles. Captions have
   * no outline when this is not set.
   */
  outline?: string;
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
     * Caption position, text size, colors and outline. Values that are not
     * valid keep the default look.
     * @defaultValue `{}`
     */
    captionStyle?: CaptionStyle;
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
