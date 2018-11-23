// TODO: remove this when mitt updated
declare namespace mitt {
  interface MittStatic {
    (all?: { [key: string]: Array<Handler> }): Emitter;
  }
}

declare module 'delegated-events' {
  type EventHandler = (event: Event) => any;

  type EventListenerOptions = {
    capture?: boolean;
    document?: Document;
  };

  export function on(
    name: string,
    selector: string,
    handler: EventHandler,
    options?: EventListenerOptions,
  ): void;
  export function off(
    name: string,
    selector: string,
    handler: EventHandler,
    options?: EventListenerOptions,
  ): void;
  export function fire(target: EventTarget, name: string, detail?: any): void;
}
