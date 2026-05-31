import path from 'path';
import { defineConfig, mergeConfig } from 'vite';
import config from '../../vite.config.default';
import { browserClientBuildDefines } from './buildMetadata';

const browserClientConfig = config(
  path.resolve(__dirname, 'src/index.ts'),
  'rrwebBrowserClient',
  {
    fileName: 'browser-client',
  },
);

export default defineConfig((env) =>
  mergeConfig(browserClientConfig(env), {
    define: browserClientBuildDefines(),
  }),
);
