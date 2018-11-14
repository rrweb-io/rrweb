/* tslint:disable: no-console */

import * as fs from 'fs';
import * as path from 'path';
import * as EventEmitter from 'events';
import * as readline from 'readline';
import * as rollup from 'rollup';
import typescript = require('rollup-plugin-typescript');
import resolve = require('rollup-plugin-node-resolve');
import postcss = require('rollup-plugin-postcss');
import * as puppeteer from 'puppeteer';
import { eventWithTime } from '../src/types';

const emitter = new EventEmitter();

async function getCode(): Promise<string> {
  const bundle = await rollup.rollup({
    input: path.resolve(__dirname, '../src/index.ts'),
    plugins: [typescript(), resolve(), postcss({ extract: false })],
  });
  const { code } = await bundle.generate({
    name: 'rrweb',
    format: 'iife',
  });
  return code;
}

(async () => {
  const code = await getCode();
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: {
      width: 1600,
      height: 900,
    },
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let events: eventWithTime[] = [];

  rl.question(
    'Enter the url you want to record, e.g https://react-redux.realworld.io: ',
    async url => {
      console.log(`Going to open ${url}...`);
      await record(url);
      console.log('Ready to record. You can do any interaction on the page.');
      rl.question(
        `Once you want to finish the recording, enter 'y' to start replay: `,
        async answer => {
          if (answer.toLowerCase() === 'y') {
            emitter.emit('done');
          }
        },
      );
    },
  );

  async function record(url: string) {
    const page = await browser.newPage();
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
    });
    await page.exposeFunction('log', (event: eventWithTime) => {
      events.push(event);
    });
    await page.evaluate(`${code}
      rrweb.record({
        emit: event => window.log(event)
      });
    `);
    emitter.once('done', async () => {
      await page.close();
      console.log(`Recorded ${events.length} events`);
      replay();
    });
  }

  async function replay() {
    const style = fs.readFileSync(
      path.resolve(__dirname, '../src/replay/styles/style.css'),
      'utf8',
    );
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addStyleTag({
      content: style,
    });
    await page.evaluate(`${code}
      const events = ${JSON.stringify(events)};
      const replayer = new rrweb.Replayer(events);
      replayer.play();
    `);
  }

  process
    .on('uncaughtException', error => {
      console.error(error);
    })
    .on('unhandledRejection', error => {
      console.error(error);
    });
})();
