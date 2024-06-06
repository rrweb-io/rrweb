import type { ErrorHandler } from '../types';

type Callback = (...args: unknown[]) => unknown;
type GenericFunction = (...args: any[]) => any;
type ExternalError = Error & {_external_: boolean}

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

export function externalFunctionWrapper<T extends GenericFunction>(func: T): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>) => {
    try {
      return func(...args);
    } catch (error) {
        try {
            (error as ExternalError)._external_ = true;
        } catch {
          // in case we can't assign, don't do anything.
        }
        throw error
  };
}
}
