import type { ImageBitmapDataURLWorkerParams, ImageBitmapDataURLWorkerResponse } from '../../types';
export interface ImageBitmapDataURLRequestWorker {
    postMessage: (message: ImageBitmapDataURLWorkerParams, transfer?: [ImageBitmap]) => void;
    onmessage: (message: MessageEvent<ImageBitmapDataURLWorkerResponse>) => void;
}
