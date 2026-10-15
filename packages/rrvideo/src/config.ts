import * as path from 'path';
import type {
  CaptureBackend,
  RRvideoConfig,
  ResolvedRRvideoConfig,
} from './types';

export const defaultConfig: ResolvedRRvideoConfig = {
  input: '',
  captureTimeoutMs: 30000,
  replayMode: 'incremental',
  frameDelayMs: 0,
  output: 'rrvideo-output.webm',
  headless: true,
  resolutionRatio: 0.8,
  capture: 'playwright',
  fps: 60,
  quality: 90,
  crf: 18,
  x264Preset: 'veryfast',
  pixelRatio: 1,
  ffmpegPath: 'ffmpeg',
  onProgressUpdate: () => {
    //
  },
  rrwebPlayer: {},
};

export function resolveCapture(options: RRvideoConfig): CaptureBackend {
  if (options.capture) return options.capture;
  const output = options.output || '';
  if (output.endsWith('.mp4') || options.fps !== undefined) return 'ffmpeg';
  return 'playwright';
}

export function resolveConfig(options: RRvideoConfig): ResolvedRRvideoConfig {
  if (!options.input) throw new Error('input is required');
  const capture = resolveCapture(options);
  const resolutionRatio =
    options.resolutionRatio !== undefined
      ? options.resolutionRatio
      : capture !== 'playwright'
      ? 1
      : defaultConfig.resolutionRatio;
  const config: ResolvedRRvideoConfig = {
    input: options.input,
    browserPath: options.browserPath,
    captureTimeoutMs:
      options.captureTimeoutMs ?? defaultConfig.captureTimeoutMs,
    replayMode: options.replayMode ?? defaultConfig.replayMode,
    frameDelayMs: options.frameDelayMs ?? defaultConfig.frameDelayMs,
    output:
      options.output ||
      (capture !== 'playwright' ? 'rrvideo-output.mp4' : defaultConfig.output),
    headless: options.headless ?? defaultConfig.headless,
    resolutionRatio:
      capture === 'playwright' ? Math.min(resolutionRatio, 1) : resolutionRatio,
    capture,
    fps: options.fps ?? defaultConfig.fps,
    quality: options.quality ?? defaultConfig.quality,
    crf: options.crf ?? defaultConfig.crf,
    x264Preset: options.x264Preset ?? defaultConfig.x264Preset,
    pixelRatio: options.pixelRatio ?? defaultConfig.pixelRatio,
    ffmpegPath: options.ffmpegPath ?? defaultConfig.ffmpegPath,
    onProgressUpdate:
      options.onProgressUpdate ?? defaultConfig.onProgressUpdate,
    rrwebPlayer: { ...defaultConfig.rrwebPlayer, ...options.rrwebPlayer },
  };
  if (!['playwright', 'ffmpeg', 'compositor'].includes(config.capture))
    throw new Error('capture must be playwright, ffmpeg, or compositor');
  if (!['incremental', 'seek'].includes(config.replayMode))
    throw new Error('replayMode must be incremental or seek');
  for (const [name, value] of Object.entries({
    fps: config.fps,
    resolutionRatio: config.resolutionRatio,
    pixelRatio: config.pixelRatio,
    captureTimeoutMs: config.captureTimeoutMs,
    speed: config.rrwebPlayer.speed ?? 1,
  })) {
    if (!Number.isFinite(value) || value <= 0)
      throw new Error(`${name} must be finite and positive`);
  }
  for (const [name, value, max] of [
    ['quality', config.quality, 100],
    ['crf', config.crf, 51],
    ['frameDelayMs', config.frameDelayMs, 60000],
  ] as const) {
    if (!Number.isFinite(value) || value < 0 || value > max)
      throw new Error(`${name} must be between 0 and ${max}`);
  }
  if (config.capture === 'compositor' && config.fps > 1000)
    throw new Error('compositor fps must not exceed 1000');
  if (
    config.capture !== 'playwright' &&
    config.frameDelayMs >= config.captureTimeoutMs
  )
    throw new Error('frameDelayMs must be less than captureTimeoutMs');
  if (config.capture !== 'playwright' && config.rrwebPlayer.skipInactive)
    throw new Error(
      'skipInactive is incompatible with fixed-timeline frame capture',
    );
  if (
    config.capture === 'compositor' &&
    (!config.headless || config.replayMode === 'seek')
  )
    throw new Error('compositor requires headless incremental playback');
  config.input = path.isAbsolute(config.input)
    ? config.input
    : path.resolve(process.cwd(), config.input);
  config.output = path.isAbsolute(config.output)
    ? config.output
    : path.resolve(process.cwd(), config.output);
  return config;
}
