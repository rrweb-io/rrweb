# Sandboxed Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make browser `rrweb-snapshot.rebuild()` reject unprotected rebuild targets by default, provide a safe iframe helper, and keep unsafe replay/canvas behavior explicit.

**Architecture:** `rrweb-snapshot` owns the rebuild target guard and the safe helper. `rrweb` continues to create the replay iframe, and passes the unsafe opt-out only when `UNSAFE_replayCanvas` makes the iframe policy unprotected. Documentation and the changeset describe the public behavior change and migration path.

**Tech Stack:** TypeScript, Vitest/jsdom, Puppeteer-backed rrweb replay tests, Yarn 1 workspaces, Changesets.

---

## Execution Prerequisites

Yarn 1.22.19 or direct `node_modules/.bin/*` commands must be available before running tests. In the Codex shell, `node_modules` is available but `yarn` may not be on `PATH`; use direct binaries if needed.

Baseline commands:

```bash
./node_modules/.bin/vitest run packages/rrweb-snapshot/test/rebuild.test.ts
./node_modules/.bin/cross-env PUPPETEER_HEADLESS=true ./node_modules/.bin/vitest run packages/rrweb/test/replayer.test.ts
```

Expected: dependencies install successfully; baseline tests pass before implementation work starts. If baseline tests fail before code changes, stop and report the pre-existing failures.

## File Structure

- `packages/rrweb-snapshot/src/rebuild.ts`: add rebuild target validation, the unsafe option, and the safe helper implementation.
- `packages/rrweb-snapshot/src/index.ts`: export `createSandboxedIframe` and `rebuildIntoSandboxedIframe`.
- `packages/rrweb-snapshot/test/rebuild.test.ts`: add jsdom tests for the guard, unsafe opt-out, and safe helper.
- `packages/rrweb/src/replay/index.ts`: pass `unsafeAllowUnprotectedRebuild` only when `UNSAFE_replayCanvas` is enabled.
- `packages/rrweb/test/replayer.test.ts`: add replay iframe sandbox tests for normal and unsafe canvas modes.
- `packages/rrweb-snapshot/README.md`: document safe browser rebuild usage.
- `docs/sandbox.md`, `guide.md`, `docs/recipes/canvas.md`: document the sandbox requirement and canvas opt-out.
- `.changeset/sandboxed-rebuilds.md`: release note for the breaking security-hardening change.

## Task 1: Guard Browser Rebuild Targets

**Files:**

- Modify: `packages/rrweb-snapshot/src/rebuild.ts`
- Test: `packages/rrweb-snapshot/test/rebuild.test.ts`

- [ ] **Step 1: Write failing tests for guarded `rebuild()`**

Add `rebuild` to the test imports in `packages/rrweb-snapshot/test/rebuild.test.ts`:

```ts
import rebuild, {
  adaptCssForReplay,
  buildNodeWithSN,
  createCache,
} from '../src/rebuild';
```

Inside the existing `describe('rebuild', function () { ... })`, after `beforeEach`, add this helper and tests:

```ts
const simpleSnapshot = {
  id: 1,
  type: NodeType.Document,
  childNodes: [
    {
      id: 2,
      type: NodeType.Element,
      tagName: 'html',
      attributes: {},
      childNodes: [
        {
          id: 3,
          type: NodeType.Element,
          tagName: 'body',
          attributes: {},
          childNodes: [],
        },
      ],
    },
  ],
} as const;

describe('browser rebuild target guard', () => {
  it('throws when rebuilding into the top-level browser document', () => {
    expect(() =>
      rebuild(simpleSnapshot, {
        doc: document,
        cache,
        mirror,
      }),
    ).toThrow(
      'rrweb-snapshot.rebuild() cannot rebuild into an unprotected browser document',
    );
  });

  it('allows rebuilding into an iframe with exactly allow-same-origin sandbox', () => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-same-origin');
    document.body.appendChild(iframe);

    const node = rebuild(simpleSnapshot, {
      doc: iframe.contentDocument!,
      cache,
      mirror,
    });

    expect(node).toBe(iframe.contentDocument);
    expect(iframe.contentDocument!.body).not.toBeNull();
    iframe.remove();
  });

  it('throws for sandbox policies other than exactly allow-same-origin', () => {
    for (const sandbox of [
      '',
      'allow-scripts',
      'allow-same-origin allow-scripts',
      'allow-same-origin allow-forms',
    ]) {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', sandbox);
      document.body.appendChild(iframe);

      expect(() =>
        rebuild(simpleSnapshot, {
          doc: iframe.contentDocument!,
          cache: createCache(),
          mirror: createMirror(),
        }),
      ).toThrow(
        'rrweb-snapshot.rebuild() cannot rebuild into an unprotected browser document',
      );

      iframe.remove();
    }
  });

  it('allows an unprotected rebuild when the caller explicitly opts out', () => {
    const node = rebuild(simpleSnapshot, {
      doc: document,
      cache,
      mirror,
      unsafeAllowUnprotectedRebuild: true,
    });

    expect(node).toBe(document);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
./node_modules/.bin/vitest run packages/rrweb-snapshot/test/rebuild.test.ts
```

