import workerString from './image-bitmap-data-url-worker';

/**
 * Get the URL for a web worker.
 */
export function getImageBitmapDataUrlWorkerURL(): string {
  const workerBlob = new Blob([workerString]);
  return URL.createObjectURL(workerBlob);
}
