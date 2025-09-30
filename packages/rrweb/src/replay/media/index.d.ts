import type { Emitter } from '@newrelic/rrweb-types';
import type { RRMediaElement } from '@newrelic/rrdom';
import type { createPlayerService, createSpeedService } from '../machine';
import type { Mirror } from '@newrelic/rrweb-snapshot';
import type { mediaInteractionData } from '@newrelic/rrweb-types';
export declare class MediaManager {
  private mediaMap;
  private warn;
  private service;
  private speedService;
  private emitter;
  private getCurrentTime;
  private metadataCallbackMap;
  constructor(options: {
    warn: (...args: Parameters<typeof console.warn>) => void;
    service: ReturnType<typeof createPlayerService>;
    speedService: ReturnType<typeof createSpeedService>;
    getCurrentTime: () => number;
    emitter: Emitter;
  });
  private syncAllMediaElements;
  private start;
  private pause;
  private seekTo;
  private waitForMetadata;
  private getMediaStateFromMutation;
  private syncTargetWithState;
  addMediaElements(node: Node, timeOffset: number, mirror: Mirror): void;
  mediaMutation({
    target,
    timeOffset,
    mutation,
  }: {
    target: HTMLMediaElement | RRMediaElement;
    timeOffset: number;
    mutation: mediaInteractionData;
  }): void;
  isSupportedMediaElement(node: Node): node is HTMLMediaElement;
  reset(): void;
}
