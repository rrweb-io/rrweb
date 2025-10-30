import { encode } from 'base64-arraybuffer';
import type {
  DataURLOptions,
  ImageBitmapDataURLProcessor,
  ImageBitmapDataURLWorkerParams,
  ImageBitmapDataURLWorkerResponse,
} from '@junify-app/types';
import type { ImageBitmapDataURLRequestWorker } from './image-bitmap-data-url-worker';

const lastBlobMap: Map<number, string> = new Map();
const transparentBlobMap: Map<string, string> = new Map();

async function getTransparentBlobFor(
  width: number,
  height: number,
  dataURLOptions: DataURLOptions,
): Promise<string> {
  const id = `${width}-${height}`;
  if (!('OffscreenCanvas' in globalThis)) {
    return '';
  }
  if (transparentBlobMap.has(id)) return transparentBlobMap.get(id)!;
  const offscreen = new OffscreenCanvas(width, height);
  // Creating the rendering context ensures convertToBlob runs correctly.
  offscreen.getContext('2d');
  const blob = await offscreen.convertToBlob(dataURLOptions);
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = encode(arrayBuffer);
  transparentBlobMap.set(id, base64);
  return base64;
}

async function convertBitmapToDataURL(
  params: ImageBitmapDataURLWorkerParams,
): Promise<ImageBitmapDataURLWorkerResponse> {
  const { id, bitmap, width, height, dataURLOptions } = params;

  if (!('OffscreenCanvas' in globalThis)) {
    if ('close' in bitmap) {
      bitmap.close();
    }
    return { id, reason: 'offscreen-canvas-unavailable' };
  }

  const transparentBase64Promise = getTransparentBlobFor(
    width,
    height,
    dataURLOptions,
  );

  const offscreen = new OffscreenCanvas(width, height);
  const ctx = offscreen.getContext('2d');

  if (!ctx) {
    if ('close' in bitmap) {
      bitmap.close();
    }
    return { id, reason: 'no-2d-context' };
  }

  ctx.drawImage(bitmap, 0, 0);
  if ('close' in bitmap) {
    bitmap.close();
  }

  let sample: Uint8ClampedArray | null = null;
  try {
    sample = ctx.getImageData(0, 0, 1, 1).data;
  } catch {
    sample = null;
  }

  const blob = await offscreen.convertToBlob(dataURLOptions);
  const type = blob.type;
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = encode(arrayBuffer);

  // Avoid emitting empty/transparent canvases on first draw.
  const sampleSuggestsTransparent =
    sample !== null &&
    sample.length >= 4 &&
    sample[3] === 0 &&
    sample[0] === 0 &&
    sample[1] === 0 &&
    sample[2] === 0;

  if (
    !lastBlobMap.has(id) &&
    (await transparentBase64Promise) === base64 &&
    (sampleSuggestsTransparent || sample === null)
  ) {
    lastBlobMap.set(id, base64);
    return { id, reason: 'transparent' };
  }

  // Avoid re-emitting unchanged frames.
  if (lastBlobMap.get(id) === base64) {
    return { id, reason: 'unchanged' };
  }

  lastBlobMap.set(id, base64);
  return {
    id,
    type,
    base64,
    width,
    height,
  };
}

export const createInlineImageBitmapProcessor =
  (): ImageBitmapDataURLProcessor => (params) =>
    convertBitmapToDataURL(params);

type PendingWorkerRequest = {
  resolve: (value: ImageBitmapDataURLWorkerResponse) => void;
  reject: (reason?: unknown) => void;
};

const defaultOnWorkerError = (error: unknown) => {
  if (typeof console !== 'undefined' && console.warn) {
    console.warn('[rrweb] canvas worker processor failed, falling back', error);
  }
};

export const createWorkerImageBitmapProcessor = (
  worker: ImageBitmapDataURLRequestWorker,
  options?: {
    fallbackProcessor?: ImageBitmapDataURLProcessor;
    onError?: (error: unknown) => void;
  },
): ImageBitmapDataURLProcessor => {
  const fallbackProcessor =
    options?.fallbackProcessor ?? createInlineImageBitmapProcessor();
  const onError = options?.onError ?? defaultOnWorkerError;
  const pending = new Map<number, PendingWorkerRequest[]>();
  let workerFailed = false;

  const resolveResponse = (
    response: ImageBitmapDataURLWorkerResponse,
  ): void => {
    const queue = pending.get(response.id);
    if (!queue || queue.length === 0) {
      return;
    }
    const { resolve } = queue.shift()!;
    resolve(response);
    if (queue.length === 0) {
      pending.delete(response.id);
    }
  };

  const rejectAll = (error: unknown): void => {
    pending.forEach((queue, id) => {
      while (queue.length) {
        const { reject } = queue.shift()!;
        reject(error);
      }
      pending.delete(id);
    });
  };

  const handleMessage = (
    event: MessageEvent<ImageBitmapDataURLWorkerResponse>,
  ): void => {
    if (workerFailed) {
      return;
    }
    resolveResponse(event.data);
  };

  const handleMessageError = (event: unknown): void => {
    if (workerFailed) {
      return;
    }
    workerFailed = true;
    rejectAll(event);
    onError(event);
  };

  if (worker.addEventListener) {
    worker.addEventListener('message', handleMessage as EventListener);
    worker.addEventListener(
      'messageerror',
      handleMessageError as EventListener,
    );
  } else {
    worker.onmessage = handleMessage;
    worker.onmessageerror = handleMessageError as
      | null
      | ((message: MessageEvent<unknown>) => void);
  }

  worker.onerror = (event: ErrorEvent) => {
    handleMessageError(event);
  };

  return (params) => {
    if (workerFailed) {
      return fallbackProcessor(params);
    }

    return new Promise<ImageBitmapDataURLWorkerResponse>((resolve, reject) => {
      const queue = pending.get(params.id);
      if (queue) {
        queue.push({ resolve, reject });
      } else {
        pending.set(params.id, [{ resolve, reject }]);
      }

      try {
        worker.postMessage(params, [params.bitmap]);
      } catch (error) {
        const existing = pending.get(params.id);
        if (existing) {
          existing.pop();
          if (existing.length === 0) {
            pending.delete(params.id);
          }
        }
        workerFailed = true;
        onError(error);
        fallbackProcessor(params)
          .then((response) => {
            resolve(response);
          })
          .catch((fallbackError) => {
            reject(fallbackError);
          });
      }
    });
  };
};

export const createWorkerMessageHandler = (
  postMessage: (message: ImageBitmapDataURLWorkerResponse) => void,
): ((event: MessageEvent<ImageBitmapDataURLWorkerParams>) => Promise<void>) => {
  return async (event) => {
    try {
      const response = await convertBitmapToDataURL(event.data);
      postMessage(response);
    } catch (error) {
      postMessage({ id: event.data.id });
      throw error;
    }
  };
};
