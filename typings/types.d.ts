import { serializedNodeWithId, idNodeMap, INode } from 'rrweb-snapshot';
export declare enum EventType {
    DomContentLoaded = 0,
    Load = 1,
    FullSnapshot = 2,
    IncrementalSnapshot = 3,
    Meta = 4
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
export declare enum IncrementalSource {
    Mutation = 0,
    MouseMove = 1,
    MouseInteraction = 2,
    Scroll = 3,
    ViewportResize = 4,
    Input = 5
}
export declare type mutationData = {
    source: IncrementalSource.Mutation;
} & mutationCallbackParam;
export declare type mousemoveData = {
    source: IncrementalSource.MouseMove;
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
} & viewportResizeDimention;
export declare type inputData = {
    source: IncrementalSource.Input;
    id: number;
} & inputValue;
export declare type incrementalData = mutationData | mousemoveData | mouseInteractionData | scrollData | viewportResizeData | inputData;
export declare type event = domContentLoadedEvent | loadedEvent | fullSnapshotEvent | incrementalSnapshotEvent | metaEvent;
export declare type eventWithTime = event & {
    timestamp: number;
    delay?: number;
};
export declare type recordOptions = {
    emit?: (e: eventWithTime, isCheckout?: boolean) => void;
    checkoutEveryNth?: number;
    checkoutEveryNms?: number;
};
export declare type observerParam = {
    mutationCb: mutationCallBack;
    mousemoveCb: mousemoveCallBack;
    mouseInteractionCb: mouseInteractionCallBack;
    scrollCb: scrollCallback;
    viewportResizeCb: viewportResizeCallback;
    inputCb: inputCallback;
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
};
export declare type addedNodeMutation = {
    parentId: number;
    previousId: number | null;
    nextId: number | null;
    node: serializedNodeWithId;
};
declare type mutationCallbackParam = {
    texts: textMutation[];
    attributes: attributeMutation[];
    removes: removedNodeMutation[];
    adds: addedNodeMutation[];
};
export declare type mutationCallBack = (m: mutationCallbackParam) => void;
export declare type mousemoveCallBack = (p: mousePosition[]) => void;
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
    TouchMove = 8,
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
export declare type viewportResizeDimention = {
    width: number;
    height: number;
};
export declare type viewportResizeCallback = (d: viewportResizeDimention) => void;
export declare type inputValue = {
    text: string;
    isChecked: boolean;
};
export declare type inputCallback = (v: inputValue & {
    id: number;
}) => void;
export declare type Mirror = {
    map: idNodeMap;
    getId: (n: INode) => number;
    getNode: (id: number) => INode | null;
    removeNodeFromMap: (n: INode) => void;
    has: (id: number) => boolean;
};
export declare type throttleOptions = {
    leading?: boolean;
    trailing?: boolean;
};
export declare type listenerHandler = () => void;
export declare type hookResetter = () => void;
export declare type playerConfig = {
    speed: number;
    root: Element;
    loadTimeout: number;
    skipInactive: Boolean;
    showWarning: Boolean;
    showDebug: Boolean;
};
export declare type playerMetaData = {
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
    SkipEnd = "skip-end"
}
export {};
