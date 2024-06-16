#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import minimist from 'minimist';
import { ProgressBar } from '@open-tech-world/cli-progress-bar';
import type Player from '@saola.ai/rrweb-player';
import { transformToVideo } from './index';

const argv = minimist(process.argv.slice(2));

if (!argv.input) {
  throw new Error('please pass --input to your rrweb events file');
}

let config = {};

if (argv.config) {
  const configPathStr = argv.config as string;
  const configPath = path.isAbsolute(configPathStr)
    ? configPathStr
    : path.resolve(process.cwd(), configPathStr);
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Omit<
    ConstructorParameters<typeof Player>[0]['props'],
    'events'
  >;
}

const pBar = new ProgressBar({ prefix: 'Transforming' });
const onProgressUpdate = (percent: number) => {
  if (percent < 1) pBar.run({ value: percent * 100, total: 100 });
  else
    pBar.run({ value: 100, total: 100, prefix: 'Transformation Completed!' });
};

transformToVideo({
  input: argv.input as string,
  output: argv.output as string,
  rrwebPlayer: config,
  onProgressUpdate,
})
  .then((file) => {
    console.log(`Successfully transformed into "${file}".`);
  })
  .catch((error) => {
    console.log('Failed to transform this session.');
    console.error(error);
    process.exit(1);
  });
