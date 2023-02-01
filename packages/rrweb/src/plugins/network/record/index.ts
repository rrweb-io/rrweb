import type { IWindow, listenerHandler, RecordPlugin } from '@rrweb/types';
import { findLast, patch } from '../../../utils';
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

const isNavigationTiming = (
  entry: PerformanceEntry,
): entry is PerformanceNavigationTiming => entry.entryType === 'navigation';
const isResourceTiming = (
  entry: PerformanceEntry,
): entry is PerformanceResourceTiming => entry.entryType === 'resource';

function initPerformanceObserver(
  cb: networkCallback,
  win: IWindow,
  options: Required<NetworkRecordOptions>,
) {
  const getPerformanceEntries = (entries: PerformanceEntryList) => {
    return entries.filter((entry) => {
      return (
        isNavigationTiming(entry) ||
        (isResourceTiming(entry) &&
          entry.initiatorType !== 'xmlhttprequest' && // ignore xhr
          entry.initiatorType !== 'fetch') // ignore fetch
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

const getPerformanceEntry = (
  win: IWindow,
  initiatorType: string,
  url: string,
) => {
  const performanceEntries = win.performance.getEntriesByType('resource');
  console.log('getPerformanceEntry', {
    performanceEntries,
    initiatorType,
    url,
  });
  return findLast(
    performanceEntries,
    (performanceEntry) =>
      isResourceTiming(performanceEntry) &&
      performanceEntry.initiatorType === initiatorType &&
      performanceEntry.name === url,
  );
};

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

  const restorePatch = patch(
    XMLHttpRequest.prototype,
    'open',
    (originalOpen: typeof XMLHttpRequest.prototype.open) => {
      return async function (
        method: string,
        url: string | URL,
        async = true,
        username?: string | null,
        password?: string | null,
      ) {
        const xhr = this as XMLHttpRequest;
        const requestUrl = typeof url === 'string' ? url : url.toString();
        let performanceEntry: PerformanceEntry | undefined;
        const networkRequest: Partial<NetworkRequest> = {};
        try {
          if (recordRequestHeaders) {
            networkRequest.requestHeaders = {};
            const originalSetRequestHeader = xhr.setRequestHeader.bind(xhr);
            xhr.setRequestHeader = (header: string, value: string) => {
              networkRequest.requestHeaders![header] = value;
              return originalSetRequestHeader(header, value);
            };
          }
          if (recordRequestBody) {
            const originalSend = xhr.send.bind(xhr);
            xhr.send = (body) => {
              if (body === undefined || body === null) {
                networkRequest.requestBody = null;
              } else {
                networkRequest.requestBody = stringify(
                  body,
                  typeof recordRequestBody === 'object'
                    ? recordRequestBody
                    : undefined,
                );
              }
              return originalSend(body);
            };
          }
          await new Promise<void>((resolve) => {
            xhr.responseType = 'text';
            xhr.addEventListener('readystatechange', () => {
              if (xhr.readyState !== xhr.DONE) return;
              performanceEntry = getPerformanceEntry(
                win,
                'xmlhttprequest',
                requestUrl,
              );
              if (recordResponseHeaders) {
                networkRequest.responseHeaders = {};
                const rawHeaders = xhr.getAllResponseHeaders();
                const headers = rawHeaders.trim().split(/[\r\n]+/);
                headers.forEach((line) => {
                  const parts = line.split(': ');
                  const header = parts.shift();
                  const value = parts.join(': ');
                  if (header) {
                    networkRequest.responseHeaders![header] = value;
                  }
                });
              }
              if (recordResponseBody) {
                if (!xhr.response) {
                  networkRequest.responseBody = null;
                } else {
                  try {
                    const objBody = JSON.parse(
                      xhr.response as string,
                    ) as object;
                    networkRequest.responseBody = stringify(
                      objBody,
                      typeof recordResponseBody === 'object'
                        ? recordResponseBody
                        : undefined,
                    );
                  } catch {
                    networkRequest.responseBody = xhr.response as string;
                  }
                }
              }
              resolve();
            });
            originalOpen(method, url, async, username, password);
          });
        } catch (cause) {
          if (!performanceEntry) {
            performanceEntry = getPerformanceEntry(
              win,
              'xmlhttprequest',
              requestUrl,
            );
          }
          throw cause;
        } finally {
          if (performanceEntry) {
            cb({
              requests: [
                {
                  performanceEntry,
                  requestMethod: method,
                  ...networkRequest,
                },
              ],
            });
          }
        }
      };
    },
  );
  return () => {
    restorePatch();
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
  const wrappedFetch: typeof fetch = async (url, init) => {
    const req = new Request(url, init);
    let performanceEntry: PerformanceEntry | undefined;
    const networkRequest: Partial<NetworkRequest> = {};
    try {
      if (recordRequestHeaders) {
        networkRequest.requestHeaders = {};
        req.headers.forEach((value, header) => {
          networkRequest.requestHeaders![header] = value;
        });
      }
      if (recordRequestBody) {
        if (req.body === undefined || req.body === null) {
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
      performanceEntry = getPerformanceEntry(win, 'fetch', req.url);
      if (recordResponseHeaders) {
        networkRequest.responseHeaders = {};
        res.headers.forEach((value, header) => {
          networkRequest.responseHeaders![header] = value;
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
    } catch (cause) {
      if (!performanceEntry) {
        performanceEntry = getPerformanceEntry(win, 'fetch', req.url);
      }
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
    if (requests.length > 0 || data.isInitial) {
      callback({ ...data, requests });
    }
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
