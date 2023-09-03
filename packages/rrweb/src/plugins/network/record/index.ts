import type { IWindow, listenerHandler, RecordPlugin } from '@rrweb/types';
import { patch } from '../../../utils';
import { findLast } from '../../utils/find-last';

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
  recordHeaders?: boolean | { request: boolean; response: boolean };
  recordBody?:
    | boolean
    | string[]
    | { request: boolean | string[]; response: boolean | string[] };
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
type Body =
  | string
  | Document
  | Blob
  | ArrayBufferView
  | ArrayBuffer
  | FormData
  | URLSearchParams
  | ReadableStream<Uint8Array>
  | null;

export type NetworkRequest = {
  url: string;
  method?: string;
  initiatorType: InitiatorType;
  status?: number;
  startTime: number;
  endTime: number;
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

const isNavigationTiming = (
  entry: PerformanceEntry,
): entry is PerformanceNavigationTiming => entry.entryType === 'navigation';
const isResourceTiming = (
  entry: PerformanceEntry,
): entry is PerformanceResourceTiming => entry.entryType === 'resource';

type ObservedPerformanceEntry = (
  | PerformanceNavigationTiming
  | PerformanceResourceTiming
) & {
  responseStatus?: number;
};

function initPerformanceObserver(
  cb: networkCallback,
  win: IWindow,
  options: Required<NetworkRecordOptions>,
) {
  if (options.recordInitialRequests) {
    const initialPerformanceEntries = win.performance
      .getEntries()
      .filter((entry): entry is ObservedPerformanceEntry => {
        return (
          isNavigationTiming(entry) ||
          (isResourceTiming(entry) &&
            options.initiatorTypes.includes(
              entry.initiatorType as InitiatorType,
            ))
        );
      });
    cb({
      requests: initialPerformanceEntries.map((entry) => ({
        url: entry.name,
        initiatorType: entry.initiatorType as InitiatorType,
        status: 'responseStatus' in entry ? entry.responseStatus : undefined,
        startTime: Math.round(entry.startTime),
        endTime: Math.round(entry.responseEnd),
      })),
      isInitial: true,
    });
  }
  const observer = new win.PerformanceObserver((entries) => {
    const performanceEntries = entries
      .getEntries()
      .filter(
        (entry): entry is ObservedPerformanceEntry =>
          isNavigationTiming(entry) ||
          (isResourceTiming(entry) &&
            options.initiatorTypes.includes(
              entry.initiatorType as InitiatorType,
            ) &&
            entry.initiatorType !== 'xmlhttprequest' &&
            entry.initiatorType !== 'fetch'),
      );
    cb({
      requests: performanceEntries.map((entry) => ({
        url: entry.name,
        initiatorType: entry.initiatorType as InitiatorType,
        status: 'responseStatus' in entry ? entry.responseStatus : undefined,
        startTime: Math.round(entry.startTime),
        endTime: Math.round(entry.responseEnd),
      })),
    });
  });
  observer.observe({ entryTypes: ['navigation', 'resource'] });
  return () => {
    observer.disconnect();
  };
}

function shouldRecordHeaders(
  type: 'request' | 'response',
  recordHeaders: NetworkRecordOptions['recordHeaders'],
) {
  return (
    !!recordHeaders &&
    (typeof recordHeaders === 'boolean' || recordHeaders[type])
  );
}

function shouldRecordBody(
  type: 'request' | 'response',
  recordBody: NetworkRecordOptions['recordBody'],
  headers: Headers,
) {
  function matchesContentType(contentTypes: string[]) {
    const contentTypeHeader = Object.keys(headers).find(
      (key) => key.toLowerCase() === 'content-type',
    );
    const contentType = contentTypeHeader && headers[contentTypeHeader];
    return contentTypes.some((ct) => contentType?.includes(ct));
  }

  if (!recordBody) return false;
  if (typeof recordBody === 'boolean') return true;
  if (Array.isArray(recordBody)) return matchesContentType(recordBody);
  const recordBodyType = recordBody[type];
  if (typeof recordBodyType === 'boolean') return recordBodyType;
  return matchesContentType(recordBodyType);
}

async function getRequestPerformanceEntry(
  win: IWindow,
  initiatorType: string,
  url: string,
  after?: number,
  before?: number,
  attempt = 0,
): Promise<PerformanceResourceTiming> {
  if (attempt > 10) {
    throw new Error('Cannot find performance entry');
  }
  const urlPerformanceEntries = win.performance.getEntriesByName(
    url,
  ) as PerformanceResourceTiming[];
  const performanceEntry = findLast(
    urlPerformanceEntries,
    (entry) =>
      isResourceTiming(entry) &&
      entry.initiatorType === initiatorType &&
      (!after || entry.startTime >= after) &&
      (!before || entry.startTime <= before),
  );
  if (!performanceEntry) {
    await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
    return getRequestPerformanceEntry(
      win,
      initiatorType,
      url,
      after,
      before,
      attempt + 1,
    );
  }
  return performanceEntry;
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
  const recordRequestHeaders = shouldRecordHeaders(
    'request',
    options.recordHeaders,
  );
  const recordResponseHeaders = shouldRecordHeaders(
    'response',
    options.recordHeaders,
  );
  const restorePatch = patch(
    win.XMLHttpRequest.prototype,
    'open',
    (originalOpen: typeof XMLHttpRequest.prototype.open) => {
      return function (
        method: string,
        url: string | URL,
        async = true,
        username?: string | null,
        password?: string | null,
      ) {
        const xhr = this as XMLHttpRequest;
        const req = new Request(url);
        const networkRequest: Partial<NetworkRequest> = {};
        let after: number | undefined;
        let before: number | undefined;
        const requestHeaders: Headers = {};
        const originalSetRequestHeader = xhr.setRequestHeader.bind(xhr);
        xhr.setRequestHeader = (header: string, value: string) => {
          requestHeaders[header] = value;
          return originalSetRequestHeader(header, value);
        };
        if (recordRequestHeaders) {
          networkRequest.requestHeaders = requestHeaders;
        }
        const originalSend = xhr.send.bind(xhr);
        xhr.send = (body) => {
          if (shouldRecordBody('request', options.recordBody, requestHeaders)) {
            if (body === undefined || body === null) {
              networkRequest.requestBody = null;
            } else {
              networkRequest.requestBody = body;
            }
          }
          after = win.performance.now();
          return originalSend(body);
        };
        xhr.addEventListener('readystatechange', () => {
          if (xhr.readyState !== xhr.DONE) {
            return;
          }
          before = win.performance.now();
          const responseHeaders: Headers = {};
          const rawHeaders = xhr.getAllResponseHeaders();
          const headers = rawHeaders.trim().split(/[\r\n]+/);
          headers.forEach((line) => {
            const parts = line.split(': ');
            const header = parts.shift();
            const value = parts.join(': ');
            if (header) {
              responseHeaders[header] = value;
            }
          });
          if (recordResponseHeaders) {
            networkRequest.responseHeaders = responseHeaders;
          }
          if (
            shouldRecordBody('response', options.recordBody, responseHeaders)
          ) {
            if (xhr.response === undefined || xhr.response === null) {
              networkRequest.responseBody = null;
            } else {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              networkRequest.responseBody = xhr.response;
            }
          }
          getRequestPerformanceEntry(
            win,
            'xmlhttprequest',
            req.url,
            after,
            before,
          )
            .then((entry) => {
              const request: NetworkRequest = {
                url: entry.name,
                method: req.method,
                initiatorType: entry.initiatorType as InitiatorType,
                status: xhr.status,
                startTime: Math.round(entry.startTime),
                endTime: Math.round(entry.responseEnd),
                requestHeaders: networkRequest.requestHeaders,
                requestBody: networkRequest.requestBody,
                responseHeaders: networkRequest.responseHeaders,
                responseBody: networkRequest.responseBody,
              };
              cb({ requests: [request] });
            })
            .catch(() => {
              //
            });
        });
        originalOpen.call(xhr, method, url, async, username, password);
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
  const recordRequestHeaders = shouldRecordHeaders(
    'request',
    options.recordHeaders,
  );
  const recordResponseHeaders = shouldRecordHeaders(
    'response',
    options.recordHeaders,
  );
  const restorePatch = patch(win, 'fetch', (originalFetch: typeof fetch) => {
    return async function (
      url: URL | RequestInfo,
      init?: RequestInit | undefined,
    ) {
      const req = new Request(url, init);
      let res: Response | undefined;
      const networkRequest: Partial<NetworkRequest> = {};
      let after: number | undefined;
      let before: number | undefined;
      try {
        const requestHeaders: Headers = {};
        req.headers.forEach((value, header) => {
          requestHeaders[header] = value;
        });
        if (recordRequestHeaders) {
          networkRequest.requestHeaders = requestHeaders;
        }
        if (shouldRecordBody('request', options.recordBody, requestHeaders)) {
          if (req.body === undefined || req.body === null) {
            networkRequest.requestBody = null;
          } else {
            networkRequest.requestBody = req.body;
          }
        }
        after = win.performance.now();
        res = await originalFetch(req);
        before = win.performance.now();
        const responseHeaders: Headers = {};
        res.headers.forEach((value, header) => {
          responseHeaders[header] = value;
        });
        if (recordResponseHeaders) {
          networkRequest.responseHeaders = responseHeaders;
        }
        if (shouldRecordBody('response', options.recordBody, responseHeaders)) {
          let body: string | undefined;
          try {
            body = await res.clone().text();
          } catch {
            //
          }
          if (res.body === undefined || res.body === null) {
            networkRequest.responseBody = null;
          } else {
            networkRequest.responseBody = body;
          }
        }
        return res;
      } finally {
        getRequestPerformanceEntry(win, 'fetch', req.url, after, before)
          .then((entry) => {
            const request: NetworkRequest = {
              url: entry.name,
              method: req.method,
              initiatorType: entry.initiatorType as InitiatorType,
              status: res?.status,
              startTime: Math.round(entry.startTime),
              endTime: Math.round(entry.responseEnd),
              requestHeaders: networkRequest.requestHeaders,
              requestBody: networkRequest.requestBody,
              responseHeaders: networkRequest.responseHeaders,
              responseBody: networkRequest.responseBody,
            };
            cb({ requests: [request] });
          })
          .catch(() => {
            //
          });
      }
    };
  });
  return () => {
    restorePatch();
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
  const networkOptions = (
    options
      ? Object.assign({}, defaultNetworkOptions, options)
      : defaultNetworkOptions
  ) as Required<NetworkRecordOptions>;

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
