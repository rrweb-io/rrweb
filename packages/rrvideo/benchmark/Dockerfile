# Build repository packages on the host before building this image.
FROM node:22-bookworm
WORKDIR /app
RUN npm install --no-save playwright@1.60.0 fs-extra@11 minimist@1 @open-tech-world/cli-progress-bar@2 && \
    npx playwright install --with-deps --only-shell chromium && \
    apt-get update && apt-get install -y --no-install-recommends ffmpeg procps && rm -rf /var/lib/apt/lists/*
COPY packages/rrweb-player/package.json node_modules/rrweb-player/package.json
COPY packages/rrweb-player/dist node_modules/rrweb-player/dist
COPY packages/types/package.json node_modules/@rrweb/types/package.json
COPY packages/types/dist node_modules/@rrweb/types/dist
COPY packages/rrvideo/build build
COPY packages/rrvideo/benchmark benchmark
ENTRYPOINT ["node", "benchmark/run.cjs"]
CMD ["--output", "/results"]
