const { transformToVideo } = require('../build');
(async () => {
  const config = JSON.parse(process.argv[2]);
  const start = performance.now();
  await transformToVideo(config);
  console.log(
    JSON.stringify({
      elapsedMs: performance.now() - start,
      nodeMaxRssKiB: process.resourceUsage().maxRSS,
      chromiumPath: config.browserPath || 'Playwright default headless shell',
    }),
  );
})().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
