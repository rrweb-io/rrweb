import { describe, expect, it } from 'vitest';
import {
  activeRecording,
  notConnectedPanel,
  recordButtonLook,
  recordingNote,
  shownMode,
  parseRecorderStatus,
  parseStoredMode,
} from './account';
import type { RecorderStatus } from '~/types';

const IDLE: RecorderStatus = { state: 'idle', lastError: { name: 'none' } };
const RECORDING: RecorderStatus = {
  state: 'recording',
  tabId: 3,
  startTimestamp: 1000,
  destination: { name: 'organization', orgName: 'Acme' },
};
const PAUSED: RecorderStatus = {
  state: 'paused',
  tabId: 3,
  startTimestamp: 1000,
  pausedTimestamp: 4000,
  destination: { name: 'stored-only' },
  lastError: { name: 'failed', message: 'Cannot access this page' },
};

describe('activeRecording', () => {
  it('does not claim a recording while a start is in flight', () => {
    expect(activeRecording({ state: 'starting' })).toBe('not-recording');
    expect(activeRecording(IDLE)).toBe('not-recording');
    expect(activeRecording(RECORDING)).toBe('cloud');
    expect(activeRecording(PAUSED)).toBe('offline');
  });
});

describe('parseRecorderStatus', () => {
  it('reads every state with its data', () => {
    const failedIdle: RecorderStatus = {
      state: 'idle',
      lastError: { name: 'failed', message: 'quota exceeded' },
    };
    for (const status of [
      IDLE,
      failedIdle,
      { state: 'starting' } as const,
      RECORDING,
      PAUSED,
    ])
      expect(parseRecorderStatus(JSON.parse(JSON.stringify(status)))).toEqual(
        status,
      );
  });

  it('reads anything else as idle, such as the shape an older version stored', () => {
    for (const value of [
      undefined,
      null,
      'RECORDING',
      { status: 'RECORDING', activeTabId: 3, startTimestamp: 1000 },
      { ...RECORDING, destination: { name: 'organization' } },
      { ...RECORDING, tabId: '3' },
      { ...RECORDING, startTimestamp: '1000' },
      { ...RECORDING, state: 'stopped' },
      { ...PAUSED, pausedTimestamp: undefined },
      { ...PAUSED, lastError: undefined },
      { state: 'idle', lastError: { name: 'failed' } },
    ])
      expect(parseRecorderStatus(value)).toEqual(IDLE);
  });
});

describe('recordingNote', () => {
  it('names the organization a cloud recording uploads to, and when', () => {
    expect(recordingNote('cloud', { name: 'connected', orgName: 'Acme' })).toBe(
      'Uploads to Acme when you stop. Typed form input is masked.',
    );
  });

  it('offers sharing later only once an organization is connected', () => {
    expect(
      recordingNote('offline', { name: 'connected', orgName: 'Acme' }),
    ).toBe('Saved in this browser only. You can share it later.');
    expect(recordingNote('offline', { name: 'not-connected' })).toBe(
      'Saved in this browser only.',
    );
  });
});

describe('shownMode', () => {
  it('defaults to Cloud, then follows the stored choice', () => {
    const idle = { active: 'not-recording' } as const;
    expect(shownMode({ ...idle, stored: 'not-stored' })).toBe('cloud');
    expect(shownMode({ ...idle, stored: 'offline' })).toBe('offline');
    expect(shownMode({ ...idle, stored: 'cloud' })).toBe('cloud');
  });

  it("shows a running recording's own mode", () => {
    expect(shownMode({ active: 'offline', stored: 'cloud' })).toBe('offline');
    expect(shownMode({ active: 'cloud', stored: 'offline' })).toBe('cloud');
  });
});

describe('notConnectedPanel', () => {
  it('pitches Cloud only when it is picked and nothing is recording', () => {
    expect(
      notConnectedPanel({ active: 'not-recording', stored: 'cloud' }),
    ).toEqual({ panel: 'cloud-pitch', shown: 'cloud' });
    expect(
      notConnectedPanel({ active: 'not-recording', stored: 'not-stored' }),
    ).toEqual({ panel: 'record', shown: 'offline' });
    expect(notConnectedPanel({ active: 'cloud', stored: 'offline' })).toEqual({
      panel: 'record',
      shown: 'cloud',
    });
  });
});

describe('parseStoredMode', () => {
  it('reads only the two modes', () => {
    expect(parseStoredMode('offline')).toBe('offline');
    expect(parseStoredMode('cloud')).toBe('cloud');
    expect(parseStoredMode(undefined)).toBe('not-stored');
    expect(parseStoredMode('Cloud')).toBe('not-stored');
  });
});

describe('recordButtonLook', () => {
  it('keeps the idle look while starting and only marks the button busy', () => {
    // Disabling would fade the button under the cursor right after a click.
    expect(recordButtonLook('starting', false)).toEqual({
      label: 'idle',
      mark: 'dot',
      press: 'busy',
    });
  });

  it('is pressable when idle and when recording', () => {
    expect(recordButtonLook('idle', false)).toEqual({
      label: 'idle',
      mark: 'dot',
      press: 'enabled',
    });
    expect(recordButtonLook('recording', false)).toEqual({
      label: 'stop',
      mark: 'square',
      press: 'enabled',
    });
  });

  it('is disabled only when the view disables it', () => {
    expect(recordButtonLook('idle', true).press).toBe('disabled');
    expect(recordButtonLook('starting', true).press).toBe('disabled');
  });
});
