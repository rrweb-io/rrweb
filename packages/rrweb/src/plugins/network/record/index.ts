import type { IWindow, listenerHandler, RecordPlugin } from '@rrweb/types';

export type InitiatorType =
  | 'audio'
  | 'beacon'
  | 'body'
  | 'css'
  | 'early-hint'
  | 'embed'
  | 'fetch'
  | 'frame'
  | 'iframe'
  | 'icon'
  | 'image'
  | 'img'
  | 'input'
  | 'link'
  | 'navigation'
  | 'object'
  | 'ping'
  | 'script'
  | 'track'
  | 'video'
  | 'xmlhttprequest';

type NetworkRecordOptions = {
  initiatorType?: InitiatorType[];
  captureInitialEvents?: boolean;
};

const defaultNetworkOptions: NetworkRecordOptions = {
  initiatorType: [
    'audio',
    'beacon',
    'body',
    'css',
    'early-hint',
    'embed',
    'fetch',
    'frame',
    'iframe',
    'icon',
    'image',
    'img',
    'input',
    'link',
    'navigation',
    'object',
    'ping',
    'script',
    'track',
    'video',
    'xmlhttprequest',
  ],
  captureInitialEvents: false,
};

type networkCallback = (p: PerformanceResourceTiming) => void;

function initNetworkObserver(
  cb: networkCallback,
  win: IWindow, // top window or in an iframe
  options: NetworkRecordOptions,
): listenerHandler {
  const networkOptions = (options
    ? Object.assign({}, defaultNetworkOptions, options)
    : defaultNetworkOptions) as {
    initiatorType: InitiatorType[];
    captureInitialEvents: boolean;
  };
  if (!('performance' in win)) {
    return () => {
      //
    };
  }
  if (networkOptions.captureInitialEvents) {
    const initialResources = win.performance.getEntriesByType(
      'resource',
    ) as PerformanceResourceTiming[];
    initialResources
      .filter((resource) =>
        networkOptions.initiatorType.includes(
          resource.initiatorType as InitiatorType,
        ),
      )
      .forEach((resource) => cb(resource));
  }
  const observer = new win.PerformanceObserver((entries) => {
    const resources = entries.getEntries() as PerformanceResourceTiming[];
    resources
      .filter((resource) =>
        networkOptions.initiatorType.includes(
          resource.initiatorType as InitiatorType,
        ),
      )
      .forEach((resource) => cb(resource));
  });
  observer.observe({ type: 'resource' });
  return () => {
    observer.disconnect();
  };
}

export const NETWORK_PLUGIN_NAME = 'rrweb/network@1';

export const getRecordNetworkPlugin: (
  options?: NetworkRecordOptions,
) => RecordPlugin = (options) => ({
  name: NETWORK_PLUGIN_NAME,
  observer: initNetworkObserver,
  options: options,
});
