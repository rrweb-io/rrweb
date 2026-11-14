# Blacksmith migration preparation

Status: **blocked on rrweb-io sponsorship coverage and runner access**. Prepared
on November 14, 2026 against `3339038d31bc15491e9def76fd4f4818b2eae6aa`.
This change does not enable Blacksmith usage. Every proposed runner expression
starts with literal `false`, so every job still selects `ubuntu-latest`.
Repository or organization variables cannot enable these gates.

## Scope and inventory

The initial worktree was at `76df9799`, with three outdated workflows. The clean
branch was fast-forwarded to current `origin/main` before preparing this change.
There are seven tracked workflows, nine job definitions, and 27 jobs when the
RelativeCI matrix expands fully. All currently use standard GitHub-hosted Ubuntu.
No tracked workflow needs macOS, Windows, ARM, GPUs, or service containers.

| Workflow                                            | Job ID / check name                                     | Preparation and compatibility                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests (`ci-cd.yml`)                                 | `release` / Tests                                       | Disabled candidate: x64 Ubuntu 24.04, 4 vCPU / 16 GB. Yarn, Node LTS, Turbo, types, all existing test commands, Chrome revision, Playwright Chromium installation, Xvfb, and failure image artifacts stay intact. Confirm browser libraries and visual snapshots in a sponsored pilot.                                                                      |
| Tests                                               | `webkit` / WebKit (Safari engine) tests                 | Disabled candidate: same 4-vCPU host. Preserve the exact `mcr.microsoft.com/playwright:v1.61.1-noble` job container and its browser-version guard. Blacksmith documents job-container support. Verify Docker pull, checkout/setup-node inside the container, and both WebKit suites in the pilot. This is Linux WebKit coverage, not macOS Safari coverage. |
| Bundle Stats (`bundle-stats.yml`)                   | `build` / build                                         | Disabled candidate: same 4-vCPU host. Secret-free build, pinned actions, head-SHA checkout, disabled credential persistence, and `relative-ci-stats` artifact remain unchanged.                                                                                                                                                                             |
| ESLint Check (`eslint-check.yml`)                   | `eslint_check_upload` / ESLint Check and Report Upload  | Disabled candidate: same 4-vCPU host. Preserve build, lint, package previews, report continuation behavior, and report artifact. Fork PRs remain on GitHub, including their existing package-preview behavior.                                                                                                                                              |
| Prettier Check (`style-check.yml`)                  | `prettier_check` / Format Check                         | Keep GitHub: this job runs only for fork PRs. Public untrusted contributions must not gain access to organization self-hosted runners.                                                                                                                                                                                                                      |
| Prettier Check                                      | `prettier` / Format Code                                | Disabled candidate: x64 Ubuntu 24.04, 2 vCPU / 8 GB. Same-repository PRs and pushes only. Preserve contents-write permission, checkout, formatter, auto-commit branch, and excluded generated file.                                                                                                                                                         |
| PR Checks (privileged) (`pr-checks-privileged.yml`) | `annotate` / annotate                                   | Keep GitHub: small report-only `workflow_run` job with checks-write permission. No build workload to accelerate. Preserve the successful-PR condition, source run ID, and artifact-only trust boundary.                                                                                                                                                     |
| RelativeCI Upload (`relative-ci-upload.yml`)        | `relative_ci` / RelativeCI (package), 19 matrix entries | Keep GitHub: short report uploads with package-specific secrets. No build workload to accelerate. Preserve all matrix entries, successful-run condition, artifact handling, and permissions. Avoid moving secrets to a new provider for little benefit.                                                                                                     |
| Release (`release.yml`)                             | `release` / Release                                     | Keep GitHub: npm trusted publishing uses OIDC, and changing to a self-hosted provider needs separate npm support and trust verification. Preserve main/next triggers, permissions, Changesets behavior, and both Chrome Web Store channels. Do not test by publishing.                                                                                      |

The API also lists active `rrvideo-benchmark.yml` and `takeover-skill-check.yml`
workflow registrations. Neither file exists on this base. Their latest runs were
on `traycer/happy-robin` (September 29) and `codex/rrweb-takeover-skill` (October 27).
They are branch-specific registrations, not omitted main-branch migration targets.
Reinventory if either lands. GitHub-managed dynamic Dependabot and Copilot
workflows are outside repository YAML control and remain with GitHub.

## Costs and evidence