Expected: tests fail because `rebuild` does not reject unprotected browser documents and does not accept `unsafeAllowUnprotectedRebuild`.

- [ ] **Step 3: Implement the guard and option**

In `packages/rrweb-snapshot/src/rebuild.ts`, add these constants/types near `createCache()`:

```ts
const REBUILD_TARGET_ERROR =
  'rrweb-snapshot.rebuild() cannot rebuild into an unprotected browser document. Use rebuildIntoSandboxedIframe() or set unsafeAllowUnprotectedRebuild: true only when you accept the script-execution risk.';

type RebuildOptions = {
  doc: Document;
  onVisit?: (node: Node) => unknown;
  hackCss?: boolean;
  afterAppend?: (n: Node, id: number) => unknown;
  cache: BuildCache;
  mirror: Mirror;
  unsafeAllowUnprotectedRebuild?: boolean;
};

function isSupportedSandboxedIframe(
  frameElement: Element | null,
): frameElement is HTMLIFrameElement {
  if (
    !frameElement ||
    frameElement.tagName !== 'IFRAME' ||
    !('sandbox' in frameElement)
  ) {
    return false;
  }

  const sandboxTokens = Array.from((frameElement as HTMLIFrameElement).sandbox);
  return sandboxTokens.length === 1 && sandboxTokens[0] === 'allow-same-origin';
}

function assertRebuildTargetAllowed(options: RebuildOptions): void {
  if (options.unsafeAllowUnprotectedRebuild) {
    return;
  }

  const win = options.doc.defaultView;
  if (!win) {
    return;
  }

  if (isSupportedSandboxedIframe(win.frameElement)) {
    return;
  }

  throw new Error(REBUILD_TARGET_ERROR);
}
```

Replace the inline options type on `function rebuild(...)` with `options: RebuildOptions`, and call the guard before destructuring:

```ts
function rebuild(
  n: serializedNodeWithId,
  options: RebuildOptions,
): Node | null {
  assertRebuildTargetAllowed(options);

  const {
    doc,
    onVisit,
    hackCss = true,
    afterAppend,
    cache,
    mirror = new Mirror(),
  } = options;
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
./node_modules/.bin/vitest run packages/rrweb-snapshot/test/rebuild.test.ts
```

Expected: `browser rebuild target guard` tests pass, and existing rebuild tests still pass.

- [ ] **Step 5: Commit Task 1**

```bash
git add packages/rrweb-snapshot/src/rebuild.ts packages/rrweb-snapshot/test/rebuild.test.ts
git commit -m "fix(snapshot): guard unprotected browser rebuilds"
```

## Task 2: Add Minimal Safe Iframe Helper

**Files:**

- Modify: `packages/rrweb-snapshot/src/rebuild.ts`
- Modify: `packages/rrweb-snapshot/src/index.ts`
- Test: `packages/rrweb-snapshot/test/rebuild.test.ts`

- [ ] **Step 1: Write failing tests for `rebuildIntoSandboxedIframe()`**

Update the imports in `packages/rrweb-snapshot/test/rebuild.test.ts`:

```ts
import rebuild, {
  adaptCssForReplay,
  buildNodeWithSN,
  createCache,
  rebuildIntoSandboxedIframe,
} from '../src/rebuild';
```

