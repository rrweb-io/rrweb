import type {
  listenerHandler,
  RecordPlugin,
  IWindow,
  NetworkBody,
  NetworkData,
  NetworkHeaders,
  NetworkInitiatorType,
  NetworkRecordOptions,
  NetworkRequest,
} from '@rrweb/types';
import { patch } from '@rrweb/utils';

export type {
  NetworkBody,
  NetworkData,
  NetworkHeaders,
  NetworkInitiatorType,
  NetworkRecordOptions,
  NetworkRequest,
} from '@rrweb/types';

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

function getPerformanceEntryInitiatorType(
  entry: ObservedPerformanceEntry,
): NetworkInitiatorType {
  return isNavigationTiming(entry)
    ? 'navigation'
    : (entry.initiatorType as NetworkInitiatorType);
}

function shouldRecordPerformanceEntry(
  entry: PerformanceEntry,
  options: Required<NetworkRecordOptions>,
): entry is ObservedPerformanceEntry {
  return (
    (isNavigationTiming(entry) || isResourceTiming(entry)) &&
    options.initiatorTypes.includes(
      getPerformanceEntryInitiatorType(entry as ObservedPerformanceEntry),
    )
  );
}

function initPerformanceObserver(
  cb: networkCallback,
  win: IWindow,
  options: Required<NetworkRecordOptions>,
) {
  if (options.recordInitialRequests) {
    const initialPerformanceEntries = win.performance
      .getEntries()
      .filter((entry): entry is ObservedPerformanceEntry =>
        shouldRecordPerformanceEntry(entry, options),
      );
    cb({
      requests: initialPerformanceEntries.map((entry) => ({
        initiatorType: getPerformanceEntryInitiatorType(entry),
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
    const shouldRecordViaPerformanceObserver = (
      entry: ObservedPerformanceEntry,
    ) =>
      options.recordBody || options.recordHeaders
        ? entry.initiatorType !== 'xmlhttprequest' &&
          entry.initiatorType !== 'fetch'
        : true;
    const performanceEntries = entries
      .getEntries()
      .filter(
        (entry): entry is ObservedPerformanceEntry =>
          shouldRecordPerformanceEntry(entry, options) &&
          shouldRecordViaPerformanceObserver(entry),
      );
    cb({
      requests: performanceEntries.map((entry) => ({
        initiatorType: getPerformanceEntryInitiatorType(entry),
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
  headers: NetworkHeaders,
  url?: string | URL | RequestInfo,
) {
  function matchesContentType(contentTypes: string[]) {
    const contentTypeHeader = Object.keys(headers).find(
      (key) => key.toLowerCase() === 'content-type',
    );
    const contentType = contentTypeHeader && headers[contentTypeHeader];
    return contentTypes.some((ct) => contentType?.includes(ct));
  }
  if (isBlobUrl(url)) return false;
  if (!recordBody) return false;
  if (typeof recordBody === 'boolean') return true;
  if (Array.isArray(recordBody)) return matchesContentType(recordBody);
  const recordBodyType = recordBody[type];
  if (typeof recordBodyType === 'boolean') return recordBodyType;
  return matchesContentType(recordBodyType);
}

function isRequest(value: unknown): value is Request {
  if (typeof Request === 'undefined') {
    return false;
  }
  if (value instanceof Request) {
    return true;
  }
  try {
    return Object.prototype.toString.call(value) === '[object Request]';
  } catch {
    return false;
  }
}

function isBlobUrl(url?: string | URL | RequestInfo) {
  try {
    if (typeof url === 'string') {
      return url.startsWith('blob:');
    }
    if (url instanceof URL) {
      return url.protocol === 'blob:';
    }
    if (isRequest(url)) {
      return isBlobUrl(url.url);
    }
  } catch {
    //
  }
  return false;
}

function isReadableStreamBody(
  body: unknown,
): body is ReadableStream<Uint8Array> {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as ReadableStream<Uint8Array>).getReader === 'function' &&
    typeof (body as ReadableStream<Uint8Array>).tee === 'function'
  );
}

function stringifyFormData(body: FormData) {
  const searchParams = new URLSearchParams();
  body.forEach((value, key) => {
    searchParams.append(
      key,
      typeof File !== 'undefined' && value instanceof File
        ? value.name
        : String(value),
    );
  });
  return searchParams.toString();
}

function readXhrBody(
  body: Document | XMLHttpRequestBodyInit | unknown | null | undefined,
): NetworkBody {
  if (body === undefined || body === null) {
    return null;
  }
  if (typeof body === 'string') {
    return body;
  }
  if (body instanceof URLSearchParams) {
    return body.toString();
  }
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return stringifyFormData(body);
  }
  if (typeof Document !== 'undefined' && body instanceof Document) {
    return body.textContent;
  }
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return `[rrweb/network] Cannot synchronously read body of type ${body.constructor.name}`;
  }
  if (
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body as ArrayBufferView)
  ) {
    return `[rrweb/network] Cannot read binary body`;
  }
  try {
    return JSON.stringify(body);
  } catch {
    return `[rrweb/network] Failed to stringify body`;
  }
}

async function readFetchBody(requestOrResponse: Request | Response) {
  return new Promise<NetworkBody>((resolve) => {
    const timeout = setTimeout(
      () => resolve('[rrweb/network] Timeout while reading body'),
      500,
    );
    try {
      requestOrResponse
        .clone()
        .text()
        .then(
          (text) => resolve(text),
          (error: unknown) =>
            resolve(`[rrweb/network] Failed to read body: ${String(error)}`),
        )
        .finally(() => clearTimeout(timeout));
    } catch {
      clearTimeout(timeout);
      resolve('[rrweb/network] Failed to read body');
    }
  });
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
  const restorePatch = patch(win.XMLHttpRequest.prototype, 'open', ((
    originalOpen: typeof XMLHttpRequest.prototype.open,
  ) => {
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
      const req = new Request(url, { method });
      const networkRequest: Partial<NetworkRequest> = {};
      let after: number | undefined;
      let before: number | undefined;
      const requestHeaders: NetworkHeaders = {};
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
        if (
          shouldRecordBody('request', options.recordBody, requestHeaders, url)
        ) {
          networkRequest.requestBody = readXhrBody(body);
        }
        after = win.performance.now();
        return originalSend(body);
      };
      xhr.addEventListener('readystatechange', () => {
        if (xhr.readyState !== xhr.DONE) {
          return;
        }
        before = win.performance.now();
        const responseHeaders: NetworkHeaders = {};
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
          shouldRecordBody('response', options.recordBody, responseHeaders, url)
        ) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          networkRequest.responseBody = readXhrBody(xhr.response);
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
              method,
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
  }) as (...args: unknown[]) => unknown);
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
  const restorePatch = patch(win, 'fetch', ((originalFetch: typeof fetch) => {
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
        const requestHeaders: NetworkHeaders = {};
        req.headers.forEach((value, header) => {
          requestHeaders[header] = value;
        });
        if (recordRequestHeaders) {
          networkRequest.requestHeaders = requestHeaders;
        }
        if (
          !isReadableStreamBody(init?.body) &&
          shouldRecordBody('request', options.recordBody, requestHeaders, url)
        ) {
          networkRequest.requestBody = await readFetchBody(req);
        }
        after = win.performance.now();
        res = isRequest(url)
          ? await originalFetch(req)
          : await originalFetch(url, init);
        before = win.performance.now();
        const responseHeaders: NetworkHeaders = {};
        res.headers.forEach((value, header) => {
          responseHeaders[header] = value;
        });
        if (recordResponseHeaders) {
          networkRequest.responseHeaders = responseHeaders;
        }
        if (
          shouldRecordBody('response', options.recordBody, responseHeaders, url)
        ) {
          networkRequest.responseBody = await readFetchBody(res);
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
  }) as (...args: unknown[]) => unknown);
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
  let xhrObserver: listenerHandler = () => {
    //
  };
  let fetchObserver: listenerHandler = () => {
    //
  };
  if (networkOptions.recordHeaders || networkOptions.recordBody) {
    xhrObserver = initXhrObserver(cb, win, networkOptions);
    fetchObserver = initFetchObserver(cb, win, networkOptions);
  }
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
    initiatorType: entry.initiatorType as NetworkInitiatorType,
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
  observer: initNetworkObserver as RecordPlugin['observer'],
  options: options,
});
