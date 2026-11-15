import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vm from 'vm';
import { installClock } from '../src/clock';
import exampleEvents from './events/example';

describe('virtual clock', () => {
  it('only runs timers and animation frames when advanced', async () => {
    type Page = {
      window: Page;
      performance: { now(): number };
      setTimeout(fn: () => void, ms: number): void;
      requestAnimationFrame(fn: (time: number) => void): void;
      __clock: { advance(ms: number): Promise<void> };
    };
    const page = {
      performance: { now: () => 0 },
      setTimeout,
    } as unknown as Page;
    page.window = page;
    vm.runInNewContext(`(${installClock.toString()})()`, page);
    const calls: Array<[string, number]> = [];
    page.setTimeout(() => calls.push(['b', page.performance.now()]), 10);
    page.setTimeout(() => calls.push(['a', page.performance.now()]), 5);
    page.requestAnimationFrame((t: number) => calls.push(['raf', t]));
    expect(calls).toEqual([]);
    await page.__clock.advance(16);
    expect(calls).toEqual([
      ['a', 5],
      ['b', 10],
      ['raf', 16],
    ]);
  });
});

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

(hasFfmpeg ? describe : describe.skip)('mp4 output', () => {
  const dir = path.resolve(__dirname, './generated-mp4');
  const input = path.join(dir, 'example.json');
  const speed4 = path.join(dir, 'speed4.json');
  beforeAll(() => {
    fs.outputJsonSync(input, exampleEvents);
    fs.outputJsonSync(speed4, { speed: 4 });
  });
  afterAll(() => fs.remove(dir));

  function render(output: string, args = '') {
    const file = path.join(dir, output);
    execSync(`node ./build/cli.js --input ${input} --output ${file} ${args}`, {
      timeout: 60_000,
    });
    return Number(
      execSync(
        `ffprobe -v error -count_frames -show_entries stream=nb_read_frames -of default=nw=1:nk=1 ${file}`,
      ),
    );
  }

  it('renders every frame at the requested fps', () => {
    // 300ms of events plus the replayer's 50ms finish buffer
    expect(render('1x.mp4', '--fps 60')).toBeGreaterThanOrEqual(18);
  });

  it('plays faster without dropping frames', () => {
    expect(render('4x.mp4', `--fps 60 --config ${speed4}`)).toBeLessThan(12);
  });
});
