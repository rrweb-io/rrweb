/* eslint:disable: no-console */

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

function getCode() {
  const bundlePath = path.resolve(__dirname, '../dist/rrweb.js');
  return fs.readFileSync(bundlePath, 'utf8');
}

async function startRecording(page, serverURL) {
  page.on('recording - console', (msg) => console.log('PAGE LOG:', msg.text()));

  await page.evaluate((serverURL) => {
    const el = document.createElement('script');
    el.addEventListener('load', () => {
      const win = window;
      win.__IS_RECORDING__ = true;
      win.events = [];
      win.rrweb?.record({
        emit: (event) => {
          win.events?.push(event);
          win._replLog?.(event);
        },
        recordCanvas: true,
        collectFonts: true,
        inlineImages: true,
        sampling: {
          canvas: 'webrtc',
        },
      });
    });
    el.src = `${serverURL}/rrweb.js`;
    document.head.appendChild(el);
  }, serverURL);
}

async function startReplay(page, serverURL, recordedPage) {
  page.on('replay - console', (msg) => console.log('PAGE LOG:', msg.text()));

  await page.exposeFunction('_signal', (signal) => {
    recordedPage.evaluate((signal) => {
      window.p.signal(signal);
    }, signal);
  });

  return page.evaluate((serverURL) => {
    const el = document.createElement('script');
    el.addEventListener('load', () => {
      window.replayer = new rrweb.Replayer([], {
        UNSAFE_replayCanvas: true,
        liveMode: true,
      });
      window.replayer.startLive();
    });
    el.src = `${serverURL}/rrweb.js`;
    document.head.appendChild(el);
  }, serverURL);
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
  const code = getCode();
  let server;
  let serverURL;

  await start();

  const fakeGoto = async (page, url) => {
    const intercept = (request) => {
      void request.respond({
        status: 200,
        contentType: 'text/html',
        body: ' ', // non-empty string or page will load indefinitely
      });
    };
    await page.setRequestInterception(true);
    page.on('request', intercept);
    await page.goto(url);
    await page.setRequestInterception(false);
    page.off('request', intercept);
  };

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
      path: path.resolve(__dirname, '../dist/rrweb.min.css'),
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

    await startReplay(replayerPage, serverURL, recordedPage);

    await Promise.all([
      resizeWindow(recordedPage, 0, 0, 800, 800),
      resizeWindow(replayerPage, 0, 800, 800, 800),
    ]);

    await recordedPage.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 300000,
    });

    if (!replayerPage) throw new Error('No replayer page found');

    await recordedPage.exposeFunction('_replLog', (event) => {
      replayerPage.evaluate((event) => {
        window.replayer?.addEvent(event);
      }, event);
    });
    await startRecording(recordedPage, serverURL);
    recordedPage.on('framenavigated', async () => {
      const isRecording = await recordedPage.evaluate(
        'window.__IS_RECORDING__',
      );
      if (!isRecording) {
        await startRecording(recordedPage, serverURL);
      }
    });

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
