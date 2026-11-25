/**
 * Skip speed for `adaptiveSkip`. The target duration is about one second for
 * a ten-second gap plus 250 ms per doubling, kept between 250 ms and 3 s and
 * shortened in proportion to the playback speed. The speed is at least ten
 * times the playback speed, which makes short gaps faster than the target,
 * and `maxSpeed` caps it, which makes very long gaps slower.
 */
export function adaptiveSkipSpeed(
  gap: number,
  tempo: number,
  maxSpeed: number,
) {
  const target =
    Math.min(3000, Math.max(250, 1000 + 250 * Math.log2(gap / 10000))) / tempo;
  return Math.min(maxSpeed, Math.max(10 * tempo, gap / target));
}
