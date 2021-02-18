import {
  serializedNodeWithId,
  idNodeMap,
  INode,
  MaskInputOptions,
  SlimDOMOptions,
} from 'rrweb-snapshot';
import { PackFn, UnpackFn } from './packer/base';
import { FontFaceDescriptors } from 'css-font-loading-module';
import { IframeManager } from './record/iframe-manager';

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

export type logEvent = {
  type: EventType.IncrementalSnapshot;
  data: incrementalData;
};

export type customEvent<T = unknown> = {
  type: EventType.Custom;
  data: {
    tag: string;
    payload: T;
  };
};

export type styleSheetEvent = {};

export enum IncrementalSource {
  Mutation,
  MouseMove,
  MouseInteraction,
  Scroll,
  ViewportResize,
  Input,
  TouchMove,
  MediaInteraction,
  StyleSheetRule,
  CanvasMutation,
  Font,
  Log,
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
} & viewportResizeDimension;

export type inputData = {
  source: IncrementalSource.Input;
  id: number;
} & inputValue;

export type mediaInteractionData = {
  source: IncrementalSource.MediaInteraction;
} & mediaInteractionParam;

export type styleSheetRuleData = {
  source: IncrementalSource.StyleSheetRule;
} & styleSheetRuleParam;

export type canvasMutationData = {
  source: IncrementalSource.CanvasMutation;
} & canvasMutationParam;

export type fontData = {
  source: IncrementalSource.Font;
} & fontParam;

export type logData = {
  source: IncrementalSource.Log;
} & LogParam;

export type incrementalData =
  | mutationData
  | mousemoveData
  | mouseInteractionData
  | scrollData
  | viewportResizeData
  | inputData
  | mediaInteractionData
  | styleSheetRuleData
  | canvasMutationData
  | fontData
  | logData;

export type event =
  | domContentLoadedEvent
  | loadedEvent
  | fullSnapshotEvent
  | incrementalSnapshotEvent
  | metaEvent
  | logEvent
  | customEvent;

export type eventWithTime = event & {
  timestamp: number;
  delay?: number;
};

export type blockClass = string | RegExp;

export type SamplingStrategy = Partial<{
  /**
   * false means not to record mouse/touch move events
   * number is the throttle threshold of recording mouse/touch move
   */
  mousemove: boolean | number;
  /**
   * false means not to record mouse interaction events
   * can also specify record some kinds of mouse interactions
   */
  mouseInteraction: boolean | Record<string, boolean | undefined>;
  /**
   * number is the throttle threshold of recording scroll
   */
  scroll: number;
  /**
   * 'all' will record all the input events
   * 'last' will only record the last input value while input a sequence of chars
   */
  input: 'all' | 'last';
}>;

export type recordOptions<T> = {
  emit?: (e: T, isCheckout?: boolean) => void;
  checkoutEveryNth?: number;
  checkoutEveryNms?: number;
  blockClass?: blockClass;
  blockSelector?: string;
  ignoreClass?: string;
  maskAllInputs?: boolean;
  maskInputOptions?: MaskInputOptions;
  maskInputFn?: MaskInputFn;
  slimDOMOptions?: SlimDOMOptions | 'all' | true;
  inlineStylesheet?: boolean;
  hooks?: hooksParam;
  packFn?: PackFn;
  sampling?: SamplingStrategy;
  recordCanvas?: boolean;
  collectFonts?: boolean;
  // departed, please use sampling options
  mousemoveWait?: number;
  recordLog?: boolean | LogRecordOptions;
};

export type observerParam = {
  mutationCb: mutationCallBack;
  mousemoveCb: mousemoveCallBack;
  mouseInteractionCb: mouseInteractionCallBack;
  scrollCb: scrollCallback;
  viewportResizeCb: viewportResizeCallback;
  inputCb: inputCallback;
  mediaInteractionCb: mediaInteractionCallback;
  blockClass: blockClass;
  blockSelector: string | null;
  ignoreClass: string;
  maskInputOptions: MaskInputOptions;
  maskInputFn?: MaskInputFn;
  inlineStylesheet: boolean;
  styleSheetRuleCb: styleSheetRuleCallback;
  canvasMutationCb: canvasMutationCallback;
  fontCb: fontCallback;
  logCb: logCallback;
  logOptions: LogRecordOptions;
  sampling: SamplingStrategy;
  recordCanvas: boolean;
  collectFonts: boolean;
  slimDOMOptions: SlimDOMOptions;
  doc: Document;
  iframeManager: IframeManager;
};

export type hooksParam = {
  mutation?: mutationCallBack;
  mousemove?: mousemoveCallBack;
  mouseInteraction?: mouseInteractionCallBack;
  scroll?: scrollCallback;
  viewportResize?: viewportResizeCallback;
  input?: inputCallback;
  mediaInteaction?: mediaInteractionCallback;
  styleSheetRule?: styleSheetRuleCallback;
  canvasMutation?: canvasMutationCallback;
  font?: fontCallback;
  log?: logCallback;
};

