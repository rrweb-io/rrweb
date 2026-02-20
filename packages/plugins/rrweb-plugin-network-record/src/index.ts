import type { listenerHandler, RecordPlugin, IWindow } from '@rrweb/types';
import { patch } from '@rrweb/utils';

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
  transformRequestFn?: (request: NetworkRequest) => NetworkRequest | undefined;
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
  transformRequestFn: (request) => request,
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

type NetworkRequest = Omit<
  PerformanceEntry,
  'toJSON' | 'startTime' | 'endTime' | 'duration' | 'entryType'
> & {
  method?: string;
  initiatorType?: InitiatorType;
  status?: number;
  startTime?: number;
  endTime?: number;
  duration?: number;
  entryType?: string;
  requestHeaders?: Headers;
  requestBody?: Body;
  responseHeaders?: Headers;
  responseBody?: Body;
  // was this captured before fetch/xhr could have been wrapped
  isInitial?: boolean;
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
      .filter(
        (entry): entry is ObservedPerformanceEntry =>
          isNavigationTiming(entry) ||
          (isResourceTiming(entry) &&
            options.initiatorTypes.includes(
              entry.initiatorType as InitiatorType,
            )),
      );
    cb({
      requests: initialPerformanceEntries.map((entry) => ({
        initiatorType: entry.initiatorType as InitiatorType,
        duration: entry.duration,
        entryType: entry.entryType,
        name: entry.name,
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
        initiatorType: entry.initiatorType as InitiatorType,
        status: 'responseStatus' in entry ? entry.responseStatus : undefined,
        startTime: Math.round(entry.startTime),
        endTime: Math.round(entry.responseEnd),
        duration: entry.duration,
        entryType: entry.entryType,
        name: entry.name,
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
): Promise<PerformanceResourceTiming | null> {
  if (attempt > 10) {
    return null;
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
    // @ts-expect-error // fix types
    (originalOpen: typeof XMLHttpRequest.prototype.open) => {
      return function (
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        async = true,
        username?: string | null,
        password?: string | null,
      ) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const xhr = this;
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
              if (!entry) {
                // https://github.com/rrweb-io/rrweb/pull/1105#issuecomment-1953808336
                const requests = prepareRequestWithoutPerformance(
                  req,
                  networkRequest,
                );
                cb({ requests });
                return;
              }

              const requests = prepareRequest(
                entry,
                req.method,
                xhr.status,
                networkRequest,
              );
              cb({ requests });
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
  // @ts-expect-error // fix types
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
            if (!entry) {
              // https://github.com/rrweb-io/rrweb/pull/1105#issuecomment-1953808336
              const requests = prepareRequestWithoutPerformance(
                req,
                networkRequest,
              );
              cb({ requests });
              return;
            }

            const requests = prepareRequest(
              entry,
              req.method,
              res?.status,
              networkRequest,
            );
            cb({ requests });
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
    const requests = data.requests
      .map((request) => networkOptions.transformRequestFn(request))
      .filter(Boolean) as NetworkRequest[];

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

function prepareRequest(
  entry: PerformanceResourceTiming,
  method: string | undefined,
  status: number | undefined,
  networkRequest: Partial<NetworkRequest>,
): NetworkRequest[] {
  const request: NetworkRequest = {
    method,
    initiatorType: entry.initiatorType as InitiatorType,
    duration: entry.duration,
    entryType: entry.entryType,
    name: entry.name,
    status,
    startTime: Math.round(entry.startTime),
    endTime: Math.round(entry.responseEnd),
    requestHeaders: networkRequest.requestHeaders,
    requestBody: networkRequest.requestBody,
    responseHeaders: networkRequest.responseHeaders,
    responseBody: networkRequest.responseBody,
  };

  return [request];
}

function prepareRequestWithoutPerformance(
  req: Request,
  networkRequest: Partial<NetworkRequest>,
): NetworkRequest[] {
  const request: NetworkRequest = {
    name: req.url,
    method: req.method,
    requestHeaders: networkRequest.requestHeaders,
    requestBody: networkRequest.requestBody,
    responseHeaders: networkRequest.responseHeaders,
    responseBody: networkRequest.responseBody,
  };

  return [request];
}

function findLast<T>(
  array: Array<T>,
  predicate: (value: T) => boolean,
): T | undefined {
  const length = array.length;
  for (let i = length - 1; i >= 0; i -= 1) {
    if (predicate(array[i])) {
      return array[i];
    }
  }
}

export const PLUGIN_NAME = 'rrweb/network@1';

export const getRecordNetworkPlugin: (
  options?: NetworkRecordOptions,
) => RecordPlugin = (options) => ({
  name: PLUGIN_NAME,
  // @ts-expect-error // fix types
  observer: initNetworkObserver,
  options: options,
});
