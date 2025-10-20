import type { ErrorHandler } from '../types';

// Loosen the callback parameter typing to avoid assignability friction when
// wrapping strongly typed functions (e.g. MutationObserver callbacks) while
// keeping the generic so original parameter/return types are preserved.
// Using `any` here is intentional; the wrapper does not alter parameters.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Callback = (...args: any[]) => any;

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
