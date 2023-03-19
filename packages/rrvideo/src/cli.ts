#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import minimist from 'minimist';
import type { RRwebPlayerOptions } from 'rrweb-player';
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
    RRwebPlayerOptions['props'],
    'events'
  >;
}

transformToVideo({
  input: argv.input as string,
  output: argv.output as string,
  rrwebPlayer: config,
})
  .then((file) => {
    console.log(`Successfully transformed into "${file}".`);
  })
  .catch((error) => {
    console.log('Failed to transform this session.');
    console.error(error);
    process.exit(1);
  });
