# RelativeCI Monorepo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace rrweb's custom bundle-size comparison with package-level RelativeCI reporting that keeps all API keys out of pull request workflows.

**Architecture:** The shared Vite configuration emits one webpack-compatible stats file for each tracked package when CI enables `RELATIVE_CI_STATS`. The file uses one canonical ESM chunk/module graph and the complete set of top-level distributable assets. The unprivileged ESLint workflow uploads all stats in one `relative-ci-stats` artifact. A successful `workflow_run` starts a static 19-entry matrix. Each job reads its stats path from the shared archive and sends it to the matching RelativeCI project with one package key.

**Tech Stack:** GitHub Actions, Vite 6, `rollup-plugin-webpack-stats` 3.1.3, `actions/upload-artifact` v4, `relative-ci/agent-action` v3, Yarn 1

---

### Task 1: Emit package-level RelativeCI stats

**Files:**

- Modify: `package.json`
- Modify: `yarn.lock`
- Modify: `turbo.json`
- Modify: `vite.config.default.ts`
- Modify: `packages/packer/vite.config.ts`

- [ ] **Step 1: Add the Vite stats dependency**

Run:

```bash
yarn add --dev --exact -W rollup-plugin-webpack-stats@3.1.3
```

Expected: `package.json` contains `"rollup-plugin-webpack-stats": "3.1.3"` and Yarn updates `yarn.lock`.

- [ ] **Step 2: Add opt-in stats generation to the shared Vite configuration**

Import `bundleToWebpackStats` from the package's public `/transform` export and extend the existing options type with `bundleStats?: boolean`. Default that option to `true`. Add a final opt-in plugin that captures the ESM output as the canonical chunk/module graph. In `closeBundle`, replace its asset list with the sizes of every top-level `.js`, `.cjs`, `.mjs`, and `.css` file in the output directory, then write `webpack-stats.json`. Do not merge the ESM and CommonJS module graphs: RelativeCI treats a module's chunk count as its instance count, so merging equivalent formats would create false duplicate-module metrics.

This keeps local builds unchanged and matches the old collector's top-level distributable selection while preserving valid RelativeCI module metrics.

- [ ] **Step 3: Pass the opt-in variable through Turbo**

Add `RELATIVE_CI_STATS` to the `prepublish` task's `env` array in `turbo.json`. This passes the variable to Vite and includes it in Turbo's cache key.

- [ ] **Step 4: Preserve the packer exclusion**

Pass `bundleStats: false` in `packages/packer/vite.config.ts`:

```ts
  {
    bundleStats: false,
  },
```

- [ ] **Step 5: Build one representative package with stats enabled**

Run:

```bash
RELATIVE_CI_STATS=true yarn workspace @rrweb/record vite build
jq -e '.assets and .chunks and .modules' packages/record/dist/webpack-stats.json
```

Expected: Vite exits 0 and `jq` exits 0 for the generated webpack-compatible stats object. Asset names and byte sizes match all tracked top-level files in `packages/record/dist`, while chunks and modules describe only `record.js`.

- [ ] **Step 6: Check formatting and types**

Run:

```bash
yarn prettier --check package.json turbo.json vite.config.default.ts packages/packer/vite.config.ts
yarn tsc --noEmit --skipLibCheck --allowSyntheticDefaultImports --moduleResolution node --module esnext --target es2020 vite.config.default.ts
```

Expected: both commands exit 0.

### Task 2: Upload shared stats from the unprivileged build

**Files:**

- Modify: `.github/workflows/eslint-check.yml`

- [ ] **Step 1: Enable stats during the existing package build**

Add `RELATIVE_CI_STATS: 'true'` to the `Build Packages` step's environment.

- [ ] **Step 2: Replace the custom PR size upload and base build**

Delete the `Measure PR bundle sizes` and `Upload PR bundle sizes` steps. Delete the complete `bundle_size_build` job.

- [ ] **Step 3: Upload one shared stats artifact**

After linting, add one `actions/upload-artifact` step pinned to the verified v4 commit `ea165f8d65b6e75b540449e92b4886f43607fa02`. Upload the stats glob as `relative-ci-stats` and fail if it matches no files. Keep RelativeCI keys out of this workflow.

The complete stats upload step is:

```yaml
- name: Upload bundle stats
  uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
  with:
    name: relative-ci-stats
    path: packages/**/dist/webpack-stats.json
    if-no-files-found: error
```

The archive omits the `packages/` prefix and preserves directories after the first wildcard. A top-level entry is `record/dist/webpack-stats.json`; a plugin entry is `plugins/rrweb-plugin-console-record/dist/webpack-stats.json`. Confirm those paths in the first uploaded archive. Packer continues to opt out of stats generation.

- [ ] **Step 4: Validate workflow formatting and artifact coverage**

Run:

```bash
yarn prettier --check .github/workflows/eslint-check.yml
rg -c 'name: relative-ci-stats' .github/workflows/eslint-check.yml
```

Expected: formatting passes and there is exactly one shared stats upload. The workflow must contain no `relative-ci/agent-upload-artifact-action` steps or RelativeCI keys.

