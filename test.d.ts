declare module 'rollup-plugin-typescript' {
  function typescript(): any;
  export = typescript;
}

declare module 'rollup-plugin-node-resolve' {
  function resolve(): any;
  export = resolve;
}

declare module 'rollup-plugin-terser' {
  export function terser(options?: any): any;
}

declare module 'rollup-plugin-postcss' {
  function postcss(options?: any): any;
  export = postcss;
}

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
