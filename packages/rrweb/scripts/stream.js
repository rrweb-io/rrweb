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
  try {
    await page.addScriptTag({ url: `${serverURL}/rrweb.js` });
    await page.addScriptTag({
      url: `${serverURL}/plugins/canvas-webrtc-record.js`,
    });
    await page.evaluate((serverURL) => {
      const win = window;
      win.__IS_RECORDING__ = true;
      win.events = [];
      window.record = win.rrweb.record;
      window.plugin = new rrwebCanvasWebRTCRecord.RRWebPluginCanvasWebRTCRecord(
        {
          webRTCCallback: (msg) => {
            // [record#callback] provides canvas id, stream, and webrtc sdpOffer signal & connect message
            _signal(msg);
          },
        },
      );

      window.record({
        emit: (event) => {
          win.events.push(event);
          win._captureEvent(event);
        },
        plugins: [window.plugin.initPlugin()],
        recordCanvas: false,
        collectFonts: true,
        inlineImages: true,
      });
    });
  } catch (error) {
    console.error(error);
  }
}

async function startReplay(page, serverURL, recordedPage) {
  await recordedPage.exposeFunction('_signal', async (signal) => {
    await page.evaluate((signal) => {
      // [replay#setupWebRTC] creates webrtc connection with sdpOffer signal
      window.plugin.setupWebRTC(signal, (data) => {
        _signal(JSON.stringify(data));
      });
    }, signal);
  });
  await page.exposeFunction('_signal', async (signal) => {
    await recordedPage.evaluate((signal) => {
      // [record#webRTCSignalCallback] creates webrtc connection with sdpOffer signal
      window.plugin.webRTCSignalCallback(signal);
    }, signal);
  });
  await page.exposeFunction('_canvas', async (id) => {
    await recordedPage.evaluate((id) => {
      // [record#setupStream] sets up the canvas stream for a given id.
      const stream = window.plugin.setupStream(id);
      console.log('stream for', id, '=>', stream);
    }, id);
  });

  await page.addScriptTag({ url: `${serverURL}/rrweb.js` });
  await page.addScriptTag({
    url: `${serverURL}/plugins/canvas-webrtc-replay.js`,
  });

  return page.evaluate(() => {
    window.plugin = new rrwebCanvasWebRTCReplay.RRWebPluginCanvasWebRTCReplay(
      // [replay#canvasFoundCallback]
      (canvas, context) => {
        console.log('canvas', canvas, context);
        // [replay#onBuild] gets id of canvas element and sends to recorded page
        _canvas(context.id);
      },
      // [replay#webRTCSignalCallback]
      (data) => {
        _signal(JSON.stringify(data));
      },
    );

    window.replayer = new rrweb.Replayer([], {
      UNSAFE_replayCanvas: true,
      liveMode: true,
      plugins: [window.plugin.initPlugin()],
    });
    window.replayer.startLive();
  });
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
      path: path.resolve(__dirname, '../dist/rrweb.css'),
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

    await recordedPage.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 300000,
    });

    if (!replayerPage) throw new Error('No replayer page found');

    await recordedPage.exposeFunction('_captureEvent', (event) => {
      replayerPage.evaluate((event) => {
        window.replayer.addEvent(event);
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