// https://dom.spec.whatwg.org/#interface-mutationrecord
export type mutationRecord = {
  type: string;
  target: Node;
  oldValue: string | null;
  addedNodes: NodeList;
  removedNodes: NodeList;
  attributeName: string | null;
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
  // Newly recorded mutations will not have previousId any more, just for compatibility
  previousId?: number | null;
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

export type styleSheetAddRule = {
  rule: string;
  index?: number;
};

export type styleSheetDeleteRule = {
  index: number;
};

export type styleSheetRuleParam = {
  id: number;
  removes?: styleSheetDeleteRule[];
  adds?: styleSheetAddRule[];
};

export type styleSheetRuleCallback = (s: styleSheetRuleParam) => void;

export type canvasMutationCallback = (p: canvasMutationParam) => void;

export type canvasMutationParam = {
  id: number;
  property: string;
  args: Array<unknown>;
  setter?: true;
};

export type fontParam = {
  family: string;
  fontSource: string;
  buffer: boolean;
  descriptors?: FontFaceDescriptors;
};

export type LogLevel =
  | 'assert'
  | 'clear'
  | 'count'
  | 'countReset'
  | 'debug'
  | 'dir'
  | 'dirxml'
  | 'error'
  | 'group'
  | 'groupCollapsed'
  | 'groupEnd'
  | 'info'
  | 'log'
  | 'table'
  | 'time'
  | 'timeEnd'
  | 'timeLog'
  | 'trace'
  | 'warn';

/* fork from interface Console */
// all kinds of console functions
export type Logger = {
  assert?: (value: any, message?: string, ...optionalParams: any[]) => void;
  clear?: () => void;
  count?: (label?: string) => void;
  countReset?: (label?: string) => void;
  debug?: (message?: any, ...optionalParams: any[]) => void;
  dir?: (obj: any, options?: NodeJS.InspectOptions) => void;
  dirxml?: (...data: any[]) => void;
  error?: (message?: any, ...optionalParams: any[]) => void;
  group?: (...label: any[]) => void;
  groupCollapsed?: (label?: any[]) => void;
  groupEnd?: () => void;
  info?: (message?: any, ...optionalParams: any[]) => void;
  log?: (message?: any, ...optionalParams: any[]) => void;
  table?: (tabularData: any, properties?: ReadonlyArray<string>) => void;
  time?: (label?: string) => void;
  timeEnd?: (label?: string) => void;
  timeLog?: (label?: string, ...data: any[]) => void;
  trace?: (message?: any, ...optionalParams: any[]) => void;
  warn?: (message?: any, ...optionalParams: any[]) => void;
};

/**
 * define an interface to replay log records
 * (data: logData) => void> function to display the log data
 */
export type ReplayLogger = Partial<Record<LogLevel, (data: logData) => void>>;

export type LogParam = {
  level: LogLevel;
  trace: Array<string>;
  payload: Array<string>;
};

export type fontCallback = (p: fontParam) => void;

export type logCallback = (p: LogParam) => void;

export type viewportResizeDimension = {
  width: number;
  height: number;
};

export type viewportResizeCallback = (d: viewportResizeDimension) => void;

export type inputValue = {
  text: string;
  isChecked: boolean;

  // `userTriggered` indicates if this event was triggered directly by user (userTriggered: true)
  // or was triggered indirectly (userTriggered: false)
  // Example of `userTriggered` in action:
  // User clicks on radio element (userTriggered: true) which triggers the other radio element to change (userTriggered: false)
  userTriggered: boolean;
};

export type inputCallback = (v: inputValue & { id: number }) => void;

export const enum MediaInteractions {
  Play,
  Pause,
}

export type mediaInteractionParam = {
  type: MediaInteractions;
  id: number;
};

export type mediaInteractionCallback = (p: mediaInteractionParam) => void;

export type DocumentDimension = {
  x: number;
  y: number;
};

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
  triggerFocus: boolean;
  UNSAFE_replayCanvas: boolean;
  pauseAnimation?: boolean;
  mouseTail:
    | boolean
    | {
        duration?: number;
        lineCap?: string;
        lineWidth?: number;
        strokeStyle?: string;
      };
  unpackFn?: UnpackFn;
  logConfig: LogReplayConfig;
};

export type LogReplayConfig = {
  level?: Array<LogLevel> | undefined;
  replayLogger: ReplayLogger | undefined;
};

export type playerMetaData = {
  startTime: number;
  endTime: number;
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
  off(type: string, handler: Handler): void;
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
  EventCast = 'event-cast',
  CustomEvent = 'custom-event',
  Flush = 'flush',
  StateChange = 'state-change',
}

export type MaskInputFn = (text: string) => string;

// store the state that would be changed during the process(unmount from dom and mount again)
export type ElementState = {
  // [scrollLeft,scrollTop]
  scroll?: [number, number];
};

export type StringifyOptions = {
  // limit of string length
  stringLengthLimit?: number;
  /**
   * limit of number of keys in an object
   * if an object contains more keys than this limit, we would call its toString function directly
   */
  numOfKeysLimit: number;
};

export type LogRecordOptions = {
  level?: Array<LogLevel> | undefined;
  lengthThreshold?: number;
  stringifyOptions?: StringifyOptions;
  logger?: Logger;
};
