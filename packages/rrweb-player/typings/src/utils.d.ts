declare global {
    interface Document {
        mozExitFullscreen: Document['exitFullscreen'];
        webkitExitFullscreen: Document['exitFullscreen'];
        msExitFullscreen: Document['exitFullscreen'];
        webkitIsFullScreen: Document['fullscreen'];
        mozFullScreen: Document['fullscreen'];
        msFullscreenElement: Document['fullscreen'];
    }
    interface HTMLElement {
        mozRequestFullScreen: Element['requestFullscreen'];
        webkitRequestFullscreen: Element['requestFullscreen'];
        msRequestFullscreen: Element['requestFullscreen'];
    }
}
import type { eventWithTime } from '@sentry-internal/rrweb-types';
export declare function inlineCss(cssObj: Record<string, string>): string;
export declare function formatTime(ms: number): string;
export declare function openFullscreen(el: HTMLElement): Promise<void>;
export declare function exitFullscreen(): Promise<void>;
export declare function isFullscreen(): boolean;
export declare function onFullscreenChange(handler: () => unknown): () => void;
export declare function typeOf(obj: unknown): 'boolean' | 'number' | 'string' | 'function' | 'array' | 'date' | 'regExp' | 'undefined' | 'null' | 'object';
/**
 * Get periods of time when no user interaction happened from a list of events.
 * @param events - all events
 * @param inactivePeriodThreshold - threshold of inactive time in milliseconds
 * @returns periods of time consist with [start time, end time]
 */
export declare function getInactivePeriods(events: eventWithTime[], inactivePeriodThreshold: number): [number, number][];
