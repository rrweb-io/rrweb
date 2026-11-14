import { useEffect, useState } from 'react';
import Browser from 'webextension-polyfill';
import { LocalDataKey, type LocalData, type RecordingKind } from '~/types';
import { parseStoredMode, type StoredMode } from './account';

/** The switch's remembered choice, read from extension storage. */
export type ModeChoice =
  | { name: 'loading' }
  | { name: 'loaded'; stored: StoredMode };

export function useRecordingMode(): {
  choice: ModeChoice;
  choose: (mode: RecordingKind) => void;
} {
  const [choice, setChoice] = useState<ModeChoice>({ name: 'loading' });
  useEffect(() => {
    let current = true;
    const settle = (stored: StoredMode) => {
      if (!current) return;
      // A pick made while the read was in flight wins.
      setChoice((now) =>
        now.name === 'loading' ? { name: 'loaded', stored } : now,
      );
    };
    Browser.storage.local
      .get(LocalDataKey.recordingMode)
      .then((data) =>
        settle(
          parseStoredMode((data as LocalData)[LocalDataKey.recordingMode]),
        ),
      )
      // A failed read must not leave the popup loading: offline recording has
      // to stay usable, so fall back to no remembered choice.
      .catch(() => settle('not-stored'));
    return () => {
      current = false;
    };
  }, []);
  const choose = (mode: RecordingKind) => {
    setChoice({ name: 'loaded', stored: mode });
    Browser.storage.local
      .set({ [LocalDataKey.recordingMode]: mode })
      .catch(() => {
        // The choice still applies in this popup; it just isn't remembered.
      });
  };
  return { choice, choose };
}
