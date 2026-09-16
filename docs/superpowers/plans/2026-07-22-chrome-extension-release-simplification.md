# Chrome Extension Release Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove manual dispatch from the privileged release workflow while preserving automatic Chrome Web Store API v2 publishing and documenting dashboard-based recovery.

**Architecture:** Keep `.github/workflows/release.yml` push-only and use the Changesets `published` output as the sole extension build/upload trigger. Put recovery instructions in the existing release-channel documentation, with a workflow comment linking maintainers to it.

**Tech Stack:** GitHub Actions YAML, Changesets, Yarn/Turborepo, `chrome-webstore-upload-cli`, Markdown, Node.js assertions, Prettier, actionlint

---

### Task 1: Simplify the release workflow

**Files:**

- Modify: `.github/workflows/release.yml:3-69`

- [ ] **Step 1: Run the failing workflow regression assertion**

```sh
node -e "const fs=require('fs');const s=fs.readFileSync('.github/workflows/release.yml','utf8');for(const x of ['workflow_dispatch','publish_chrome_extension','github.event.inputs'])if(s.includes(x))throw new Error('manual release logic remains: '+x);if((s.match(/steps\.changesets\.outputs\.published == 'true'/g)||[]).length!==3)throw new Error('automatic publish gates changed');console.log('push-only release assertions passed')"
```

Expected: FAIL with `manual release logic remains: workflow_dispatch`.

- [ ] **Step 2: Remove manual-dispatch behavior and add the recovery pointer**

Make the trigger and relevant steps equivalent to:

```yaml
on:
  push:
    branches:
      - main
      - next

jobs:
  release:
    name: Release
    # Existing setup and Changesets steps remain unchanged.

      # Manual recovery: build and upload through the Chrome Web Store dashboard.
      # See docs/releases/next-channel.md#manual-chrome-extension-recovery.
      - name: Build Chrome Extension
        if: steps.changesets.outputs.published == 'true'
        run: NODE_OPTIONS='--max-old-space-size=4096' DISABLE_WORKER_INLINING=true yarn turbo run prepublish --filter=@rrweb/web-extension

      - name: Publish Chrome Extension
        if: steps.changesets.outputs.published == 'true' && github.ref == 'refs/heads/main'
        run: npx --yes chrome-webstore-upload-cli@4.0.1 --source ./packages/web-extension/dist/chrome.zip

      - name: Publish Next Chrome Extension
        if: steps.changesets.outputs.published == 'true' && github.ref == 'refs/heads/next'
        run: npx --yes chrome-webstore-upload-cli@4.0.1 --source ./packages/web-extension/dist/chrome.zip
```

Preserve the existing environment mappings, including `CWS_PUBLISHER_ID` and `NEXT_CWS_PUBLISHER_ID`.

- [ ] **Step 3: Run workflow validation**

```sh
node -e "const fs=require('fs');const yaml=require('yaml');const s=fs.readFileSync('.github/workflows/release.yml','utf8');yaml.parse(s);for(const x of ['workflow_dispatch','publish_chrome_extension','github.event.inputs'])if(s.includes(x))throw new Error('manual release logic remains: '+x);if((s.match(/steps\.changesets\.outputs\.published == 'true'/g)||[]).length!==3)throw new Error('automatic publish gates changed');for(const x of ['chrome-webstore-upload-cli@4.0.1','CWS_PUBLISHER_ID','NEXT_CWS_PUBLISHER_ID'])if(!s.includes(x))throw new Error('missing '+x);console.log('push-only API v2 workflow assertions passed')"
actionlint -ignore 'runner of .* action is too old' .github/workflows/release.yml
yarn prettier --check .github/workflows/release.yml
git diff --check
```

Expected: all commands exit 0 and the assertion prints `push-only API v2 workflow assertions passed`.

### Task 2: Document dashboard-based manual recovery

**Files:**

- Modify: `docs/releases/next-channel.md:1-110`

- [ ] **Step 1: Run the failing documentation assertion**

```sh
node -e "const fs=require('fs');const s=fs.readFileSync('docs/releases/next-channel.md','utf8');if(/\bmaster\b/.test(s))throw new Error('stale master reference remains');for(const x of ['## Manual Chrome extension recovery','packages/web-extension/dist/chrome.zip','unzip -t packages/web-extension/dist/chrome.zip'])if(!s.includes(x))throw new Error('missing recovery documentation: '+x);console.log('release recovery documentation assertions passed')"
```

Expected: FAIL with `stale master reference remains`.

- [ ] **Step 2: Correct branch names and add exact recovery instructions**

