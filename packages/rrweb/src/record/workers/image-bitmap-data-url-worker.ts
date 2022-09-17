import { encode } from 'base64-arraybuffer';
import type {
  ImageBitmapDataURLWorkerParams,
  ImageBitmapDataURLWorkerResponse,
} from '../../types';

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
): Promise<string> {
  const id = `${width}-${height}`;
  if (transparentBlobMap.has(id)) return transparentBlobMap.get(id)!;
  // offScreenCanvas will significantly increase the requirements for browser compatibility so that I disable this rule here.
  // eslint-disable-next-line compat/compat
  const offscreen = new OffscreenCanvas(width, height);
  offscreen.getContext('2d'); // creates rendering context for `converToBlob`
  const blob = await offscreen.convertToBlob(); // takes a while
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = encode(arrayBuffer); // cpu intensive
  transparentBlobMap.set(id, base64);
  return base64;
}

// `as any` because: https://github.com/Microsoft/TypeScript/issues/20595
const worker: ImageBitmapDataURLResponseWorker = self;

// eslint-disable-next-line @typescript-eslint/no-misused-promises
worker.onmessage = async function (e) {
  if (!('OffscreenCanvas' in globalThis))
    return worker.postMessage({ id: e.data.id });

  const { id, bitmap, width, height } = e.data;

  const transparentBase64 = getTransparentBlobFor(width, height);

  // eslint-disable-next-line compat/compat
  const offscreen = new OffscreenCanvas(width, height);
  const ctx = offscreen.getContext('2d')!;

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await offscreen.convertToBlob(); // takes a while
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
};
