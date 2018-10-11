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

export type incrementalSnapshotEvent = {
  type: EventType.IncrementalSnapshot;
  data: incrementalData;
};

export enum IncrementalSource {
  Mutation,
  MouseMove,
  MouseInteraction,
  Scroll,
  ViewportResize,
  Input,
}

export type mutationData = {
  source: IncrementalSource.Mutation;
} & mutationCallbackParam;

export type mousemoveData = {
  source: IncrementalSource.MouseMove;
  positions: mousePosition[];
};

export type mouseInteractionData = {
  source: IncrementalSource.MouseInteraction;
} & mouseInteractionParam;

export type scrollData = {
  source: IncrementalSource.Scroll;
} & scrollPosition;

export type viewportResizeData = {
  source: IncrementalSource.ViewportResize;
} & viewportResizeDimention;

export type inputData = {
  source: IncrementalSource.Input;
  id: number;
} & inputValue;

export type incrementalData =
  | mutationData
  | mousemoveData
  | mouseInteractionData
  | scrollData
  | viewportResizeData
  | inputData;

export type event =
  | domContentLoadedEvent
  | loadedEvent
  | fullSnapshotEvent
  | incrementalSnapshotEvent;

export type eventWithTime = event & {
  timestamp: number;
};

export type recordOptions = {
  emit?: (e: eventWithTime) => void;
};

export type observerParam = {
  mutationCb: mutationCallBack;
  mousemoveCb: mousemoveCallBack;
  mouseInteractionCb: mouseInteractionCallBack;
  scrollCb: scrollCallback;
  viewportResizeCb: viewportResizeCallback;
  inputCb: inputCallback;
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

export type mousemoveCallBack = (p: mousePosition[]) => void;

export type mousePosition = {
  x: number;
  y: number;
  timeOffset: number;
};

export enum MouseInteractions {
  MouseUp,
  MouseDown,
  Click,
  ContextMenu,
  DblClick,
  Focus,
  Blur,
  TouchStart,
  TouchMove,
  TouchEnd,
}

type mouseInteractionParam = {
  type: MouseInteractions;
  id: number;
  x: number;
  y: number;
};

export type mouseInteractionCallBack = (d: mouseInteractionParam) => void;

export type scrollPosition = {
  id: number;
  x: number;
  y: number;
};

export type scrollCallback = (p: scrollPosition) => void;

export type viewportResizeDimention = {
  width: number;
  height: number;
};

export type viewportResizeCallback = (d: viewportResizeDimention) => void;

export type inputValue = {
  text: string;
  isChecked: boolean;
};

export type inputCallback = (v: inputValue & { id: number }) => void;

export type Mirror = {
  map: idNodeMap;
  getId: (n: INode) => number;
  getNode: (id: number) => INode;
  removeNodeFromMap: (n: INode) => void;
};

export type throttleOptions = {
  leading?: boolean;
  trailing?: boolean;
};

export type listenerHandler = () => void;
export type hookResetter = () => void;
