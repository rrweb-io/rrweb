import config from '../../vite.config.default';

export default config(
  {
    // rrweb: 'src/index.ts',
    'rrweb-record': 'src/entries/record.ts',
    'rrweb-replay': 'src/entries/replay.ts',
  },
  'rrweb',
  // { outputDir: 'dist/alt' },
  { outputDir: 'dist' },
);