Add tests inside `describe('browser rebuild target guard', () => { ... })`:

```ts
it('rebuildIntoSandboxedIframe creates a fresh sandboxed iframe in the required root', () => {
  const root = document.createElement('div');
  document.body.appendChild(root);

  const { iframe, node } = rebuildIntoSandboxedIframe(simpleSnapshot, {
    root,
    cache,
    mirror,
  });

  expect(root.contains(iframe)).toBe(true);
  expect(iframe.getAttribute('sandbox')).toBe('allow-same-origin');
  expect(node).toBe(iframe.contentDocument);
  expect(iframe.contentDocument!.querySelector('body')).not.toBeNull();
  root.remove();
});

it('rebuildIntoSandboxedIframe does not allow callers to override sandbox', () => {
  const root = document.createElement('div');
  document.body.appendChild(root);

  const { iframe } = rebuildIntoSandboxedIframe(simpleSnapshot, {
    root,
    cache,
    mirror,
    iframeAttributes: {
      sandbox: 'allow-same-origin allow-scripts',
      title: 'Replay',
    },
  });

  expect(iframe.getAttribute('sandbox')).toBe('allow-same-origin');
  expect(iframe.getAttribute('title')).toBe('Replay');
  root.remove();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
./node_modules/.bin/vitest run packages/rrweb-snapshot/test/rebuild.test.ts
```

Expected: tests fail because `rebuildIntoSandboxedIframe` is not implemented or exported.

- [ ] **Step 3: Implement helper types and function**

In `packages/rrweb-snapshot/src/rebuild.ts`, add this type after `RebuildOptions`:

```ts
type RebuildIntoSandboxedIframeOptions = Omit<
  RebuildOptions,
  'doc' | 'unsafeAllowUnprotectedRebuild'
> & {
  root: Element;
  iframeAttributes?: Omit<Record<string, string>, 'sandbox'> & {
    sandbox?: string;
  };
};
```

Add the helper before `export default rebuild;`:

```ts
export function rebuildIntoSandboxedIframe(
  n: serializedNodeWithId,
  options: RebuildIntoSandboxedIframeOptions,
): { iframe: HTMLIFrameElement; node: Node | null } {
  const iframe = options.root.ownerDocument.createElement('iframe');

  for (const [name, value] of Object.entries(options.iframeAttributes || {})) {
    if (name === 'sandbox') {
      continue;
    }
    iframe.setAttribute(name, value);
  }

  iframe.setAttribute('sandbox', 'allow-same-origin');
  options.root.appendChild(iframe);

  const node = rebuild(n, {
    ...options,
    doc: iframe.contentDocument!,
  });

  return { iframe, node };
}
```

- [ ] **Step 4: Export helper from package entrypoint**

In `packages/rrweb-snapshot/src/index.ts`, update imports and exports:

```ts
import rebuild, {
  buildNodeWithSN,
  adaptCssForReplay,
  createCache,
  rebuildIntoSandboxedIframe,
} from './rebuild';
```

and:

```ts
export {
  snapshot,
  serializeNodeWithId,
  rebuild,
  rebuildIntoSandboxedIframe,
  buildNodeWithSN,
  adaptCssForReplay,
  createCache,
  transformAttribute,
  ignoreAttribute,
  slimDOMDefaults,
  visitSnapshot,
  cleanupSnapshot,
  needMaskingText,
  classMatchesRegex,
  IGNORED_NODE,
  genId,
};
```

- [ ] **Step 5: Run tests and typecheck**

Run:

```bash
./node_modules/.bin/vitest run packages/rrweb-snapshot/test/rebuild.test.ts
./node_modules/.bin/tsc --noEmit -p packages/rrweb-snapshot/tsconfig.json
```

Expected: rebuild tests pass and TypeScript reports no errors.

- [ ] **Step 6: Commit Task 2**

```bash
git add packages/rrweb-snapshot/src/rebuild.ts packages/rrweb-snapshot/src/index.ts packages/rrweb-snapshot/test/rebuild.test.ts
git commit -m "feat(snapshot): add sandboxed iframe rebuild helper"
```

## Task 3: Integrate Guard With rrweb Replayer

**Files:**

