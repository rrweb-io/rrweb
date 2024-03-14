import { encode } from 'base64-arraybuffer';
import type { DataURLOptions } from '@sentry-internal/rrweb-snapshot';
import type {
  ImageBitmapDataURLWorkerParams,
  ImageBitmapDataURLWorkerResponse,
} from '@sentry-internal/rrweb-types';

const lastBlobMap: Map<number, string> = new Map();
const transparentBlobMap: Map<string, string> = new Map();

export interface ImageBitmapDataURLRequestWorker {
  postMessage: (
    message: ImageBitmapDataURLWorkerParams,
    transfer?: [ImageBitmap],
  ) => void;
  onmessage: (message: MessageEvent<ImageBitmapDataURLWorkerResponse>) => void;
}

interface ImageBitmapDataURLResponseWorker {
  onmessage:
    | null
    | ((message: MessageEvent<ImageBitmapDataURLWorkerParams>) => void);
  postMessage(e: ImageBitmapDataURLWorkerResponse): void;
}

async function getTransparentBlobFor(
  width: number,
  height: number,
  dataURLOptions: DataURLOptions,
): Promise<string> {
  const id = width + '-' + height;
  if ('OffscreenCanvas' in globalThis) {
    if (transparentBlobMap.has(id)) return transparentBlobMap.get(id)!;
    const offscreen = new OffscreenCanvas(width, height);
    offscreen.getContext('2d'); // creates rendering context for `converToBlob`
    const blob = await offscreen.convertToBlob(dataURLOptions); // takes a while
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = encode(arrayBuffer); // cpu intensive
    transparentBlobMap.set(id, base64);
    return base64;
  } else {
    return '';
  }
}

// `as any` because: https://github.com/Microsoft/TypeScript/issues/20595
const worker: ImageBitmapDataURLResponseWorker = self;

const processEvent = async function (e: MessageEvent<ImageBitmapDataURLWorkerParams>) {
  if ('OffscreenCanvas' in globalThis) {
    const { id, bitmap, width, height, dataURLOptions } = e.data;

    const transparentBase64 = getTransparentBlobFor(
      width,
      height,
      dataURLOptions,
    );

    const offscreen = new OffscreenCanvas(width, height);
    const ctx = offscreen.getContext('2d')!;

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await offscreen.convertToBlob(dataURLOptions); // takes a while
    const type = blob.type;
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = encode(arrayBuffer); // cpu intensive

    // on first try we should check if canvas is transparent,
    // no need to save it's contents in that case
    if (!lastBlobMap.has(id) && (await transparentBase64) === base64) {
      lastBlobMap.set(id, base64);
      return worker.postMessage({ id });
    }

    if (lastBlobMap.get(id) === base64) return worker.postMessage({ id }); // unchanged
    worker.postMessage({
      id,
      type,
      base64,
      width,
      height,
    });
    lastBlobMap.set(id, base64);
  } else {
    return worker.postMessage({ id: e.data.id });
  }
};

worker.onmessage = function (e) {
  // OffscreenCanvas operations sometimes block UI operations in main thread in Chrome,
  // https://stackoverflow.com/questions/61475472/does-web-worker-block-on-the-main-thread-for-some-offscreencanvas-functions
  // setTimeout(fn, 1) fixes the issue
  setTimeout(() => processEvent(e), 1)
}
