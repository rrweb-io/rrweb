import _Player from './Player.svelte';
import type { RRwebPlayerOptions } from './types';
export class Player extends _Player {
  constructor(
    options: {
      // for compatibility
      data?: RRwebPlayerOptions['props'];
    } & RRwebPlayerOptions,
  ) {
    super({
      target: options.target,
      props: options.data || options.props,
    });
  }

  $set(props: Parameters<_Player['$set']>[0]) {
    if ('timelineMarkers' in props) {
      // Validate/copy before Svelte schedules an update. A reactive validation
      // error would escape the caller and interrupt the shared update queue.
      const { timelineMarkers, ...remaining } = props;
      this.setTimelineMarkers(
        timelineMarkers === undefined ? [] : timelineMarkers,
      );
      super.$set(remaining);
    } else {
      super.$set(props);
    }
  }
}

export default Player;

export type { annotationData } from '@rrweb/types';

export type { TimelineMarker, TimelineMarkerSelection } from './types';