- Modify: `packages/rrweb/src/replay/index.ts`
- Test: `packages/rrweb/test/replayer.test.ts`

- [ ] **Step 1: Write failing replayer tests**

In `packages/rrweb/test/replayer.test.ts`, add these tests after `it('can get meta data', async () => { ... })`:

```ts
it('creates a replay iframe with the supported sandbox policy', async () => {
  const sandbox = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events);
      replayer.iframe.getAttribute('sandbox');
    `);

  expect(sandbox).toBe('allow-same-origin');
});

it('keeps UNSAFE_replayCanvas explicit by using an unprotected sandbox policy', async () => {
  const sandbox = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events, { UNSAFE_replayCanvas: true });
      replayer.iframe.getAttribute('sandbox');
    `);

  expect(sandbox).toBe('allow-same-origin allow-scripts');
});

it('can rebuild the first full snapshot when UNSAFE_replayCanvas is enabled', async () => {
  const rebuilt = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events, { UNSAFE_replayCanvas: true });
      replayer.play(0);
      Boolean(replayer.iframe.contentDocument.querySelector('html'));
    `);

  expect(rebuilt).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify unsafe canvas rebuild fails**

Run:

```bash
./node_modules/.bin/cross-env PUPPETEER_HEADLESS=true ./node_modules/.bin/turbo run prepublish -F rrweb
./node_modules/.bin/cross-env PUPPETEER_HEADLESS=true ./node_modules/.bin/vitest run packages/rrweb/test/replayer.test.ts -t "UNSAFE_replayCanvas|supported sandbox policy"
```

Expected: default sandbox test passes. The unsafe canvas rebuild test fails until the replayer passes `unsafeAllowUnprotectedRebuild`.

- [ ] **Step 3: Pass unsafe option only for `UNSAFE_replayCanvas`**

In `packages/rrweb/src/replay/index.ts`, update the full snapshot rebuild call:

```ts
rebuild(event.data.node, {
  doc: this.iframe.contentDocument,
  afterAppend,
  cache: this.cache,
  mirror: this.mirror,
  unsafeAllowUnprotectedRebuild: this.config.UNSAFE_replayCanvas,
});
```

Do not pass the unsafe option from any other call site unless a test proves that call reaches the guarded `rebuild()` path with an unprotected browser target.

- [ ] **Step 4: Run focused rrweb tests**

Run:

```bash
./node_modules/.bin/cross-env PUPPETEER_HEADLESS=true ./node_modules/.bin/turbo run prepublish -F rrweb
./node_modules/.bin/cross-env PUPPETEER_HEADLESS=true ./node_modules/.bin/vitest run packages/rrweb/test/replayer.test.ts -t "UNSAFE_replayCanvas|supported sandbox policy"
```

Expected: focused replayer tests pass.

- [ ] **Step 5: Commit Task 3**

```bash
git add packages/rrweb/src/replay/index.ts packages/rrweb/test/replayer.test.ts
git commit -m "fix(rrweb): mark unsafe canvas rebuilds explicitly"
```

## Task 4: Update Public Docs

**Files:**

- Modify: `packages/rrweb-snapshot/README.md`
- Modify: `docs/sandbox.md`
- Modify: `guide.md`
- Modify: `docs/recipes/canvas.md`

- [ ] **Step 1: Update `packages/rrweb-snapshot/README.md`**

Replace the `#### rebuild` section with:

````md
#### rebuild

`rebuild` will build the DOM according to the taken snapshot.

In browser environments, `rebuild` is a low-level API and requires a document created by `rebuildIntoSandboxedIframe()` or `createSandboxedIframe()` by default. Untrusted replay data must not be rebuilt directly into the top-level `document` or a caller-created iframe document.

For browser usage, prefer `rebuildIntoSandboxedIframe`:

```ts
const { iframe, node } = rebuildIntoSandboxedIframe(snapshot, {
  root: document.body,
  cache,
  mirror,
});
```

If you intentionally accept the script-execution risk, pass `unsafeAllowUnprotectedRebuild: true` to `rebuild`.

There are several things will be done during rebuild:

1. Add data-rrid attribute if the Node is an Element.
2. Create some extra DOM node like text node to place inline CSS and some states.
3. Add data-extra-child-index attribute if Node has some extra child DOM.
````

