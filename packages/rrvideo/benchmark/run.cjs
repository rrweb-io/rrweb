const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');
let fixtures = require('./fixtures.cjs');
const argv = require('minimist')(process.argv.slice(2));
if (argv.input)
  fixtures = {
    recording: JSON.parse(fs.readFileSync(path.resolve(argv.input), 'utf8')),
  };
const out = path.resolve(argv.output || 'benchmark-results');
const repetitions = Number(argv.repetitions || 3);
const fps = Number(argv.fps || 30);
const delays = String(argv.delays ?? '0,40')
  .split(',')
  .map(Number);
if (
  !Number.isInteger(repetitions) ||
  repetitions < 1 ||
  !Number.isFinite(fps) ||
  fps <= 0 ||
  delays.some((d) => !Number.isFinite(d) || d < 0)
)
  throw new Error('Invalid benchmark arguments');
fs.mkdirSync(out, { recursive: true });
const modes = [
  { name: 'seek-baseline', capture: 'ffmpeg', replayMode: 'seek' },
  { name: 'incremental', capture: 'ffmpeg', replayMode: 'incremental' },
  ...(process.platform === 'linux' || process.platform === 'win32'
    ? [{ name: 'compositor', capture: 'compositor', replayMode: 'incremental' }]
    : []),
];
function command(binary, args) {
  const result = spawnSync(binary, args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error(result.stderr || String(result.error));
  return result.stdout;
}
function decodedHashes(file) {
  return command('ffmpeg', ['-v', 'error', '-i', file, '-f', 'framemd5', '-'])
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(',').pop().trim());
}
function processTreeRss(pid) {
  if (process.platform === 'win32') return null;
  const result = spawnSync('ps', ['-axo', 'pid=,ppid=,rss='], {
    encoding: 'utf8',
  });
  if (result.status !== 0) return null;
  const rows = result.stdout
    .trim()
    .split('\n')
    .map((line) => line.trim().split(/\s+/).map(Number));
  const children = new Set([pid]);
  for (let changed = true; changed; ) {
    changed = false;
    for (const [child, parent] of rows)
      if (children.has(parent) && !children.has(child)) {
        children.add(child);
        changed = true;
      }
  }
  return rows.reduce(
    (sum, [child, , rss]) => sum + (children.has(child) ? rss : 0),
    0,
  );
}
async function run(config) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(__dirname, 'worker.cjs'), JSON.stringify(config)],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: process.platform !== 'win32',
      },
    );
    let stdout = '',
      stderr = '',
      peak = null;
    const sample = setInterval(() => {
      const rss = processTreeRss(child.pid);
      if (rss !== null) peak = Math.max(peak || 0, rss);
    }, 100);
    const deadline = setTimeout(() => {
      if (process.platform === 'win32')
        spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']);
      else {
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch {}
      }
    }, 180000);
    child.stdout.on('data', (data) => {
      stdout = (stdout + data).slice(-65536);
    });
    child.stderr.on('data', (data) => {
      stderr = (stderr + data).slice(-65536);
    });
    const cleanup = () => {
      clearInterval(sample);
      clearTimeout(deadline);
    };
    child.on('error', (error) => {
      cleanup();
      reject(error);
    });
    child.on('close', (code) => {
      cleanup();
      if (code !== 0)
        return reject(new Error(stderr || `Worker exited with ${code}`));
      try {
        resolve({
          ...JSON.parse(stdout.trim().split('\n').pop()),
          sampledProcessTreePeakRssKiB: peak,
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}
(async () => {
  const report = {
    environment: {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      cpus: os.cpus().length,
      cpu: os.cpus()[0]?.model,
      playwright: require('playwright/package.json').version,
      ffmpeg: command('ffmpeg', ['-version']).split('\n')[0],
      fps,
      repetitions,
      delays,
      memory:
        'Process-tree RSS sampled every 100ms; shared pages may be counted more than once.',
      warmup:
        'None. Each run launches a fresh browser and encoder; mode order rotates each repetition.',
    },
    skipped:
      process.platform === 'darwin'
        ? ['compositor requires Linux/Windows']
        : [],
    runs: [],
    comparisons: [],
  };
  for (const [fixture, events] of Object.entries(fixtures)) {
    const input = path.join(out, `${fixture}.json`);
    fs.writeFileSync(input, JSON.stringify(events));
    for (let repetition = 0; repetition < repetitions; repetition++) {
      for (const frameDelayMs of delays) {
        for (let m = 0; m < modes.length; m++) {
          const mode = modes[(m + repetition) % modes.length];
          const id = `${fixture}-${mode.name}-delay${frameDelayMs}-run${repetition}`;
          const output = path.join(out, `${id}.mp4`);
          const record = {
            id,
            fixture,
            mode: mode.name,
            frameDelayMs,
            repetition,
          };
          try {
            Object.assign(
              record,
              await run({
                input,
                output,
                capture: mode.capture,
                replayMode: mode.replayMode,
                fps,
                quality: 90,
                crf: 18,
                x264Preset: 'veryfast',
                resolutionRatio: 1,
                pixelRatio: 1,
                frameDelayMs,
                browserPath: argv.browserPath,
              }),
            );
            record.hashes = decodedHashes(output);
            record.probe = JSON.parse(
              command('ffprobe', [
                '-v',
                'error',
                '-select_streams',
                'v:0',
                '-count_frames',
                '-show_entries',
                'stream=width,height,r_frame_rate,nb_read_frames,duration',
                '-of',
                'json',
                output,
              ]),
            ).streams[0];
            const expectedFrames = Math.max(
              1,
              Math.round(
                ((events[events.length - 1].timestamp - events[0].timestamp) /
                  1000) *
                  fps,
              ),
            );
            if (record.hashes.length !== expectedFrames)
              throw new Error(
                `Expected ${expectedFrames} frames, received ${record.hashes.length}`,
              );
            record.outputBytes = fs.statSync(output).size;
          } catch (error) {
            record.error = error.message;
            process.exitCode = 1;
          }
          report.runs.push(record);
          console.log(
            `${id}: ${
              record.error ||
              `${Math.round(record.elapsedMs)}ms, ${
                record.hashes.length
              } frames`
            }`,
          );
          fs.writeFileSync(
            path.join(out, 'report.json'),
            JSON.stringify(report, null, 2),
          );
        }
      }
    }
  }
  for (const record of report.runs.filter((r) => !r.error)) {
    const reference = report.runs.find(
      (r) =>
        !r.error &&
        r.fixture === record.fixture &&
        r.mode === record.mode &&
        r.frameDelayMs === 0 &&
        r.repetition === 0,
    );
    if (reference)
      report.comparisons.push({
        run: record.id,
        reference: reference.id,
        differingFrames: record.hashes.filter(
          (hash, i) => hash !== reference.hashes[i],
        ).length,
        totalFrames: record.hashes.length,
      });
  }
  report.summary = [];
  for (const fixture of Object.keys(fixtures)) {
    for (const mode of modes) {
      for (const delay of delays) {
        const trials = report.runs.filter(
          (r) =>
            r.fixture === fixture &&
            r.mode === mode.name &&
            r.frameDelayMs === delay,
        );
        const successful = trials.filter((r) => !r.error);
        const timings = successful
          .map((r) => r.elapsedMs)
          .sort((a, b) => a - b);
        const middle = Math.floor(timings.length / 2);
        report.summary.push({
          fixture,
          mode: mode.name,
          frameDelayMs: delay,
          medianElapsedMs: timings.length
            ? (timings[middle] +
                timings[Math.floor((timings.length - 1) / 2)]) /
              2
            : null,
          sampledPeakRssKiB:
            successful.length &&
            successful.every((r) => r.sampledProcessTreePeakRssKiB !== null)
              ? Math.max(
                  ...successful.map((r) => r.sampledProcessTreePeakRssKiB),
                )
              : null,
          failures: trials.length - successful.length,
          maxDifferingFrames: Math.max(
            0,
            ...report.comparisons
              .filter((c) => successful.some((r) => r.id === c.run))
              .map((c) => c.differingFrames),
          ),
        });
      }
    }
  }
  const lines = [
    '# rrvideo capture comparison',
    '',
    `${report.environment.platform}/${report.environment.arch}, ${fps} fps, ${repetitions} repetitions.`,
    '',
    '| Fixture | Mode | Delay per frame | Median time | Peak sampled RSS | Failures | Max differing frames |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
    ...report.summary.map(
      (s) =>
        `| ${s.fixture} | ${s.mode} | ${s.frameDelayMs} ms | ${
          s.medianElapsedMs === null
            ? 'n/a'
            : Math.round(s.medianElapsedMs) + ' ms'
        } | ${
          s.sampledPeakRssKiB === null
            ? 'n/a'
            : Math.round(s.sampledPeakRssKiB / 1024) + ' MiB'
        } | ${s.failures} | ${s.maxDifferingFrames} |`,
    ),
    '',
    'Frame differences compare each run with the first undelayed run of the same mode. A frozen animation can be repeatable but incorrect. Inspect videos before choosing a backend. Memory is sampled and may count shared pages more than once.',
  ];
  fs.writeFileSync(path.join(out, 'report.md'), lines.join('\n') + '\n');
  fs.writeFileSync(
    path.join(out, 'report.json'),
    JSON.stringify(report, null, 2),
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
