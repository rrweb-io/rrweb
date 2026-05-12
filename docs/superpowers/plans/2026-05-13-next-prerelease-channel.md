# Next Prerelease Channel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a downstream `next` branch release channel that publishes rrweb packages as `2.0.0-next.N` prereleases, supports frequent Next releases, and keeps promotion back to `master` manageable.

**Architecture:** Treat `next` as a downstream prerelease branch. `next` carries a committed `.changeset/pre.json` with `tag: "next"` and publishes through the existing Changesets action flow; `master` should not keep a competing prerelease state long-term if we want recurring `master -> next` merges to stay clean. Promotion from `next` back to `master` is done by cherry-picking feature commits only, never by merging generated next release commits. Chrome extension publishing stays branch-gated, with `master` using the production Web Store listing and `next` using separate Next Web Store secrets.

**Tech Stack:** GitHub Actions, Changesets `@changesets/cli`, `changesets/action@v1`, Yarn v1, npm dist-tags, Chrome Web Store upload action.

---

## Files

- Modify: `.github/workflows/release.yml`
  - Add `next` to the push trigger.
  - Keep the existing Changesets release step.
  - Build the Chrome extension for both `master` and `next` when npm packages publish.
  - Publish production extension only from `master`.
  - Publish Next extension only from `next`.
- Modify on the `next` branch only: `.changeset/pre.json`
  - Convert prerelease state from `alpha` to `next` by running Changesets commands, not hand-editing JSON.
- Modify on `master` when retiring the current alpha train: `.changeset/pre.json`
  - Exit or remove long-lived `alpha` prerelease state so future `master -> next` merges do not carry competing alpha release metadata.
- Optional create: `docs/releases/next-channel.md`
  - Document maintainer steps and required GitHub secrets.

## Preconditions

- The working branch starts from current `origin/master`.
- The existing generated-file change at `packages/rrweb-player/.svelte-kit/ambient.d.ts` is unrelated and must not be staged or reverted as part of this work.
- Next feature PRs must keep real source/docs/tests/changeset edits separate from generated release artifacts.
- Generated release commits named like `Version Packages (next)` must never be merged or cherry-picked back to `master`.
- Repository maintainers have created a separate Chrome Web Store listing for the Next extension if extension release is enabled.
- GitHub repository secrets exist before enabling Next extension publishing:
  - `NEXT_CWS_EXTENSION_ID`
  - `NEXT_CWS_CLIENT_ID`
  - `NEXT_CWS_CLIENT_SECRET`
  - `NEXT_CWS_REFRESH_TOKEN`

## Task 1: Retire Competing Master Prerelease State

**Files:**
- Modify: `.changeset/pre.json`

- [ ] **Step 1: Confirm whether `master` still needs alpha releases**

Run on `master`:

```bash
node -e "const fs=require('fs'); if (!fs.existsSync('.changeset/pre.json')) { console.log('no pre.json'); process.exit(0); } const pre=require('./.changeset/pre.json'); console.log(pre.mode, pre.tag)"
```

Expected before cleanup if alpha is still active:

```text
pre alpha
```

If the project intentionally still needs alpha releases from `master`, pause here and accept that `master -> next` merges will require more manual release-state review. The cleaner long-term setup is to finish or retire the alpha train before making `next` long-lived.

- [ ] **Step 2: Exit prerelease mode on master when alpha is no longer needed**

Run:

```bash
yarn changeset pre exit
```

Expected:

```text
success Exited pre mode
```

- [ ] **Step 3: Version or remove master prerelease state according to release policy**

If maintainers want a normal release from `master`, run the normal release process after `pre exit`.

If maintainers only want to stop carrying prerelease state and avoid a normal release in this implementation, remove `.changeset/pre.json` on `master`:

```bash
git rm .changeset/pre.json
git commit -m "chore: exit master prerelease mode"
```

Expected: future normal feature changes on `master` add `.changeset/*.md` files but do not mutate `.changeset/pre.json`.

## Task 2: Create the Next Branch and Convert Prerelease State

**Files:**
- Modify: `.changeset/pre.json`

- [ ] **Step 1: Start from current master**

Run:

