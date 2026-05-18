# Sandboxed Rebuild Design

## Context

GitHub issue rrweb-io/rrweb#1817 reports that direct use of `rrweb-snapshot.rebuild()` can execute crafted replay content when callers rebuild into an unsandboxed browser document. The project already documents that filtering script-like behavior is incomplete and that replay should rely on iframe sandboxing as the browser-enforced security boundary.

The current `rrweb` replayer already creates a top-level iframe with `sandbox="allow-same-origin"` before rebuilding snapshots. The exposed `rrweb-snapshot.rebuild()` API is lower-level and can still target any caller-provided `Document`, including the top-level page document. That direct browser use is the gap this design closes.

## Goals

- Make unprotected direct browser rebuild fail by default.
- Preserve a deliberate escape hatch for callers that explicitly accept the script-execution risk.
- Provide a first-class safe API for users who want to rebuild snapshots directly.
- Keep the fix structural: use browser sandboxing instead of expanding attribute or URL sanitization.
- Preserve `UNSAFE_replayCanvas` as an explicit unsafe mode.

## Non-Goals

- Do not attempt to sanitize every executable HTML, SVG, CSS, URL, or event-handler vector.
- Do not redesign replay around a separate-origin or message-passing renderer.
- Do not remove `UNSAFE_replayCanvas` in this change.

## API Boundary

`rrweb-snapshot.rebuild()` will validate browser `Document` targets before mutating them. In a real browser document, rebuild is allowed only when the target document belongs to an iframe whose sandbox token set is exactly `allow-same-origin`.

This guard belongs to `rebuild()` only. Lower-level node builders such as `buildNodeWithSN()` do not own the browser sandbox policy in this change.

If validation fails, `rebuild()` throws a clear error:

```text
rrweb-snapshot.rebuild() cannot rebuild into an unprotected browser document. Use rebuildIntoSandboxedIframe(), pass a sandboxed iframe document, or set unsafeAllowUnprotectedRebuild: true only when you accept the script-execution risk.
```

The API will accept an explicit unsafe option for callers that accept the risk:

```ts
rebuild(node, {
  doc,
  cache,
  mirror,
  unsafeAllowUnprotectedRebuild: true,
});
```

This option makes unsafe usage visible in code review and keeps existing tests or tooling unblocked when they intentionally accept the risk.

## Safe Helper

Add a convenience API to `rrweb-snapshot`:

```ts
const { iframe, node } = rebuildIntoSandboxedIframe(snapshot, {
  root: document.body,
  cache,
  mirror,
});
```

The helper creates an iframe, applies `sandbox="allow-same-origin"` before appending it, appends it to the configured root, then calls guarded `rebuild()` with the iframe document. It returns both the iframe and the rebuilt root node so callers can size or manage the iframe while using the safe path by default. The `node` return value is `Node | null`, matching `rebuild()` semantics.

The helper requires an explicit `root` element and does not default to `document.body`. It always creates a fresh iframe rather than accepting a caller-provided iframe, because the sandbox must be set before the iframe is appended or used. It stays minimal in the first implementation and does not mirror replayer styling, scrolling, pointer-event, or injected-style behavior. Additional helper flags can be added later when a concrete use case needs them. Helper options must not allow callers to override the enforced sandbox token set.

## Replayer Behavior

The `rrweb` replayer keeps its current default iframe model. `setupDom()` creates the top-level replay iframe, sets `sandbox="allow-same-origin"`, disables interaction, appends it, and then rebuilds snapshots into that iframe document. This satisfies the new `rebuild()` guard without using the unsafe escape hatch.

`UNSAFE_replayCanvas` remains available. In that mode the replay iframe may include `allow-scripts`, so it no longer satisfies the safe rebuild guard. Replayer calls into `rebuild()` must pass the explicit unsafe option when this mode is enabled. Documentation and tests must describe `UNSAFE_replayCanvas` as opting out of the script-execution protection.

Nested iframe sandbox attributes are not part of this issue fix. For normal rrweb replay, the top-level replay iframe's sandbox constrains browsing contexts nested inside it, so an inner serialized iframe cannot re-enable script execution that the ancestor sandbox removed. This change enforces the rebuild target document boundary rather than rewriting every nested iframe sandbox attribute.

## Error Handling And Compatibility

The guard applies when the target document has a live `defaultView`. If `doc.defaultView` is absent, the browser sandbox check does not run. If `doc.defaultView` exists, the target is allowed only when `doc.defaultView.frameElement` is an iframe whose sandbox token set is exactly `allow-same-origin`, unless `unsafeAllowUnprotectedRebuild: true` is set. Test environments that model browser documents can use the explicit unsafe option where they intentionally rebuild fixtures into the top-level document.

This is an intentional breaking change for unprotected direct browser use of `rrweb-snapshot.rebuild()`. The migration paths are:

- use `rebuildIntoSandboxedIframe()` for untrusted replay content;
- pass an already-sandboxed iframe document to `rebuild()`;
- set `unsafeAllowUnprotectedRebuild: true` only when you accept the script-execution risk.

## Testing

Add `rrweb-snapshot` tests for:

- `rebuild()` throws when targeting the top-level browser `document`;
- `rebuild()` works when targeting an iframe document whose iframe has `sandbox="allow-same-origin"`;
- `rebuild()` throws for any sandbox token set other than exactly `allow-same-origin`;
- `unsafeAllowUnprotectedRebuild: true` allows unprotected rebuild for callers that explicitly accept the risk;
- `rebuildIntoSandboxedIframe()` creates the iframe, applies sandbox before rebuild, and returns the rebuilt node;
- nested iframes cannot relax the target document's ancestor sandbox in normal replay.

Add `rrweb` replayer tests for:

- normal replay still rebuilds without the unsafe opt-out;
- `UNSAFE_replayCanvas` still works while using the explicit unsafe path;
- replay iframe snapshots expose the expected sandbox attributes.

These tests prove the browser-enforced boundary rather than enumerate every possible script vector.

## Documentation

Update:

- `docs/sandbox.md`;
- `guide.md`;
- `packages/rrweb-snapshot/README.md`;
- canvas replay docs that mention `UNSAFE_replayCanvas`.

The docs will say that `rebuild()` is a low-level API and that untrusted browser replay must use a sandboxed iframe. They will also state that `UNSAFE_replayCanvas` disables the script-execution protection.

## Release Note

Add a changeset for the public behavior change. The changeset should describe this as a breaking security-hardening change for `rrweb-snapshot`: browser rebuilds now require a sandboxed iframe target unless callers explicitly opt into an unprotected rebuild.
