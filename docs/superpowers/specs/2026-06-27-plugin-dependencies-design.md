# Plugin Dependency Design

## Context

The plugin packages currently declare `rrweb` as a peer dependency. That was a reasonable shape when `rrweb` was the only obvious host entrypoint, but the package split now makes `@rrweb/record`, `@rrweb/replay`, and `@rrweb/all` first-class ways to use the same plugin APIs.

That creates two problems:

- A hard `rrweb` peer tells consumers that `rrweb` is required even when they use `@rrweb/record`, `@rrweb/replay`, or `@rrweb/all`.
- Some plugin manifests hide real dependencies. Examples include `simple-peer-light` in the canvas WebRTC plugins, paired record plugins imported by replay plugins, and `@rrweb/utils` imported by record plugins.

The goal is to make plugin package metadata match the package split and the published artifacts without breaking existing public imports.

## Goals

- Remove misleading host package peers from plugin packages.
- Keep `rrweb`, `@rrweb/record`, `@rrweb/replay`, and `@rrweb/all` valid host entrypoints.
- Preserve existing public type imports from `rrweb`, especially `import type { ReplayPlugin } from 'rrweb'`.
- Make replay plugin typing available without forcing plugin packages to import types from the monolithic `rrweb` entrypoint.
- Declare every dependency needed by published JavaScript or published declarations.
- Document the trade-off between no host peers, optional host peers, and strict host peers in the PR description.

## Non-Goals

- Do not require plugin consumers to install a specific host package.
- Do not remove any existing public exports from `rrweb`.
- Do not change runtime plugin behavior.
- Do not add a broad dependency-policy checker unless it is dist-aware and small.
- Do not externalize plugin runtime imports as part of this change.

## Proposed Approach

Use the no-host-peer option.

Plugin packages should not declare `rrweb` as a required peer. The host relationship is a compatibility contract documented in README and recipe docs, not a package-manager peer contract, because npm cannot express "one of `rrweb`, `@rrweb/record`, `@rrweb/replay`, or `@rrweb/all`."

The manifests should instead declare the packages required by the plugin's published output:

- Published JavaScript imports left in `dist` or `umd` need `dependencies`.
- Published declaration imports left in `dist/*.d.ts` or `dist/*.d.cts` need `dependencies`.
- Source-only build, test, and example imports stay in `devDependencies`.
- Host peers such as `rrweb` should be removed from plugin packages.
- Non-host peers that are actually imported, such as `@rrweb/utils` or `@rrweb/types`, should move to `dependencies` when the published artifacts need them.

The build currently bundles many runtime imports. This change should not change that bundling policy. The implementation should verify built JavaScript separately from built declarations.

## Type Surface

`RecordPlugin` already lives in `@rrweb/types`. Replay plugins are less clean today: `ReplayPlugin` is exported from `rrweb`, and some replay plugins import it from `rrweb`.

Do not move the existing concrete `ReplayPlugin` type into `@rrweb/types` as-is. It references concrete replay types such as `Replayer`, plus `RRNode` and `Mirror`, which risks dependency cycles with `rrweb`, `rrdom`, and `rrweb-snapshot`.

Instead:

1. Add a host-neutral replay plugin contract to `@rrweb/types`.
2. Keep `rrweb` exporting `ReplayPlugin` for backwards compatibility.
3. Export `ReplayPlugin` from `@rrweb/replay` so replay-entrypoint users have a first-class type import.
4. Update replay plugin source so emitted plugin declarations no longer import types from `rrweb`.

The acceptance check is not just source cleanup. Built plugin declarations should not contain `from 'rrweb'`.

## Documentation

Update plugin documentation so package-manager peers are not the only compatibility signal.

Record plugin READMEs should say that the plugin works with one compatible recording host:

- `rrweb`
- `@rrweb/record`
- `@rrweb/all`

Replay plugin READMEs should say that the plugin works with one compatible replay host:

- `rrweb`
- `@rrweb/replay`
- `@rrweb/all`

Recipe docs that still imply `rrweb` is the only host should be updated when they touch the affected plugins.

The PR description must include the three options considered:

1. No host peer.
2. Optional host peers.
3. Strict host peer.

It should list pros and cons for each option and explain that no host peer was chosen because it matches the first-class split packages and avoids false package-manager warnings.

## PR Option Summary

### Option 1: No Host Peer

Pros:

- Supports all valid host entrypoints without false warnings.
- Avoids forcing `rrweb` into projects that intentionally use `@rrweb/record`, `@rrweb/replay`, or `@rrweb/all`.
- Lets plugin manifests focus on actual published-artifact imports.
- Works better with strict package managers once declarations no longer reference undeclared packages.

Cons:

- Package managers will not warn when a user installs a plugin without any compatible host package.
- Compatibility is enforced through documentation, TypeScript shape, and tests rather than peer metadata.

### Option 2: Optional Host Peers

Pros:

- Makes host compatibility visible in package metadata.
- Avoids hard install failures when peers are marked optional.

Cons:

- Does not enforce that at least one compatible host is installed.
- Multiple optional host peers can imply every host is relevant to every plugin.
- Keeps noisy metadata without fixing real undeclared imports.

### Option 3: Strict Host Peer

Pros:

- Gives clear install-time feedback when there is one canonical host.
- Matches a familiar plugin pattern.

Cons:

- No longer models rrweb's package split.
- Produces false warnings or forced installs for `@rrweb/record`, `@rrweb/replay`, and `@rrweb/all` users.
- Encourages accidental coupling back to the monolithic entrypoint.

## Testing

Focused verification should cover both package metadata and published artifacts.

- Run type checks for changed plugin packages and shared type packages.
- Build affected plugin packages.
- Inspect built plugin declarations and assert they do not import from `rrweb`.
- Inspect built JavaScript and declarations separately to decide which packages must be dependencies.
- Run `yarn references:update` after manifest changes because project references are generated from workspace metadata.
- Add changesets for published packages whose manifests or public type surfaces change.

Add strict-consumer smoke tests:

- Pack and install one record plugin with `@rrweb/record` only, then compile a tiny TypeScript import.
- Pack and install one replay plugin with `@rrweb/replay` only, then compile a tiny TypeScript import.

These smoke tests are important because Yarn v1 workspaces can mask undeclared dependencies through hoisting.

## Risks

The largest design risk is the replay type boundary. Moving the concrete `ReplayPlugin` type directly into `@rrweb/types` would create a poor dependency direction. The implementation should use a structural host-neutral contract instead.

The second risk is relying on source imports rather than built artifacts. These packages publish `dist`, `umd`, and `package.json`, not source files. The implementation must inspect emitted JavaScript and declarations.

The third risk is the canvas WebRTC plugin public type surface. `simple-peer-light` is currently undeclared, and `SimplePeer.Instance` leaks through constructor types. The implementation should either make that public type reliable through dependencies and emitted declarations or hide it behind a local structural type.

Removing host peers also removes install-time compatibility warnings. Documentation and smoke tests need to compensate for that trade-off.
