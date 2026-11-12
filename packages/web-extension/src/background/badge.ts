import { RecorderStatus } from '~/types';

export const BADGE_COLORS = {
  RECORDING: '#E5484D',
  PAUSED: '#7A3A3D',
} as const;
/** A single space renders as a solid pill; the bullet looks uneven in Chrome. */
export const BADGE_TEXT = ' ';

export type BadgeDeps = {
  setBadge: (tabId: number, color: string) => Promise<unknown>;
  clearBadge: (tabId: number) => Promise<unknown>;
};

type BadgeStatus = { status: RecorderStatus; activeTabId: number };

/**
 * Mirror the recorder status on the recorded tab's toolbar icon. Badge
 * errors are logged and never reach the recorder.
 */
export function createBadge(deps: BadgeDeps) {
  let badgedTab = -1;

  const log = (e: unknown) => console.warn('rrweb: badge failed', e);
  const guard = (run: () => Promise<unknown>) => {
    try {
      run().catch(log);
    } catch (e) {
      log(e);
    }
  };

  function clear() {
    const tabId = badgedTab;
    badgedTab = -1;
    if (tabId !== -1) guard(() => deps.clearBadge(tabId));
  }

  function sync({ status, activeTabId: tabId }: BadgeStatus) {
    if (status !== RecorderStatus.RECORDING && status !== RecorderStatus.PAUSED)
      return clear();
    if (badgedTab !== tabId) clear();
    badgedTab = tabId;
    const color =
      status === RecorderStatus.PAUSED
        ? BADGE_COLORS.PAUSED
        : BADGE_COLORS.RECORDING;
    guard(() => deps.setBadge(tabId, color));
  }

  return { sync };
}
