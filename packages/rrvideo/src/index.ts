import * as fs from 'fs-extra';
import * as path from 'path';
import { chromium } from 'playwright';
import { EventType, eventWithTime } from '@rrweb/types';
import type { RRwebPlayerOptions } from 'rrweb-player';

const rrwebScriptPath = path.resolve(
  require.resolve('rrweb-player'),
  '../../dist/index.js',
);
const rrwebStylePath = path.resolve(rrwebScriptPath, '../style.css');
const rrwebRaw = fs.readFileSync(rrwebScriptPath, 'utf-8');
const rrwebStyle = fs.readFileSync(rrwebStylePath, 'utf-8');

type RRvideoConfig = {
  input: string;
  output?: string;
  headless?: boolean;
  rrwebPlayer?: Omit<RRwebPlayerOptions['props'], 'events'>;
};

const defaultConfig: Required<RRvideoConfig> = {
  input: '',
  output: 'rrvideo-output.webm',
  headless: true,
  rrwebPlayer: {},
};

function getHtml(
  events: Array<eventWithTime>,
  config?: Omit<RRwebPlayerOptions['props'], 'events'>,
): string {
  return `
<html>
  <head>
  <style>${rrwebStyle}</style>
  <style>html, body {padding: 0; border: none; margin: 0;}</style>
  </head>
  <body>
    <script>
      ${rrwebRaw};
      /*<!--*/
      const events = ${JSON.stringify(events).replace(
        /<\/script>/g,
        '<\\/script>',
      )};
      /*-->*/
      const userConfig = ${JSON.stringify(config || {})};
      window.replayer = new rrwebPlayer({
        target: document.body,
        props: {
          ...userConfig,
          events,
          showController: false,
        },
      });
      window.replayer.addEventListener('finish', () => window.onReplayFinish());
    </script>
  </body>
</html>
`;
}

/**
 * Preprocess all events to get a maximum view port size.
 */
function getMaxViewport(events: eventWithTime[]) {
  let maxWidth = 0,
    maxHeight = 0;
  events.forEach((event) => {
    if (event.type !== EventType.Meta) return;
    if (event.data.width > maxWidth) maxWidth = event.data.width;
    if (event.data.height > maxHeight) maxHeight = event.data.height;
  });
  return {
    width: maxWidth,
    height: maxHeight,
  };
}

export async function transformToVideo(options: RRvideoConfig) {
  const defaultVideoDir = '__rrvideo__temp__';
  const config = { ...defaultConfig };
  if (!options.input) throw new Error('input is required');
  // If the output is not specified or undefined, use the default value.
  if (!options.output) delete options.output;
  Object.assign(config, options);
  const eventsPath = path.isAbsolute(config.input)
    ? config.input
    : path.resolve(process.cwd(), config.input);
  const outputPath = path.isAbsolute(config.output)
    ? config.output
    : path.resolve(process.cwd(), config.output);
  const events = JSON.parse(
    fs.readFileSync(eventsPath, 'utf-8'),
  ) as eventWithTime[];

  // Make the browser viewport fit the player size.
  const maxViewport = getMaxViewport(events);
  Object.assign(config.rrwebPlayer, maxViewport);
  const browser = await chromium.launch({
    headless: config.headless,
  });
  const context = await browser.newContext({
    viewport: maxViewport,
    recordVideo: {
      dir: defaultVideoDir,
      size: maxViewport,
    },
  });
  const page = await context.newPage();
  await page.goto('about:blank');
  // Wait for the replay to finish
  await new Promise<void>(
    (resolve) =>
      void page
        .exposeFunction('onReplayFinish', () => resolve())
        .then(() => page.setContent(getHtml(events, config.rrwebPlayer))),
  );
  const videoPath = (await page.video()?.path()) || '';
  const cleanFiles = async (videoPath: string) => {
    await fs.remove(videoPath);
    if ((await fs.readdir(defaultVideoDir)).length === 0) {
      await fs.remove(defaultVideoDir);
    }
  };
  await context.close();
  await Promise.all([
    fs
      .move(videoPath, outputPath, { overwrite: true })
      .catch((e) => {
        console.error(
          "Can't create video file. Please check the output path.",
          e,
        );
      })
      .finally(() => void cleanFiles(videoPath)),
    browser.close(),
  ]);
  return outputPath;
}
