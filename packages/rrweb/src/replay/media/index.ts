import {
  type Emitter,
  MediaInteractions,
  ReplayerEvents,
} from '@saola.ai/rrweb-types';
import type { RRMediaElement } from '@saola.ai/rrdom';
import type { createPlayerService, createSpeedService } from '../machine';
import type { Mirror, mediaAttributes } from '@saola.ai/rrweb-snapshot';
import type { mediaInteractionData } from '@saola.ai/rrweb-types';

type MediaState = {
  isPlaying: boolean;
  currentTimeAtLastInteraction: number;
  lastInteractionTimeOffset: number;
  playbackRate: number;
  loop: boolean;
  volume: number;
  muted: boolean;
};

export class MediaManager {
  private mediaMap: Map<HTMLMediaElement | RRMediaElement, MediaState> =
    new Map();
  private warn: (...args: Parameters<typeof console.warn>) => void;
  private service: ReturnType<typeof createPlayerService>;
  private speedService: ReturnType<typeof createSpeedService>;
  private emitter: Emitter;
  private getCurrentTime: () => number;
  private metadataCallbackMap: WeakMap<
    HTMLMediaElement | RRMediaElement,
    () => void
  > = new Map();

  constructor(options: {
    warn: (...args: Parameters<typeof console.warn>) => void;
    service: ReturnType<typeof createPlayerService>;
    speedService: ReturnType<typeof createSpeedService>;
    getCurrentTime: () => number;
    emitter: Emitter;
  }) {
    this.warn = options.warn;
    this.service = options.service;
    this.speedService = options.speedService;
    this.emitter = options.emitter;
    this.getCurrentTime = options.getCurrentTime;

    this.emitter.on(ReplayerEvents.Start, this.start.bind(this));
    this.emitter.on(ReplayerEvents.SkipStart, this.start.bind(this));
    this.emitter.on(ReplayerEvents.Pause, this.pause.bind(this));
    this.emitter.on(ReplayerEvents.Finish, this.pause.bind(this));
    this.speedService.subscribe(() => {
      this.syncAllMediaElements();
    });
  }

  private syncAllMediaElements(options = { pause: false }) {
    this.mediaMap.forEach((_mediaState, target) => {
      this.syncTargetWithState(target);
      if (options.pause) {
        target.pause();
      }
    });
  }

  private start() {
    this.syncAllMediaElements();
  }

  private pause() {
    this.syncAllMediaElements({ pause: true });
  }

  private seekTo({
    time,
    target,
    mediaState,
  }: {
    time: number;
    target: HTMLMediaElement | RRMediaElement;
    mediaState: MediaState;
  }) {
    if (mediaState.isPlaying) {
      const differenceBetweenCurrentTimeAndMediaMutationTimestamp =
        time - mediaState.lastInteractionTimeOffset;
      const mediaPlaybackOffset =
        (differenceBetweenCurrentTimeAndMediaMutationTimestamp / 1000) *
        mediaState.playbackRate;

      const duration = 'duration' in target && target.duration;

      // Video hasn't loaded yet, wait for metadata
      if (Number.isNaN(duration)) {
        this.waitForMetadata(target);
        return;
      }

      let seekToTime =
        mediaState.currentTimeAtLastInteraction + mediaPlaybackOffset;

      if (
        target.loop &&
        // RRMediaElement doesn't have a duration property
        duration !== false
      ) {
        seekToTime = seekToTime % duration;
      }

      target.currentTime = seekToTime;
    } else {
      target.pause();
      target.currentTime = mediaState.currentTimeAtLastInteraction;
    }
  }

  private waitForMetadata(target: HTMLMediaElement | RRMediaElement) {
    if (this.metadataCallbackMap.has(target)) return;
    if (!('addEventListener' in target)) return;

    const onLoadedMetadata = () => {
      this.metadataCallbackMap.delete(target);
      const mediaState = this.mediaMap.get(target);
      if (!mediaState) return;
      this.seekTo({
        time: this.getCurrentTime(),
        target,
        mediaState,
      });
    };

    this.metadataCallbackMap.set(target, onLoadedMetadata);
    target.addEventListener('loadedmetadata', onLoadedMetadata, {
      once: true,
    });
  }

