<p align="center">
  <img width="100px" height="100px" src="https://www.rrweb.io/favicon.png">
</p>
<p align="center">
  <a href="https://www.rrweb.io/" style="font-weight: bold">Try rrweb</a>
</p>

# rrweb

[![Build Status](https://travis-ci.org/rrweb-io/rrweb.svg?branch=master)](https://travis-ci.org/rrweb-io/rrweb) [![Join the chat at https://gitter.im/rrweb-io/rrweb](https://badges.gitter.im/rrweb-io/rrweb.svg)](https://gitter.im/rrweb-io/rrweb?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[中文文档](./README.zh_CN.md)

rrweb refers to 'record and replay the web', which is a tool for recording and replaying users' interactions on the web.

**Currently, rrweb has already solved many difficult problems in recording and replaying, but the data structure may still be changed before the release of Version 1.0. So please be cautious to use rrweb in the production environment.**

## Guide

[**📚 Read the rrweb guide here. 📚**](./guide.md)

## Project Structure

rrweb is mainly composed of 3 parts:

- **[rrweb-snapshot](https://github.com/rrweb-io/rrweb-snapshot)**, including both snapshot and rebuilding features. The snapshot is used to convert the DOM and its state into a serializable data structure with an unique identifier; the rebuilding feature is to rebuild the snapshot into corresponding DOM.
- **[rrweb](https://github.com/rrweb-io/rrweb)**, including two functions, record and replay. The record function is used to record all the mutations in the DOM; the replay is to replay the recorded mutations one by one according to the corresponding timestamp.
- **[rrweb-player](https://github.com/rrweb-io/rrweb-player)**, is a player UI for rrweb, providing GUI-based functions like pause, fast-forward, drag and drop to play at any time.

## Roadmap

- rrweb
  - handle cross-domain request errors
  - record in web worker
  - implement transmission data compression
  - verify recording in mobile browser
- rrweb-player
  - implement efficient progress bar drag and drop control
  - add full screen mode
- extensions
  - hijack the console API and record corresponding events
  - hijack Ajax/fetch API and record request events
  - use TraceKit to log exception events

## Internal Design

- [serialization](./docs/serialization.md)
- [incremental snapshot](./docs/observer.md)
- [replay](./docs/replay.md)
- [sandbox](./docs/sandbox.md)

## Contribute Guide

Since we want the record and replay sides to share a strongly typed data structure, rrweb is developed with typescript which provides stronger type support.

[Typescript handbook](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)

1. Fork the rrweb component repository you want to patch.
2. Run `npm install` to install required dependencies.
3. Patch the code and pass all the tests.
4. Push the code and create a pull request.

In addition to adding integration tests and unit tests, rrweb also provides a REPL testing tool.

[Using the REPL tool](./guide.md#REPL-tool)
