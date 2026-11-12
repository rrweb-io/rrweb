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

/** The switch's choice in storage: 'not-stored' until the person picks one. */
export type StoredMode = RecordingKind | 'not-stored';

export function parseStoredMode(value: unknown): StoredMode {
  return value === 'cloud' || value === 'offline' ? value : 'not-stored';
}

/**
 * The mode the switch and record button show. A running recording shows its
 * own mode. Cloud is shown only once the account is ready, and is the default
 * until the person picks one.
 */
export function shownMode(input: {
  active: ActiveRecording;
  cloud: 'ready' | 'not-ready';
  stored: StoredMode;
}): RecordingKind {
  if (input.active !== 'not-recording') return input.active;
  if (input.cloud === 'not-ready') return 'offline';
  return input.stored === 'not-stored' ? 'cloud' : input.stored;
}

/**
 * Who reads the note under the record button.
 * signed-in: uploads go to `orgName`.
 * setting-up: signed in, but the account is not ready yet.
 * signed-out: signed out, or a browser without sign-in.
 */
export type NoteReader =
  | { name: 'signed-in'; orgName: string }
  | { name: 'setting-up' }
  | { name: 'signed-out' };

/** The line under the record button. */
export function recordingNote(mode: RecordingKind, reader: NoteReader): string {
  if (mode === 'cloud')
    return reader.name === 'signed-in'
      ? `Uploads to ${reader.orgName}. Form fields are masked.`
      : 'Uploads to rrweb. Form fields are masked.';
  return reader.name === 'signed-out'
    ? 'Saved in this browser only.'
    : 'Saved in this browser only. You can share it later.';
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

/**
 * The organization's public key lookup. `no-key` means the API answered but
 * the organization has none yet; `failed` is anything else (status, network,
 * body), which a retry may fix.
 */
export type PublicKeyResult =
  | { name: 'key'; publicKey: string }
  | { name: 'no-key' }
  | { name: 'failed' };

export async function fetchPublicKey(
  orgId: string,
  sessionToken: string,
): Promise<PublicKeyResult> {
  try {
    const response = await fetch(
      `${config.apiUrl}/get-public-key/${encodeURIComponent(orgId)}`,
      {
        headers: { Authorization: `Bearer ${sessionToken}` },
      },
    );
    if (!response.ok) return { name: 'failed' };
    const body = (await response.json()) as { publicKey?: unknown };
    return typeof body.publicKey === 'string' && body.publicKey !== ''
      ? { name: 'key', publicKey: body.publicKey }
      : { name: 'no-key' };
  } catch {
    return { name: 'failed' };
  }
}
