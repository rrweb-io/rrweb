import path from 'path';
import config from '../../vite.config.default';

export default config(
  {
    packer: path.resolve(__dirname, 'src/index.ts'),
    pack: path.resolve(__dirname, 'src/pack.ts'),
    unpack: path.resolve(__dirname, 'src/unpack.ts'),
  },
  'rrwebPacker',
);
