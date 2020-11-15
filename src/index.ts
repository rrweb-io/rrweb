import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import puppeteer from "puppeteer";
import type { eventWithTime } from "rrweb/typings/types";
import type { RRwebPlayerOptions } from "rrweb-player";

const rrwebScriptPath = path.resolve(
  require.resolve("rrweb-player"),
  "../../dist/index.js"
);
const rrwebStylePath = path.resolve(rrwebScriptPath, "../style.css");
const rrwebRaw = fs.readFileSync(rrwebScriptPath, "utf-8");
const rrwebStyle = fs.readFileSync(rrwebStylePath, "utf-8");

function getHtml(
  events: Array<eventWithTime>,
  config?: Omit<RRwebPlayerOptions["props"], "events">
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
          ...userConfig
        },
      });
      window.onReplayStart();
      window.replayer.play();
      window.replayer.addEventListener('finish', () => window.onReplayFinish());
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
  rrwebPlayer: Omit<RRwebPlayerOptions["props"], "events">;
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
  private browser!: puppeteer.Browser;
  private page!: puppeteer.Page;
  private state: "idle" | "recording" | "closed" = "idle";
  private config: RRvideoConfig;

  constructor(config?: Partial<RRvideoConfig> & { input: string }) {
    this.config = Object.assign({}, defaultConfig, config);
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
