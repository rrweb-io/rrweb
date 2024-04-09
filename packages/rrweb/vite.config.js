import config from '../../vite.config.default';

export default config(
  {
    rrweb: 'src/index.ts',
    'rrweb-record': 'src/record/index.ts',
    'rrweb-replay': 'src/replay/index.ts',
  },
  'rrweb',
);
