/* eslint:disable: no-console */
/**
 * DEPRECATED: This developer utility previously demonstrated low‑latency live streaming
 * using the (now removed) canvas WebRTC record/replay plugins. The plugin packages were
 * purged in this fork, so the original behavior no longer works. The script is retained
 * only for historical reference. Running it will exit immediately.
 *
 * If you need a live two‑window demo again, either:
 *  - enable native rrweb canvas recording (recordCanvas: true) and remove WebRTC logic, or
 *  - reintroduce a custom internal observer for WebRTC streaming.
 */

import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'node:events';
import inquirer from 'inquirer';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

import { startServer, getServerURL } from './utils.js';

// Turn on devtools for debugging:
const devtools = false;
const defaultURL = 'https://webglsamples.org/';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const emitter = new EventEmitter();

async function injectRecording() {
  throw new Error('Deprecated stream script: plugin-based canvas WebRTC recording removed.');
}

async function startReplay() {
  throw new Error('Deprecated stream script: plugin-based canvas WebRTC replay removed.');
}

async function resizeWindow(page, top, left, width, height) {
  const session = await page.target().createCDPSession();
  await page.setViewport({ height, width });
  const { windowId } = await session.send('Browser.getWindowForTarget');
  await session.send('Browser.setWindowBounds', {
    bounds: { top, left, height, width },
    windowId,
  });
}

void (async () => {
  let server;
  let serverURL;

  console.error('[DEPRECATED] stream.js is no longer functional (plugins removed). Exiting.');
  process.exit(1);

  async function start() {
    server = await startServer();
    serverURL = getServerURL(server);

    const { url } = await inquirer.prompt([
      {
        type: 'input',
        name: 'url',
        message: `Enter the url you want to record, e.g ${defaultURL}: `,
      },
    ]);

    await record(url);

    const { shouldRecordAnother } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldRecordAnother',
        message: 'Record another one?',
      },
    ]);

    emitter.emit('done');

    if (shouldRecordAnother) {
      await start();
    } else {
      process.exit();
    }
  }

  async function record(url) {
    if (url === '') url = defaultURL;

    const replayingBrowser = await puppeteer.launch({
      headless: false,
      devtools,
      defaultViewport: {
        width: 1600,
        height: 900,
      },
      args: [
        '--start-maximized',
        '--ignore-certificate-errors',
        '--no-sandbox',
      ],
    });

    const replayerPage = (await replayingBrowser.pages())[0];
    await replayerPage.goto('about:blank');

    await replayerPage.addStyleTag({
      path: path.resolve(__dirname, '../dist/style.css'),
    });

    const recordingBrowser = await puppeteer.launch({
      headless: false,
      devtools,
      defaultViewport: {
        width: 1600,
        height: 900,
      },
      args: [
        '--start-maximized',
        '--ignore-certificate-errors',
        '--no-sandbox',
      ],
    });

    const recordedPage = (await recordingBrowser.pages())[0];
    if (!recordedPage) {
      throw new Error('No recorded page found');
    }
    // disables content security policy which enables us to insert rrweb as a script tag
    await recordedPage.setBypassCSP(true);

    replayerPage.on('console', (msg) =>
      console.log('REPLAY PAGE LOG:', msg.text()),
    );
    recordedPage.on('console', (msg) =>
      console.log('RECORD PAGE LOG:', msg.text()),
    );
    await startReplay(replayerPage, serverURL, recordedPage);

    await Promise.all([
      resizeWindow(recordedPage, 0, 0, 800, 800),
      resizeWindow(replayerPage, 0, 800, 800, 800),
    ]);

    await recordedPage.exposeFunction('_captureEvent', (event) => {
      replayerPage.evaluate((event) => {
        window.replayer.addEvent(event);
      }, event);
    });

    recordedPage.on('framenavigated', async (frame) => {
      console.log('framenavigated');
      await injectRecording(frame, serverURL);
    });

    await recordedPage.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 300000,
    });

    if (!replayerPage) throw new Error('No replayer page found');

    emitter.once('done', async () => {
      const pages = [
        ...(await recordingBrowser.pages()),
        ...(await replayingBrowser.pages()),
      ];
      await server.close();
      await Promise.all(pages.map((page) => page.close()));
      await recordingBrowser.close();
      await replayingBrowser.close();
    });
  }

  process
    .on('uncaughtException', (error) => {
      console.error(error);
    })
    .on('unhandledRejection', (error) => {
      console.error(error);
    });
})();
