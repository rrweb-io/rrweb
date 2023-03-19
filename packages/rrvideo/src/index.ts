import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import type { Page, Browser } from 'puppeteer';
import type { eventWithTime } from '@rrweb/types';
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
  fps?: number;
  cb?: (file: string, error: null | Error) => void;
  // start playback delay time
  startDelayTime?: number;
  rrwebPlayer?: Omit<RRwebPlayerOptions['props'], 'events'>;
};

const defaultConfig: Required<RRvideoConfig> = {
  input: '',
  output: 'rrvideo-output.mp4',
  headless: true,
  fps: 15,
  cb: () => {
    //
  },
  startDelayTime: 1000,
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
          autoPlay: false, // autoPlay off by default
        },
      });
      window.replayer.addEventListener('finish', () => window.onReplayFinish());
    </script>
  </body>
</html>
`;
}

export class RRvideo {
  private browser!: Browser;
  private page!: Page;
  private state: 'idle' | 'recording' | 'closed' = 'idle';
  private config = {
    ...defaultConfig,
  };

  constructor(config: RRvideoConfig) {
    this.updateConfig(config);
  }

  public async transform() {
    try {
      this.browser = await puppeteer.launch({
        headless: this.config.headless,
      });
      this.page = await this.browser.newPage();
      await this.page.goto('about:blank');

      await this.page.exposeFunction('onReplayFinish', () => {
        void this.finishRecording();
      });

      const eventsPath = path.isAbsolute(this.config.input)
        ? this.config.input
        : path.resolve(process.cwd(), this.config.input);
      const events = JSON.parse(
        fs.readFileSync(eventsPath, 'utf-8'),
      ) as eventWithTime[];

      await this.page.setContent(getHtml(events, this.config.rrwebPlayer));

      setTimeout(() => {
        void this.startRecording().then(() => {
          return this.page.evaluate('window.replayer.play();');
        });
      }, this.config.startDelayTime);
    } catch (error) {
      this.config.cb('', error as Error);
    }
  }

  public updateConfig(config: RRvideoConfig) {
    if (!config.input) throw new Error('input is required');
    config.output = config.output || defaultConfig.output;
    Object.assign(this.config, defaultConfig, config);
  }

  private async startRecording() {
    this.state = 'recording';
    let wrapperSelector = '.replayer-wrapper';
    if (this.config.rrwebPlayer.width && this.config.rrwebPlayer.height) {
      wrapperSelector = '.rr-player';
    }
    const wrapperEl = await this.page.$(wrapperSelector);

    if (!wrapperEl) {
      throw new Error('failed to get replayer element');
    }

    // start ffmpeg
    const args = [
      // fps
      '-framerate',
      this.config.fps.toString(),
      // input
      '-f',
      'image2pipe',
      '-i',
      '-',
      // output
      '-y',
      this.config.output,
    ];

    const ffmpegProcess = spawn('ffmpeg', args);
    ffmpegProcess.stderr.setEncoding('utf-8');
    ffmpegProcess.stderr.on('data', console.log);

    let processError: Error | null = null;

    const timer = setInterval(() => {
      if (this.state === 'recording' && !processError) {
        void wrapperEl
          .screenshot({
            encoding: 'binary',
          })
          .then((buffer) => ffmpegProcess.stdin.write(buffer))
          .catch();
      } else {
        clearInterval(timer);
        if (this.state === 'closed' && !processError) {
          ffmpegProcess.stdin.end();
        }
      }
    }, 1000 / this.config.fps);

    const outputPath = path.isAbsolute(this.config.output)
      ? this.config.output
      : path.resolve(process.cwd(), this.config.output);
    ffmpegProcess.on('close', () => {
      if (processError) {
        return;
      }
      this.config.cb(outputPath, null);
    });
    ffmpegProcess.on('error', (error) => {
      if (processError) {
        return;
      }
      processError = error;
      this.config.cb(outputPath, error);
    });
    ffmpegProcess.stdin.on('error', (error) => {
      if (processError) {
        return;
      }
      processError = error;
      this.config.cb(outputPath, error);
    });
  }

  private async finishRecording() {
    this.state = 'closed';
    await this.browser.close();
  }
}

export function transformToVideo(config: RRvideoConfig): Promise<string> {
  return new Promise((resolve, reject) => {
    const rrvideo = new RRvideo({
      ...config,
      cb(file, error) {
        if (error) {
          return reject(error);
        }
        resolve(file);
      },
    });
    void rrvideo.transform();
  });
}
