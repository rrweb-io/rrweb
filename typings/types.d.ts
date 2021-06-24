import { serializedNodeWithId, idNodeMap, INode, MaskInputOptions, SlimDOMOptions } from 'rrweb-snapshot';
import { PackFn, UnpackFn } from './packer/base';
import { FontFaceDescriptors } from 'css-font-loading-module';
import { IframeManager } from './record/iframe-manager';
import { ShadowDomManager } from './record/shadow-dom-manager';
export declare enum EventType {
    DomContentLoaded = 0,
    Load = 1,
    FullSnapshot = 2,
    IncrementalSnapshot = 3,
    Meta = 4,
    Custom = 5
}
export declare type domContentLoadedEvent = {
    type: EventType.DomContentLoaded;
    data: {};
};
export declare type loadedEvent = {
    type: EventType.Load;
    data: {};
};
export declare type fullSnapshotEvent = {
    type: EventType.FullSnapshot;
    data: {
        node: serializedNodeWithId;
        initialOffset: {
            top: number;
            left: number;
        };
    };
};
export declare type incrementalSnapshotEvent = {
    type: EventType.IncrementalSnapshot;
    data: incrementalData;
};
export declare type metaEvent = {
    type: EventType.Meta;
    data: {
        href: string;
        width: number;
        height: number;
    };
};
export declare type logEvent = {
    type: EventType.IncrementalSnapshot;
    data: incrementalData;
};
export declare type customEvent<T = unknown> = {
    type: EventType.Custom;
    data: {
        tag: string;
        payload: T;
    };
};
export declare type styleSheetEvent = {};
export declare enum IncrementalSource {
    Mutation = 0,
    MouseMove = 1,
    MouseInteraction = 2,
    Scroll = 3,
    ViewportResize = 4,
    Input = 5,
    TouchMove = 6,
    MediaInteraction = 7,
    StyleSheetRule = 8,
    CanvasMutation = 9,
    Font = 10,
    Log = 11,
    Drag = 12
}
export declare type mutationData = {
    source: IncrementalSource.Mutation;
} & mutationCallbackParam;
export declare type mousemoveData = {
    source: IncrementalSource.MouseMove | IncrementalSource.TouchMove | IncrementalSource.Drag;
    positions: mousePosition[];
};
export declare type mouseInteractionData = {
    source: IncrementalSource.MouseInteraction;
} & mouseInteractionParam;
export declare type scrollData = {
    source: IncrementalSource.Scroll;
} & scrollPosition;
export declare type viewportResizeData = {
    source: IncrementalSource.ViewportResize;
} & viewportResizeDimension;
export declare type inputData = {
    source: IncrementalSource.Input;
    id: number;
} & inputValue;
export declare type mediaInteractionData = {
    source: IncrementalSource.MediaInteraction;
} & mediaInteractionParam;
export declare type styleSheetRuleData = {
    source: IncrementalSource.StyleSheetRule;
} & styleSheetRuleParam;
export declare type canvasMutationData = {
    source: IncrementalSource.CanvasMutation;
} & canvasMutationParam;
export declare type fontData = {
    source: IncrementalSource.Font;
} & fontParam;
export declare type logData = {
    source: IncrementalSource.Log;
} & LogParam;
export declare type incrementalData = mutationData | mousemoveData | mouseInteractionData | scrollData | viewportResizeData | inputData | mediaInteractionData | styleSheetRuleData | canvasMutationData | fontData | logData;
export declare type event = domContentLoadedEvent | loadedEvent | fullSnapshotEvent | incrementalSnapshotEvent | metaEvent | logEvent | customEvent;
export declare type eventWithTime = event & {
    timestamp: number;
    delay?: number;
};
export declare type blockClass = string | RegExp;
export declare type maskTextClass = string | RegExp;
export declare type SamplingStrategy = Partial<{
    mousemove: boolean | number;
    mousemoveCallback: number;
    mouseInteraction: boolean | Record<string, boolean | undefined>;
    scroll: number;
    input: 'all' | 'last';
}>;
export declare type recordOptions<T> = {
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
    collectFonts?: boolean;
    mousemoveWait?: number;
    recordLog?: boolean | LogRecordOptions;
};
export declare type observerParam = {
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
    logCb: logCallback;
    logOptions: LogRecordOptions;
    sampling: SamplingStrategy;
    recordCanvas: boolean;
    collectFonts: boolean;
    slimDOMOptions: SlimDOMOptions;
    doc: Document;
    mirror: Mirror;
    iframeManager: IframeManager;
    shadowDomManager: ShadowDomManager;
};
export declare type hooksParam = {
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
export declare type mutationRecord = {
    type: string;
    target: Node;
    oldValue: string | null;
    addedNodes: NodeList;
    removedNodes: NodeList;
    attributeName: string | null;
};
export declare type textCursor = {
    node: Node;
    value: string | null;
};
export declare type textMutation = {
    id: number;
    value: string | null;
};
export declare type attributeCursor = {
    node: Node;
    attributes: {
        [key: string]: string | null;
    };
};
export declare type attributeMutation = {
    id: number;
    attributes: {
        [key: string]: string | null;
    };
};
export declare type removedNodeMutation = {
    parentId: number;
    id: number;
    isShadow?: boolean;
};
export declare type addedNodeMutation = {
    parentId: number;
    previousId?: number | null;
    nextId: number | null;
    node: serializedNodeWithId;
};
export declare type mutationCallbackParam = {
    texts: textMutation[];
    attributes: attributeMutation[];
    removes: removedNodeMutation[];
    adds: addedNodeMutation[];
    isAttachIframe?: true;
};
export declare type mutationCallBack = (m: mutationCallbackParam) => void;
export declare type mousemoveCallBack = (p: mousePosition[], source: IncrementalSource.MouseMove | IncrementalSource.TouchMove | IncrementalSource.Drag) => void;
export declare type mousePosition = {
    x: number;
    y: number;
    id: number;
    timeOffset: number;
};
export declare enum MouseInteractions {
    MouseUp = 0,
    MouseDown = 1,
    Click = 2,
    ContextMenu = 3,
    DblClick = 4,
    Focus = 5,
    Blur = 6,
    TouchStart = 7,
    TouchMove_Departed = 8,
    TouchEnd = 9
}
declare type mouseInteractionParam = {
    type: MouseInteractions;
    id: number;
    x: number;
    y: number;
};
export declare type mouseInteractionCallBack = (d: mouseInteractionParam) => void;
export declare type scrollPosition = {
    id: number;
    x: number;
    y: number;
};
export declare type scrollCallback = (p: scrollPosition) => void;
export declare type styleSheetAddRule = {
    rule: string;
    index?: number;
};
export declare type styleSheetDeleteRule = {
    index: number;
};
export declare type styleSheetRuleParam = {
    id: number;
    removes?: styleSheetDeleteRule[];
    adds?: styleSheetAddRule[];
};
export declare type styleSheetRuleCallback = (s: styleSheetRuleParam) => void;
export declare type canvasMutationCallback = (p: canvasMutationParam) => void;
export declare type canvasMutationParam = {
    id: number;
    property: string;
    args: Array<unknown>;
    setter?: true;
};
export declare type fontParam = {
    family: string;
    fontSource: string;
    buffer: boolean;
    descriptors?: FontFaceDescriptors;
};
export declare type LogLevel = 'assert' | 'clear' | 'count' | 'countReset' | 'debug' | 'dir' | 'dirxml' | 'error' | 'group' | 'groupCollapsed' | 'groupEnd' | 'info' | 'log' | 'table' | 'time' | 'timeEnd' | 'timeLog' | 'trace' | 'warn';
export declare type Logger = {
    assert?: typeof console.assert;
    clear?: typeof console.clear;
    count?: typeof console.count;
    countReset?: typeof console.countReset;
    debug?: typeof console.debug;
    dir?: typeof console.dir;
    dirxml?: typeof console.dirxml;
    error?: typeof console.error;
    group?: typeof console.group;
    groupCollapsed?: typeof console.groupCollapsed;
    groupEnd?: () => void;
    info?: typeof console.info;
    log?: typeof console.log;
    table?: typeof console.table;
    time?: typeof console.time;
    timeEnd?: typeof console.timeEnd;
    timeLog?: typeof console.timeLog;
    trace?: typeof console.trace;
    warn?: typeof console.warn;
};
export declare type ReplayLogger = Partial<Record<LogLevel, (data: logData) => void>>;
export declare type LogParam = {
    level: LogLevel;
    trace: string[];
    payload: string[];
};
export declare type fontCallback = (p: fontParam) => void;
export declare type logCallback = (p: LogParam) => void;
export declare type viewportResizeDimension = {
    width: number;
    height: number;
};
export declare type viewportResizeCallback = (d: viewportResizeDimension) => void;
export declare type inputValue = {
    text: string;
    isChecked: boolean;
};
export declare type inputCallback = (v: inputValue & {
    id: number;
}) => void;
export declare const enum MediaInteractions {
    Play = 0,
    Pause = 1,
    Seeked = 2
}
export declare type mediaInteractionParam = {
    type: MediaInteractions;
    id: number;
    currentTime?: number;
};
export declare type mediaInteractionCallback = (p: mediaInteractionParam) => void;
export declare type DocumentDimension = {
    x: number;
    y: number;
    relativeScale: number;
    absoluteScale: number;
};
export declare type Mirror = {
    map: idNodeMap;
    getId: (n: INode) => number;
    getNode: (id: number) => INode | null;
    removeNodeFromMap: (n: INode) => void;
    has: (id: number) => boolean;
    reset: () => void;
};
export declare type throttleOptions = {
    leading?: boolean;
    trailing?: boolean;
};
export declare type listenerHandler = () => void;
export declare type hookResetter = () => void;
export declare type playerConfig = {
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
    mouseTail: boolean | {
        duration?: number;
        lineCap?: string;
        lineWidth?: number;
        strokeStyle?: string;
    };
    unpackFn?: UnpackFn;
    logConfig: LogReplayConfig;
};
export declare type LogReplayConfig = {
    level?: LogLevel[] | undefined;
    replayLogger: ReplayLogger | undefined;
};
export declare type playerMetaData = {
    startTime: number;
    endTime: number;
    totalTime: number;
};
export declare type missingNode = {
    node: Node;
    mutation: addedNodeMutation;
};
export declare type missingNodeMap = {
    [id: number]: missingNode;
};
export declare type actionWithDelay = {
    doAction: () => void;
    delay: number;
};
export declare type Handler = (event?: unknown) => void;
export declare type Emitter = {
    on(type: string, handler: Handler): void;
    emit(type: string, event?: unknown): void;
    off(type: string, handler: Handler): void;
};
export declare type Arguments<T> = T extends (...payload: infer U) => unknown ? U : unknown;
export declare enum ReplayerEvents {
    Start = "start",
    Pause = "pause",
    Resume = "resume",
    Resize = "resize",
    Finish = "finish",
    FullsnapshotRebuilded = "fullsnapshot-rebuilded",
    LoadStylesheetStart = "load-stylesheet-start",
    LoadStylesheetEnd = "load-stylesheet-end",
    SkipStart = "skip-start",
    SkipEnd = "skip-end",
    MouseInteraction = "mouse-interaction",
    EventCast = "event-cast",
    CustomEvent = "custom-event",
    Flush = "flush",
    StateChange = "state-change",
    PlayBack = "play-back"
}
export declare type MaskInputFn = (text: string) => string;
export declare type MaskTextFn = (text: string) => string;
export declare type ElementState = {
    scroll?: [number, number];
};
export declare type StringifyOptions = {
    stringLengthLimit?: number;
    numOfKeysLimit: number;
};
export declare type LogRecordOptions = {
    level?: LogLevel[] | undefined;
    lengthThreshold?: number;
    stringifyOptions?: StringifyOptions;
    logger?: Logger;
};
export {};
