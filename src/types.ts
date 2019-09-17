import { serializedNodeWithId, idNodeMap, INode } from 'rrweb-snapshot';

export enum EventType {
  DomContentLoaded,
  Load,
  FullSnapshot,
  IncrementalSnapshot,
  Meta,
  Custom,
}

export type domContentLoadedEvent = {
  type: EventType.DomContentLoaded;
  data: {};
};

export type loadedEvent = {
  type: EventType.Load;
  data: {};
};

export type fullSnapshotEvent = {
  type: EventType.FullSnapshot;
  data: {
    node: serializedNodeWithId;
    initialOffset: {
      top: number;
      left: number;
    };
  };
};

export type incrementalSnapshotEvent = {
  type: EventType.IncrementalSnapshot;
  data: incrementalData;
};

export type metaEvent = {
  type: EventType.Meta;
  data: {
    href: string;
    width: number;
    height: number;
  };
};

export type customEvent<T = unknown> = {
  type: EventType.Custom;
  data: {
    tag: string;
    payload: T;
  };
};

export enum IncrementalSource {
  Mutation,
  MouseMove,
  MouseInteraction,
  Scroll,
  ViewportResize,
  Input,
  TouchMove,
}

export type mutationData = {
  source: IncrementalSource.Mutation;
} & mutationCallbackParam;

export type mousemoveData = {
  source: IncrementalSource.MouseMove | IncrementalSource.TouchMove;
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
  | incrementalSnapshotEvent
  | metaEvent
  | customEvent;

export type eventWithTime = event & {
  timestamp: number;
  delay?: number;
};

export type blockClass = string | RegExp;

export type recordOptions = {
  emit?: (e: eventWithTime, isCheckout?: boolean) => void;
  checkoutEveryNth?: number;
  checkoutEveryNms?: number;
  blockClass?: blockClass;
  ignoreClass?: string;
  maskAllInputs?: boolean;
  inlineStylesheet?: boolean;
  hooks?: hooksParam;
};

export type observerParam = {
  mutationCb: mutationCallBack;
  mousemoveCb: mousemoveCallBack;
  mouseInteractionCb: mouseInteractionCallBack;
  scrollCb: scrollCallback;
  viewportResizeCb: viewportResizeCallback;
  inputCb: inputCallback;
  blockClass: blockClass;
  ignoreClass: string;
  maskAllInputs: boolean;
  inlineStylesheet: boolean;
};

export type hooksParam = {
  mutation?: mutationCallBack;
  mousemove?: mousemoveCallBack;
  mouseInteraction?: mouseInteractionCallBack;
  scroll?: scrollCallback;
  viewportResize?: viewportResizeCallback;
  input?: inputCallback;
};

export type textCursor = {
  node: Node;
  value: string | null;
};
export type textMutation = {
  id: number;
  value: string | null;
};

export type attributeCursor = {
  node: Node;
  attributes: {
    [key: string]: string | null;
  };
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
  node: serializedNodeWithId;
};

type mutationCallbackParam = {
  texts: textMutation[];
  attributes: attributeMutation[];
  removes: removedNodeMutation[];
  adds: addedNodeMutation[];
};

export type mutationCallBack = (m: mutationCallbackParam) => void;

export type mousemoveCallBack = (
  p: mousePosition[],
  source: IncrementalSource.MouseMove | IncrementalSource.TouchMove,
) => void;

export type mousePosition = {
  x: number;
  y: number;
  id: number;
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
  TouchMove_Departed, // we will start a separate observer for touch move event
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
  getNode: (id: number) => INode | null;
  removeNodeFromMap: (n: INode) => void;
  has: (id: number) => boolean;
};

export type throttleOptions = {
  leading?: boolean;
  trailing?: boolean;
};

export type listenerHandler = () => void;
export type hookResetter = () => void;

export type playerConfig = {
  speed: number;
  root: Element;
  loadTimeout: number;
  skipInactive: boolean;
  showWarning: boolean;
  showDebug: boolean;
  blockClass: string;
  liveMode: boolean;
  insertStyleRules: string[];
};

export type playerMetaData = {
  totalTime: number;
};

export type missingNode = {
  node: Node;
  mutation: addedNodeMutation;
};
export type missingNodeMap = {
  [id: number]: missingNode;
};

export type actionWithDelay = {
  doAction: () => void;
  delay: number;
};

export type Handler = (event?: unknown) => void;

export type Emitter = {
  on(type: string, handler: Handler): void;
  emit(type: string, event?: unknown): void;
};

export type Arguments<T> = T extends (...payload: infer U) => unknown
  ? U
  : unknown;

export enum ReplayerEvents {
  Start = 'start',
  Pause = 'pause',
  Resume = 'resume',
  Resize = 'resize',
  Finish = 'finish',
  FullsnapshotRebuilded = 'fullsnapshot-rebuilded',
  LoadStylesheetStart = 'load-stylesheet-start',
  LoadStylesheetEnd = 'load-stylesheet-end',
  SkipStart = 'skip-start',
  SkipEnd = 'skip-end',
  MouseInteraction = 'mouse-interaction',
}
