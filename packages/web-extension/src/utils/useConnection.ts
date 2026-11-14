import { useEffect, useState } from 'react';
import Browser from 'webextension-polyfill';
import { LocalDataKey, type Connection, type LocalData } from '~/types';
import { parseConnection } from './connection';

export type ConnectionView = { name: 'loading' } | Connection;

/**
 * The organization the dashboard connected, read from extension storage and
 * followed as it changes.
 */
export function useConnection(): ConnectionView {
  const [view, setView] = useState<ConnectionView>({ name: 'loading' });
  useEffect(() => {
    let current = true;
    void Browser.storage.local
      .get(LocalDataKey.cloudAccount)
      .then((data) => {
        if (current)
          setView(
            parseConnection((data as LocalData)[LocalDataKey.cloudAccount]),
          );
      })
      // Offline recording must stay usable when storage cannot be read.
      .catch(() => {
        if (current) setView({ name: 'not-connected' });
      });
    const onChanged = (
      changes: Record<string, Browser.Storage.StorageChange>,
    ) => {
      const change = changes[LocalDataKey.cloudAccount];
      if (change) setView(parseConnection(change.newValue));
    };
    Browser.storage.local.onChanged.addListener(onChanged);
    return () => {
      current = false;
      Browser.storage.local.onChanged.removeListener(onChanged);
    };
  }, []);
  return view;
}

/** Forget the connected organization. */
export const disconnect = () =>
  Browser.storage.local.remove(LocalDataKey.cloudAccount);
