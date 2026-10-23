import { compositorFrameTick } from '../src/compositor-ticks';

// Deterministic LCG (Numerical Recipes constants) so the uptime sweep below
// is fully repeatable and does not depend on machine uptime or a real
// Chrome instance. `nextSeed(12345)` walked 3 draws reproduces the observed
// collision base 272689215.7 under the old +0.5 encoding (see below).
function nextSeed(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

function strictlyIncreasing(values: number[]): boolean {
  return values.every(
    (value, index) => index === 0 || value > values[index - 1],
  );
}

function attemptTicks(
  baseMs: number,
  offsetMs: number,
  encode: (baseMs: number, offsetMs: number, attempt: number) => number,
): number[] {
  const ticks: number[] = [];
  for (let attempt = 0; attempt < 10; attempt++) {
    ticks.push(encode(baseMs, offsetMs, attempt));
  }
  return ticks;
}

function assertSafeUnderBothConversions(baseMs: number, offsetMs = 0): void {
  const ticks = attemptTicks(baseMs, offsetMs, compositorFrameTick);
  expect(strictlyIncreasing(ticks.map((tick) => Math.trunc(tick * 1000)))).toBe(
    true,
  );
  expect(strictlyIncreasing(ticks.map((tick) => Math.round(tick * 1000)))).toBe(
    true,
  );
}

// The two unsafe encodings this suite must be able to catch on a revert:
// the pre-fix production code added a plain 0.5us offset, which sits exactly
// on Chrome's rounding boundary if it ever rounds instead of truncating, and
// the original naive implementation stepped attempts by a raw 0.001ms in
// floating point, which truncates onto a repeated microsecond.
const halfMicrosecondOffset = (
  baseMs: number,
  offsetMs: number,
  attempt: number,
): number => {
  const microseconds = Math.round((baseMs + offsetMs) * 1000) + attempt;
  return (microseconds + 0.5) / 1000;
};
const naiveMillisecondStep = (
  baseMs: number,
  offsetMs: number,
  attempt: number,
): number => baseMs + offsetMs + attempt * 0.001;

// Observed failing base from the real-Chrome retry probe: the naive 0.001ms
// step truncates attempt 2 onto the same microsecond as attempt 1 here.
const KNOWN_TRUNCATION_COLLISION_BASE_MS = 560370.205;
// Found by walking the seeded LCG below from seed 12345: the +0.5us offset
// rounds attempts 2 and 3 onto the same microsecond at this base.
const KNOWN_ROUNDING_COLLISION_BASE_MS = 272689215.7;

describe('compositorFrameTick', () => {
  it('increases strictly under truncated and rounded microsecond conversion at the known bases', () => {
    assertSafeUnderBothConversions(KNOWN_TRUNCATION_COLLISION_BASE_MS);
    assertSafeUnderBothConversions(KNOWN_ROUNDING_COLLISION_BASE_MS);
  });

  it('increases strictly across a seeded, repeatable sweep of representative Chrome uptimes', () => {
    let seed = 12345;
    // A uint32 seed divided by 10 spans milliseconds from 0 to roughly 5
    // days of uptime.
    for (let sample = 0; sample < 10000; sample++) {
      seed = nextSeed(seed);
      const baseMs = seed / 10;
      assertSafeUnderBothConversions(baseMs);
    }
  });

  it('rejects a +0.5 microsecond offset that lands on a rounding boundary', () => {
    // Proves the sweep is sensitive to the exact pre-fix bug: at the base the
    // LCG above produces on its 3rd draw, the old +0.5us offset repeats a
    // microsecond under round-to-nearest conversion, while the real,
    // fixed export stays strictly increasing on the same input.
    const unsafeTicks = attemptTicks(
      KNOWN_ROUNDING_COLLISION_BASE_MS,
      0,
      halfMicrosecondOffset,
    );
    expect(
      strictlyIncreasing(unsafeTicks.map((tick) => Math.round(tick * 1000))),
    ).toBe(false);

    const safeTicks = attemptTicks(
      KNOWN_ROUNDING_COLLISION_BASE_MS,
      0,
      compositorFrameTick,
    );
    expect(
      strictlyIncreasing(safeTicks.map((tick) => Math.round(tick * 1000))),
    ).toBe(true);
  });

  it('rejects a naive +0.001ms per-attempt step that truncates onto a repeated microsecond', () => {
    const unsafeTicks = attemptTicks(
      KNOWN_TRUNCATION_COLLISION_BASE_MS,
      0,
      naiveMillisecondStep,
    );
    expect(
      strictlyIncreasing(unsafeTicks.map((tick) => Math.trunc(tick * 1000))),
    ).toBe(false);

    const safeTicks = attemptTicks(
      KNOWN_TRUNCATION_COLLISION_BASE_MS,
      0,
      compositorFrameTick,
    );
    expect(
      strictlyIncreasing(safeTicks.map((tick) => Math.trunc(tick * 1000))),
    ).toBe(true);
  });
});
