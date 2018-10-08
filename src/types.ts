import { serializedNodeWithId, idNodeMap, INode } from 'rrweb-snapshot';

export enum EventType {
  DomContentLoaded,
  Load,
  FullSnapshot,
  IncrementalSnapshot,
}

export type domContentLoadedEvent = {
  type: EventType.DomContentLoaded;
  data: {
    href: string;
  };
};

export type loadedEvent = {
  type: EventType.Load;
  data: {};
};

export type fullSnapshotEvent = {
  type: EventType.FullSnapshot;
  data: {
    node: serializedNodeWithId;
  };
};

export enum IncrementalSource {
  Mutation,
}

export type incrementalSnapshotEvent = {
  type: EventType.IncrementalSnapshot;
  data: incrementalData;
};

export type mutationData = {
  source: IncrementalSource.Mutation;
} & mutationCallbackParam;

export type incrementalData = mutationData;

export type event =
  | domContentLoadedEvent
  | loadedEvent
  | fullSnapshotEvent
  | incrementalSnapshotEvent;

export type eventWithTime = event & {
  timestamp: number;
};

export type recordOptions = {
  emit: (e: eventWithTime) => void;
};

export type observerParam = {
  mutationCb: mutationCallBack;
};

export type textMutation = {
  id: number;
  value: string | null;
};

export type attributeMutation = {
  id: number;
  attributes: {
    [key: string]: string | null;
  };
};

export type removedNodeMutation = {
  parentId: number;
  id: number;
};

export type addedNodeMutation = {
  parentId: number;
  previousId: number | null;
  nextId: number | null;
  id: number;
};

type mutationCallbackParam = {
  texts: textMutation[];
  attributes: attributeMutation[];
  removes: removedNodeMutation[];
  adds: addedNodeMutation[];
};

export type mutationCallBack = (m: mutationCallbackParam) => void;

export type Mirror = {
  map: idNodeMap;
  getId: (n: INode) => number;
  getNode: (id: number) => INode;
};
