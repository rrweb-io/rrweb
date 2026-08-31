import * as fs from 'fs-extra';
import * as path from 'path';
import type { eventWithTime } from '@rrweb/types';
import type { RRvideoConfig } from './types';

export const PLAYWRIGHT_MAX_SCALE = 2.5;

const rrwebScriptPath = path.resolve(
  require.resolve('rrweb-player'),
  '../../dist/rrweb-player.umd.cjs',
);
const rrwebStylePath = path.resolve(rrwebScriptPath, '../style.css');

export function loadPlayerAssets(): { script: string; style: string } {
  return {
    script: fs.readFileSync(rrwebScriptPath, 'utf-8'),
    style: fs.readFileSync(rrwebStylePath, 'utf-8'),
  };
}

export function getHtml(
  events: Array<eventWithTime>,
  config?: RRvideoConfig,
  options?: { scale?: number; startPlayback?: boolean },
): string {
  const { script, style } = loadPlayerAssets();
  const scale = options?.scale ?? 1;
  const startPlayback = options?.startPlayback ?? false;

  return `
<html>
  <head>
  <style>${style}</style>
  <style>html, body {padding: 0; border: none; margin: 0; background: #fff;}</style>
  </head>
  <body>
    <script>
      ${script};
      /*<!--*/
      const events = ${JSON.stringify(events).replace(
        /<\/script>/g,
        '<\\/script>',
      )};
      /*-->*/
      const userConfig = ${JSON.stringify(config?.rrwebPlayer || {})};
      window.__rrvideoInitError = null;
      try {
        const Player = (typeof rrwebPlayer === 'function')
          ? rrwebPlayer
          : (rrwebPlayer.default || rrwebPlayer.Player);
        window.replayer = new Player({
          target: document.body,
          props: {
            ...userConfig,
            events,
            showController: false,
            autoPlay: false,
          },
        });
        window.replayer.addEventListener('finish', () => {
          if (window.onReplayFinish) window.onReplayFinish();
        });
        window.replayer.addEventListener('ui-update-progress', (payload) => {
          if (window.onReplayProgressUpdate) window.onReplayProgressUpdate(payload);
        });
        window.replayer.addEventListener('resize', () => {
          const wrapper = document.querySelector('.replayer-wrapper');
          if (wrapper) {
            wrapper.style.transform = 'scale(${scale}) translate(-50%, -50%)';
          }
        });
        if (${startPlayback ? 'true' : 'false'}) {
          window.replayer.play();
        }
      } catch (error) {
        console.error('Error initializing replayer:', error);
        window.__rrvideoInitError = String(error && error.stack ? error.stack : error);
        if (window.onReplayFinish) window.onReplayFinish();
      }
    </script>
  </body>
</html>
`;
}
