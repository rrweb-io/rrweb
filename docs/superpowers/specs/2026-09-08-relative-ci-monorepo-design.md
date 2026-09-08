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

The shared Vite configuration will add `rollup-plugin-webpack-stats` when `RELATIVE_CI_STATS=true`. Each package build writes its own `webpack-stats.json`. The ESLint workflow already builds every package and will set that environment variable for the build.

After the build, the unprivileged workflow uploads each stats file with `relative-ci/agent-upload-artifact-action`. Each artifact has a stable package-specific name. This workflow receives no RelativeCI keys and continues to run safely for forked pull requests.

The privileged `workflow_run` workflow will replace the custom base build, comparison, comment renderer, and sticky-comment action with a matrix job. Each matrix entry identifies one artifact and one repository secret. `relative-ci/agent-action` downloads the corresponding artifact and sends it to the matching RelativeCI project.

## Security boundaries

- Pull request code never receives RelativeCI keys.
- The privileged job never checks out or executes pull request code.
- The privileged job runs only after a successful pull request or push build, so RelativeCI receives both comparisons and default-branch baselines.
- Each matrix job receives one package key rather than every project key.
- The job's `GITHUB_TOKEN` has only `actions: read` permission.
- New third-party actions are pinned to full commit SHAs.
- The bundle-stats artifact remains attacker-controlled input. The pinned RelativeCI action is the only component that parses it in the privileged job.

Repository administrators must add one RelativeCI project key per package, using the secret names encoded in the workflow matrix.

## Removed code

Delete the custom measurement and Markdown-rendering scripts. Remove the base-branch bundle build, intermediate size artifacts, PR-number lookup, and sticky bundle-size comment. Keep the unrelated ESLint report and annotation flow.

## Validation

Run a representative Vite build with `RELATIVE_CI_STATS=true` and verify that it creates a parseable stats file. Parse all changed workflow files with a YAML parser, run the repository formatter or focused lint checks for changed TypeScript/configuration files, scan for references to the deleted bundle-size implementation, and inspect the final diff.
