# Compare frame capture modes

Build from the repository root:

```sh
yarn install --frozen-lockfile
yarn turbo run prepublish --filter=rrweb-player...
yarn workspace rrvideo build
```

Install FFmpeg and Chromium, then run:

```sh
yarn workspace rrvideo exec playwright install chromium
node packages/rrvideo/benchmark/run.cjs --output /tmp/rrvideo-results
```

The runner compares per-frame seeking and screenshots, incremental
clock/screenshot capture, and compositor capture. It runs compositor only on
Linux/Windows. On macOS, the report records that mode as skipped.

Defaults: two local two-second 640×360 fixtures, 30 fps, JPEG quality 90, CRF 18, veryfast
preset, three repetitions, and both 0 ms and 40 ms artificial capture delays.
Every run uses a new browser and encoder. Mode order rotates between repetitions;
there is no warmup. Use `--repetitions 1 --delays 0` for a smoke test. Use
`--input /path/to/events.json` for a representative recording. A run has a
three-minute wall-clock limit and failure terminates its process group on Unix.

`report.md` summarizes the measurements. `report.json` includes elapsed conversion time, video metadata and size,
process-tree RSS sampled every 100 ms, and decoded frame hashes. RSS is an
approximation and may double-count shared pages. Frame comparisons measure repeat
and delay sensitivity within each mode. They do not establish that the pixels
match the original website. Inspect the MP4s to assess visual fidelity, especially
CSS animation: a frozen animation can produce repeatable hashes while being wrong.
Synthetic fixtures are regression probes, not evidence of production throughput.

## Native Linux container on macOS

Build the JavaScript packages above first. Send only the built packages to Docker:

```sh
tar -czf - packages/rrvideo/build packages/rrvideo/benchmark \
  packages/rrweb-player/package.json packages/rrweb-player/dist \
  packages/types/package.json packages/types/dist | \
  docker build -t rrvideo-compare -f packages/rrvideo/benchmark/Dockerfile -
mkdir -p /tmp/rrvideo-linux-results
docker run --rm --init --shm-size=1g \
  -v /tmp/rrvideo-linux-results:/results rrvideo-compare
```

No `--platform` override is used: an Apple Silicon Mac runs ARM64 Linux. Keep
architecture, CPU allocation, browser version, viewport, encoder settings, and
host load the same between modes. Compare all modes within that container;
do not compare macOS timing against Linux timing as if only the backend changed.
For an x86 production target, run the workflow on a native x86 Linux runner.

The `rrvideo capture comparison` GitHub Actions workflow runs tests and a one-repeat, zero-delay smoke
comparison on pull requests, and the full benchmark on manual dispatch and uploads the report and videos even when a run fails.
The compositor protocol is experimental; browser upgrades require this check.
