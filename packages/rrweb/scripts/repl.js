/* eslint:disable: no-console */

import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'node:events';
import inquirer from 'inquirer';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const emitter = new EventEmitter();

function getCode() {
  const bundlePath = path.resolve(__dirname, '../dist/rrweb.umd.js');
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

        (async () => {
          function loadScript(code) {
            const s = document.createElement('script');
            let r = false;
            s.type = 'text/javascript';
            s.innerHTML = code;
            if (document.head) {
              document.head.append(s);
            } else {
              requestAnimationFrame(() => {
                document.head.append(s);
              });
            }
          }
          loadScript(rrwebCode);

          win.events = [];
          rrweb.record({
            emit: (event) => {
              win.events.push(event);
              win._replLog(event);
            },
            plugins: [],
            recordCanvas: true,
            recordCrossOriginIframes: true,
            collectFonts: true,
          });
        })();
      }, code);
    } catch (e) {
      console.error('failed to inject recording script:', e);
    }
  }

  await start('https://react-redux.realworld.io');

  const fakeGoto = async (page, url) => {
    const intercept = async (request) => {
      await request.respond({
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

  async function start(defaultURL) {
    events = [];
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

    console.log(`Going to open ${url}...`);
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
    const browser = await puppeteer.launch({
      headless: false,
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
    const page = await browser.newPage();

    await page.exposeFunction('_replLog', (event) => {
      events.push(event);
    });

    page.on('framenavigated', async (frame) => {
      await injectRecording(frame);
    });

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 300000,
    });

    emitter.once('done', async (shouldReplay) => {
      const pages = await browser.pages();
      await Promise.all(pages.map((page) => page.close()));
      await browser.close();
      if (shouldReplay) {
        await replay(url, shouldReplay === 'replayWithFakeURL');
      }
    });
  }

  async function replay(url, useSpoofedUrl) {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: {
        width: 1600,
        height: 900,
      },
      args: ['--start-maximized', '--no-sandbox'],
    });
    const page = await browser.newPage();
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
    const fileName = `replay_${time}.html`;
    const content = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Record @${time}</title>
    <link rel="stylesheet" href="../dist/style.css" />
  </head>
  <body>
    <script src="../dist/rrweb.umd.js"></script>
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
