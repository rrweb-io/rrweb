export const allBundleSizeFixtures = [
  'all-anchor-001-packer-signal-hydrant-latency',
  'all-anchor-002-courier-packet-braided-vertex',
  'all-anchor-003-ember-channel-granular-hedgerow',
  'all-anchor-004-layered-proxy-summit-viewport',
  'all-anchor-005-harbored-minimap-cascade-ridge',
  'all-anchor-006-tallied-recording-fiber-bulwark',
  'all-anchor-007-portable-slate-observer-ripple',
  'all-anchor-008-prudent-cinder-manifest-silo',
  'all-anchor-009-muted-compass-backfill-grove',
  'all-anchor-010-brisk-telemetry-lantern-orbit',
  'all-anchor-011-routed-archive-snapshot-cedar',
  'all-anchor-012-fairway-capsule-buffer-signal',
  'all-anchor-013-lucid-silo-scrubber-embankment',
  'all-anchor-014-scribed-window-hinterland-graph',
  'all-anchor-015-steady-radial-payload-tributary',
  'all-anchor-016-fertile-weave-kernel-marker',
  'all-anchor-017-measured-ledger-courtyard-parse',
  'all-anchor-018-etched-foothold-sequence-tandem',
  'all-anchor-019-amber-mariner-breadcrumb-thread',
  'all-anchor-020-sheltered-circuit-replayer-delta',
  'all-anchor-021-verdant-scroll-pointer-galleon',
  'all-anchor-022-compact-spectrum-channel-lock',
  'all-anchor-023-burnished-protocol-valley-spoke',
  'all-anchor-024-factual-overlay-prairie-signal',
] as const;

export function getAllBundleSizeSignature(): string {
  return allBundleSizeFixtures.join('|');
}
