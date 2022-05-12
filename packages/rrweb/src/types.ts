import type {
  serializedNodeWithId,
  Mirror,
  INode,
  MaskInputOptions,
  SlimDOMOptions,
  MaskInputFn,
  MaskTextFn,
} from 'rrweb-snapshot';
import type { PackFn, UnpackFn } from './packer/base';
import type { IframeManager } from './record/iframe-manager';
import type { ShadowDomManager } from './record/shadow-dom-manager';
import type { Replayer } from './replay';
import type { RRNode } from 'rrdom/es/virtual-dom';
import type { CanvasManager } from './record/observers/canvas/canvas-manager';

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
  StyleDeclaration,
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

export type styleDeclarationData = {
  source: IncrementalSource.StyleDeclaration;
} & styleDeclarationParam;

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
  | fontData
  | styleDeclarationData;

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

export type canvasEventWithTime = eventWithTime & {
  type: EventType.IncrementalSnapshot;
  data: canvasMutationData;
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
   * number is the throttle threshold of recording media interactions
   */
  media: number;
  /**
   * 'all' will record all the input events
   * 'last' will only record the last input value while input a sequence of chars
   */
  input: 'all' | 'last';
  /**
   * 'all' will record every single canvas call
   * number between 1 and 60, will record an image snapshots in a web-worker a (maximum) number of times per second.
   *                          Number only supported where [`OffscreenCanvas`](http://mdn.io/offscreencanvas) is supported.
   */
  canvas: 'all' | number;
}>;

export type RecordPlugin<TOptions = unknown> = {
  name: string;
  observer?: (cb: Function, win: IWindow, options: TOptions) => listenerHandler;
  eventProcessor?: <TExtend>(event: eventWithTime) => eventWithTime & TExtend;
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
  inlineImages?: boolean;
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
  styleDeclarationCb: styleDeclarationCallback;
  canvasMutationCb: canvasMutationCallback;
  fontCb: fontCallback;
  sampling: SamplingStrategy;
  recordCanvas: boolean;
  inlineImages: boolean;
  userTriggeredOnInput: boolean;
  collectFonts: boolean;
  slimDOMOptions: SlimDOMOptions;
  doc: Document;
  mirror: Mirror;
  iframeManager: IframeManager;
  shadowDomManager: ShadowDomManager;
  canvasManager: CanvasManager;
  plugins: Array<{
    observer: Function;
    callback: Function;
    options: unknown;
  }>;
};

export type MutationBufferParam = Pick<
  observerParam,
  | 'mutationCb'
  | 'blockClass'
  | 'blockSelector'
  | 'maskTextClass'
  | 'maskTextSelector'
  | 'inlineStylesheet'
  | 'maskInputOptions'
  | 'maskTextFn'
  | 'maskInputFn'
  | 'recordCanvas'
  | 'inlineImages'
  | 'slimDOMOptions'
  | 'doc'
  | 'mirror'
  | 'iframeManager'
  | 'shadowDomManager'
  | 'canvasManager'
>;

export type hooksParam = {
  mutation?: mutationCallBack;
  mousemove?: mousemoveCallBack;
  mouseInteraction?: mouseInteractionCallBack;
  scroll?: scrollCallback;
  viewportResize?: viewportResizeCallback;
  input?: inputCallback;
  mediaInteaction?: mediaInteractionCallback;
  styleSheetRule?: styleSheetRuleCallback;
  styleDeclaration?: styleDeclarationCallback;
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
  [key: string]: styleValueWithPriority | string | false;
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

export enum CanvasContext {
  '2D',
  WebGL,
  WebGL2,
}

export type SerializedCanvasArg =
  | {
      rr_type: 'ArrayBuffer';
      base64: string; // base64
    }
  | {
      rr_type: 'Blob';
      data: Array<CanvasArg>;
      type?: string;
    }
  | {
      rr_type: string;
      src: string; // url of image
    }
  | {
      rr_type: string;
      args: Array<CanvasArg>;
    }
  | {
      rr_type: string;
      index: number;
    };

export type CanvasArg =
  | SerializedCanvasArg
  | string
  | number
  | boolean
  | null
  | CanvasArg[];

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
  index?: number | number[];
};

export type styleSheetDeleteRule = {
  index: number | number[];
};

export type styleSheetRuleParam = {
  id: number;
  removes?: styleSheetDeleteRule[];
  adds?: styleSheetAddRule[];
};

export type styleSheetRuleCallback = (s: styleSheetRuleParam) => void;

export type styleDeclarationParam = {
  id: number;
  index: number[];
  set?: {
    property: string;
    value: string | null;
    priority: string | undefined;
  };
  remove?: {
    property: string;
  };
};

export type styleDeclarationCallback = (s: styleDeclarationParam) => void;

export type canvasMutationCommand = {
  property: string;
  args: Array<unknown>;
  setter?: true;
};

export type canvasMutationParam =
  | {
      id: number;
      type: CanvasContext;
      commands: canvasMutationCommand[];
    }
  | ({
      id: number;
      type: CanvasContext;
    } & canvasMutationCommand);

export type canvasMutationWithType = {
  type: CanvasContext;
} & canvasMutationCommand;

export type canvasMutationCallback = (p: canvasMutationParam) => void;

export type canvasManagerMutationCallback = (
  target: HTMLCanvasElement,
  p: canvasMutationWithType,
) => void;

export type ImageBitmapDataURLWorkerParams = {
  id: number;
  bitmap: ImageBitmap;
  width: number;
  height: number;
};

export type ImageBitmapDataURLWorkerResponse =
  | {
      id: number;
    }
  | {
      id: number;
      type: string;
      base64: string;
      width: number;
      height: number;
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
  VolumeChange,
}

export type mediaInteractionParam = {
  type: MediaInteractions;
  id: number;
  currentTime?: number;
  volume?: number;
  muted?: boolean;
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

export type DeprecatedMirror = {
  map: {
    [key: number]: INode;
  };
  getId: (n: Node) => number;
  getNode: (id: number) => INode | null;
  removeNodeFromMap: (n: Node) => void;
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
  useVirtualDom: boolean;
  plugins?: ReplayPlugin[];
};

export type playerMetaData = {
  startTime: number;
  endTime: number;
  totalTime: number;
};

export type missingNode = {
  node: Node | RRNode;
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

export type KeepIframeSrcFn = (src: string) => boolean;

declare global {
  interface Window {
    FontFace: typeof FontFace;
  }
}

export type IWindow = Window & typeof globalThis;

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
