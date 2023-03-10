import type {
  Mirror,
  MaskInputOptions,
  SlimDOMOptions,
  MaskInputFn,
  MaskTextFn,
  DataURLOptions,
} from 'rrweb-snapshot';
import type { PackFn, UnpackFn } from './packer/base';
import type { IframeManager } from './record/iframe-manager';
import type { ShadowDomManager } from './record/shadow-dom-manager';
import type { Replayer } from './replay';
import type { RRNode } from 'rrdom';
import type { CanvasManager } from './record/observers/canvas/canvas-manager';
import type { StylesheetManager } from './record/stylesheet-manager';
import type {
  addedNodeMutation,
  blockClass,
  canvasMutationCallback,
  eventWithTime,
  fontCallback,
  hooksParam,
  inputCallback,
  IWindow,
  KeepIframeSrcFn,
  listenerHandler,
  maskTextClass,
  mediaInteractionCallback,
  mouseInteractionCallBack,
  mousemoveCallBack,
  mutationCallBack,
  RecordPlugin,
  SamplingStrategy,
  scrollCallback,
  selectionCallback,
  styleDeclarationCallback,
  styleSheetRuleCallback,
  viewportResizeCallback,
} from '@rrweb/types';
import type ProcessedNodeManager from './record/processed-node-manager';

export type recordOptions<T> = {
  emit?: (e: T, isCheckout?: boolean) => void;
  checkoutEveryNth?: number;
  checkoutEveryNms?: number;
  blockClass?: blockClass;
  blockSelector?: string;
  deleteSelector?: string;
  ignoreClass?: string;
  maskTextClass?: maskTextClass;
  maskTextSelector?: string;
  maskAllInputs?: boolean;
  maskInputOptions?: MaskInputOptions;
  maskInputFn?: MaskInputFn;
  maskTextFn?: MaskTextFn;
  slimDOMOptions?: SlimDOMOptions | 'all' | true;
  ignoreCSSAttributes?: Set<string>;
  inlineStylesheet?: boolean;
  hooks?: hooksParam;
  packFn?: PackFn<eventWithTime>;
  sampling?: SamplingStrategy;
  dataURLOptions?: DataURLOptions;
  recordCanvas?: boolean;
  recordCrossOriginIframes?: boolean;
  recordAfter?: 'DOMContentLoaded' | 'load';
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
  selectionCb: selectionCallback;
  blockClass: blockClass;
  blockSelector: string | null;
  deleteSelector: string | null;
  ignoreClass: string;
  maskTextClass: maskTextClass;
  maskTextSelector: string | null;
  maskInputOptions: MaskInputOptions;
  maskInputFn?: MaskInputFn;
  maskTextFn?: MaskTextFn;
  keepIframeSrcFn: KeepIframeSrcFn;
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
  dataURLOptions: DataURLOptions;
  doc: Document;
  mirror: Mirror;
  iframeManager: IframeManager;
  stylesheetManager: StylesheetManager;
  shadowDomManager: ShadowDomManager;
  canvasManager: CanvasManager;
  processedNodeManager: ProcessedNodeManager;
  ignoreCSSAttributes: Set<string>;
  plugins: Array<{
    observer: (
      cb: (...arg: Array<unknown>) => void,
      win: IWindow,
      options: unknown,
    ) => listenerHandler;
    callback: (...arg: Array<unknown>) => void;
    options: unknown;
  }>;
};

export type MutationBufferParam = Pick<
  observerParam,
  | 'mutationCb'
  | 'blockSelector'
  | 'deleteSelector'
  | 'maskTextClass'
  | 'maskTextSelector'
  | 'inlineStylesheet'
  | 'maskInputOptions'
  | 'maskTextFn'
  | 'maskInputFn'
  | 'keepIframeSrcFn'
  | 'recordCanvas'
  | 'inlineImages'
  | 'slimDOMOptions'
  | 'dataURLOptions'
  | 'doc'
  | 'mirror'
  | 'iframeManager'
  | 'stylesheetManager'
  | 'shadowDomManager'
  | 'canvasManager'
  | 'processedNodeManager'
>;

export type ReplayPlugin = {
  handler?: (
    event: eventWithTime,
    isSync: boolean,
    context: { replayer: Replayer },
  ) => void;
  onBuild?: (
    node: Node | RRNode,
    context: { id: number; replayer: Replayer },
  ) => void;
  getMirror?: (mirrors: { nodeMirror: Mirror }) => void;
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
  logger: {
    log: (...args: Parameters<typeof console.log>) => void;
    warn: (...args: Parameters<typeof console.warn>) => void;
  };
  plugins?: ReplayPlugin[];
};

export type missingNode = {
  node: Node | RRNode;
  mutation: addedNodeMutation;
};
export type missingNodeMap = {
  [id: number]: missingNode;
};

declare global {
  interface Window {
    FontFace: typeof FontFace;
  }
}

export type CrossOriginIframeMessageEventContent<T = eventWithTime> = {
  type: 'rrweb';
  event: T;
  // The origin of the iframe which originally emits this message. It is used to check the integrity of message and to filter out the rrweb messages which are forwarded by some sites.
  origin: string;
  isCheckout?: boolean;
};
export type CrossOriginIframeMessageEvent =
  MessageEvent<CrossOriginIframeMessageEventContent>;