Replace `master` with `main` throughout the document. Add this section after the branch-specific Chrome publication description:

````markdown
## Manual Chrome extension recovery

Use this fallback only when the npm release was recovered separately and the
automatic Chrome step did not publish the matching extension version.

1. Check out the exact `main` or `next` release commit whose extension version
   should be published.
2. Install dependencies and build the archive:

   ```sh
   yarn install --frozen-lockfile
   NODE_OPTIONS='--max-old-space-size=4096' \
     DISABLE_WORKER_INLINING=true \
     yarn turbo run prepublish --filter=@rrweb/web-extension
   unzip -t packages/web-extension/dist/chrome.zip
   ```

3. Confirm that `packages/web-extension/dist/chrome/manifest.json` contains the
   intended version.
4. In the Chrome Web Store developer dashboard, select the production listing
   for `main` or the prerelease listing for `next`, upload
   `packages/web-extension/dist/chrome.zip`, and submit it for review.

GitHub Actions secrets cannot be read back for local CLI use, so dashboard upload
is the supported manual recovery path. Keep production and prerelease listings
separate.
````

Add `CWS_PUBLISHER_ID` and `NEXT_CWS_PUBLISHER_ID` to the preceding secret lists.

- [ ] **Step 3: Run documentation validation**

```sh
node -e "const fs=require('fs');const s=fs.readFileSync('docs/releases/next-channel.md','utf8');if(/\bmaster\b/.test(s))throw new Error('stale master reference remains');for(const x of ['## Manual Chrome extension recovery','packages/web-extension/dist/chrome.zip','unzip -t packages/web-extension/dist/chrome.zip','CWS_PUBLISHER_ID','NEXT_CWS_PUBLISHER_ID'])if(!s.includes(x))throw new Error('missing recovery documentation: '+x);console.log('release recovery documentation assertions passed')"
yarn prettier --check docs/releases/next-channel.md
git diff --check
```

Expected: all commands exit 0 and the assertion prints `release recovery documentation assertions passed`.

- [ ] **Step 4: Verify the documented build commands**

```sh
NODE_OPTIONS='--max-old-space-size=4096' DISABLE_WORKER_INLINING=true yarn turbo run prepublish --filter=@rrweb/web-extension
unzip -t packages/web-extension/dist/chrome.zip
node -e "const m=require('./packages/web-extension/dist/chrome/manifest.json');if(!m.version)throw new Error('manifest version missing');console.log('Chrome extension version:',m.version)"
```

Expected: build exits 0, `unzip` reports no errors, and the manifest assertion prints a version.

### Task 3: Commit, update the pull request, and verify remotely

**Files:**

- Modify: GitHub pull request `rrweb-io/rrweb#1908` description

- [ ] **Step 1: Run final local verification**

Repeat Task 1 Step 3 and Task 2 Steps 3-4, then run:

```sh
git status --short
git diff --check
```

Expected: only the workflow, release documentation, and plan are changed; every command exits 0.

- [ ] **Step 2: Commit and push the implementation**

```sh
git add .github/workflows/release.yml docs/releases/next-channel.md docs/superpowers/plans/2026-07-22-chrome-extension-release-simplification.md
git commit -m "Simplify Chrome extension release recovery"
git push
```

Expected: the commit and push succeed with only the listed files.

- [ ] **Step 3: Update the PR description**

Use `gh pr edit 1908 --repo rrweb-io/rrweb --body-file -` with a body that states:

```markdown
## Summary

- migrate Chrome Web Store publishing to pinned API v2 tooling
- preserve automatic stable and `next` publishing after successful npm releases
- document dashboard-based recovery without broadening the npm release workflow
- correct stale `master` references in release documentation

## Required repository setup

Production uses `CWS_PUBLISHER_ID`; `next` uses `NEXT_CWS_PUBLISHER_ID` with its
existing `NEXT_CWS_*` credentials.

## Validation

- workflow assertions, YAML parsing, Prettier, actionlint, and diff checks pass
- extension build and ZIP integrity checks pass
```

Expected: `gh pr edit` prints the PR URL.

- [ ] **Step 4: Verify CI and review state**

```sh
gh pr checks 1908 --repo rrweb-io/rrweb --watch --interval 10
python3 /Users/justin/.codex/plugins/cache/openai-curated-remote/github/0.1.8-2841cf9749ae/skills/gh-address-comments/scripts/fetch_comments.py --repo rrweb-io/rrweb --pr 1908
```

Expected: all required checks pass. Do not reply to or resolve review threads without explicit authorization.
