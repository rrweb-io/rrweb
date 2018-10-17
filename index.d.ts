// TODO: remove this when mitt updated
declare namespace mitt {
  interface MittStatic {
    (all?: { [key: string]: Array<Handler> }): Emitter;
  }
}
