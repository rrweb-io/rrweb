# Sandboxed Rebuild Design

## Context

GitHub issue rrweb-io/rrweb#1817 reports that direct use of `rrweb-snapshot.rebuild()` can execute crafted replay content when callers rebuild into an unsandboxed browser document. The project already documents that filtering script-like behavior is incomplete and that replay should rely on iframe sandboxing as the browser-enforced security boundary.

The current `rrweb` replayer already creates a top-level iframe with `sandbox="allow-same-origin"` before rebuilding snapshots. The exposed `rrweb-snapshot.rebuild()` API is lower-level and can still target any caller-provided `Document`, including the top-level page document. That direct browser use is the gap this design closes.

## Goals

- Make unsafe direct browser rebuild fail by default.
- Preserve a deliberate escape hatch for trusted content and legacy tooling.
- Provide a first-class safe API for users who want to rebuild snapshots directly.
- Keep the fix structural: use browser sandboxing instead of expanding attribute or URL sanitization.
- Preserve `UNSAFE_replayCanvas` as an explicit unsafe mode.

## Non-Goals

- Do not attempt to sanitize every executable HTML, SVG, CSS, URL, or event-handler vector.
- Do not redesign replay around a separate-origin or message-passing renderer.
- Do not remove `UNSAFE_replayCanvas` in this change.

## API Boundary

`rrweb-snapshot.rebuild()` will validate browser `Document` targets before mutating them. In a real browser document, rebuild is allowed only when the target document belongs to an iframe whose `sandbox` attribute exists and does not include `allow-scripts`.

If validation fails, `rebuild()` throws a clear error:

```text
rrweb-snapshot.rebuild() cannot rebuild into an unsandboxed browser document. Use rebuildIntoSandboxedIframe(), pass a sandboxed iframe document, or set unsafeAllowUnsandboxedRebuild: true only for trusted content.
```

The API will accept an explicit unsafe option for trusted callers:

```ts
rebuild(node, {
  doc,
  cache,
  mirror,
  unsafeAllowUnsandboxedRebuild: true,
});
```

This option makes unsafe usage visible in code review and keeps existing trusted tests or tooling unblocked.

## Safe Helper

Add a convenience API to `rrweb-snapshot`:

```ts
const { iframe, node } = rebuildIntoSandboxedIframe(snapshot, {
  root: document.body,
  cache,
  mirror,
});
```

The helper creates an iframe, applies `sandbox="allow-same-origin"` before appending it, appends it to the configured root, then calls guarded `rebuild()` with the iframe document. It returns both the iframe and the rebuilt root node so callers can size or manage the iframe while using the safe path by default.

## Replayer Behavior

The `rrweb` replayer keeps its current default iframe model. `setupDom()` creates the top-level replay iframe, sets `sandbox="allow-same-origin"`, disables interaction, appends it, and then rebuilds snapshots into that iframe document. This satisfies the new `rebuild()` guard without using the unsafe escape hatch.

`UNSAFE_replayCanvas` remains available. In that mode the replay iframe may include `allow-scripts`, so it no longer satisfies the safe rebuild guard. Replayer calls into `rebuild()` must pass the explicit unsafe option when this mode is enabled. Documentation and tests must describe `UNSAFE_replayCanvas` as opting out of the script-execution protection.

Nested rebuilt iframes receive a safe sandbox by default. When `buildNode()` creates an iframe element from snapshot data, it sets `sandbox="allow-same-origin"` before applying serialized attributes. Any relaxation of that policy must flow through an explicit internal unsafe option rather than serialized replay data.

## Error Handling And Compatibility

The guard applies to real browser DOM documents. Non-browser virtual documents, including rrdom virtual documents, are not blocked by the browser sandbox check. Test environments that model browser documents can use the explicit unsafe option where they intentionally rebuild trusted fixtures into the top-level document.

This is an intentional breaking change for unsafe direct browser use of `rrweb-snapshot.rebuild()`. The migration paths are:

- use `rebuildIntoSandboxedIframe()` for untrusted replay content;
- pass an already-sandboxed iframe document to `rebuild()`;
- set `unsafeAllowUnsandboxedRebuild: true` only for trusted content.

## Testing

Add `rrweb-snapshot` tests for:

- `rebuild()` throws when targeting the top-level browser `document`;
- `rebuild()` works when targeting an iframe document whose iframe has `sandbox="allow-same-origin"`;
- `rebuild()` throws for a sandbox containing `allow-scripts`;
- `unsafeAllowUnsandboxedRebuild: true` allows direct rebuild for trusted callers;
- `rebuildIntoSandboxedIframe()` creates the iframe, applies sandbox before rebuild, and returns the rebuilt node;
- rebuilt nested iframes receive the safe sandbox by default.

Add `rrweb` replayer tests for:

- normal replay still rebuilds without the unsafe opt-out;
- `UNSAFE_replayCanvas` still works while using the explicit unsafe path;
- replay iframe snapshots expose the expected sandbox attributes.

These tests prove the browser-enforced boundary rather than enumerate every possible script vector.

## Documentation

Update:

- `docs/sandbox.md`;
- `guide.md`;
- canvas replay docs that mention `UNSAFE_replayCanvas`.

Add direct `rebuild()` API notes to `packages/rrweb-snapshot/README.md` only if implementation adds or expands API examples there.

The docs will say that `rebuild()` is a low-level API and that untrusted browser replay must use a sandboxed iframe. They will also state that `UNSAFE_replayCanvas` disables the script-execution protection.