### Task 3: Submit artifacts from the privileged workflow

**Files:**

- Modify: `.github/workflows/pr-checks-privileged.yml`

- [ ] **Step 1: Replace the bundle comment job with a RelativeCI matrix**

Rename the `comment` job to `relative_ci`. Run it only when the triggering ESLint workflow succeeded and its event was `push` or `pull_request`. Grant only `actions: read`.

Use a static matrix with one entry per tracked package, containing `stats`, `name`, and `secret`. Preserve the existing 19 package-to-secret mappings. The stats path is relative to the archive root, for example:

```yaml
- stats: record/dist/webpack-stats.json
  name: '@rrweb/record'
  secret: RELATIVE_CI_KEY_RECORD
```

Keep this matrix in the trusted workflow. Do not build it from artifacts or PR metadata. Extra stats files in the shared artifact must not select more projects or secrets.

- [ ] **Step 2: Add the pinned RelativeCI agent step**

The matrix job contains no checkout, shell step, installation, or executable configuration. Each job downloads the shared archive and reads its own JSON entry using commit `fcf45416581928e8dd62eded78ce98c78e5149f8`:

```yaml
- name: Send ${{ matrix.name }} bundle stats to RelativeCI
  uses: relative-ci/agent-action@fcf45416581928e8dd62eded78ce98c78e5149f8 # v3
  with:
    artifactName: relative-ci-stats
    webpackStatsFile: ${{ matrix.stats }}
    key: ${{ secrets[matrix.secret] }}
    token: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 3: Preserve ESLint annotation**

Leave the existing `annotate` job and its pull-request-only condition unchanged.

- [ ] **Step 4: Validate workflow formatting and matrix coverage**

Run:

```bash
yarn prettier --check .github/workflows/pr-checks-privileged.yml
rg -c '^\s+- stats:' .github/workflows/pr-checks-privileged.yml
```

Expected: formatting passes and the count is `19`. Verify that stats paths and secret names are unique, each display name matches its package manifest, and the paths match the shared archive layout. Missing package stats must fail the corresponding agent job.

### Task 4: Remove the legacy bundle-size implementation

**Files:**

- Delete: `.github/scripts/measure-bundle-sizes.js`
- Delete: `.github/scripts/render-bundle-size-comment.js`

- [ ] **Step 1: Delete both custom scripts**

Remove the measurement and Markdown-rendering scripts after their workflow callers are gone.

- [ ] **Step 2: Prove the old implementation has no live references**

Run:

```bash
rg -n 'measure-bundle-sizes|render-bundle-size-comment|bundle-size-data|pr-sizes|base-sizes|sticky-pull-request-comment' .github
```

Expected: no matches.

### Task 5: Verify the complete integration

**Files:**

- Verify all files changed in Tasks 1 through 4

- [ ] **Step 1: Parse both workflows as YAML 1.2**

Use the repository's available YAML parser to load `.github/workflows/eslint-check.yml` and `.github/workflows/pr-checks-privileged.yml`.

Expected: both files parse without errors and retain a top-level `on` key. Run actionlint on both workflows, ignoring only the existing outdated-version warning for `actions/setup-node@v3`:

```bash
actionlint -ignore 'the runner of "actions/setup-node@v3" action is too old' .github/workflows/eslint-check.yml .github/workflows/pr-checks-privileged.yml
```

Expected: no other actionlint findings.

- [ ] **Step 2: Run focused formatting checks**

Run:

```bash
yarn prettier --check package.json turbo.json vite.config.default.ts packages/packer/vite.config.ts .github/workflows/eslint-check.yml .github/workflows/pr-checks-privileged.yml docs/superpowers/specs/2026-09-08-relative-ci-monorepo-design.md docs/superpowers/plans/2026-09-08-relative-ci-monorepo.md
```

Expected: Prettier reports every file as formatted.

- [ ] **Step 3: Inspect the security boundary and diff**

Run:

```bash
git diff --check
git diff --stat HEAD~1
git status --short
```

Confirm that the PR workflow references no `RELATIVE_CI_KEY`, the privileged RelativeCI job contains only the pinned agent step with `actions: read`, and new third-party actions use full commit SHAs. Check that successful `pull_request` and `push` builds still trigger submission so the default branch supplies baselines. Verify that the shared artifact name agrees between workflows and `webpackStatsFile` comes only from the static matrix. Do not run or update unrelated visual snapshots for this workflow refactor.

- [ ] **Step 4: Commit the implementation**

Run:

```bash
git add package.json yarn.lock turbo.json vite.config.default.ts packages/packer/vite.config.ts .github/workflows/eslint-check.yml .github/workflows/pr-checks-privileged.yml .github/scripts/measure-bundle-sizes.js .github/scripts/render-bundle-size-comment.js docs/superpowers/specs/2026-09-08-relative-ci-monorepo-design.md docs/superpowers/plans/2026-09-08-relative-ci-monorepo.md
git commit -m "ci: replace bundle size checks with RelativeCI"
```

Expected: Git creates one implementation commit containing the verified integration.
