import type Player from 'rrweb-player';

export type CaptureBackend = 'ffmpeg' | 'playwright' | 'compositor';

export type RRwebPlayerProps = Omit<
  ConstructorParameters<typeof Player>[0]['props'],
  'events'
>;

export type RRvideoConfig = {
  /** Experimental compositor capture requires Linux/Windows chrome-headless-shell. */
  browserPath?: string;
  /** Per-operation timeout, including encoder writes and shutdown. Default: 30000. */
  captureTimeoutMs?: number;
  /** Seek is retained only as a comparison baseline. Default: incremental. */
  replayMode?: 'incremental' | 'seek';
  /** Artificial wall-clock delay before each frame. Must be below captureTimeoutMs. Default: 0. */
  frameDelayMs?: number;
  input: string;
  output?: string;
  headless?: boolean;
  /**
   * A number typically between 0 and 1 for the Playwright backend.
   * The ffmpeg backend also accepts values greater than 1 to upscale.
   */
  resolutionRatio?: number;
  /**
   * How to capture frames.
   *
   * - `ffmpeg`: advance controlled playback per output frame, screenshot, pipe JPEGs to
   *   ffmpeg. Use this for high fps / high resolution / MP4.
   * - `compositor`: controlled playback plus headless-shell beginFrame capture.
   * - `playwright`: Playwright `recordVideo` (CDP screencast). Caps around
   *   25fps and writes WebM. Kept for compatibility.
   */
  capture?: CaptureBackend;
  /** Output frames per second. Used by the ffmpeg and compositor backends. Default: 60. */
  fps?: number;
  /** JPEG screenshot quality 0-100. Used by the ffmpeg and compositor backends. Default: 90. */
  quality?: number;
  /** libx264 CRF. Used by the ffmpeg and compositor backends. Default: 18. */
  crf?: number;
  /** libx264 preset. Used by the ffmpeg and compositor backends. Default: veryfast. */
  x264Preset?: string;
  /**
   * Device pixel ratio used when screenshotting. 2 captures at 2× resolution.
   * Used by the ffmpeg and compositor backends. Default: 1.
   */
  pixelRatio?: number;
  /** ffmpeg binary. Default: ffmpeg on PATH. */
  ffmpegPath?: string;
  onProgressUpdate?: (percent: number) => void;
  rrwebPlayer?: RRwebPlayerProps;
};

export type ResolvedRRvideoConfig = Required<
  Pick<
    RRvideoConfig,
    | 'captureTimeoutMs'
    | 'replayMode'
    | 'frameDelayMs'
    | 'input'
    | 'output'
    | 'headless'
    | 'resolutionRatio'
    | 'capture'
    | 'fps'
    | 'quality'
    | 'crf'
    | 'x264Preset'
    | 'pixelRatio'
    | 'ffmpegPath'
    | 'onProgressUpdate'
    | 'rrwebPlayer'
  >
> &
  Pick<RRvideoConfig, 'browserPath'>;

export type ViewportSize = {
  width: number;
  height: number;
};
