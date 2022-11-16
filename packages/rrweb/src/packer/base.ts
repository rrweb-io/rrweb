export type PackFn<T extends { timestamp: number }> = (event: T) => string;
export type UnpackFn<T extends { timestamp: number }> = (raw: string) => T;

export type eventWithTimeAndPacker<T extends { timestamp: number }> = T & {
  v: string;
};

export const MARK = 'v1';
