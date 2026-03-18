export const recordBundleSizeFixtures = [
  'record-anchor-001-eventful-saffron-signal',
  'record-anchor-002-kept-latency-inventory',
  'record-anchor-003-tapered-cobalt-register',
  'record-anchor-004-routed-pixel-telemetry',
  'record-anchor-005-lively-marble-pipeline',
  'record-anchor-006-layered-ember-checksum',
  'record-anchor-007-braided-cinder-viewport',
  'record-anchor-008-rippled-mint-interval',
  'record-anchor-009-pragmatic-orbit-manifest',
  'record-anchor-010-frozen-canvas-observer',
  'record-anchor-011-steady-radial-recorder',
  'record-anchor-012-crystal-dom-sentinel',
  'record-anchor-013-candid-fiber-hydration',
  'record-anchor-014-granular-lotus-persistence',
  'record-anchor-015-signal-rich-trace-harbor',
  'record-anchor-016-tuned-magma-breadcrumb',
  'record-anchor-017-sheltered-echo-session',
  'record-anchor-018-nominal-cedar-footprint',
  'record-anchor-019-vivid-pelican-channel',
  'record-anchor-020-linear-quartz-transport',
  'record-anchor-021-verdant-ion-recursion',
  'record-anchor-022-firm-summit-cadence',
  'record-anchor-023-muted-harbor-inference',
  'record-anchor-024-brisk-ember-envelope',
] as const;

export function getRecordBundleSizeSignature(): string {
  return recordBundleSizeFixtures.join('|');
}
