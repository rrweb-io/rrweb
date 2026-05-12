<p align="center">
  <img width="100px" height="100px" src="https://www.rrweb.io/favicon.png">
</p>
<p align="center">
  <a href="https://www.rrweb.io/" style="font-weight: bold">Try rrweb</a>
</p>

# rrweb

**This is a simpler version of the [original rrweb README](../../README.md) within this rrweb subpackage**

[中文文档](../../README.zh_CN.md)

rrweb refers to 'record and replay the web', which is a tool for recording and replaying users' interactions on the web.

## Guide

[**📚 Read the rrweb guide here. 📚**](../../guide.md)

[**🍳 Recipes 🍳**](../../docs/recipes/index.md)

## Project Structure

**[rrweb](https://github.com/rrweb-io/rrweb)** mainly includes two funtions:

- **Record**: The record function is used to record all the mutations in the DOM
- **Replay**: The replay function is to replay the recorded mutations one by one according to the corresponding timestamp.

## Roadmap

- storage engine: do deduplication on a large number of rrweb sessions
- compact mutation data in common patterns
- provide plugins via the new plugin API, including:
  - XHR plugin
  - fetch plugin
  - GraphQL plugin
  - ...

## Internal Design

- [serialization](../../docs/serialization.md)
- [incremental snapshot](../../docs/observer.md)
- [replay](../../docs/replay.md)
- [sandbox](../../docs/sandbox.md)

## Contribute Guide

Since we want the record and replay sides to share a strongly typed data structure, rrweb is developed with typescript which provides stronger type support.

[Typescript handbook](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)

1. Fork this repository.
2. Run `pnpm install` in the root to install required dependencies for all sub-packages.
3. Run `pnpm dev` in the root to get auto-building for all the sub-packages whenever you modify anything.
4. Navigate to one of the sub-packages (in the `packages` folder) where you'd like to make a change.
5. Patch the code and run `pnpm test` to run the tests, make sure they pass before you commit anything.
6. Push the code and create a pull request.

Protip: You can run `pnpm test` in the root folder to run all the tests.

In addition to adding integration tests and unit tests, rrweb also provides a REPL testing tool.

[Using the REPL tool](../../guide.md#REPL-tool)
