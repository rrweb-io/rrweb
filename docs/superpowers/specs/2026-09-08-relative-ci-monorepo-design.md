# RelativeCI monorepo integration

## Goal

Replace rrweb's custom bundle-size comparison and privileged PR-comment code with RelativeCI's documented `workflow_run` integration. Preserve package-level bundle reporting without exposing repository secrets to pull request code.

## Scope

RelativeCI will track every Vite-built package covered by the existing bundle-size script, except `@rrweb/packer`, which the existing script already excludes:

- `@rrweb/all`
- `@rrweb/browser-client`
- `@rrweb/record`
- `@rrweb/replay`
- `rrdom`
- `rrdom-nodejs`
- `rrweb-player`
- `rrweb-snapshot`
- `rrweb`
- `@rrweb/types`
- `@rrweb/utils`
- `@rrweb/rrweb-plugin-canvas-webrtc-record`
- `@rrweb/rrweb-plugin-canvas-webrtc-replay`
- `@rrweb/rrweb-plugin-console-record`
- `@rrweb/rrweb-plugin-console-replay`
- `@rrweb/rrweb-plugin-network-record`
- `@rrweb/rrweb-plugin-network-replay`
- `@rrweb/rrweb-plugin-sequential-id-record`
- `@rrweb/rrweb-plugin-sequential-id-replay`

`rrvideo` and `@rrweb/web-extension` remain outside bundle reporting because the existing collector did not include their outputs.

## Build and artifact flow

Bundle reporting runs independently of lint and tests. `bundle-stats.yml` builds and uploads stats on pushes and pull requests; `relative-ci-upload.yml` consumes successful `Bundle Stats` runs. The ESLint workflow keeps its existing build and package-preview publishing but no longer generates or uploads bundle stats. This adds a dedicated build so lint, preview publishing, and test failures cannot block bundle feedback.

The shared Vite configuration will use `rollup-plugin-webpack-stats` when `RELATIVE_CI_STATS=true`. Each package build writes its own `webpack-stats.json`. The file uses the ESM output as the canonical chunk and module graph, avoiding false duplicate-module results from combining equivalent ESM and CommonJS graphs. Its asset list is finalized after all output hooks and includes every top-level `.js`, `.cjs`, `.mjs`, and `.css` distributable, including generated UMD, minified, and CSS files. The Bundle Stats workflow sets that environment variable for the build. Turbo will pass the variable to `prepublish` tasks and include it in their cache keys.

After the build, one pinned `actions/upload-artifact` step uploads `packages/**/dist/webpack-stats.json` as `relative-ci-stats`. The upload fails if no stats files exist. This workflow receives no RelativeCI keys and continues to run for forked pull requests.

The privileged `workflow_run` workflow replaces the custom base build, comparison, comment renderer, and sticky-comment action with a static 19-entry matrix. Each entry contains the stats path inside the shared artifact, a display name, and the existing repository secret name. Every job passes `artifactName: relative-ci-stats` and its matrix stats path as `webpackStatsFile` to the pinned `relative-ci/agent-action`. The action reads that JSON entry from the triggering run's archive and sends it to the matching RelativeCI project.

The upload glob preserves directories after its first wildcard and omits the `packages/` prefix. For example, the archive contains `record/dist/webpack-stats.json` and `plugins/rrweb-plugin-console-record/dist/webpack-stats.json`. The matrix is the only operational list of tracked packages and key mappings. Extra stats files in the archive do not add projects. A missing tracked package file fails its submission job.

Each of the 19 submission jobs downloads the shared archive. This adds download traffic but avoids upload fan-out jobs, generated YAML, and executable configuration in the privileged workflow.

## Security boundaries

- Pull request code never receives RelativeCI keys.
- The privileged job never checks out or executes pull request code.
- The privileged job runs only after a successful pull request or push build, so RelativeCI receives both comparisons and default-branch baselines.
- Each matrix job receives one package key.
- Stats paths and secret names come only from the static trusted workflow, never from an artifact or pull request metadata.
- The job's `GITHUB_TOKEN` has only `actions: read` permission.
- New third-party actions are pinned to full commit SHAs.
- The bundle-stats artifact remains attacker-controlled input. The pinned RelativeCI action is the only component that parses it in the privileged job.

Repository administrators must add one RelativeCI project key per package, using the secret names encoded in the workflow matrix.

## Removed code

Delete the custom measurement and Markdown-rendering scripts. Remove the base-branch bundle build, intermediate size artifacts, PR-number lookup, and sticky bundle-size comment. Keep the unrelated ESLint report and annotation flow.

## Validation

Run a representative Vite build with `RELATIVE_CI_STATS=true` and verify that it creates a parseable stats file whose asset names and sizes match every tracked top-level distributable. Verify that its chunk and module graph represents only the canonical ESM output. Parse both workflows as YAML 1.2, run Prettier and actionlint, scan for references to the deleted bundle-size implementation, and inspect the final diff. Ignore only actionlint's known outdated-version warning for the existing `actions/setup-node@v3` step.

Verify that there is one shared stats upload, exactly 19 unique matrix paths and secret names, and that every path matches its package and the archive layout. Check both a top-level package and a nested plugin. Confirm the successful pull request and push conditions, the absence of RelativeCI keys in the build workflow, and the privileged job's `actions: read` permission and single pinned action step. Confirm the archive paths in the first GitHub Actions run; local checks do not submit to RelativeCI.
