import type { IWindow, listenerHandler, RecordPlugin } from '@rrweb/types';
import type { StringifyOptions } from '../../utils/stringify';

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
  captureHeaders?:
    | boolean
    | StringifyOptions
    | {
        request: boolean | StringifyOptions;
        response: boolean | StringifyOptions;
      };
  captureBody?:
    | boolean
    | StringifyOptions
    | {
        request: boolean | StringifyOptions;
        response: boolean | StringifyOptions;
      };
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
  captureHeaders: false,
  captureBody: false,
  captureInitialEvents: false,
};

type Headers = Record<string, string>;
type Body =
  | string
  | Document
  | Blob
  | ArrayBufferView
  | ArrayBuffer
  | FormData
  | URLSearchParams
  | ReadableStream<Uint8Array>
  | null
  | undefined;

type NetworkRequest = {
  performanceEntry: PerformanceEntry;
  requestHeaders?: Headers;
  requestBody?: Body;
  responseHeaders?: Headers;
  responseBody?: Body;
};

export type NetworkData = {
  requests: NetworkRequest[];
  isInitial?: boolean;
};

type networkCallback = (data: NetworkData) => void;

function initPerformanceObserver(
  cb: networkCallback,
  win: IWindow,
  options: {
    initiatorType: InitiatorType[];
    captureInitialEvents: boolean;
  },
) {
  if (!('performance' in win)) {
    return () => {
      //
    };
  }
  const isNavigationTiming = (
    entry: PerformanceEntry,
  ): entry is PerformanceNavigationTiming => entry.entryType === 'navigation';
  const isResourceTiming = (
    entry: PerformanceEntry,
  ): entry is PerformanceResourceTiming => entry.entryType === 'resource';
  const getPerformanceEntries = (entries: PerformanceEntryList) => {
    return entries.filter((entry) => {
      return (
        isNavigationTiming(entry) ||
        (isResourceTiming(entry) &&
          entry.initiatorType !== 'xmlhttprequest' &&
          entry.initiatorType !== 'fetch')
      );
    });
  };
  if (options.captureInitialEvents) {
    const initialPerformanceEntries = getPerformanceEntries(
      win.performance.getEntries(),
    );
    cb({
      requests: initialPerformanceEntries.map((performanceEntry) => ({
        performanceEntry,
      })),
      isInitial: true,
    });
  }
  const observer = new win.PerformanceObserver((entries) => {
    const performanceEntries = getPerformanceEntries(entries.getEntries());
    cb({
      requests: performanceEntries.map((performanceEntry) => ({
        performanceEntry,
      })),
    });
  });
  observer.observe({ entryTypes: ['navigation', 'resource'] });
  return () => {
    observer.disconnect();
  };
}

function initXhrObserver(
  cb: networkCallback,
  win: IWindow,
  options: NetworkRecordOptions,
): listenerHandler {
  return () => {
    // TODO:
  };
}

function initFetchObserver(
  cb: networkCallback,
  win: IWindow,
  options: NetworkRecordOptions,
): listenerHandler {
  return () => {
    // TODO:
  };
}

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

  const performanceObserver = initPerformanceObserver(cb, win, networkOptions);
  let xhrObserver: listenerHandler | undefined;
  if (networkOptions.initiatorType.includes('xmlhttprequest')) {
    xhrObserver = initXhrObserver(cb, win, networkOptions);
  }
  let fetchObserver: listenerHandler | undefined;
  if (networkOptions.initiatorType.includes('fetch')) {
    fetchObserver = initFetchObserver(cb, win, networkOptions);
  }

  return () => {
    performanceObserver();
    xhrObserver?.();
    fetchObserver?.();
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
