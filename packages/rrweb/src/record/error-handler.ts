import type { ErrorHandler } from '../types';

type Callback = (...args: unknown[]) => unknown;

let errorHandler: ErrorHandler | undefined;

export function registerErrorHandler(handler: ErrorHandler | undefined) {
  errorHandler = handler;
}

export function unregisterErrorHandler() {
  errorHandler = undefined;
}

/**
 * Wrap callbacks in a wrapper that allows to pass errors to a configured `errorHandler` method.
 */
export const callbackWrapper = <T extends Callback>(cb: T): T => {
  if (!errorHandler) {
    return cb;
  }

  const rrwebWrapped = ((...rest: unknown[]) => {
    try {
      return cb(...rest);
    } catch (error) {
      if (errorHandler && errorHandler(error) === true) {
        return;
      }

      throw error;
    }
  }) as unknown as T;

  return rrwebWrapped;
};
