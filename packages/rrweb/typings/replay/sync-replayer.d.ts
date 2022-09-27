import { RRDocument as BaseRRDocument } from 'rrdom';
import type { Mirror as RRDOMMirror } from 'rrdom';
import {
  eventWithTime,
  playerConfig,
  playerMetaData,
  Handler,
  mouseMovePos,
} from '../types';
declare class RRDocument extends BaseRRDocument {
  scrollTop: number;
  scrollLeft: number;
}
export declare class SyncReplayer {
  config: Partial<playerConfig>;
  virtualDom: RRDocument;
  mousePos: mouseMovePos | null;
  events: eventWithTime[];
  latestMetaEvent: eventWithTime | null;
  unhandledEvents: eventWithTime[];
  private currentTime;
  private emitter;
  private legacy_missingNodeRetryMap;
  private cache;
  private mirror;
  private newDocumentQueue;
  constructor(
    events: Array<eventWithTime | string>,
    config?: Partial<playerConfig>,
  );
  on(event: string, handler: Handler): this;
  off(event: string, handler: Handler): this;
  setConfig(config: Partial<playerConfig>): void;
  getMetaData(): playerMetaData;
  getCurrentTime(): number;
  getMirror(): RRDOMMirror;
  play(
    castEventCallback?: (event: {
      index: number;
      event: eventWithTime;
      currentTime: number;
    }) => boolean | void,
  ): void;
  resetCache(): void;
  private getCastFn;
  private rebuildFullSnapshot;
  private attachDocumentToIframe;
  private collectIframeAndAttachDocument;
  private applyIncremental;
  private applyMutation;
  private legacy_resolveMissingNode;
  private warnNodeNotFound;
  private debugNodeNotFound;
  private warn;
  private debug;
}
export {};
