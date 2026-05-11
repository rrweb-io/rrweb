# Contributing to rrweb

We want to make contributing to this project as easy and transparent as
possible.

## Our Development Process

The majority of development on rrweb will occur through GitHub. Accordingly,
the process for contributing will follow standard GitHub protocol.

## Pull Requests

We actively welcome your pull requests (PRs)!

1. Fork the repo and create your branch from `master`.
2. If you've added code that should be tested, add tests
3. Ensure the test suite passes or ask for help as to why tests are failing
4. Use a conventional-commit-style PR title (`feat:`, `fix:`, `perf:`, `chore:`, etc.). The merge commit will use this title — semantic-release reads it to compute the next version. See [conventionalcommits.org](https://www.conventionalcommits.org/).
5. If you've changed APIs, update the documentation.
6. Make sure your code lints and typechecks.

## Issues

We use GitHub issues to track public bugs. Please ensure your description is
clear and has sufficient instructions to be able to reproduce the issue.

## Run locally

- Install dependencies: `yarn`
- Build all packages: (in `/`) `yarn build:all` or `yarn dev`
- Run recorder on a website: (in `/packages/rrweb`) `yarn repl`
- Run a cobrowsing/mirroring session locally: (in `/packages/rrweb`) `yarn live-stream`
- Build individual packages: `yarn build` or `yarn dev`
- Test: `yarn test` or `yarn test:watch`
- Lint: `yarn lint`
- Rewrite files with prettier: `yarn format` or `yarn format:head`

## Coding style

See [documentation](docs/development/coding-style.md)

## Releases

Releases are driven by [Lerna](https://lerna.js.org) in fixed-versioning mode, triggered manually via the [`Release` GitHub Actions workflow](https://github.com/amplitude/rrweb/actions/workflows/release.yml). Lerna reads conventional-commit PR titles since the last tag to compute the version bump — no manual version edits.

See [RELEASE.md](RELEASE.md) for the full release procedure, the `release` / `prerelease` / `dry-run` trigger options, the deploy-key infrastructure that makes the push-back work, rotation steps, and troubleshooting.

Published versions are listed at [github.com/amplitude/rrweb/releases](https://github.com/amplitude/rrweb/releases).

## License

rrweb is [MIT licensed](https://github.com/rrweb-io/rrweb/blob/master/LICENSE).

By contributing to rrweb, you agree that your contributions will be licensed
under its MIT license.