`rrweb-io/rrweb` is public. Standard GitHub-hosted runner compute is free for
public repositories under [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
Thus the current runner compute cost for every tracked job is **$0**. This is a
performance and sponsorship migration, not a reduction in an existing compute bill.
Artifact and cache storage have separate allowances and charges; this change does
not establish their current invoice totals or change retention.

Read-only timing samples from November 13 report `UBUNTU.total_ms: 0` billable
usage for Tests (`43463383781`), ESLint (`43463384303`), Bundle Stats
(`43463384262`), and Prettier (`43463383858`). These samples corroborate free
compute; they are not a monthly billing export. The Tests sample used GitHub
runner names and `ubuntu-latest` labels for both jobs.

[Blacksmith pricing](https://www.blacksmith.sh/pricing) advertises Ubuntu x64
starting at $0.004/min for the displayed 2-vCPU configuration. Do not apply that
rate to the proposed 4-vCPU jobs, assume a runtime speedup, or treat a free tier as
sponsorship. Confirm the exact SKU rates and any storage or add-on charges in the
rrweb-io agreement. No paid add-ons, sticky disks, or Docker cache actions are
introduced here.

Justin's November 14 observation was **rrweb-cloud usage $44.28, discount $44.28,
net $0.00**, with only rrweb-cloud visible in the organization selector. That is
evidence for rrweb-cloud only. It does not establish that rrweb-io, this
repository, these runner sizes, or future usage are covered.

The repository runners API returned zero runners. That does not exclude
organization-managed or just-in-time runners. The organization runners API
returned HTTP 403 requiring org-admin or runner permissions. No token scope was
expanded. Repository variables contained only `TURBO_TEAM`; this migration does
not add variables. The main branch protection endpoint returned no required
status-check configuration, and the repository rulesets list was empty. Check
names and all existing enforcement behavior are preserved regardless.

## Confirm access and sponsorship before activation

An authorized rrweb-io owner and Blacksmith must establish all of the following.
This preparation does not install an app, modify runner groups, expand
permissions, change billing, or send a support request.

1. Obtain written confirmation naming **GitHub organization rrweb-io** and
   **repository rrweb-io/rrweb**, linked to the correct Blacksmith billing account.
   Confirm whether the rrweb-cloud sponsorship extends to this distinct org or
   requires a separate sponsorship agreement.
2. Confirm the discount percentage, start and expiry dates, caps, included runner
   SKUs (2- and 4-vCPU Ubuntu x64 24.04), concurrency, caching/storage coverage,
   and what happens when sponsorship expires or limits are reached. Require a
   no-paid-usage arrangement before any pilot. A successful rrweb-cloud discount
   or free-trial balance is insufficient.
3. Verify rrweb-io is visible to the authorized user in Blacksmith. Check GitHub
   organization membership and SSO authorization, plus the Blacksmith GitHub App
   installation's organization and selected-repository access. The
   [quickstart](https://docs.blacksmith.sh/introduction/quickstart) lists those
   causes for a missing org. If installation or permission changes are needed,
   obtain separate authorization; do not perform them as part of this PR.
4. Have the org owner verify runner-group access for this public repository,
   allowed workflow policy, and exact runner labels. Check that GitHub's public
   repository self-hosted runner policy and org network restrictions allow the
   intended jobs. Do not enable access for fork code or broaden access to other
   repositories. Blacksmith uses organization self-hosted runner administration
   for registration, as documented in its
   [GitHub App permissions](https://docs.blacksmith.sh/blacksmith-administration/github-app).
   Confirm fresh ephemeral isolation between jobs and appropriate cache isolation.
5. Confirm Docker job containers, image registry access, Node/Yarn downloads,
   browser downloads and shared libraries, artifact upload/download, and package
   preview endpoint access. The [runner types](https://docs.blacksmith.sh/blacksmith-runners/overview)
   document GitHub-compatible images and the proposed labels. The
   [container documentation](https://docs.blacksmith.sh/blacksmith-caching/docker-container-caching)
   documents `container.image` support. These establish compatibility candidates,
   not successful execution in this organization.

## Activate in a separate reviewed change

Only after the confirmations above, replace literal `false` in a selected gate
with `true` through a reviewed pilot change. Preserve the repository, event, and
same-repository-head restrictions. Fork PRs, pushes in forks, and other event
types must continue to resolve to GitHub. A draft PR alone is not an execution
gate; this preparation uses literal false to remain safe even when pushed.

Start with a trusted branch and one build job under confirmed full sponsorship.
Then validate the existing Chromium/Xvfb tests and containerized WebKit tests,
types, bundle artifacts, lint/package previews, formatting, and downstream
reports. Compare required check names and outcomes, browser snapshots, artifact
provenance, and cold/warm cache behavior. Keep release publishing unchanged.
The activation PR must update the verifier's deliberate disabled-gate invariant.
Do not weaken a check, skip a test, or add `continue-on-error` to get a pilot green.

Until activation every job selects GitHub. After activation, a missing Blacksmith
label can queue indefinitely; the expression is not an availability fallback.
Roll back selected expressions to literal false or `ubuntu-latest`, cancel the
affected queued runs, and rerun the existing checks on GitHub. No billing or app
changes are needed for that code rollback.

## Validate this preparation

Run from the repository root:

```sh
python3 .github/scripts/validate-blacksmith-migration.py
actionlint -shellcheck= -pyflakes= .github/workflows/*.yml
git diff --check
```

The verifier compares all workflow bytes against the recorded base after
normalizing exactly five disabled runner blocks. It proves that job IDs, names,
events, paths, concurrency, permissions, steps, action versions, cache keys,
artifacts, containers, matrices, fork handling, and publishing behavior are
unchanged. It also rejects removal of a gate or a change outside runner selection.
It uses only the Python standard library and Git.

Dependency caching stays with the existing official `actions/setup-node` Yarn
cache. Blacksmith's current
[dependency caching documentation](https://docs.blacksmith.sh/blacksmith-caching/dependencies-actions)
says official cache actions work directly on its runners. No archived cache or
setup-node forks are needed, and no action upgrades are bundled into this change.

Local validation cannot prove remote Blacksmith access or browser runtime parity.
No Blacksmith job or publishing command was executed during preparation.

Validation results: the invariant verifier and `git diff --check` pass.
Actionlint 1.7.12 reports ten pre-existing warnings about the Node runtime used by
`actions/checkout@v3` and `actions/setup-node@v3`. The same ten diagnostics occur
on the unmodified base. With that specific warning excluded, all workflow and
expression checks pass. Address action modernization separately before activation
if GitHub or Blacksmith rejects those versions. ShellCheck and Pyflakes were
disabled for this workflow-structure check; the shell and embedded Python steps
are unchanged.