  private getMediaStateFromMutation({
    target,
    timeOffset,
    mutation,
  }: {
    target: HTMLMediaElement | RRMediaElement;
    timeOffset: number;
    mutation: mediaInteractionData;
  }): MediaState {
    const lastState = this.mediaMap.get(target);
    const { type, playbackRate, currentTime, muted, volume, loop } = mutation;

    const isPlaying =
      type === MediaInteractions.Play ||
      (type !== MediaInteractions.Pause &&
        (lastState?.isPlaying || target.getAttribute('autoplay') !== null));

    const mediaState: MediaState = {
      isPlaying,
      currentTimeAtLastInteraction:
        currentTime ?? lastState?.currentTimeAtLastInteraction ?? 0,
      lastInteractionTimeOffset: timeOffset,
      playbackRate: playbackRate ?? lastState?.playbackRate ?? 1,
      volume: volume ?? lastState?.volume ?? 1,
      muted: muted ?? lastState?.muted ?? target.getAttribute('muted') === null,
      loop: loop ?? lastState?.loop ?? target.getAttribute('loop') === null,
    };

    return mediaState;
  }

  private syncTargetWithState(target: HTMLMediaElement | RRMediaElement) {
    const mediaState = this.mediaMap.get(target);
    if (!mediaState) return;
    const { muted, loop, volume, isPlaying } = mediaState;
    const playerIsPaused = this.service.state.matches('paused');
    const playbackRate =
      mediaState.playbackRate * this.speedService.state.context.timer.speed;

    try {
      this.seekTo({
        time: this.getCurrentTime(),
        target,
        mediaState,
      });

      if (target.volume !== volume) {
        target.volume = volume;
      }
      target.muted = muted;
      target.loop = loop;

      if (target.playbackRate !== playbackRate) {
        // Avoid setting playbackRate when it's already the same
        // Safari drops frames whenever playbackRate is set, even if it's the same
        target.playbackRate = playbackRate;
      }

      if (isPlaying && !playerIsPaused) {
        // remove listener for 'canplay' event because play() is async and returns a promise
        // i.e. media will eventually start to play when data is loaded
        // 'canplay' event fires even when currentTime attribute changes which may lead to
        // unexpected behavior
        void target.play();
      } else {
        target.pause();
      }
    } catch (error) {
      this.warn(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
        `Failed to replay media interactions: ${error.message || error}`,
      );
    }
  }

  public addMediaElements(node: Node, timeOffset: number, mirror: Mirror) {
    if (!['AUDIO', 'VIDEO'].includes(node.nodeName)) return;
    const target = node as HTMLMediaElement;
    const serializedNode = mirror.getMeta(target);
    if (!serializedNode || !('attributes' in serializedNode)) return;
    const playerIsPaused = this.service.state.matches('paused');
    const mediaAttributes = serializedNode.attributes as
      | mediaAttributes
      | Record<string, never>;

    let isPlaying = false;
    if (mediaAttributes.rr_mediaState) {
      isPlaying = mediaAttributes.rr_mediaState === 'played';
    } else {
      isPlaying = target.getAttribute('autoplay') !== null;
    }
    if (isPlaying && playerIsPaused) target.pause();

    let playbackRate = 1;
    if (typeof mediaAttributes.rr_mediaPlaybackRate === 'number') {
      playbackRate = mediaAttributes.rr_mediaPlaybackRate;
    }

    let muted = false;
    if (typeof mediaAttributes.rr_mediaMuted === 'boolean') {
      muted = mediaAttributes.rr_mediaMuted;
    } else {
      muted = target.getAttribute('muted') !== null;
    }

    let loop = false;
    if (typeof mediaAttributes.rr_mediaLoop === 'boolean') {
      loop = mediaAttributes.rr_mediaLoop;
    } else {
      loop = target.getAttribute('loop') !== null;
    }

    let volume = 1;
    if (typeof mediaAttributes.rr_mediaVolume === 'number') {
      volume = mediaAttributes.rr_mediaVolume;
    }

    let currentTimeAtLastInteraction = 0;
    if (typeof mediaAttributes.rr_mediaCurrentTime === 'number') {
      currentTimeAtLastInteraction = mediaAttributes.rr_mediaCurrentTime;
    }

    this.mediaMap.set(target, {
      isPlaying,
      currentTimeAtLastInteraction,
      lastInteractionTimeOffset: timeOffset,
      playbackRate,
      volume,
      muted,
      loop,
    });
    this.syncTargetWithState(target);
  }

  public mediaMutation({
    target,
    timeOffset,
    mutation,
  }: {
    target: HTMLMediaElement | RRMediaElement;
    timeOffset: number;
    mutation: mediaInteractionData;
  }) {
    this.mediaMap.set(
      target,
      this.getMediaStateFromMutation({
        target,
        timeOffset,
        mutation,
      }),
    );

    this.syncTargetWithState(target);
  }

  public isSupportedMediaElement(node: Node): node is HTMLMediaElement {
    return ['AUDIO', 'VIDEO'].includes(node.nodeName);
  }

  public reset() {
    this.mediaMap.clear();
  }
}