- [ ] **Step 2: Update `docs/sandbox.md`**

After the paragraph ending `implementing this security ourselves.`, add:

```md
`rrweb-snapshot.rebuild()` enforces this boundary in browser environments. Browser rebuilds should use `rebuildIntoSandboxedIframe()` or an iframe created by `createSandboxedIframe()`, which creates an iframe with exactly `sandbox="allow-same-origin"` before rebuilding into it. Direct `rebuild()` calls against caller-created browser documents must explicitly opt into an unprotected rebuild with `unsafeAllowUnprotectedRebuild: true`.
```

- [ ] **Step 3: Update `guide.md` option text**

In the options table, replace the `UNSAFE_replayCanvas` description with:

```md
whether to replay the canvas element. **Enabling this adds `allow-scripts` to the replay iframe and opts out of the sandbox script-execution protection, which is unsafe.**
```

- [ ] **Step 4: Update `docs/recipes/canvas.md` warning**

Replace:

```md
**Enable replaying Canvas will remove the sandbox, which may cause a potential security issue.**
```

with:

```md
**Enabling canvas replay adds `allow-scripts` to the replay iframe and opts out of rrweb's sandbox script-execution protection. Only use `UNSAFE_replayCanvas` for replay data whose risk you accept.**
```

- [ ] **Step 5: Run markdown formatting**

Run:

```bash
./node_modules/.bin/prettier --write packages/rrweb-snapshot/README.md docs/sandbox.md guide.md docs/recipes/canvas.md
```

Expected: files format cleanly.

- [ ] **Step 6: Commit Task 4**

```bash
git add packages/rrweb-snapshot/README.md docs/sandbox.md guide.md docs/recipes/canvas.md
git commit -m "docs: explain sandboxed rebuild requirements"
```

## Task 5: Add Changeset And Full Verification

**Files:**

- Create: `.changeset/sandboxed-rebuilds.md`

- [ ] **Step 1: Add changeset**

Create `.changeset/sandboxed-rebuilds.md`:

```md
---
'rrweb-snapshot': major
'rrweb': patch
---

Require browser `rebuild()` calls to target a document created by `rebuildIntoSandboxedIframe()` or `createSandboxedIframe()` by default. Use these helpers for untrusted replay data, or pass `unsafeAllowUnprotectedRebuild: true` only when accepting the script-execution risk.

`rrweb` now marks `UNSAFE_replayCanvas` rebuilds as an explicit unsafe path because canvas replay adds script permission to the replay iframe.
```

- [ ] **Step 2: Run snapshot package verification**

Run:

```bash
./node_modules/.bin/tsc --noEmit -p packages/rrweb-snapshot/tsconfig.json
./node_modules/.bin/vitest run packages/rrweb-snapshot/test/rebuild.test.ts
```

Expected: TypeScript and focused tests pass.

- [ ] **Step 3: Run rrweb focused verification**

Run:

```bash
./node_modules/.bin/cross-env PUPPETEER_HEADLESS=true ./node_modules/.bin/turbo run prepublish -F rrweb
./node_modules/.bin/cross-env PUPPETEER_HEADLESS=true ./node_modules/.bin/vitest run packages/rrweb/test/replayer.test.ts -t "UNSAFE_replayCanvas|supported sandbox policy"
```

Expected: build succeeds and focused replayer tests pass.

- [ ] **Step 4: Run formatting on changed files**

Run:

```bash
./node_modules/.bin/prettier --write packages/rrweb-snapshot/src/rebuild.ts packages/rrweb-snapshot/src/index.ts packages/rrweb-snapshot/test/rebuild.test.ts packages/rrweb/src/replay/index.ts packages/rrweb/test/replayer.test.ts packages/rrweb-snapshot/README.md docs/sandbox.md guide.md docs/recipes/canvas.md .changeset/sandboxed-rebuilds.md
```

Expected: formatting completes without changing unrelated files.

- [ ] **Step 5: Check final diff**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; status shows only intended files.

- [ ] **Step 6: Commit Task 5**

```bash
git add .changeset/sandboxed-rebuilds.md
git commit -m "chore: add sandboxed rebuild changeset"
```
