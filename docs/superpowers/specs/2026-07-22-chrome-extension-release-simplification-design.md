# Chrome Extension Release Simplification

## Objective

Keep Chrome extension publishing automatic during normal npm releases while
removing the manual-dispatch logic that complicates and broadens the privileged
release workflow. Preserve a documented manual recovery path through the Chrome
Web Store dashboard.

## Workflow design

`.github/workflows/release.yml` will return to a push-only workflow for `main`
and `next`. The release job will run Changesets normally. Chrome extension build
and upload steps will run only when `steps.changesets.outputs.published` is
`true`.

The Chrome upload will continue using the pinned
`chrome-webstore-upload-cli@4.0.1` API v2 client and the publisher ID secrets
introduced by this pull request. Stable releases will use the production listing
and `CWS_*` secrets; `next` releases will use the prerelease listing and
`NEXT_CWS_*` secrets.

The following manual-dispatch behavior will be removed:

- the `workflow_dispatch` trigger and `publish_chrome_extension` input;
- the job-level ref guard added for arbitrary manual refs;
- event-name and event-input branches in Chrome build and publish conditions.

## Manual recovery

A short comment beside the Chrome build step will identify the manual fallback
and link to `docs/releases/next-channel.md`. That document will explain how to:

1. check out the intended release commit;
2. install dependencies and build `packages/web-extension/dist/chrome.zip`;
3. verify the archive before upload;
4. upload the archive to the appropriate Chrome Web Store listing through the
   developer dashboard.

The documentation will distinguish stable (`main`) from prerelease (`next`),
list the relevant publisher ID secrets, and replace stale `master` branch
references with `main`.

This fallback intentionally uses the dashboard instead of local API credentials,
because GitHub Actions secrets cannot be read back for local use.

## Pull request maintenance

The pull request description will be updated to describe API v2 migration,
automatic publishing, and the documented dashboard fallback. Existing review
threads made obsolete by removing manual dispatch will not be replied to or
resolved without separate authorization.

## Validation

Before pushing the implementation:

- parse the workflow as YAML;
- assert that `workflow_dispatch`, `publish_chrome_extension`, and manual event
  conditions are absent;
- assert that automatic stable and `next` publish conditions remain;
- assert that the API v2 CLI and publisher ID variables remain;
- run Prettier, `actionlint`, and `git diff --check`;
- verify the documented build command produces a valid Chrome ZIP archive.

After pushing, all required pull request checks must pass. No Changeset is
required because the change affects release infrastructure and documentation,
not a published package.
