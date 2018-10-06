export enum EventType {
  DomContentLoaded,
  Load,
  FullSnapshot,
  IncrementalSnapshot,
}

export type event = {
  type: EventType;
  timestamp: number;
  data: any;
};
