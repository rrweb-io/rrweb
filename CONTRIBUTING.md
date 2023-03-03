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
5. Ensure the test suite passes or ask for help as to why tests are failing
3. We use [changesets](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md) to enable you to easily document your PR so that it can be packaged up into the next release. A github plugin will prompt you to fill in your changeset if you haven't already done so.
4. If you've changed APIs, update the documentation.
6. Make sure your code lints and typechecks.

## Issues

We use GitHub issues to track public bugs. Please ensure your description is
clear and has sufficient instructions to be able to reproduce the issue.

## Run locally

- Install dependencies: `yarn`
- Run recorder on a website: `yarn repl`
- Run a cobrowsing/mirroring session locally: `yarn live-stream`
- Test: `yarn test` or `yarn test:watch`
- Lint: `yarn lint`

## Coding style

See [documentation](docs/development/coding-style.md)

## License

rrweb is [MIT licensed](https://github.com/rrweb-io/rrweb/blob/master/LICENSE).

By contributing to rrweb, you agree that your contributions will be licensed
under its MIT license.
