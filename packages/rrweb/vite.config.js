import config from '../../vite.config.default';

export default config(
  {
    rrweb: 'src/index.ts',
    'rrweb-record': 'src/record/index.ts',
    'rrweb-replay': 'src/replay/index.ts',
    'rrweb-record-pack': 'src/entries/record-pack.ts',
    'rrweb-replay-unpack': 'src/entries/replay-unpack.ts',
    'rrweb-all': 'src/entries/all.ts',
  },
  'rrweb',
);
