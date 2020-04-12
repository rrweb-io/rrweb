import * as fsm from '@xstate/fsm';

declare module '@xstate/fsm' {
  export namespace StateMachine {
    interface Service<
      TContext extends object,
      TEvent extends fsm.EventObject,
      TState extends fsm.Typestate<TContext> = any
    > {
      send: (event: TEvent | TEvent['type']) => void;
      subscribe: (
        listener: StateListener<State<TContext, TEvent, TState>>,
      ) => {
        unsubscribe: () => void;
      };
      start: () => Service<TContext, TEvent, TState>;
      stop: () => Service<TContext, TEvent, TState>;
      readonly status: fsm.InterpreterStatus;
      readonly state: State<TContext, TEvent, TState>;
    }
  }
}
