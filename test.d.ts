declare module 'jest-snapshot' {
  export class SnapshotState {
    constructor(testFile: string, options: any);

    save(): any;
  }
  type matchResult = {
    pass: boolean;
    report(): string;
  };
  export function toMatchSnapshot(
    received: any,
    propertyMatchers?: any,
    testName?: string,
  ): matchResult;
}
