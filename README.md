<p align="center">
  <img width="100px" height="100px" src="https://www.rrweb.io/favicon.png">
</p>

# rrweb

rrweb refers to 'record and replay the web', which is a tool for recording and replaying users' interactions on the web.

This is a fork of rrweb meant to power New Relic experiences for session replay.

## Project Structure

rrweb is mainly composed of 3 parts:

- **[rrweb-snapshot](https://github.com/newrelic-forks/rrweb/tree/master/packages/rrweb-snapshot/)**, including both snapshot and rebuilding features. The snapshot is used to convert the DOM and its state into a serializable data structure with a unique identifier; the rebuilding feature is to rebuild the snapshot into corresponding DOM.
- **[rrweb](https://github.com/newrelic-forks/rrweb)**, including two functions, record and replay. The record function is used to record all the mutations in the DOM; the replay is to replay the recorded mutations one by one according to the corresponding timestamp.
- **[rrweb-player](https://github.com/newrelic-forks/rrweb/tree/master/packages/rrweb-player/)**, is a player UI for rrweb, providing GUI-based functions like pause, fast-forward, drag and drop to play at any time.

## Developing locally

- Install dependencies: `yarn`
- Build all packages: (in `/`) `yarn build:all` or `yarn dev`
- Build individual packages: `yarn build` or `yarn dev`
- Test: `yarn test` or `yarn test:watch`
- Lint: `yarn lint`
- Rewrite files with prettier: `yarn format` or `yarn format:head`
- Run recorder on a website: (in `/packages/rrweb`) `yarn repl`
- Run a co-browsing/mirroring session locally: (in `/packages/rrweb`) `yarn live-stream`
- Publishing: `yarn release`
  - When asked which packages to include, only include the packages that were changed. Use 'space' key to select packages.
