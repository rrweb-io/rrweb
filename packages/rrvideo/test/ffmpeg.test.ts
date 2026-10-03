import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { buildFfmpegArgs, FfmpegJpegPipe } from '../src/ffmpeg';

function makeJpeg(width: number, height: number): Buffer {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rrvideo-jpeg-'));
  const file = path.join(dir, 'frame.jpg');
  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      `color=c=red:s=${width}x${height}:d=1`,
      '-frames:v',
      '1',
      file,
    ],
    { encoding: 'utf-8' },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || 'ffmpeg jpeg fixture failed');
  }
  const jpeg = fs.readFileSync(file);
  fs.removeSync(dir);
  return jpeg;
}

function probe(file: string): {
  fps: number;
  duration: number;
  width: number;
  height: number;
} {
  const result = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height,r_frame_rate,duration',
      '-of',
      'json',
      file,
    ],
    { encoding: 'utf-8' },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || 'ffprobe failed');
  }
  const parsed = JSON.parse(result.stdout) as {
    streams: Array<{
      width: number;
      height: number;
      r_frame_rate: string;
      duration?: string;
    }>;
  };
  const stream = parsed.streams[0];
  const [num, den] = stream.r_frame_rate.split('/').map(Number);
  return {
    fps: num / den,
    duration: Number(stream.duration),
    width: stream.width,
    height: stream.height,
  };
}

describe('ffmpeg jpeg pipe', () => {
  it('builds a constant-fps libx264 mp4 command', () => {
    expect(
      buildFfmpegArgs({
        fps: 60,
        outputPath: '/tmp/out.mp4',
        crf: 18,
        preset: 'veryfast',
      }),
    ).toEqual([
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'image2pipe',
      '-vcodec',
      'mjpeg',
      '-framerate',
      '60',
      '-i',
      'pipe:0',
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '/tmp/out.mp4',
    ]);
  });

  it('encodes a 60fps mp4 from still frames', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rrvideo-mp4-'));
    const output = path.join(dir, 'out.mp4');
    const jpeg = makeJpeg(320, 240);
    const pipe = new FfmpegJpegPipe({
      fps: 60,
      outputPath: output,
      preset: 'ultrafast',
      crf: 28,
    });
    for (let i = 0; i < 30; i++) {
      await pipe.write(jpeg);
    }
    await pipe.end();
    const info = probe(output);
    expect(info.fps).toBe(60);
    expect(info.width).toBe(320);
    expect(info.height).toBe(240);
    expect(info.duration).toBeCloseTo(0.5, 1);
    fs.removeSync(dir);
  });
});
