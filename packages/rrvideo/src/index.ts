import * as fs from 'fs-extra';
import * as path from 'path';
import { chromium } from 'playwright';
import { EventType, eventWithTime } from '@saola.ai/rrweb-types';
import type Player from '@saola.ai/rrweb-player';

const rrwebScriptPath = path.resolve(
  require.resolve('rrweb-player'),
  '../../dist/rrweb-player.umd.cjs',
);
const rrwebStylePath = path.resolve(rrwebScriptPath, '../style.css');
const rrwebRaw = fs.readFileSync(rrwebScriptPath, 'utf-8');
const rrwebStyle = fs.readFileSync(rrwebStylePath, 'utf-8');
// The max valid scale value for the scaling method which can improve the video quality.
const MaxScaleValue = 2.5;

type RRvideoConfig = {
  input: string;
  output?: string;
  headless?: boolean;
  // A number between 0 and 1. The higher the value, the better the quality of the video.
  resolutionRatio?: number;
  // A callback function that will be called when the progress of the replay is updated.
  onProgressUpdate?: (percent: number) => void;
  rrwebPlayer?: Omit<
    ConstructorParameters<typeof Player>[0]['props'],
    'events'
  >;
};

const defaultConfig: Required<RRvideoConfig> = {
  input: '',
  output: 'rrvideo-output.webm',
  headless: true,
  // A good trade-off value between quality and file size.
  resolutionRatio: 0.8,
  onProgressUpdate: () => {
    //
  },
  rrwebPlayer: {},
};

function getHtml(events: Array<eventWithTime>, config?: RRvideoConfig): string {
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
      const userConfig = ${JSON.stringify(config?.rrwebPlayer || {})};
      window.replayer = new rrwebPlayer.Player({
        target: document.body,
        width: userConfig.width,
        height: userConfig.height,
        props: {
          ...userConfig,
          events,
          showController: false,          
        },
      });
      window.replayer.addEventListener('finish', () => window.onReplayFinish());
      window.replayer.addEventListener('ui-update-progress', (payload)=> window.onReplayProgressUpdate
      (payload));
      window.replayer.addEventListener('resize',()=>document.querySelector('.replayer-wrapper').style.transform = 'scale(${
        (config?.resolutionRatio ?? 1) * MaxScaleValue
      }) translate(-50%, -50%)');
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
  if (config.resolutionRatio > 1) config.resolutionRatio = 1; // The max value is 1.

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
  // Use the scaling method to improve the video quality.
  const scaledViewport = {
    width: Math.round(
      maxViewport.width * (config.resolutionRatio ?? 1) * MaxScaleValue,
    ),
    height: Math.round(
      maxViewport.height * (config.resolutionRatio ?? 1) * MaxScaleValue,
    ),
  };
  Object.assign(config.rrwebPlayer, scaledViewport);
  const browser = await chromium.launch({
    headless: config.headless,
  });
  const context = await browser.newContext({
    viewport: scaledViewport,
    recordVideo: {
      dir: defaultVideoDir,
      size: scaledViewport,
    },
  });
  const page = await context.newPage();
  await page.goto('about:blank');
  await page.exposeFunction(
    'onReplayProgressUpdate',
    (data: { payload: number }) => {
      config.onProgressUpdate(data.payload);
    },
  );

  // Wait for the replay to finish
  await new Promise<void>(
    (resolve) =>
      void page
        .exposeFunction('onReplayFinish', () => resolve())
        .then(() => page.setContent(getHtml(events, config))),
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
