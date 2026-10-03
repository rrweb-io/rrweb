/** Encode compositor milliseconds without collapsing adjacent microseconds. */
export function compositorFrameTick(
  baseMs: number,
  offsetMs: number,
  attempt: number,
): number {
  const microseconds = Math.round((baseMs + offsetMs) * 1000) + attempt;
  // Stay away from both the truncation boundary and the half-way rounding
  // boundary. A quarter microsecond survives either protocol conversion.
  return (microseconds + 0.25) / 1000;
}
