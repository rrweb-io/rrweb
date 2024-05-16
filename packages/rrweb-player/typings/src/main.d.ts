import type { eventWithTime } from '@sentry-internal/rrweb-types';
import _Player from './Player.svelte';
type PlayerProps = {
    events: eventWithTime[];
};
declare class Player extends _Player {
    constructor(options: {
        target: Element;
        props: PlayerProps;
        data?: PlayerProps;
    });
}
export default Player;