```bash
git fetch origin
git switch -c next origin/master
```

Expected:

```text
branch 'next' set up to track 'origin/master'
Switched to a new branch 'next'
```

- [ ] **Step 2: Create or verify next prerelease state**

If `next` was created before `master` exited alpha, verify current prerelease state is alpha:

Run:

```bash
node -e "const fs=require('fs'); if (!fs.existsSync('.changeset/pre.json')) { console.log('no pre.json'); process.exit(0); } const pre=require('./.changeset/pre.json'); console.log(pre.mode, pre.tag)"
```

Expected:

```text
pre alpha
```

If `master` has already exited alpha and `.changeset/pre.json` no longer exists, create next prerelease state with:

```bash
yarn changeset pre enter next
```

Expected:

```text
success Entered pre mode with tag next
```

- [ ] **Step 3: Convert alpha prerelease state using Changesets when needed**

Only run this step when Step 2 printed `pre alpha`.

Run:

```bash
yarn changeset pre exit
yarn changeset pre enter next
```

Expected:

```text
success Exited pre mode
success Entered pre mode with tag next
```

- [ ] **Step 4: Confirm the first planned Next version**

Run:

```bash
yarn changeset status --verbose
```

Expected: the fixed rrweb package set is planned for a `2.0.0-next.N` prerelease. `N` continues from the current prerelease counter, so it may be `21`, `22`, or later depending on alpha/next releases already merged. The exact table is long, but it must include entries like:

```text
rrweb              2.0.0-next.N
rrweb-snapshot     2.0.0-next.N
@rrweb/replay      2.0.0-next.N
@rrweb/record      2.0.0-next.N
@rrweb/web-extension 2.0.0-next.N
```

- [ ] **Step 5: Commit only the Next prerelease-state change**

Run:

```bash
git status --short
git add .changeset/pre.json
git commit -m "chore: enter next prerelease mode"
```

Expected: only `.changeset/pre.json` is staged and committed.

## Task 3: Update the Release Workflow for Both Branches

**Files:**
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Update release workflow trigger**

Change the top of `.github/workflows/release.yml` to:

```yaml
name: Release

on:
  push:
    branches:
      - master
      - next
```

- [ ] **Step 2: Keep the existing Changesets publish step unchanged**

Confirm this block remains:

```yaml
      - name: Create Release Pull Request or Publish to npm
        id: changesets
        uses: changesets/action@v1
        with:
          publish: yarn run release
        env:
          NODE_OPTIONS: '--max-old-space-size=4096'
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Rationale: Changesets reads `.changeset/pre.json` from the active branch. On `next` it publishes `next`. On `master`, after alpha is retired, it follows the normal Changesets release path without next prerelease metadata.

- [ ] **Step 3: Keep extension build for published releases on either branch**

Keep or set the build step to:

```yaml
      - name: Build Chrome Extension
        if: steps.changesets.outputs.published == 'true'
        run: NODE_OPTIONS='--max-old-space-size=4096' DISABLE_WORKER_INLINING=true yarn turbo run prepublish --filter=@rrweb/web-extension
```

- [ ] **Step 4: Gate production extension publish to master**

Replace the existing `Publish Chrome Extension` step with:

```yaml
      - name: Publish Chrome Extension
        uses: mnao305/chrome-extension-upload@v5.0.0
        if: steps.changesets.outputs.published == 'true' && github.ref == 'refs/heads/master'
        with:
          extension-id: 'pdaldeopoccdhlkabbkcjmecmmoninhe'
          file-path: ./packages/web-extension/dist/chrome.zip
          client-id: ${{ secrets.CWS_CLIENT_ID }}
          client-secret: ${{ secrets.CWS_CLIENT_SECRET }}
          refresh-token: ${{ secrets.CWS_REFRESH_TOKEN }}
          publish: true
