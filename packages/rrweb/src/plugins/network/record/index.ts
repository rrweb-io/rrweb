import type { IWindow, listenerHandler, RecordPlugin } from '@rrweb/types';
import { findLast } from '../../../utils';
import { stringify, StringifyOptions } from '../../utils/stringify';

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
  initiatorTypes?: InitiatorType[];
  ignoreRequestFn?: (data: NetworkRequest) => boolean;
  recordHeaders?:
    | boolean
    | StringifyOptions
    | {
        request: boolean | StringifyOptions;
        response: boolean | StringifyOptions;
      };
  recordBody?:
    | boolean
    | StringifyOptions
    | {
        request: boolean | StringifyOptions;
        response: boolean | StringifyOptions;
      };
  recordInitialRequests?: boolean;
};

const defaultNetworkOptions: NetworkRecordOptions = {
  initiatorTypes: [
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
  ignoreRequestFn: () => false,
  recordHeaders: false,
  recordBody: false,
  recordInitialRequests: false,
};

type Headers = Record<string, string>;

type NetworkRequest = {
  performanceEntry: PerformanceEntry;
  requestMethod: string;
  requestHeaders?: Headers;
  requestBody?: string | null;
  responseHeaders?: Headers;
  responseBody?: string | null;
};

export type NetworkData = {
  requests: NetworkRequest[];
  isInitial?: boolean;
};

type networkCallback = (data: NetworkData) => void;

function initPerformanceObserver(
  cb: networkCallback,
  win: IWindow,
  options: Required<NetworkRecordOptions>,
) {
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
  if (options.recordInitialRequests) {
    const initialPerformanceEntries = getPerformanceEntries(
      win.performance.getEntries(),
    );
    cb({
      requests: initialPerformanceEntries.map((performanceEntry) => ({
        performanceEntry,
        requestMethod: 'GET',
      })),
      isInitial: true,
    });
  }
  const observer = new win.PerformanceObserver((entries) => {
    const performanceEntries = getPerformanceEntries(entries.getEntries());
    cb({
      requests: performanceEntries.map((performanceEntry) => ({
        performanceEntry,
        requestMethod: 'GET',
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
  options: Required<NetworkRecordOptions>,
): listenerHandler {
  if (!options.initiatorTypes.includes('xmlhttprequest')) {
    return () => {
      //
    };
  }
  return () => {
    // TODO:
  };
}

function initFetchObserver(
  cb: networkCallback,
  win: IWindow,
  options: Required<NetworkRecordOptions>,
): listenerHandler {
  if (!options.initiatorTypes.includes('fetch')) {
    return () => {
      //
    };
  }
  const recordRequestHeaders =
    !!options.recordHeaders &&
    (typeof options.recordHeaders === 'boolean' ||
      !('request' in options.recordHeaders) ||
      options.recordHeaders.request);
  const recordRequestBody =
    !!options.recordBody &&
    (typeof options.recordBody === 'boolean' ||
      !('request' in options.recordBody) ||
      options.recordBody.request);
  const recordResponseHeaders =
    !!options.recordHeaders &&
    (typeof options.recordHeaders === 'boolean' ||
      !('response' in options.recordHeaders) ||
      options.recordHeaders.response);
  const recordResponseBody =
    !!options.recordBody &&
    (typeof options.recordBody === 'boolean' ||
      !('response' in options.recordBody) ||
      options.recordBody.response);

  const originalFetch = win.fetch;
  const wrappedFetch: typeof fetch = async function (url, init) {
    let performanceEntry: PerformanceResourceTiming | undefined;
    const networkRequest: Partial<NetworkRequest> = {};
    const req = new Request(url, init);
    try {
      if (recordRequestHeaders) {
        networkRequest.requestHeaders = {};
        req.headers.forEach((value, key) => {
          networkRequest.requestHeaders![key] = value;
        });
      }
      if (recordRequestBody) {
        if (!req.body) {
          networkRequest.requestBody = null;
        } else {
          networkRequest.requestBody = stringify(
            req.body,
            typeof recordRequestBody === 'object'
              ? recordRequestBody
              : undefined,
          );
        }
      }
      const res = await originalFetch(req);
      const performanceEntries = win.performance.getEntriesByType(
        'resource',
      ) as PerformanceResourceTiming[];
      performanceEntry = findLast(
        performanceEntries,
        (p) => p.initiatorType === 'fetch' && p.name === req.url,
      );
      if (recordResponseHeaders) {
        networkRequest.responseHeaders = {};
        res.headers.forEach((value, key) => {
          networkRequest.responseHeaders![key] = value;
        });
      }
      if (recordResponseBody) {
        const reqBody = await res.clone().text();
        if (!reqBody) {
          networkRequest.responseBody = null;
        } else {
          try {
            const objBody = JSON.parse(reqBody) as object;
            networkRequest.responseBody = stringify(
              objBody,
              typeof recordResponseBody === 'object'
                ? recordResponseBody
                : undefined,
            );
          } catch {
            networkRequest.responseBody = reqBody;
          }
        }
      }
      return res;
      // eslint-disable-next-line no-useless-catch
    } catch (cause) {
      // failed to fetch
      throw cause;
    } finally {
      if (performanceEntry) {
        cb({
          requests: [
            {
              performanceEntry,
              requestMethod: req.method,
              ...networkRequest,
            },
          ],
        });
      }
    }
  };
  wrappedFetch.prototype = {};
  Object.defineProperties(wrappedFetch, {
    __rrweb_original__: {
      enumerable: false,
      value: originalFetch,
    },
  });
  win.fetch = wrappedFetch;
  return () => {
    win.fetch = originalFetch;
  };
}

function initNetworkObserver(
  callback: networkCallback,
  win: IWindow, // top window or in an iframe
  options: NetworkRecordOptions,
): listenerHandler {
  if (!('performance' in win)) {
    return () => {
      //
    };
  }

  const networkOptions = (options
    ? Object.assign({}, defaultNetworkOptions, options)
    : defaultNetworkOptions) as Required<NetworkRecordOptions>;

  const cb: networkCallback = (data) => {
    const requests = data.requests.filter(
      (request) => !networkOptions.ignoreRequestFn(request),
    );
    callback({ ...data, requests });
  };

  const performanceObserver = initPerformanceObserver(cb, win, networkOptions);
  const xhrObserver = initXhrObserver(cb, win, networkOptions);
  const fetchObserver = initFetchObserver(cb, win, networkOptions);

  return () => {
    performanceObserver();
    xhrObserver();
    fetchObserver();
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
