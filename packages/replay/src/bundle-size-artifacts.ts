export const replayBundleSizeFixtures = [
  'replay-anchor-001-signal-heavy-sequence-atlas',
  'replay-anchor-002-turbine-window-marker-rally',
  'replay-anchor-003-copper-shadow-buffer-lens',
  'replay-anchor-004-lattice-timer-brook-metric',
  'replay-anchor-005-cinder-stamp-portal-vector',
  'replay-anchor-006-velvet-drift-scrubber-trace',
  'replay-anchor-007-fable-render-matrix-courier',
  'replay-anchor-008-raster-orchid-ledger-burst',
  'replay-anchor-009-slate-pulse-audit-kernel',
  'replay-anchor-010-gilded-scroll-tandem-branch',
  'replay-anchor-011-frosted-reducer-capsule-note',
  'replay-anchor-012-amber-minimap-locator-thread',
  'replay-anchor-013-lucid-buffered-viewport-crown',
  'replay-anchor-014-rhythm-stitched-snapshot-moor',
  'replay-anchor-015-stable-proxy-channel-signal',
  'replay-anchor-016-burnished-delta-overlay-lock',
  'replay-anchor-017-deep-cluster-timeline-slate',
  'replay-anchor-018-measured-circuit-frame-scan',
  'replay-anchor-019-binary-meadow-cursor-helm',
  'replay-anchor-020-ferrous-cascade-replayer-gate',
  'replay-anchor-021-orbiting-cache-window-lattice',
  'replay-anchor-022-hushed-needle-driver-passage',
  'replay-anchor-023-pacific-pointer-mirror-ribbon',
  'replay-anchor-024-resolved-signal-archive-vault',
] as const;

export function getReplayBundleSizeSignature(): string {
  return replayBundleSizeFixtures.join('|');
}
