import { config } from '~/config';
import { RecorderStatus } from '~/types';
import type {
  CloudAccount,
  LocalData,
  LocalDataKey,
  RecordingKind,
} from '~/types';

/** What the recorder is doing right now, as the popup shows it. */
export type ActiveRecording = RecordingKind | 'not-recording';

export function activeRecording(
  data: Pick<LocalData[LocalDataKey.recorderStatus], 'status' | 'kind'>,
): ActiveRecording {
  // STARTING has no kind yet, so it reads as not recording until RECORDING.
  if (
    data.status === RecorderStatus.IDLE ||
    data.status === RecorderStatus.STARTING
  )
    return 'not-recording';
  // The background sets kind on every non-idle status.
  return data.kind ?? 'offline';
}

/** The line under the record button in the signed-out view. */
export function recordingNote(active: ActiveRecording): string {
  return active === 'cloud'
    ? 'Uploading to rrweb'
    : 'Saved in this browser only';
}

export type RecordButtonLook = {
  label: 'idle' | 'stop';
  mark: 'dot' | 'square';
  /** busy: a start is in flight, so clicks do nothing but the look stays. */
  press: 'enabled' | 'busy' | 'disabled';
};

export function recordButtonLook(
  status: RecorderStatus,
  disabled: boolean,
): RecordButtonLook {
  const starting = status === RecorderStatus.STARTING;
  const idle = status === RecorderStatus.IDLE || starting;
  return {
    label: idle ? 'idle' : 'stop',
    mark: idle ? 'dot' : 'square',
    press: disabled ? 'disabled' : starting ? 'busy' : 'enabled',
  };
}

export type PopupState =
  | { name: 'signed-out' }
  | { name: 'validating' }
  | { name: 'setting-up' }
  | { name: 'setup-slow' }
  | {
      name: 'ready';
      account: CloudAccount;
      orgs: { id: string; name: string }[];
    };

export const KEY_POLL_INTERVAL_MS = 3000;
export const SETUP_SLOW_AFTER_MS = 60000;

/** The signed-in user's organizations, as far as the lookup has got. */
export type Memberships =
  | { name: 'loading' }
  | { name: 'loaded'; list: { id: string; name: string }[] }
  | { name: 'failed' };

/**
 * Whether the stored account may record. It is valid only for the user who
 * stored it, and only once their memberships include its organization.
 */
export type AccountCheck = 'no-account' | 'validating' | 'valid' | 'invalid';

export function checkAccount(input: {
  account: CloudAccount | null;
  userId: string | null;
  memberships: Memberships;
}): AccountCheck {
  const { account, userId, memberships } = input;
  if (!account) return 'no-account';
  if (userId === null) return 'validating';
  if (account.userId !== userId) return 'invalid';
  if (memberships.name === 'loading') return 'validating';
  if (memberships.name === 'failed') return 'invalid';
  return memberships.list.some((o) => o.id === account.orgId)
    ? 'valid'
    : 'invalid';
}

export function derivePopupState(input: {
  cloudEnabled: boolean;
  isSignedIn: boolean;
  userId: string | null;
  memberships: Memberships;
  account: CloudAccount | null;
  waitingSinceMs: number;
  nowMs: number;
}): PopupState {
  if (!input.cloudEnabled || !input.isSignedIn) return { name: 'signed-out' };
  const check = checkAccount(input);
  if (check === 'validating') return { name: 'validating' };
  if (check === 'valid' && input.account && input.memberships.name === 'loaded')
    return {
      name: 'ready',
      account: input.account,
      orgs: input.memberships.list,
    };
  // no-account or invalid: the caller drops an invalid account and sets up again
  return input.nowMs - input.waitingSinceMs >= SETUP_SLOW_AFTER_MS
    ? { name: 'setup-slow' }
    : { name: 'setting-up' };
}

export async function fetchPublicKey(
  orgId: string,
  sessionToken: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `${config.apiUrl}/get-public-key/${encodeURIComponent(orgId)}`,
      {
        headers: { Authorization: `Bearer ${sessionToken}` },
      },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { publicKey?: unknown };
    return typeof body.publicKey === 'string' && body.publicKey !== ''
      ? body.publicKey
      : null;
  } catch {
    return null;
  }
}
