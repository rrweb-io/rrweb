/* eslint:disable: no-console */

import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'node:events';
import inquirer from 'inquirer';
import { webkit, chromium, firefox } from 'playwright';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const emitter = new EventEmitter();

// Store selected browser info globally
let selectedBrowser = null;
let selectedBrowserName = null;

function getCode() {
  const bundlePath = path.resolve(__dirname, '../dist/rrweb.umd.cjs');
  return fs.readFileSync(bundlePath, 'utf8');
}

void (async () => {
  const code = getCode();
  let events = [];

  async function injectRecording(frame) {
    try {
      await frame.evaluate((rrwebCode) => {
        const win = window;
        if (win.__IS_RECORDING__) return;
        win.__IS_RECORDING__ = true;

        function loadScript(code) {
          return new Promise((resolve) => {
            const s = document.createElement('script');
            s.type = 'text/javascript';
            s.innerHTML = code;
            s.onload = resolve;
            if (document.head) {
              document.head.append(s);
              // Script with innerHTML doesn't fire onload, resolve immediately
              resolve();
            } else {
              requestAnimationFrame(() => {
                document.head.append(s);
                resolve();
              });
            }
          });
        }

        loadScript(rrwebCode).then(() => {
          if (typeof rrweb !== 'undefined' && rrweb.record) {
            rrweb.record({
              emit: (event) => {
                win._replLog(event);
              },
              plugins: [],
              recordCanvas: true,
              sampling: {
                canvas: 15  // Use FPS-based recording at 15 FPS for bitmaprenderer support
              },
              recordCrossOriginIframes: true,
              collectFonts: true,
            });
            console.log('rrweb recording started');
          } else {
            console.error('rrweb is not available');
          }
        });
      }, code);
    } catch (e) {
      //console.error('failed to inject recording script:', e);
    }
  }

  await start('https://react-redux.realworld.io');

  const fakeGoto = async (page, url) => {
    await page.route('**/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: ' ', // non-empty string or page will load indefinitely
      });
    });
    await page.goto(url);
    await page.unroute('**/*');
  };

  async function start(defaultURL) {
    events = [];

    // Add browser selection prompt
    const { browser } = await inquirer.prompt([
      {
        type: 'list',
        name: 'browser',
        message: 'Select browser to test with:',
        choices: [
          { name: 'WebKit (Safari)', value: 'webkit' },
          { name: 'Firefox (Gecko)', value: 'firefox' },
          { name: 'Chromium', value: 'chromium' },
        ],
        default: 'webkit',
      },
    ]);

    // Set the selected browser
    switch (browser) {
      case 'webkit':
        selectedBrowser = webkit;
        selectedBrowserName = 'WebKit';
        break;
      case 'firefox':
        selectedBrowser = firefox;
        selectedBrowserName = 'Firefox';
        break;
      case 'chromium':
        selectedBrowser = chromium;
        selectedBrowserName = 'Chromium';
        break;
    }

    let { url } = await inquirer.prompt([
      {
        type: 'input',
        name: 'url',
        message: `Enter the url you want to record, e.g [${defaultURL}]: `,
      },
    ]);

    if (url === '') {
      url = defaultURL;
    }

    console.log(`Going to open ${url} in ${selectedBrowserName}...`);
    await record(url);
    console.log('Ready to record. You can do any interaction on the page.');

    const { shouldReplay } = await inquirer.prompt([
      {
        type: 'list',
        choices: [
          { name: 'Start replay (default)', value: 'default' },
          {
            name: `Start replay on original url (helps when experiencing CORS issues)`,
            value: 'replayWithFakeURL',
          },
          { name: 'Skip replay', value: false },
        ],
        name: 'shouldReplay',
        message: `Once you want to finish the recording, choose the following to start replay: `,
      },
    ]);

    emitter.emit('done', shouldReplay);

    console.log(`Captured ${events.length} events`);

    const { shouldStore } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldStore',
        message: `Persistently store these recorded events?`,
      },
    ]);

    if (shouldStore) {
      saveEvents();
    }

    const { shouldRecordAnother } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldRecordAnother',
        message: 'Record another one?',
      },
    ]);

    if (shouldRecordAnother) {
      start(url);
    } else {
      process.exit();
    }
  }

  async function record(url) {
    // WebKit supports --start-maximized, but Firefox doesn't
    const launchArgs = selectedBrowserName === 'WebKit' ? ['--start-maximized'] : [];
    const browser = await selectedBrowser.launch({
      headless: false,
      args: launchArgs,
    });
    const context = await browser.newContext({
      viewport: {
        width: 1600,
        height: 900,
      },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    let eventCount = 0;
    await page.exposeFunction('_replLog', (event) => {
      events.push(event);
      eventCount++;
      if (eventCount % 50 === 0) {
        console.log(`Captured ${eventCount} events so far...`);
      }
    });

    // Add console listener to debug issues
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('rrweb') || text.includes('error') || text.includes('Error')) {
        console.log('PAGE LOG:', text);
      }
    });

    page.on('pageerror', error => {
      console.error('PAGE ERROR:', error.message);
    });

    // Track which frames we've injected into
    const injectedFrames = new Set();

    // Handle navigation events for all frames
    page.on('framenavigated', async (frame) => {
      console.log('Frame navigated:', frame.url());

      // Only inject into frames we haven't seen before, or if it's a real navigation
      // (not a SPA route change). For the main frame, we'll inject manually after page load.
      if (frame !== page.mainFrame()) {
        // This is an iframe - inject into it
        if (!injectedFrames.has(frame)) {
          injectedFrames.add(frame);
          await injectRecording(frame);
        }
      }
      // For main frame, ignore framenavigated events - we inject manually after page.goto
    });

    console.log('Navigating to:', url);
    await page.goto(url, {
      waitUntil: 'domcontentloaded', // Changed from 'networkidle' to start recording sooner
      timeout: 300000,
    });

    // Wait a bit more for Angular/React to fully render
    // Reduced from 2000ms to minimize the window where interactions aren't captured
    await page.waitForTimeout(500);

    // Ensure recording is injected in main frame after everything is loaded
    await injectRecording(page.mainFrame());

    console.log('Page loaded and app should be rendered. Recording started.');

    emitter.once('done', async (shouldReplay) => {
      await context.close();
      await browser.close();
      if (shouldReplay) {
        await replay(url, shouldReplay === 'replayWithFakeURL');
      }
    });
  }

  async function replay(url, useSpoofedUrl) {
    const launchArgs = selectedBrowserName === 'WebKit' ? ['--start-maximized'] : [];
    const browser = await selectedBrowser.launch({
      headless: false,
      args: launchArgs,
    });
    const context = await browser.newContext({
      viewport: {
        width: 1600,
        height: 900,
      },
    });
    const page = await context.newPage();

    if (useSpoofedUrl) {
      await fakeGoto(page, url);
    } else {
      await page.goto('about:blank');
    }

    await page.addStyleTag({
      path: path.resolve(__dirname, '../dist/style.css'),
    });
    await page.evaluate(`${code}
      const events = ${JSON.stringify(events)};
      const replayer = new rrweb.Replayer(events, {
        UNSAFE_replayCanvas: true
      });
      replayer.play();
    `);
  }

  function saveEvents() {
    const tempFolder = path.join(__dirname, '../temp');
    console.log(tempFolder);

    if (!fs.existsSync(tempFolder)) {
      fs.mkdirSync(tempFolder);
    }
    const time = new Date()
      .toISOString()
      .replace(/[-|:]/g, '_')
      .replace(/\..+/, '');
    const browserSlug = selectedBrowserName.toLowerCase().replace(/\s+/g, '_');
    const fileName = `replay_${browserSlug}_${time}.html`;
    const content = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Record @${time} (${selectedBrowserName})</title>
    <link rel="stylesheet" href="../dist/style.css" />
  </head>
  <body>
    <script src="../dist/rrweb.umd.cjs"></script>
    <script>
      /*<!--*/
      const events = ${JSON.stringify(events).replace(
        /<\/script>/g,
        '<\\/script>',
      )};
      /*-->*/
      const replayer = new rrweb.Replayer(events, {
        UNSAFE_replayCanvas: true
      });
      replayer.play();
    </script>
  </body>
</html>
    `;
    const savePath = path.resolve(tempFolder, fileName);
    fs.writeFileSync(savePath, content);
    console.log(`Saved at ${savePath}`);
  }

  process
    .on('uncaughtException', (error) => {
      console.error(error);
    })
    .on('unhandledRejection', (error) => {
      console.error(error);
    });
})();
