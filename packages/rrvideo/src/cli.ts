#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import minimist from 'minimist';
import { ProgressBar } from '@open-tech-world/cli-progress-bar';
import type { CaptureBackend, RRvideoConfig } from './types';
import { transformToVideo } from './index';

const argv = minimist(process.argv.slice(2));

if (!argv.input) {
  throw new Error('please pass --input to your rrweb events file');
}

type FileConfig = Record<string, unknown>;

const CAPTURE_KEYS = new Set([
  'fps',
  'capture',
  'quality',
  'crf',
  'x264Preset',
  'pixelRatio',
  'headless',
  'resolutionRatio',
  'ffmpegPath',
]);

let fileConfig: FileConfig = {};

if (argv.config) {
  const configPathStr = argv.config as string;
  const configPath = path.isAbsolute(configPathStr)
    ? configPathStr
    : path.resolve(process.cwd(), configPathStr);
  fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as FileConfig;
}

const rrwebPlayer: NonNullable<RRvideoConfig['rrwebPlayer']> = {};
const captureFromFile: Partial<RRvideoConfig> = {};
for (const [key, value] of Object.entries(fileConfig)) {
  if (CAPTURE_KEYS.has(key)) {
    (captureFromFile as Record<string, unknown>)[key] = value;
  } else {
    (rrwebPlayer as Record<string, unknown>)[key] = value;
  }
}

const pBar = new ProgressBar({ prefix: 'Transforming' });
const onProgressUpdate = (percent: number) => {
  if (percent < 1) pBar.run({ value: percent * 100, total: 100 });
  else
    pBar.run({ value: 100, total: 100, prefix: 'Transformation Completed!' });
};

const options: RRvideoConfig = {
  ...captureFromFile,
  input: argv.input as string,
  output: argv.output as string | undefined,
  rrwebPlayer,
  onProgressUpdate,
};

if (argv.fps !== undefined) options.fps = Number(argv.fps);
if (argv.capture !== undefined)
  options.capture = argv.capture as CaptureBackend;
if (argv.quality !== undefined) options.quality = Number(argv.quality);
if (argv.crf !== undefined) options.crf = Number(argv.crf);
if (argv.pixelRatio !== undefined) options.pixelRatio = Number(argv.pixelRatio);

transformToVideo(options)
  .then((file) => {
    console.log(`Successfully transformed into "${file}".`);
  })
  .catch((error) => {
    console.log('Failed to transform this session.');
    console.error(error);
    process.exit(1);
  });
