/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */

import type { IWindow, listenerHandler, RecordPlugin } from '@rrweb/types';

type NetworkRecordOptions = {
  captureHeaders?: boolean;
  captureBody?: boolean;
  capturePerformance?: boolean;
};

const defaultNetworkOptions: NetworkRecordOptions = {
  captureHeaders: false,
  captureBody: false,
  capturePerformance: true,
};

export type NetworkData = {
  method: string;
  url: string;
  status: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  performance?: PerformanceResourceTiming;
};

type networkCallback = (p: NetworkData) => void;

function initNetworkObserver(
  cb: networkCallback,
  win: IWindow, // top window or in an iframe
  options: NetworkRecordOptions,
): listenerHandler {
  const networkOptions = options
    ? Object.assign({}, defaultNetworkOptions, options)
    : defaultNetworkOptions;

  // Check if performance is supported
  if (!('performance' in win)) {
    networkOptions.capturePerformance = false;
  }

  let networkCount = 1;
  const cancelHandlers: listenerHandler[] = [];

  // Store a reference to the native method
  const originalOpen = XMLHttpRequest.prototype.open;
  // Overwrite the native method
  XMLHttpRequest.prototype.open = function (
    method,
    url,
    async = true,
    username = undefined,
    password = undefined,
  ) {
    networkCount += 1;
    const markName = `xhr-${networkCount}`;
    const that = this as XMLHttpRequest;

    const requestUrl: string = typeof url === 'string' ? url : url.toString();
    const requestHeaders: Record<string, string> = {};
    const responseHeaders: Record<string, string> = {};
    let requestBody: any = null;
    let responseBody: any = null;
    let status: number | undefined;
    let performance: PerformanceResourceTiming | undefined;

    // Capture set request headers
    if (networkOptions.captureHeaders) {
      const originalSetRequestHeader = that.setRequestHeader;
      that.setRequestHeader = function (header: string, value: string) {
        requestHeaders[header] = value;
        originalSetRequestHeader.call(this, header, value);
      };
    }

    // Capture sent request body
    const originalSend = that.send;
    that.send = function (body) {
      if (networkOptions.captureBody && typeof body !== 'undefined') {
        requestBody = body;
      }
      // Set a mark before we trigger the XHR so we can find the performance data easier
      win.performance.mark(markName);
      originalSend.call(this, body);
    };

    // Capture recieved response body
    if (networkOptions.captureBody) {
      function onLoad() {
        responseBody = that.response;
      }
      cancelHandlers.push(() => {
        that.removeEventListener('load', onLoad);
      });
    }

    function onLoadend() {
      // Get the raw header string
      const rawHeaders = that.getAllResponseHeaders();

      // Convert the header string into an array of individual headers
      const headers = rawHeaders.trim().split(/[\r\n]+/);

      // Create a map of header names to values
      headers.forEach((line) => {
        const parts = line.split(': ');
        const header = parts.shift();
        const value = parts.join(': ');
        if (typeof header === 'string') {
          responseHeaders[header] = value;
        }
      });

      // Set response status
      status = that.status;

      // Get performance data
      const marks = win.performance.getEntries() as PerformanceResourceTiming[];
      const markIndex = marks.findIndex((mark) => mark.name === markName);
      if (markIndex >= 0) {
        performance = marks.find((mark, index) => {
          return (
            index >= markIndex &&
            mark.initiatorType === 'xmlhttprequest' &&
            mark.name?.includes(requestUrl)
          );
        });
      }

      // Clear performance mark
      win.performance.clearMarks(markName);

      const networkData: NetworkData = {
        method,
        url: requestUrl,
        status,
        ...(networkOptions.captureHeaders && {
          requestHeaders,
          responseHeaders,
        }),
        ...(networkOptions.captureBody && {
          requestBody,
          responseBody,
        }),
        performance,
      };

      cb(networkData);
    }

    that.addEventListener('loadend', onLoadend);
    cancelHandlers.push(() => {
      that.removeEventListener('loadend', onLoadend);
    });

    // Call the stored reference to the native method
    originalOpen.call(
      that,
      method,
      url,
      async as boolean,
      username as string | null | undefined,
      password as string | null | undefined,
    );
  };

  return () => {
    cancelHandlers.forEach((h) => h());
  };
}

export const PLUGIN_NAME = 'rrweb/network@2';

export const getRecordConsolePlugin: (
  options?: NetworkRecordOptions,
) => RecordPlugin = (options) => ({
  name: PLUGIN_NAME,
  observer: initNetworkObserver,
  options: options,
});
