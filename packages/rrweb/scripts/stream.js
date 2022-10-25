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

async function injectRecording(page, serverURL) {
  await page.evaluateOnNewDocument((serverURL) => {
    (async () => {
      function loadScript(src) {
        return new Promise(function (resolve, reject) {
          const s = document.createElement('script');
          let r = false;
          s.type = 'text/javascript';
          s.src = src;
          s.async = true;
          s.onerror = function (err) {
            reject(err, s);
          };
          s.onload = s.onreadystatechange = function () {
            // console.log(this.readyState); // uncomment this line to see which ready states are called.
            if (!r && (!this.readyState || this.readyState == 'complete')) {
              r = true;
              resolve();
            }
          };
          if (document.head) {
            document.head.append(s);
          } else {
            requestAnimationFrame(() => {
              document.head.append(s);
            });
          }
        });
      }
      await Promise.all([
        loadScript(`${serverURL}/rrweb.js`),
        loadScript(`${serverURL}/plugins/canvas-webrtc-record.js`),
      ]);

      const win = window;
      win.__IS_RECORDING__ = true;
      win.events = [];
      window.record = win.rrweb.record;
      window.plugin = new rrwebCanvasWebRTCRecord.RRWebPluginCanvasWebRTCRecord(
        {
          signalSendCallback: (msg) => {
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
        recordCrossOriginIframes: true,
        collectFonts: true,
        inlineImages: true,
      });
    })();
  }, serverURL);
}

async function startReplay(page, serverURL, recordedPage) {
  await recordedPage.exposeFunction('_signal', async (signal) => {
    await page.evaluate((signal) => {
      // [replay#signalReceive] setups up peer and starts creating counter offer
      window.plugin.signalReceive(signal);
    }, signal);
  });
  await page.exposeFunction('_signal', async (signal) => {
    await recordedPage.evaluate((signal) => {
      // [record#signalReceive]  setups up webrtc connection
      window.plugin.signalReceive(signal);
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
    window.plugin = new rrwebCanvasWebRTCReplay.RRWebPluginCanvasWebRTCReplay({
      canvasFoundCallback(canvas, context) {
        console.log('canvas', canvas, context);
        // [replay#onBuild] gets id of canvas element and sends to recorded page
        _canvas(context.id);
      },
      signalSendCallback(data) {
        _signal(JSON.stringify(data));
      },
    });

    window.replayer = new rrweb.Replayer([], {
      UNSAFE_replayCanvas: true,
      liveMode: true,
      plugins: [window.plugin.initPlugin()],
    });
    window.replayer.startLive();
    const style = new CSSStyleSheet();
    style.replaceSync('body {margin: 0;} iframe {border: none;}');
    document.adoptedStyleSheets = [style];
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
  let server;
  let serverURL;

  await start();

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
        // evaluateOnNewDocument doesn't work on cross-origin iframes without this
        // more info:
        // https://github.com/puppeteer/puppeteer/issues/7353
        // https://stackoverflow.com/questions/60375593/puppeteer-and-dynamically-added-iframe-element
        '--disable-features=site-per-process',
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

    await injectRecording(recordedPage, serverURL);
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
