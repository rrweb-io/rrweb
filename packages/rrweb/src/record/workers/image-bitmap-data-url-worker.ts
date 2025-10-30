import type {
  ImageBitmapDataURLWorkerParams,
  ImageBitmapDataURLWorkerResponse,
} from '@junify-app/types';
import { createWorkerMessageHandler } from './image-bitmap-data-url-processor';

export interface ImageBitmapDataURLRequestWorker {
  postMessage(
    message: ImageBitmapDataURLWorkerParams,
    transfer: Transferable[],
  ): void;

  postMessage(
    message: ImageBitmapDataURLWorkerParams,
    options?: StructuredSerializeOptions,
  ): void;

  onmessage:
    | null
    | ((message: MessageEvent<ImageBitmapDataURLWorkerResponse>) => void);
  onmessageerror?: null | ((message: MessageEvent<unknown>) => void);
  onerror?: null | ((event: ErrorEvent) => void);
  addEventListener?: (
    type: 'message' | 'messageerror',
    listener: EventListenerOrEventListenerObject,
  ) => void;
  removeEventListener?: (
    type: 'message' | 'messageerror',
    listener: EventListenerOrEventListenerObject,
  ) => void;
}

interface ImageBitmapDataURLResponseWorker {
  onmessage:
    | null
    | ((message: MessageEvent<ImageBitmapDataURLWorkerParams>) => void);

  postMessage(e: ImageBitmapDataURLWorkerResponse): void;
}

// `as any` because: https://github.com/Microsoft/TypeScript/issues/20595
const worker = self as unknown as ImageBitmapDataURLResponseWorker;

const handler = createWorkerMessageHandler((message) => {
  worker.postMessage(message);
});

worker.onmessage = (event) => {
  return handler(event);
};