```

- [ ] **Step 5: Add Next extension publish step**

Add this step immediately after the production extension publish step:

```yaml
      - name: Publish Next Chrome Extension
        uses: mnao305/chrome-extension-upload@v5.0.0
        if: steps.changesets.outputs.published == 'true' && github.ref == 'refs/heads/next'
        with:
          extension-id: ${{ secrets.NEXT_CWS_EXTENSION_ID }}
          file-path: ./packages/web-extension/dist/chrome.zip
          client-id: ${{ secrets.NEXT_CWS_CLIENT_ID }}
          client-secret: ${{ secrets.NEXT_CWS_CLIENT_SECRET }}
          refresh-token: ${{ secrets.NEXT_CWS_REFRESH_TOKEN }}
          publish: true
```

- [ ] **Step 6: Validate workflow syntax locally**

Run:

```bash
ruby -e "require 'yaml'; YAML.load_file('.github/workflows/release.yml'); puts 'valid yaml'"
```

Expected:

```text
valid yaml
```

- [ ] **Step 7: Commit workflow change**

Run:

```bash
git add .github/workflows/release.yml
git commit -m "ci: publish next prerelease channel"
```

## Task 4: Document Maintainer Usage

**Files:**
- Create: `docs/releases/next-channel.md`

- [ ] **Step 1: Create release docs**

Create `docs/releases/next-channel.md` with:

```markdown
# Next Release Channel

The `next` branch publishes rrweb prereleases for Next development without moving npm's `latest` tag.

## Package Releases

- `master` is the upstream/stable line and should not carry next prerelease state.
- `next` publishes the `next` prerelease channel.
- Consumers can install Next packages with `rrweb@next`, `@rrweb/replay@next`, or any other rrweb package using the `next` dist-tag.
- The first Next release uses `2.0.0-next.N`, where `N` continues from the current prerelease counter.

## Branch Setup

The `next` branch must keep `.changeset/pre.json` in prerelease mode with `tag: "next"`.

Merge `master` into `next` regularly before Next releases. Resolve any one-time `.changeset/pre.json` conflict by keeping Next's `tag: "next"`.

Do not run `changeset pre enter next` on `master`. Changesets cannot enter a second prerelease mode while `master` is already in `alpha` mode.

## Promotion Back To Master

Do not merge `next` back into `master` wholesale.

Promote source work by cherry-picking feature commits from `next` to `master`. Feature commits may include source files, tests, docs, and their original `.changeset/*.md` files.

Never cherry-pick generated Next release commits such as `Version Packages (next)`. Those commits contain release artifacts:

- `.changeset/pre.json`
- package `CHANGELOG.md` updates
- version-only package `package.json` updates

If a cherry-pick accidentally includes generated release artifacts, unstage and restore those paths before committing:

```bash
git cherry-pick --no-commit <feature-commit>
git restore --staged .changeset/pre.json 'packages/*/CHANGELOG.md' 'packages/plugins/*/CHANGELOG.md' 'packages/*/package.json' 'packages/plugins/*/package.json'
git restore .changeset/pre.json 'packages/*/CHANGELOG.md' 'packages/plugins/*/CHANGELOG.md' 'packages/*/package.json' 'packages/plugins/*/package.json'
git commit
```

## Chrome Extension

Next extension releases use a separate Chrome Web Store listing. The release workflow expects these GitHub secrets:

- `NEXT_CWS_EXTENSION_ID`
- `NEXT_CWS_CLIENT_ID`
- `NEXT_CWS_CLIENT_SECRET`
- `NEXT_CWS_REFRESH_TOKEN`

