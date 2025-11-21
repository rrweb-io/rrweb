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
4. We use [changesets](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md) to enable you to easily document your PR so that it can be packaged up into the next release. A github plugin will prompt you to fill in your changeset if you haven't already done so.
5. If you've changed APIs, update the documentation.
6. Make sure your code lints and typechecks.

## Issues

We use GitHub issues to track public bugs. Please ensure your description is
clear and has sufficient instructions to be able to reproduce the issue.

## Run locally

- Install dependencies: `bun install`
- Build all packages: (in `/`) `bun run build:all` or `bun run dev`
- Run recorder on a website: (in `/packages/rrweb`) `bun run repl`
- Run a cobrowsing/mirroring session locally: (in `/packages/rrweb`) `bun run live-stream`
- Build individual packages: `bun run build` or `bun run dev`
- Test: `bun run test` or `bun run test:watch`
- Lint: `bun run lint`
- Rewrite files with prettier: `bun run format` or `bun run format:head`

## Coding style

See [documentation](docs/development/coding-style.md)

## License

rrweb is [MIT licensed](https://github.com/rrweb-io/rrweb/blob/master/LICENSE).

By contributing to rrweb, you agree that your contributions will be licensed
under its MIT license.
