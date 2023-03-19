import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import puppeteer from "puppeteer";
import type { eventWithTime } from "rrweb/typings/types";
import type { RRwebPlayerOptions } from "rrweb-player";
import type { Page, Browser } from "puppeteer";

const rrwebScriptPath = path.resolve(
  require.resolve("rrweb-player"),
  "../../dist/index.js"
);
const rrwebStylePath = path.resolve(rrwebScriptPath, "../style.css");
const rrwebRaw = fs.readFileSync(rrwebScriptPath, "utf-8");
const rrwebStyle = fs.readFileSync(rrwebStylePath, "utf-8");
interface Config {
  // start playback delay time
  startDelayTime?: number,
} 

function getHtml(
  events: Array<eventWithTime>,
  config?: Omit<RRwebPlayerOptions["props"] & Config, "events">
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
        "<\\/script>"
      )};
      /*-->*/
      const userConfig = ${config ? JSON.stringify(config) : {}};
      window.replayer = new rrwebPlayer({
        target: document.body,
        props: {
          events,
          showController: false,
          autoPlay: false, // autoPlay off by default
          ...userConfig
        },
      }); 
      
      window.replayer.addEventListener('finish', () => window.onReplayFinish());
      let time = userConfig.startDelayTime || 1000 // start playback delay time, default 1000ms
      let start = fn => {
        setTimeout(() => {
          fn()
        }, time)
      }
      // It is recommended not to play auto by default. If the speed is not 1, the page block in the early stage of autoPlay will be blank
      if (userConfig.autoPlay) {
        start = fn => {
          fn()
        };
      }
      start(() => {
        window.onReplayStart();
        window.replayer.play();
      })
    </script>
  </body>
</html>
`;
}

type RRvideoConfig = {
  fps: number;
  headless: boolean;
  input: string;
  cb: (file: string, error: null | Error) => void;
  output: string;
  rrwebPlayer: Omit<RRwebPlayerOptions["props"] & Config, "events">;
};

const defaultConfig: RRvideoConfig = {
  fps: 15,
  headless: true,
  input: "",
  cb: () => {},
  output: "rrvideo-output.mp4",
  rrwebPlayer: {},
};

class RRvideo {
  private browser!: Browser;
  private page!: Page;
  private state: "idle" | "recording" | "closed" = "idle";
  private config: RRvideoConfig;

  constructor(config?: Partial<RRvideoConfig> & { input: string }) {
    this.config = {
      fps: config?.fps || defaultConfig.fps,
      headless: config?.headless || defaultConfig.headless,
      input: config?.input || defaultConfig.input,
      cb: config?.cb || defaultConfig.cb,
      output: config?.output || defaultConfig.output,
      rrwebPlayer: config?.rrwebPlayer || defaultConfig.rrwebPlayer,
    };
  }

  public async init() {
    try {
      this.browser = await puppeteer.launch({
        headless: this.config.headless,
      });
      this.page = await this.browser.newPage();
      await this.page.goto("about:blank");

      await this.page.exposeFunction("onReplayStart", () => {
        this.startRecording();
      });

      await this.page.exposeFunction("onReplayFinish", () => {
        this.finishRecording();
      });

      const eventsPath = path.isAbsolute(this.config.input)
        ? this.config.input
        : path.resolve(process.cwd(), this.config.input);
      const events = JSON.parse(fs.readFileSync(eventsPath, "utf-8"));

      await this.page.setContent(getHtml(events, this.config.rrwebPlayer));
    } catch (error) {
      this.config.cb("", error);
    }
  }

  private async startRecording() {
    this.state = "recording";
    let wrapperSelector = ".replayer-wrapper";
    if (this.config.rrwebPlayer.width && this.config.rrwebPlayer.height) {
      wrapperSelector = ".rr-player";
    }
    const wrapperEl = await this.page.$(wrapperSelector);

    if (!wrapperEl) {
      throw new Error("failed to get replayer element");
    }

    // start ffmpeg
    const args = [
      // fps
      "-framerate",
      this.config.fps.toString(),
      // input
      "-f",
      "image2pipe",
      "-i",
      "-",
      // output
      "-y",
      this.config.output,
    ];

    const ffmpegProcess = spawn("ffmpeg", args);
    ffmpegProcess.stderr.setEncoding("utf-8");
    ffmpegProcess.stderr.on("data", console.log);

    let processError: Error | null = null;

    const timer = setInterval(async () => {
      if (this.state === "recording" && !processError) {
        try {
          const buffer = await wrapperEl.screenshot({
            encoding: "binary",
          });
          ffmpegProcess.stdin.write(buffer);
        } catch (error) {
          // ignore
        }
      } else {
        clearInterval(timer);
        if (this.state === "closed" && !processError) {
          ffmpegProcess.stdin.end();
        }
      }
    }, 1000 / this.config.fps);

    const outputPath = path.isAbsolute(this.config.output)
      ? this.config.output
      : path.resolve(process.cwd(), this.config.output);
    ffmpegProcess.on("close", () => {
      if (processError) {
        return;
      }
      this.config.cb(outputPath, null);
    });
    ffmpegProcess.on("error", (error) => {
      if (processError) {
        return;
      }
      processError = error;
      this.config.cb(outputPath, error);
    });
    ffmpegProcess.stdin.on("error", (error) => {
      if (processError) {
        return;
      }
      processError = error;
      this.config.cb(outputPath, error);
    });
  }

  private async finishRecording() {
    this.state = "closed";
    await this.browser.close();
  }
}

export function transformToVideo(
  config: Partial<RRvideoConfig> & { input: string }
): Promise<string> {
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
    rrvideo.init();
  });
}