Production extension releases continue to use the existing production listing and secrets from `master`.
```

- [ ] **Step 2: Commit docs**

Run:

```bash
git add docs/releases/next-channel.md
git commit -m "docs: describe next release channel"
```

## Task 5: Verify End-to-End Release Behavior Without Publishing

**Files:**
- Read-only verification unless a failure reveals a needed fix.

- [ ] **Step 1: Verify branch-local Changesets state**

Run on `next`:

```bash
node -e "const pre=require('./.changeset/pre.json'); if (pre.mode !== 'pre' || pre.tag !== 'next') process.exit(1); console.log(`${pre.mode} ${pre.tag}`)"
```

Expected:

```text
pre next
```

- [ ] **Step 2: Verify release plan**

Run:

```bash
yarn changeset status --verbose
```

Expected: packages in the fixed set are planned as `2.0.0-next.N`.

- [ ] **Step 3: Verify package build**

Run:

```bash
NODE_OPTIONS='--max-old-space-size=4096' yarn build:all
```

Expected: command exits `0`.

- [ ] **Step 4: Verify Next extension build**

Run:

```bash
NODE_OPTIONS='--max-old-space-size=4096' DISABLE_WORKER_INLINING=true yarn turbo run prepublish --filter=@rrweb/web-extension
```

Expected:

```text
Tasks: ... successful
```

- [ ] **Step 5: Verify no unrelated files are staged**

Run:

```bash
git status --short
```

Expected: no staged files. The unrelated generated-file change at `packages/rrweb-player/.svelte-kit/ambient.d.ts` may still appear as unstaged if it existed before this work.

## Task 6: Push and Observe First Release PR

**Files:**
- No local file edits expected.

- [ ] **Step 1: Push Next branch**

Run:

```bash
git push -u origin next
```

Expected: GitHub Actions starts the `Release` workflow for `refs/heads/next`.

- [ ] **Step 2: Confirm Changesets opens a Next release PR**

Check GitHub Actions and pull requests. Expected:

```text
changeset-release/next
```

The release PR should version packages to `2.0.0-next.N`, update changelogs, and remove consumed changeset files.

- [ ] **Step 3: Merge Next release PR after checks pass**

After merge, the `Release` workflow on `next` should publish npm packages with the `next` dist-tag and publish the Next Chrome extension if the Next Web Store secrets are present.

## Task 7: Promote Next Work Back To Master

**Files:**
- Modify: source/docs/tests touched by selected Next feature commits.
- Keep: `.changeset/*.md` files from selected feature commits.
- Exclude: `.changeset/pre.json`, generated `CHANGELOG.md` release sections, and version-only package `package.json` changes from Next release commits.

- [ ] **Step 1: List commits that are on next but not master**

Run:

```bash
git fetch origin
git log --oneline origin/master..origin/next
```

Expected: the list includes feature commits and generated release commits. Select only feature commits for promotion.

- [ ] **Step 2: Cherry-pick selected feature commits**

Run:

```bash
git switch master
git pull --ff-only origin master
git cherry-pick <feature-commit-sha>
```

Expected: source/docs/tests and feature changesets are applied to `master`.

- [ ] **Step 3: Remove accidental release artifacts before committing**

If the cherry-pick was run with `--no-commit` or stopped for conflicts, remove generated release artifacts before continuing:

```bash
git restore --staged .changeset/pre.json 'packages/*/CHANGELOG.md' 'packages/plugins/*/CHANGELOG.md' 'packages/*/package.json' 'packages/plugins/*/package.json'
git restore .changeset/pre.json 'packages/*/CHANGELOG.md' 'packages/plugins/*/CHANGELOG.md' 'packages/*/package.json' 'packages/plugins/*/package.json'
git status --short
git cherry-pick --continue
```

Expected: `master` does not receive Next prerelease metadata.

- [ ] **Step 4: Verify master release state**

Run:

```bash
node -e "const fs=require('fs'); if (!fs.existsSync('.changeset/pre.json')) { console.log('no pre.json'); process.exit(0); } const pre=require('./.changeset/pre.json'); console.log(pre.mode, pre.tag)"
```

Expected:

```text
no pre.json
```

## Rollback Plan

- If npm packages publish under the wrong dist-tag, correct npm tags with `npm dist-tag` and pause the `next` branch workflow until the Changesets state is fixed.
- If Next extension publishing targets the wrong listing, stop the workflow, revoke the Next refresh token, and republish the correct zip to the intended listing.
- If the `next` branch should be retired, stop merging into it and remove `next` from `.github/workflows/release.yml` on `master`. Do not delete npm versions; remove or move the `next` dist-tag instead.

## Self-Review

- Spec coverage: covers master prerelease retirement, branch creation, prerelease conversion, one workflow, npm prerelease publishing, optional Next extension release, feature-only promotion back to master, docs, verification, and rollback.
- Placeholder scan: no placeholder tasks or unspecified code blocks remain.
- Type/name consistency: branch name is consistently `next`; npm prerelease tag is `next`; GitHub secrets use `NEXT_CWS_*`; production extension secrets remain `CWS_*`.
