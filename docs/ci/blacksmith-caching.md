# Blacksmith Cache Readiness

Status: caching activation is blocked on rrweb-io coverage and runner access.
This follow-up to [migration #2021](https://github.com/rrweb-io/rrweb/pull/2021)
enables no Blacksmith service. It can land independently on `main`.
The migration branch and its five literal-disabled runner selectors are untouched.
Research and inventory were checked on November 14, 2026 against main
`3339038d31bc15491e9def76fd4f4818b2eae6aa` and migration head `ac598250`.

## Enabled and prepared changes

This change fixes two existing local Turbo cache inputs:

- Hash `DISABLE_WORKER_INLINING` through `globalEnv`. The shared Vite config reads
  it, and release builds set it to `true`. Previously `globalPassThroughEnv`
  exposed its value without invalidating cached outputs. An extension build could
  reuse dependencies built with the wrong worker mode within the same release job.
- Hash the shared `tsconfig.base.json` through `globalDependencies`. Package
  TypeScript configs extend it outside their workspace. Editing it must invalidate
  builds and type checks even when each workspace's files are unchanged.

Build commands, output patterns, tests, release publishing, workflow permissions,
artifact handling, and runner selection stay unchanged. No persistent cache,
builder, storage, secret, credential, app, or account setting is added.
The fixes improve local cache correctness today and prepare for a future cache.
They do not establish that all tasks are ready for shared remote caching.

## Actual usage and official options

<!-- markdownlint-disable MD013 -->

| Existing usage                                                                                                                                                             | Supported option                                                                                                                                                                                                              | Decision                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Six `actions/setup-node` steps set `cache: yarn`: Tests, WebKit, bundle stats, ESLint, and both formatter jobs. Release has no dependency cache.                           | [Dependency caching](https://docs.blacksmith.sh/blacksmith-caching/dependencies-actions) transparently redirects official actions on Blacksmith runners. Docs advertise no additional cost and 25 GB per repository per week. | Keep upstream actions. No archived `useblacksmith/cache` or language-action forks. Keep release unchanged.                                   |
| WebKit uses `container.image: mcr.microsoft.com/playwright:v1.61.1-noble`.                                                                                                 | [Container caching](https://docs.blacksmith.sh/blacksmith-caching/docker-container-caching) is automatic and free on Blacksmith. It caches Docker's image store by organization, region, and architecture.                    | No action or workflow change needed. Still blocked on runner access and coverage.                                                            |
| `Dockerfile.webkit-test` and contributor instructions build and run a local WebKit test image. No tracked workflow builds an image or invokes buildx, bake, or build-push. | [Docker layer caching](https://docs.blacksmith.sh/blacksmith-caching/docker-builds) uses `setup-docker-builder` and optional `build-push-action`, with a builder cache key. Layer storage is billed separately.               | Do not add a builder or turn local Docker instructions into CI. No useful CI layer cache exists here.                                        |
| Turbo 2.0.4 is locked. `build:all`, tests, type checks, lint, and release already use Turbo. No workflow persists `.turbo` or configures a remote Turbo cache.             | [Native Turbo caching](https://docs.blacksmith.sh/blacksmith-caching/turborepo-build-caching) requires no YAML. An org admin enables **Settings > Caching > Build systems > Turborepo build cache**.                          | Prepare input fixes only. Do not toggle the setting or add a token. The docs do not establish this org's entitlement or Turbo storage price. |

<!-- markdownlint-enable MD013 -->

Native Turbo caching cannot serve a `container:` job or Turbo inside a Docker
build. Thus WebKit could benefit from image caching, but not native Turbo caching.
Tests, bundle stats, and ESLint are possible future host-runner candidates.
Formatter jobs have no Turbo build workload. Release remains on GitHub.

The [Docker build documentation](https://docs.blacksmith.sh/blacksmith-caching/docker-builds#pricing)
prices its sticky-disk storage at **$0.50 per GB per month**.
[Checkout caching](https://docs.blacksmith.sh/blacksmith-caching/git-checkout-caching)
also uses sticky disks at **$0.50 per GB per month**. No checkout cache is
configured by this PR, and no
checkout action changes are proposed. Runner-minute sponsorship does not establish
coverage for disks, Turbo storage, checkout caches, or other extras. Confirm each
product's entitlement and any charges separately before requesting activation.
The documented free container-image cache is distinct from paid Docker build
layer storage. Neither changes this repository's runner-access blocker.

Blacksmith leaves existing `TURBO_API`, `TURBO_TOKEN`, or `TURBO_TEAM` environment
configuration in place instead of replacing it. The repository has a variable
named `TURBO_TEAM` with value `rrweb-io`, but no workflow maps it into the job
environment. A repository variable alone does not enable remote caching.
No repository secret named `TURBO_TOKEN` was listed. Organization or environment
configuration and actual runtime settings remain unverified. Do not delete or
replace another cache provider's configuration without checking its owner.

## Keys, trust, and artifact integrity

The Yarn cache stores downloaded packages, not `node_modules` or build outputs.
Setup-node derives its key from platform, architecture, package manager, and the
root `yarn.lock` hash. Keep `yarn install --frozen-lockfile` on cache hits.
Do not replace installation with restored executable dependencies. Blacksmith
documents GitHub-compatible branch restrictions for this cache. An owner must
confirm **Branch Protected Caches** stays enabled before a pilot. Fork PR caches
must not become trusted branch caches.

Turbo keys cover workspace inputs, dependency hashes, configured environment,
and shared inputs. `RELATIVE_CI_STATS` already participates in `prepublish` hashes
and separates bundle-stat builds from normal builds. This follow-up adds worker
mode and the base TypeScript configuration. Browser executable paths and headless
mode remain passthrough variables, so this change does not claim browser-test
cache correctness. Before enabling native Turbo caching:

1. Audit every task's outputs against clean builds. `prepublish` lists `lib`,
   `es`, `dist`, `typings`, `.svelte-kit`, and `types`; the reference-generation
   task lists generated package TypeScript configs. Check build-info files and
   any output outside these patterns. A cached log is not evidence that missing
   files were restored.
2. Separate or hash Node version, OS, browser revisions, test configuration,
   output-affecting environment, and external state where relevant. Blacksmith
   documents architecture isolation, but that alone is insufficient. Disable
   caching for tasks whose results depend on untracked state. Never skip test
   execution merely to report a warm build-cache hit.
3. Confirm write policy with Blacksmith. Its Turbo cache is shared across branches
   and PRs within a repository; fork PRs can read but cannot write. This is a
   different trust model from branch-scoped dependency caching. Require trusted
   writers and verify that PR code cannot seed outputs used by trusted jobs.
   Same-repository PRs are not automatically trustworthy. Do not assume signature
   verification, protected-branch-only writes, or an undocumented isolation policy.
4. Treat cache contents and replayed task logs as readable by fork contributors.
   Never store secrets, tokens, private registry credentials, or secret-bearing
   output. Keep public fork code on GitHub runners under #2021's restrictions.
5. Keep build outputs separate from workflow artifacts. Preserve head-SHA builds,
   run-specific downloads, bundle-stat presence checks, ESLint annotations, and
   secret-bearing RelativeCI uploads. A cache hit must not substitute an artifact
   from a different run. Do not introduce build-cache restores into publishing.

Container caching shares image storage across the organization and retains images
for eight days of inactivity. Before use, verify image provenance and tag refresh
behavior, private-image access boundaries, and untrusted-write isolation. The
existing Playwright version and executable-presence guard remain unchanged.
No image or action pin is changed as part of this cache preparation.

## Coverage and setup still missing

Justin observed rrweb-cloud usage of $44.28, fully discounted to $0.00, on
November 14. Only rrweb-cloud appeared in that billing selector. This evidence
does not cover rrweb-io, this repository, or any cache product.

Read-only GitHub checks for this follow-up returned zero repository runners.
The organization runners endpoint returned HTTP 403 requiring org-admin or runner
permissions. No scope expansion was attempted. These results cannot establish
org-level or just-in-time runner availability. No connected Blacksmith account
API was available to verify rrweb-io billing or cache settings. Public docs are
product evidence, not account authorization.

Before any pilot, an authorized rrweb-io owner and Blacksmith must confirm:

- Written sponsorship for **rrweb-io/rrweb**, linked to the correct billing
  account, including runner SKUs, concurrency, dates, caps, storage and Turbo
  entitlements, and a no-paid-usage arrangement when limits or sponsorship expire.
- rrweb-io visibility in the dashboard, GitHub App repository access, SSO where
  applicable, public-repository runner-group policy, and exact allowed labels.
  Missing installation or permissions require separately authorized setup.
- Actual cache settings, dependency-cache branch protection, Turbo write controls,
  cache provenance and secret boundaries, and the runtime/input/output audit above.

Do not activate runners, caches, builders, or storage based on a free trial or
rrweb-cloud's discount. Do not create credentials, install apps, accept charges,
or expand permissions. #2021 intentionally requires a reviewed code change to
remove literal `false`; no variable or dashboard toggle can open those gates.

## Validation, pilot, and rollback

Track these states separately:

- **Configuration:** this PR fixes local Turbo hash inputs and documents supported
  options. Workflow files are unchanged.
- **Activation:** no Blacksmith runner or remote cache has been activated or
  verified for rrweb-io. Native Turbo requires an authorized org admin to enable
  **Settings > Caching > Build systems > Turborepo build cache**, after permission
  and coverage are confirmed. Workflow edits alone cannot prove activation.
- **Measured cache hits:** none verified. Local dry-run hash checks do not access
  Blacksmith and do not prove warm remote-cache hits, restored artifact integrity,
  or a performance gain. Those require a separately authorized cold/warm pilot.

Run the hash verifier using the lockfile's Turbo 2.0.4:

```sh
python3 .github/scripts/validate-turbo-cache.py
```

Use `--turbo /absolute/path/to/turbo` for an external installation.
The verifier copies tracked working files into a temporary Git repository,
computes real dry-run hashes, and checks stable inputs, worker modes, stats mode,
and a base TypeScript config edit. It executes no tasks and performs no remote
cache reads or writes. `--config-ref origin/main` runs the same regression check
against the old configuration and should fail on worker-mode invalidation.
Also run Prettier on the changed JSON and Markdown, and `git diff --check`.
For this page, run `markdownlint --disable MD043 -- docs/ci/blacksmith-caching.md`.
The repository's empty required-heading list triggers MD043 on existing pages,
including `CONTRIBUTING.md`. Long comparison-table rows have a local MD013
exception. Workflow bytes must match current main exactly.

Local validation passed with Turbo 2.0.4: both explicit worker modes and stats mode
invalidate all 22 build hashes; the shared TypeScript edit invalidates all 23 task
hashes. Stable inputs retain their hashes. The main-branch configuration fails
the same worker-mode regression check. Prettier 2.8.4, the scoped Markdownlint
check, whitespace checks, and the workflow byte comparison pass. Application
builds and browser tests were not run locally for this configuration-only change.
Main's protection requires one approving review and lists no required status
checks. Keep this PR draft pending that review and normal GitHub CI.

After all coverage and integrity prerequisites are met, use a separate reviewed
activation PR dependent on #2021. Compare cold and warm trusted runs at the same
revision and runtime. Check build hashes and complete artifact contents, run the
existing tests, and verify fork isolation without executing fork code on
Blacksmith. Check `Remote caching enabled` and actual hits rather than inferring
benefit from configuration. Compare build, container-init, and total durations,
including transfer and storage overhead. Standard GitHub runner compute is
already free for this public repository, so judge developer time and performance,
not avoided compute spend. No speedup has been measured in this preparation.

Rollback this preparation by reverting its commit. For a future pilot, restore
literal-disabled runner gates or `ubuntu-latest` and rerun on GitHub. An authorized
admin can disable Turbo caching, but Blacksmith documents that this deletes the
organization's Turbo cache. Review that consequence separately. Release and
deployment behavior require no rollback because this PR does not change them.
