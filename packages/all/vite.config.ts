import path from 'path';
import config from '../../vite.config.default';

// Keep UMD global name 'rrweb' (tests expect window.rrweb.*) but emit artifact filenames 'all.*'.
export default config(path.resolve(__dirname, 'src/index.ts'), 'rrweb', {
  fileName: 'all',
});
