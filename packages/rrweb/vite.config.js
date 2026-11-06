import path from 'path';
import config from '../../vite.config.default';

export default config('src/index.ts', 'rrweb', {
  plugins: [
    {
      name: 'resolve-local-source-entries',
      enforce: 'pre',
      // 从源码构建，避免依赖产物中内联的 utils 产生多份根引用表。
      resolveId(source) {
        if (source === 'rrweb-snapshot')
          return path.resolve(__dirname, '../rrweb-snapshot/src/index.ts');
        if (source === 'rrdom')
          return path.resolve(__dirname, '../rrdom/src/index.ts');
        return null;
      },
    },
  ],
});
