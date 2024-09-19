import path from 'path';
import config from '../../vite.config.default';

export default config(path.resolve(__dirname, 'src/index.ts'), 'rrwebUtils');
