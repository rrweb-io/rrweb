/* tslint:disable: no-console */

import * as fs from 'fs';
import * as path from 'path';
import * as EventEmitter from 'events';
import * as inquirer from 'inquirer';
import * as puppeteer from 'puppeteer';
import { eventWithTime } from '../src/types';

const emitter = new EventEmitter();

function getCode(): string {
  const bundlePath = path.resolve(__dirname, '../dist/rrweb.min.js');
  return fs.readFileSync(bundlePath, 'utf8');
}

(async () => {
  const code = getCode();
  let events: eventWithTime[] = [];

  const { url } = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message:
        'Enter the url you want to record, e.g https://react-redux.realworld.io: ',
    },
  ]);

  console.log(`Going to open ${url}...`);
  await record(url);
  console.log('Ready to record. You can do any interaction on the page.');

  const { shouldReplay } = await inquirer.prompt([
    {
      type: 'expand',
      name: 'shouldReplay',
      choices: [
        {
          key: 'y',
          name: 'Replay',
          value: 'replay',
        },
        {
          key: 'n',
          name: 'Exit',
          value: 'exit',
        },
      ],
      default: 'y',
      message: `Once you want to finish the recording, enter 'y' to start replay: `,
    },
  ]);

  if (shouldReplay === 'replay') {
    emitter.emit('done');
    const { shouldStore } = await inquirer.prompt([
      {
        type: 'expand',
        name: 'shouldStore',
        choices: [
          {
            key: 'y',
            name: 'Store',
            value: 'store',
          },
          {
            key: 'n',
            name: 'Exit',
            value: 'exit',
          },
        ],
        default: 'y',
        message: `Enter 'y' to persistently store these recorded events: `,
      },
    ]);

    if (shouldStore === 'store') {
      saveEvents();
    }
  }

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
      const events = ${JSON.stringify(events)};
      const replayer = new rrweb.Replayer(events);
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
    <link rel="stylesheet" href="../dist/rrweb.min.css" />
  </head>
  <body>
    <script src="../dist/rrweb.min.js"></script>
    <script>
      /*<!--*/
      const events = ${JSON.stringify(events).replace(
        /<\/script>/g,
        '<\\/script>',
      )};
      /*-->*/
      const replayer = new rrweb.Replayer(events);
      replayer.play();
    </script>
  </body>
</html>  
    `;
    const savePath = path.resolve(tempFolder, fileName);
    fs.writeFileSync(savePath, content);
    console.log(`Saved at ${savePath}`);
    process.exit();
  }

  process
    .on('uncaughtException', error => {
      console.error(error);
    })
    .on('unhandledRejection', error => {
      console.error(error);
    });
})();
