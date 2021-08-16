import {
  serializedNodeWithId,
  idNodeMap,
  INode,
  MaskInputOptions,
  SlimDOMOptions,
  MaskInputFn,
  MaskTextFn,
} from 'rrweb-snapshot';
import { PackFn, UnpackFn } from './packer/base';
import { FontFaceDescriptors } from 'css-font-loading-module';
import { IframeManager } from './record/iframe-manager';
import { ShadowDomManager } from './record/shadow-dom-manager';
import type { Replayer } from './replay';

export enum EventType {
  DomContentLoaded,
  Load,
  FullSnapshot,
  IncrementalSnapshot,
  Meta,
  Custom,
  Plugin,
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

export type pluginEvent<T = unknown> = {
  type: EventType.Plugin;
  data: {
    plugin: string;
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
  Drag,
}

export type mutationData = {
  source: IncrementalSource.Mutation;
} & mutationCallbackParam;

export type mousemoveData = {
  source:
    | IncrementalSource.MouseMove
    | IncrementalSource.TouchMove
    | IncrementalSource.Drag;
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
  | fontData;

export type event =
  | domContentLoadedEvent
  | loadedEvent
  | fullSnapshotEvent
  | incrementalSnapshotEvent
  | metaEvent
  | customEvent
  | pluginEvent;

export type eventWithTime = event & {
  timestamp: number;
  delay?: number;
};

export type blockClass = string | RegExp;

export type maskTextClass = string | RegExp;

export type SamplingStrategy = Partial<{
  /**
   * false means not to record mouse/touch move events
   * number is the throttle threshold of recording mouse/touch move
   */
  mousemove: boolean | number;
  /**
   * number is the throttle threshold of mouse/touch move callback
   */
  mousemoveCallback: number;
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

export type RecordPlugin<TOptions = unknown> = {
  name: string;
  observer: (cb: Function, options: TOptions) => listenerHandler;
  options: TOptions;
};

export type recordOptions<T> = {
  emit?: (e: T, isCheckout?: boolean) => void;
  checkoutEveryNth?: number;
  checkoutEveryNms?: number;
  blockClass?: blockClass;
  blockSelector?: string;
  ignoreClass?: string;
  maskTextClass?: maskTextClass;
  maskTextSelector?: string;
  maskAllInputs?: boolean;
  maskInputOptions?: MaskInputOptions;
  maskInputFn?: MaskInputFn;
  maskTextFn?: MaskTextFn;
  slimDOMOptions?: SlimDOMOptions | 'all' | true;
  inlineStylesheet?: boolean;
  hooks?: hooksParam;
  packFn?: PackFn;
  sampling?: SamplingStrategy;
  recordCanvas?: boolean;
  userTriggeredOnInput?: boolean;
  collectFonts?: boolean;
  plugins?: RecordPlugin[];
  // departed, please use sampling options
  mousemoveWait?: number;
  keepIframeSrcFn?: KeepIframeSrcFn;
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
  maskTextClass: maskTextClass;
  maskTextSelector: string | null;
  maskInputOptions: MaskInputOptions;
  maskInputFn?: MaskInputFn;
  maskTextFn?: MaskTextFn;
  inlineStylesheet: boolean;
  styleSheetRuleCb: styleSheetRuleCallback;
  canvasMutationCb: canvasMutationCallback;
  fontCb: fontCallback;
  sampling: SamplingStrategy;
  recordCanvas: boolean;
  userTriggeredOnInput: boolean;
  collectFonts: boolean;
  slimDOMOptions: SlimDOMOptions;
  doc: Document;
  mirror: Mirror;
  iframeManager: IframeManager;
  shadowDomManager: ShadowDomManager;
  plugins: Array<{
    observer: Function;
    callback: Function;
    options: unknown;
  }>;
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

export type styleAttributeValue = {
  [key:string]: styleValueWithPriority | string | false;
};

export type styleValueWithPriority = [string, string];

export type attributeCursor = {
  node: Node;
  attributes: {
    [key: string]: string | styleAttributeValue | null;
  };
};
export type attributeMutation = {
  id: number;
  attributes: {
    [key: string]: string | styleAttributeValue | null;
  };
};

export type removedNodeMutation = {
  parentId: number;
  id: number;
  isShadow?: boolean;
};

export type addedNodeMutation = {
  parentId: number;
  // Newly recorded mutations will not have previousId any more, just for compatibility
  previousId?: number | null;
  nextId: number | null;
  node: serializedNodeWithId;
};

export type mutationCallbackParam = {
  texts: textMutation[];
  attributes: attributeMutation[];
  removes: removedNodeMutation[];
  adds: addedNodeMutation[];
  isAttachIframe?: true;
};

export type mutationCallBack = (m: mutationCallbackParam) => void;

export type mousemoveCallBack = (
  p: mousePosition[],
  source:
    | IncrementalSource.MouseMove
    | IncrementalSource.TouchMove
    | IncrementalSource.Drag,
) => void;

export type mousePosition = {
  x: number;
  y: number;
  id: number;
  timeOffset: number;
};

export type mouseMovePos = {
  x: number;
  y: number;
  id: number;
  debugData: incrementalData;
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
  TouchCancel,
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

export type fontCallback = (p: fontParam) => void;

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
  userTriggered?: boolean;
};

export type inputCallback = (v: inputValue & { id: number }) => void;

export const enum MediaInteractions {
  Play,
  Pause,
  Seeked,
}

export type mediaInteractionParam = {
  type: MediaInteractions;
  id: number;
  currentTime?: number;
};

export type mediaInteractionCallback = (p: mediaInteractionParam) => void;

export type DocumentDimension = {
  x: number;
  y: number;
  // scale value relative to its parent iframe
  relativeScale: number;
  // scale value relative to the root iframe
  absoluteScale: number;
};

export type Mirror = {
  map: idNodeMap;
  getId: (n: INode) => number;
  getNode: (id: number) => INode | null;
  removeNodeFromMap: (n: INode) => void;
  has: (id: number) => boolean;
  reset: () => void;
};

export type throttleOptions = {
  leading?: boolean;
  trailing?: boolean;
};

export type listenerHandler = () => void;
export type hookResetter = () => void;

export type ReplayPlugin = {
  handler: (
    event: eventWithTime,
    isSync: boolean,
    context: { replayer: Replayer },
  ) => void;
};
export type playerConfig = {
  speed: number;
  maxSpeed: number;
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
  plugins?: ReplayPlugin[];
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
  PlayBack = 'play-back',
}

// store the state that would be changed during the process(unmount from dom and mount again)
export type ElementState = {
  // [scrollLeft,scrollTop]
  scroll?: [number, number];
};

export type KeepIframeSrcFn = (src: string) => boolean;
