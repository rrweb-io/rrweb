import { isRunning, type RecorderStatus } from '~/types';

export const BADGE_COLORS = {
  RECORDING: '#E5484D',
  PAUSED: '#7A3A3D',
} as const;
export const BADGE_TEXT = 'REC';

export type Badge = { text: string; color: string };

export type BadgeDeps = {
  setBadge: (tabId: number, badge: Badge) => Promise<unknown>;
  clearBadge: (tabId: number) => Promise<unknown>;
};

/** The tab whose toolbar icon shows the badge. */
type Badged = { name: 'no-tab' } | { name: 'tab'; tabId: number };

/**
 * Mirror the recorder status on the recorded tab's toolbar icon. Badge
 * errors are logged and never reach the recorder.
 */
export function createBadge(deps: BadgeDeps) {
  let badged: Badged = { name: 'no-tab' };

  const log = (e: unknown) => console.warn('rrweb: badge failed', e);
  const guard = (run: () => Promise<unknown>) => {
    try {
      run().catch(log);
    } catch (e) {
      log(e);
    }
  };

  function clear() {
    const was = badged;
    badged = { name: 'no-tab' };
    if (was.name === 'tab') guard(() => deps.clearBadge(was.tabId));
  }

  function sync(status: RecorderStatus) {
    if (!isRunning(status)) return clear();
    const { tabId } = status;
    if (badged.name === 'tab' && badged.tabId !== tabId) clear();
    badged = { name: 'tab', tabId };
    const color =
      status.state === 'paused' ? BADGE_COLORS.PAUSED : BADGE_COLORS.RECORDING;
    guard(() => deps.setBadge(tabId, { text: BADGE_TEXT, color }));
  }

  return { sync };
}
