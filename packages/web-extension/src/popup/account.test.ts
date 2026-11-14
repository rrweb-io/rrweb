import { describe, expect, it } from 'vitest';
import {
  activeRecording,
  notConnectedPanel,
  recordButtonLook,
  recordingNote,
  shownMode,
  parseStoredMode,
} from './account';
import { RecorderStatus } from '~/types';

describe('activeRecording', () => {
  it('does not claim a recording while a start is in flight', () => {
    expect(activeRecording({ status: RecorderStatus.STARTING })).toBe(
      'not-recording',
    );
    expect(
      activeRecording({ status: RecorderStatus.IDLE, kind: 'cloud' }),
    ).toBe('not-recording');
    expect(
      activeRecording({ status: RecorderStatus.PAUSED, kind: 'cloud' }),
    ).toBe('cloud');
  });
});

describe('recordingNote', () => {
  it('names the organization a cloud recording uploads to, and when', () => {
    expect(recordingNote('cloud', { name: 'connected', orgName: 'Acme' })).toBe(
      'Uploads to Acme when you stop. Form fields are masked.',
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
    expect(recordButtonLook(RecorderStatus.STARTING, false)).toEqual({
      label: 'idle',
      mark: 'dot',
      press: 'busy',
    });
  });

  it('is pressable when idle and when recording', () => {
    expect(recordButtonLook(RecorderStatus.IDLE, false)).toEqual({
      label: 'idle',
      mark: 'dot',
      press: 'enabled',
    });
    expect(recordButtonLook(RecorderStatus.RECORDING, false)).toEqual({
      label: 'stop',
      mark: 'square',
      press: 'enabled',
    });
  });

  it('is disabled only when the view disables it', () => {
    expect(recordButtonLook(RecorderStatus.IDLE, true).press).toBe('disabled');
    expect(recordButtonLook(RecorderStatus.STARTING, true).press).toBe(
      'disabled',
    );
  });
});
