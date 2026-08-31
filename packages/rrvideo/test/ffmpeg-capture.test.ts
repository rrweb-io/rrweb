import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import exampleEvents from './events/example';

jest.setTimeout(120_000);

function probeFps(file: string): { fps: number; nbFrames: number } {
  const result = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-count_frames',
      '-show_entries',
      'stream=r_frame_rate,nb_read_frames',
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
    streams: Array<{ r_frame_rate: string; nb_read_frames?: string }>;
  };
  const stream = parsed.streams[0];
  const [num, den] = stream.r_frame_rate.split('/').map(Number);
  return {
    fps: num / den,
    nbFrames: Number(stream.nb_read_frames || 0),
  };
}

describe('ffmpeg capture backend', () => {
  const generated = path.resolve(__dirname, './generated-ffmpeg');
  const execOptions = { timeout: 90_000, stdio: 'inherit' as const };

  beforeAll(() => {
    fs.mkdirSync(generated, { recursive: true });
    fs.writeJsonSync(path.join(generated, 'example.json'), exampleEvents, {
      spaces: 2,
    });
  });

  afterAll(async () => {
    await fs.remove(generated);
  });

  it('writes a 60fps mp4 by seeking the replayer instead of Playwright screencast', () => {
    const output = path.join(generated, 'sixty.mp4');
    execSync(
      `node ./build/cli.js --input ${path.join(
        generated,
        'example.json',
      )} --output ${output} --fps 60`,
      execOptions,
    );
    expect(fs.existsSync(output)).toBe(true);
    const info = probeFps(output);
    expect(info.fps).toBe(60);
    expect(info.nbFrames).toBeGreaterThanOrEqual(18);
  });

  it('shortens output duration at 4x without dropping fps', () => {
    const output = path.join(generated, 'four-x.mp4');
    const configFile = path.join(generated, 'speed4.json');
    fs.writeJsonSync(configFile, {
      speed: 4,
      skipInactive: false,
      fps: 60,
      capture: 'ffmpeg',
    });
    execSync(
      `node ./build/cli.js --input ${path.join(
        generated,
        'example.json',
      )} --output ${output} --config ${configFile}`,
      execOptions,
    );
    const info = probeFps(output);
    expect(info.fps).toBe(60);
    expect(info.nbFrames).toBeGreaterThanOrEqual(5);
    expect(info.nbFrames).toBeLessThan(18);
  });

  it('renders two sessions in parallel', () => {
    const outputs = [
      path.join(generated, 'parallel-a.mp4'),
      path.join(generated, 'parallel-b.mp4'),
    ];
    const input = path.join(generated, 'example.json');
    const scriptPath = path.join(generated, 'parallel.js');
    fs.writeFileSync(
      scriptPath,
      `
        const { transformMany } = require(${JSON.stringify(
          path.resolve(__dirname, '../build'),
        )});
        transformMany(
          ${JSON.stringify(outputs)}.map((output) => ({
            input: ${JSON.stringify(input)},
            output,
            capture: 'ffmpeg',
            fps: 30,
            rrwebPlayer: { skipInactive: false, speed: 1 },
          })),
          { concurrency: 2 },
        ).then(() => process.exit(0)).catch((error) => {
          console.error(error);
          process.exit(1);
        });
      `,
    );
    execSync(`node ${JSON.stringify(scriptPath)}`, execOptions);
    outputs.forEach((file) => expect(fs.existsSync(file)).toBe(true));
    expect(probeFps(outputs[0]).fps).toBe(30);
  });
});
