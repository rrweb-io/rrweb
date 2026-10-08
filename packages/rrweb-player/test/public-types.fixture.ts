import Player, {
  type TimelineMarker,
  type TimelineMarkerSelection,
} from '../dist/rrweb-player';
declare const player: Player;
const markers: TimelineMarker[] = [{ id: 'a', timeOffset: 100, text: 'A' }];
player.setTimelineMarkers(markers);
player.setActiveTimelineMarker('a');
player.$set({
  timelineMarkers: markers,
  activeTimelineMarker: 'a',
  width: 800,
});
// @ts-expect-error prop replacement requires marker IDs too
player.$set({ timelineMarkers: [{ timeOffset: 100, text: 'Missing ID' }] });
player.goto(100, true);
player.getReplayer().pause();
player.addEventListener('ui-update-current-time', () => {});
// @ts-expect-error marker IDs are required
player.setTimelineMarkers([{ timeOffset: 100, text: 'Missing ID' }]);
// @ts-expect-error offsets are milliseconds, not strings
player.goto('100');
type IsAny<T> = 0 extends 1 & T ? true : false;
const setterIsTyped: IsAny<typeof player.setTimelineMarkers> = false;
const gotoIsTyped: IsAny<typeof player.goto> = false;
declare const selection: TimelineMarkerSelection;
selection.preventDefault();
