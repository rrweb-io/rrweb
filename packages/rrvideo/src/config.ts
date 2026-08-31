import * as path from 'path';
import type {
  CaptureBackend,
  RRvideoConfig,
  ResolvedRRvideoConfig,
} from './types';

export const defaultConfig: ResolvedRRvideoConfig = {
  input: '',
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
      : capture === 'ffmpeg'
      ? 1
      : defaultConfig.resolutionRatio;
  const config: ResolvedRRvideoConfig = {
    input: options.input,
    output:
      options.output ||
      (capture === 'ffmpeg' ? 'rrvideo-output.mp4' : defaultConfig.output),
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
  config.input = path.isAbsolute(config.input)
    ? config.input
    : path.resolve(process.cwd(), config.input);
  config.output = path.isAbsolute(config.output)
    ? config.output
    : path.resolve(process.cwd(), config.output);
  return config;
}
