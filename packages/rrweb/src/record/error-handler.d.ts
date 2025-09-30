import type { ErrorHandler } from '../types';
type Callback = (...args: unknown[]) => unknown;
export declare function registerErrorHandler(handler: ErrorHandler | undefined): void;
export declare function unregisterErrorHandler(): void;
export declare const callbackWrapper: <T extends Callback>(cb: T) => T;
export {};
