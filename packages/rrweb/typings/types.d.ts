import type { serializedNodeWithId, Mirror, INode, MaskInputOptions, SlimDOMOptions, MaskInputFn, MaskTextFn } from 'rrweb-snapshot';
import type { PackFn, UnpackFn } from './packer/base';
import type { IframeManager } from './record/iframe-manager';
import type { ShadowDomManager } from './record/shadow-dom-manager';
import type { Replayer } from './replay';
import type { RRNode } from 'rrdom';
import type { CanvasManager } from './record/observers/canvas/canvas-manager';
import type { StylesheetManager } from './record/stylesheet-manager';
export declare enum EventType {
    DomContentLoaded = 0,
    Load = 1,
    FullSnapshot = 2,
    IncrementalSnapshot = 3,
    Meta = 4,
    Custom = 5,
    Plugin = 6
}
export declare type domContentLoadedEvent = {
    type: EventType.DomContentLoaded;
    data: unknown;
};
export declare type loadedEvent = {
    type: EventType.Load;
    data: unknown;
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
export declare type customEvent<T = unknown> = {
    type: EventType.Custom;
    data: {
        tag: string;
        payload: T;
    };
};
export declare type pluginEvent<T = unknown> = {
    type: EventType.Plugin;
    data: {
        plugin: string;
        payload: T;
    };
};
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
    Drag = 12,
    StyleDeclaration = 13
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
export declare type styleDeclarationData = {
    source: IncrementalSource.StyleDeclaration;
} & styleDeclarationParam;
export declare type canvasMutationData = {
    source: IncrementalSource.CanvasMutation;
} & canvasMutationParam;
export declare type fontData = {
    source: IncrementalSource.Font;
} & fontParam;
export declare type incrementalData = mutationData | mousemoveData | mouseInteractionData | scrollData | viewportResizeData | inputData | mediaInteractionData | styleSheetRuleData | canvasMutationData | fontData | styleDeclarationData;
export declare type event = domContentLoadedEvent | loadedEvent | fullSnapshotEvent | incrementalSnapshotEvent | metaEvent | customEvent | pluginEvent;
export declare type eventWithTime = event & {
    timestamp: number;
    delay?: number;
};
export declare type canvasEventWithTime = eventWithTime & {
    type: EventType.IncrementalSnapshot;
    data: canvasMutationData;
};
export declare type blockClass = string | RegExp;
export declare type maskTextClass = string | RegExp;
export declare type SamplingStrategy = Partial<{
    mousemove: boolean | number;
    mousemoveCallback: number;
    mouseInteraction: boolean | Record<string, boolean | undefined>;
    scroll: number;
    media: number;
    input: 'all' | 'last';
    canvas: 'all' | number;
}>;
export declare type RecordPlugin<TOptions = unknown> = {
    name: string;
    observer?: (cb: (...args: Array<unknown>) => void, win: IWindow, options: TOptions) => listenerHandler;
    eventProcessor?: <TExtend>(event: eventWithTime) => eventWithTime & TExtend;
    options: TOptions;
};
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
    userTriggeredOnInput?: boolean;
    collectFonts?: boolean;
    inlineImages?: boolean;
    plugins?: RecordPlugin[];
    mousemoveWait?: number;
    keepIframeSrcFn?: KeepIframeSrcFn;
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
    stylesheetManager: StylesheetManager;
    shadowDomManager: ShadowDomManager;
    canvasManager: CanvasManager;
    plugins: Array<{
        observer: (cb: (...arg: Array<unknown>) => void, win: IWindow, options: unknown) => listenerHandler;
        callback: (...arg: Array<unknown>) => void;
        options: unknown;
    }>;
};
export declare type MutationBufferParam = Pick<observerParam, 'mutationCb' | 'blockClass' | 'blockSelector' | 'maskTextClass' | 'maskTextSelector' | 'inlineStylesheet' | 'maskInputOptions' | 'maskTextFn' | 'maskInputFn' | 'recordCanvas' | 'inlineImages' | 'slimDOMOptions' | 'doc' | 'mirror' | 'iframeManager' | 'stylesheetManager' | 'shadowDomManager' | 'canvasManager'>;
export declare type hooksParam = {
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
export declare type styleAttributeValue = {
    [key: string]: styleValueWithPriority | string | false;
};
export declare type styleValueWithPriority = [string, string];
export declare type attributeCursor = {
    node: Node;
    attributes: {
        [key: string]: string | styleAttributeValue | null;
    };
};
export declare type attributeMutation = {
    id: number;
    attributes: {
        [key: string]: string | styleAttributeValue | null;
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
export declare type mouseMovePos = {
    x: number;
    y: number;
    id: number;
    debugData: incrementalData;
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
    TouchEnd = 9,
    TouchCancel = 10
}
export declare enum CanvasContext {
    '2D' = 0,
    WebGL = 1,
    WebGL2 = 2
}
export declare type SerializedCanvasArg = {
    rr_type: 'ArrayBuffer';
    base64: string;
} | {
    rr_type: 'Blob';
    data: Array<CanvasArg>;
    type?: string;
} | {
    rr_type: string;
    src: string;
} | {
    rr_type: string;
    args: Array<CanvasArg>;
} | {
    rr_type: string;
    index: number;
};
export declare type CanvasArg = SerializedCanvasArg | string | number | boolean | null | CanvasArg[];
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
    index?: number | number[];
};
export declare type styleSheetDeleteRule = {
    index: number | number[];
};
export declare type styleSheetRuleParam = {
    id: number;
    removes?: styleSheetDeleteRule[];
    adds?: styleSheetAddRule[];
};
export declare type styleSheetRuleCallback = (s: styleSheetRuleParam) => void;
export declare type styleDeclarationParam = {
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
export declare type styleDeclarationCallback = (s: styleDeclarationParam) => void;
export declare type canvasMutationCommand = {
    property: string;
    args: Array<unknown>;
    setter?: true;
};
export declare type canvasMutationParam = {
    id: number;
    type: CanvasContext;
    commands: canvasMutationCommand[];
} | ({
    id: number;
    type: CanvasContext;
} & canvasMutationCommand);
export declare type canvasMutationWithType = {
    type: CanvasContext;
} & canvasMutationCommand;
export declare type canvasMutationCallback = (p: canvasMutationParam) => void;
export declare type canvasManagerMutationCallback = (target: HTMLCanvasElement, p: canvasMutationWithType) => void;
export declare type ImageBitmapDataURLWorkerParams = {
    id: number;
    bitmap: ImageBitmap;
    width: number;
    height: number;
};
export declare type ImageBitmapDataURLWorkerResponse = {
    id: number;
} | {
    id: number;
    type: string;
    base64: string;
    width: number;
    height: number;
};
export declare type fontParam = {
    family: string;
    fontSource: string;
    buffer: boolean;
    descriptors?: FontFaceDescriptors;
};
export declare type fontCallback = (p: fontParam) => void;
export declare type viewportResizeDimension = {
    width: number;
    height: number;
};
export declare type viewportResizeCallback = (d: viewportResizeDimension) => void;
export declare type inputValue = {
    text: string;
    isChecked: boolean;
    userTriggered?: boolean;
};
export declare type inputCallback = (v: inputValue & {
    id: number;
}) => void;
export declare const enum MediaInteractions {
    Play = 0,
    Pause = 1,
    Seeked = 2,
    VolumeChange = 3
}
export declare type mediaInteractionParam = {
    type: MediaInteractions;
    id: number;
    currentTime?: number;
    volume?: number;
    muted?: boolean;
};
export declare type mediaInteractionCallback = (p: mediaInteractionParam) => void;
export declare type DocumentDimension = {
    x: number;
    y: number;
    relativeScale: number;
    absoluteScale: number;
};
export declare type DeprecatedMirror = {
    map: {
        [key: number]: INode;
    };
    getId: (n: Node) => number;
    getNode: (id: number) => INode | null;
    removeNodeFromMap: (n: Node) => void;
    has: (id: number) => boolean;
    reset: () => void;
};
export declare type throttleOptions = {
    leading?: boolean;
    trailing?: boolean;
};
export declare type listenerHandler = () => void;
export declare type hookResetter = () => void;
export declare type ReplayPlugin = {
    handler: (event: eventWithTime, isSync: boolean, context: {
        replayer: Replayer;
    }) => void;
};
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
    useVirtualDom: boolean;
    plugins?: ReplayPlugin[];
};
export declare type playerMetaData = {
    startTime: number;
    endTime: number;
    totalTime: number;
};
export declare type missingNode = {
    node: Node | RRNode;
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
export declare type KeepIframeSrcFn = (src: string) => boolean;
declare global {
    interface Window {
        FontFace: typeof FontFace;
    }
}
export declare type IWindow = Window & typeof globalThis;
export declare type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
export {};
