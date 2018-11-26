/* tslint:disable: no-console */

import * as fs from 'fs';
import * as path from 'path';
import * as EventEmitter from 'events';
import * as readline from 'readline';
import * as puppeteer from 'puppeteer';
import { eventWithTime } from '../src/types';

const emitter = new EventEmitter();

function getCode(): string {
  const bundlePath = path.resolve(__dirname, '../dist/rrweb.min.js');
  return fs.readFileSync(bundlePath, 'utf8');
}

function safeStringify(obj: Object): string {
  return JSON.stringify(obj)
    .replace(/&/g, '&amp')
    .replace(/</g, '&lt')
    .replace(/>/g, '&gt');
}

(async () => {
  const code = getCode();

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
      rl.write('y');
    },
  );

  emitter.once('done', async () => {
    rl.question(
      `Enter 'y' to persistently store these recorded events: `,
      async answer => {
        if (answer.toLowerCase() === 'y') {
          saveEvents();
        }
      },
    );
  });

  async function record(url: string) {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: {
        width: 1600,
        height: 900,
      },
      args: ['--start-maximized'],
    });
    const page = await browser.newPage();
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
    });

    await page.exposeFunction('_replLog', (event: eventWithTime) => {
      events.push(event);
    });
    await page.evaluate(`;${code}
      window.__IS_RECORDING__ = true
      rrweb.record({
        emit: event => window._replLog(event)
      });
    `);
    page.on('framenavigated', async () => {
      const isRecording = await page.evaluate('window.__IS_RECORDING__');
      if (!isRecording) {
        await page.evaluate(`;${code}
          window.__IS_RECORDING__ = true
          rrweb.record({
            emit: event => window._replLog(event)
          });
        `);
      }
    });

    emitter.once('done', async () => {
      await browser.close();
      console.log(`Recorded ${events.length} events`);
      replay();
    });
  }

  async function replay() {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: {
        width: 1600,
        height: 900,
      },
      args: ['--start-maximized'],
    });
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addStyleTag({
      path: path.resolve(__dirname, '../dist/rrweb.min.css'),
    });
    await page.evaluate(`${code}
      const events = ${safeStringify(events)};
      const replayer = new rrweb.Replayer(events);
      replayer.play();
    `);
  }

  const tempFolder = path.join(__dirname, '../temp');
  function saveEvents() {
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
    <link rel="stylesheet" href="../dist/rrweb.min.css" />
  </head>
  <body>
    <script src="../dist/rrweb.min.js"></script>
    <script>
      const data = ${safeStringify({ events })}
      const replayer = new rrweb.Replayer(data.events);
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
    .on('uncaughtException', error => {
      console.error(error);
    })
    .on('unhandledRejection', error => {
      console.error(error);
    });
})();
