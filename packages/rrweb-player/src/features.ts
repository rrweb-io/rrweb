/** Activity graph layers: three stacked bands, and a lane of dots for clicks
 * and for page loads at a new URL. Marks close together share one dot. */
export type ActivityLayer =
  | 'clicks'
  | 'mouse'
  | 'scroll'
  | 'inputs'
  | 'navigation';
export type PlayerFeatures = {
  /**
   * Off unless set. Adds back and forward jump buttons to the controller.
   * `keyboard` also lets the left and right arrows jump and Space play or
   * pause: `'player'` while the player has focus, `'page'` from anywhere on
   * the page.
   */
  jump?: { seconds?: number; keyboard?: 'player' | 'page' };
  /**
   * Off unless `true`. Replaces the classic button row with a compact
   * toolbar: play, jumps (when `jump` is set), the time, a speed panel, a
   * settings panel and fullscreen.
   */
  toolbar?: boolean;
  /**
   * Off unless set, and shown in the toolbar. Adds a Download menu. Its
   * built-in item saves the recording's events as a JSON file; `fileName`
   * names it (by default it includes the recording's start time) and
   * `json: false` leaves it out. `links` adds the host's own downloads, such
   * as a rendered video or a screenshot.
   */
  download?:
    | boolean
    | { fileName?: string; json?: boolean; links?: DownloadLink[] };
  /** Options for the timeline. */
  timeline?: {
    /**
     * Off unless set. Compresses inactive periods so they take at most
     * `maxIdleShare` of the timeline's width (default 0.2, clamped to
     * 0.001-1). `true` uses the default. Times and seeking keep their real
     * values.
     */
    compressInactive?: boolean | { maxIdleShare?: number };
    /**
     * Off unless set. While a mouse or pen is over the timeline, shows a
     * dashed line and the time where a click would seek. `time: false` shows
     * the line alone. `true` uses the defaults.
     */
    seekPreview?: boolean | { time?: boolean };
    /**
     * Off unless set. Draws an activity graph over the timeline from the
     * recording's input events, scrolling, pointer movement, clicks and
     * page loads at a new URL.
     * `layers` limits which of them are available (default all); `true`
     * offers all of them. With the toolbar, a panel lets the viewer show or
     * hide each one.
     */
    activityGraph?: boolean | { layers?: ActivityLayer[] };
  };
};

/** A download the host provides, opened from the toolbar's Download menu. */
export type DownloadLink = {
  label: string;
  /** An http, https or blob URL. Others are left out. */
  href: string;
  description?: string;
};

/** Toolbar controls a host can hide with the `controls` prop. */
export type PlayerControls = Partial<
  Record<
    | 'play'
    | 'jump'
    | 'time'
    | 'speed'
    | 'settings'
    | 'activityGraph'
    | 'download'
    | 'fullscreen',
    boolean
  >
>;
export type PlayerIconName =
  | 'jump-back'
  | 'jump-forward'
  | 'play'
  | 'pause'
  | 'speed'
  | 'settings'
  | 'download'
  | 'activityGraph'
  | 'enter-fullscreen'
  | 'exit-fullscreen'
  /** The activity graph's click mark and its legend swatch. */
  | 'click'
  /** The activity graph's page change mark and its legend swatch. */
  | 'navigation';
export type PlayerIconContext = {
  name: PlayerIconName;
  /** The jump length, for icons that show it. */
  seconds: number;
  /** The document to create the icon in, which may be the player's frame. */
  document: Document;
};
/** Toolbar icons a host replaces with its own SVG via the `icons` prop. */
export type PlayerIcons = Partial<
  Record<PlayerIconName, (context: PlayerIconContext) => SVGElement>
>;

export type JumpEvent = {
  fromMs: number;
  toMs: number;
  source: 'button' | 'keyboard' | 'api';
};

export function jumpSeconds(jump: PlayerFeatures['jump']) {
  const value = jump?.seconds;
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : 10;
}
