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
  data: unknown;
};

export type loadedEvent = {
  type: EventType.Load;
  data: unknown;
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
  Selection,
  AdoptedStyleSheet,
  CustomElement,
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

export type selectionData = {
  source: IncrementalSource.Selection;
} & selectionParam;

export type adoptedStyleSheetData = {
  source: IncrementalSource.AdoptedStyleSheet;
} & adoptedStyleSheetParam;

export type customElementData = {
  source: IncrementalSource.CustomElement;
} & customElementParam;

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
  | selectionData
  | styleDeclarationData
  | adoptedStyleSheetData
  | customElementData;

export type eventWithoutTime =
  | domContentLoadedEvent
  | loadedEvent
  | fullSnapshotEvent
  | incrementalSnapshotEvent
  | metaEvent
  | customEvent
  | pluginEvent;

/**
 * @deprecated intended for internal use
 * a synonym for eventWithoutTime
 */
export type event = eventWithoutTime;

export type eventWithTime = eventWithoutTime & {
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

export interface ICrossOriginIframeMirror {
  getId(
    iframe: HTMLIFrameElement,
    remoteId: number,
    parentToRemoteMap?: Map<number, number>,
    remoteToParentMap?: Map<number, number>,
  ): number;
  getIds(iframe: HTMLIFrameElement, remoteId: number[]): number[];
  getRemoteId(
    iframe: HTMLIFrameElement,
    parentId: number,
    map?: Map<number, number>,
  ): number;
  getRemoteIds(iframe: HTMLIFrameElement, parentId: number[]): number[];
  reset(iframe?: HTMLIFrameElement): void;
}

export type RecordPlugin<TOptions = unknown> = {
  name: string;
  observer?: (
    cb: (...args: Array<unknown>) => void,
    win: IWindow,
    options: TOptions,
  ) => listenerHandler;
  eventProcessor?: <TExtend>(event: eventWithTime) => eventWithTime & TExtend;
  getMirror?: (mirrors: {
    nodeMirror: IMirror<Node>;
    crossOriginIframeMirror: ICrossOriginIframeMirror;
    crossOriginIframeStyleMirror: ICrossOriginIframeMirror;
  }) => void;
  options: TOptions;
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
  styleDeclaration?: styleDeclarationCallback;
  canvasMutation?: canvasMutationCallback;
  font?: fontCallback;
  selection?: selectionCallback;
  customElement?: customElementCallback;
};

// https://dom.spec.whatwg.org/#interface-mutationrecord
export type mutationRecord = Readonly<{
  type: string;
  target: Node;
  oldValue: string | null;
  addedNodes: NodeList;
  removedNodes: NodeList;
  attributeName: string | null;
}>;

export type textCursor = {
  node: Node;
  value: string | null;
};
export type textMutation = {
  id: number;
  value: string | null;
};

export type styleOMValue = {
  [key: string]: styleValueWithPriority | string | false;
};

export type styleValueWithPriority = [string, string];

export type attributeCursor = {
  node: Node;
  attributes: {
    [key: string]: string | styleOMValue | null;
  };
  styleDiff: styleOMValue;
  _unchangedStyles: styleOMValue;
};
export type attributeMutation = {
  id: number;
  attributes: {
    [key: string]: string | styleOMValue | null;
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

export enum PointerTypes {
  Mouse,
  Pen,
  Touch,
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
  x?: number;
  y?: number;
  pointerType?: PointerTypes;
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
  id?: number;
  styleId?: number;
  removes?: styleSheetDeleteRule[];
  adds?: styleSheetAddRule[];
  replace?: string;
  replaceSync?: string;
};

export type styleSheetRuleCallback = (s: styleSheetRuleParam) => void;

export type adoptedStyleSheetParam = {
  // id indicates the node id of document or shadow DOMs' host element.
  id: number;
  // New CSSStyleSheets which have never appeared before.
  styles?: {
    styleId: number;
    rules: styleSheetAddRule[];
  }[];
  // StyleSheet ids to be adopted.
  styleIds: number[];
};

export type adoptedStyleSheetCallback = (a: adoptedStyleSheetParam) => void;

export type styleDeclarationParam = {
  id?: number;
  styleId?: number;
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
  dataURLOptions: DataURLOptions;
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

export enum MediaInteractions {
  Play,
  Pause,
  Seeked,
  VolumeChange,
  RateChange,
}

export type mediaInteractionParam = {
  type: MediaInteractions;
  id: number;
  currentTime?: number;
  volume?: number;
  muted?: boolean;
  loop?: boolean;
  playbackRate?: number;
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

export type SelectionRange = {
  start: number;
  startOffset: number;
  end: number;
  endOffset: number;
};

export type selectionParam = {
  ranges: Array<SelectionRange>;
};

export type selectionCallback = (p: selectionParam) => void;

export type customElementParam = {
  define?: {
    name: string;
  };
};

export type customElementCallback = (c: customElementParam) => void;

/**
 *  @deprecated
 */
interface INode extends Node {
  __sn: serializedNodeWithId;
}

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

export type playerMetaData = {
  startTime: number;
  endTime: number;
  totalTime: number;
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
  /**
   * @deprecated use Play instead
   */
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
  Destroy = 'destroy',
  GotoStarted = 'goto-started',
  EventsApplied = 'events-applied',
}

export type KeepIframeSrcFn = (src: string) => boolean;

declare global {
  interface Window {
    FontFace: typeof FontFace;
  }
}

export type IWindow = Window & typeof globalThis;

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type GetTypedKeys<Obj extends object, ValueType> = TakeTypeHelper<
  Obj,
  ValueType
>[keyof TakeTypeHelper<Obj, ValueType>];
export type TakeTypeHelper<Obj extends object, ValueType> = {
  [K in keyof Obj]: Obj[K] extends ValueType ? K : never;
};

export type TakeTypedKeyValues<Obj extends object, Type> = Pick<
  Obj,
  TakeTypeHelper<Obj, Type>[keyof TakeTypeHelper<Obj, Type>]
>;

export enum NodeType {
  Document,
  DocumentType,
  Element,
  Text,
  CDATA,
  Comment,
}

export type documentNode = {
  type: NodeType.Document;
  childNodes: serializedNodeWithId[];
  compatMode?: string;
};

export type documentTypeNode = {
  type: NodeType.DocumentType;
  name: string;
  publicId: string;
  systemId: string;
};

type cssTextKeyAttr = {
  _cssText?: string;
};

export type attributes = cssTextKeyAttr & {
  [key: string]:
    | string
    | number // properties e.g. rr_scrollLeft or rr_mediaCurrentTime
    | true // e.g. checked  on <input type="radio">
    | null; // an indication that an attribute was removed (during a mutation)
};

export type legacyAttributes = {
  /**
   * @deprecated old bug in rrweb was causing these to always be set
   * @see https://github.com/rrweb-io/rrweb/pull/651
   */
  selected: false;
};

export type mediaAttributes = {
  rr_mediaState: 'played' | 'paused';
  rr_mediaCurrentTime: number;
  /**
   * for backwards compatibility this is optional but should always be set
   */
  rr_mediaPlaybackRate?: number;
  /**
   * for backwards compatibility this is optional but should always be set
   */
  rr_mediaMuted?: boolean;
  /**
   * for backwards compatibility this is optional but should always be set
   */
  rr_mediaLoop?: boolean;
  /**
   * for backwards compatibility this is optional but should always be set
   */
  rr_mediaVolume?: number;
};

export type elementNode = {
  type: NodeType.Element;
  tagName: string;
  attributes: attributes;
  childNodes: serializedNodeWithId[];
  isSVG?: true;
  needBlock?: boolean;
  // This is a custom element or not.
  isCustom?: true;
};

export type textNode = {
  type: NodeType.Text;
  textContent: string;
  /**
   * @deprecated styles are now always snapshotted against parent <style> element
   * style mutations can still happen via an added textNode, but they don't need this attribute for correct replay
   */
  isStyle?: true;
};

export type cdataNode = {
  type: NodeType.CDATA;
  textContent: '';
};

export type commentNode = {
  type: NodeType.Comment;
  textContent: string;
};

export type serializedNode = (
  | documentNode
  | documentTypeNode
  | elementNode
  | textNode
  | cdataNode
  | commentNode
) & {
  rootId?: number;
  isShadowHost?: boolean;
  isShadow?: boolean;
};

export type serializedNodeWithId = serializedNode & { id: number };

export type serializedElementNodeWithId = Extract<
  serializedNodeWithId,
  Record<'type', NodeType.Element>
>;

export interface IMirror<TNode> {
  getId(n: TNode | undefined | null): number;

  getNode(id: number): TNode | null;

  getIds(): number[];

  getMeta(n: TNode): serializedNodeWithId | null;

  removeNodeFromMap(n: TNode): void;

  has(id: number): boolean;

  hasNode(node: TNode): boolean;

  add(n: TNode, meta: serializedNodeWithId): void;

  replace(id: number, n: TNode): void;

  reset(): void;
}

export type DataURLOptions = Partial<{
  type: string;
  quality: number;
}>;

// Types for @rrweb/packer
export type PackFn = (event: eventWithTime) => string;
export type UnpackFn = (raw: string) => eventWithTime;
