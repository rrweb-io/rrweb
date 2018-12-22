# rrweb

[![Build Status](https://travis-ci.org/rrweb-io/rrweb.svg?branch=master)](https://travis-ci.org/rrweb-io/rrweb)

[中文文档](./README.zh_CN.md)

rrweb refers to 'record and replay the web', which is a tool for recording and replaying users' interactions on the web.

**Currently, rrweb has already solved many difficult problems in recording and replaying, but the data structure may still be changed before the release of Version 1.0. So please be cautious to use rrweb in the production environment.**

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

Run `npm run repl` to launch a browser and ask for a URL you want to test on the CLI:

```
Enter the url you want to record, e.g https://react-redux.realworld.io:
```

Waiting for the browser to open the specified page and print following messages on the CLI:

```
Enter the url you want to record, e.g https://react-redux.realworld.io: https://github.com
Going to open https://github.com...
Ready to record. You can do any interaction on the page.
Once you want to finish the recording, enter 'y' to start replay:
```

At this point, you can interact in the web page. After the desired operations have been recorded, enter 'y' on the CLI, and the test tool will replay the operations to verify whether the recording was successful.

The following messages will be printed on the CLI during replay:

```
Enter 'y' to persistently store these recorded events:
```

At this point, you can enter 'y' again on the CLI. The test tool will save the recorded session into a static HTML file and prompt for the location:

```
Saved at PATH_TO_YOUR_REPO/temp/replay_2018_11_23T07_53_30.html
```

This file uses the latest rrweb bundle code, so we can run `npm run bundle:browser` after patching the code, then refresh the static file to see and debug the impact of the latest code on replay.
