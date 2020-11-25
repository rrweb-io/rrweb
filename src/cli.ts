#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import minimist from 'minimist';
import { transformToVideo } from './index';

const argv = minimist(process.argv.slice(2));

if (!argv.input) {
  throw new Error('please pass --input to your rrweb events file');
}

let config = {};

if (argv.config) {
  const configPath = path.isAbsolute(argv.config)
    ? argv.config
    : path.resolve(process.cwd(), argv.config);
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

transformToVideo({
  input: argv.input,
  output: argv.output,
  rrwebPlayer: config
})
  .then((file) => {
    console.log(`Successfully transformed into "${file}".`);
  })
  .catch((error) => {
    console.log('Failed to transform this session.');
    console.error(error);
    process.exit(1);
  });
