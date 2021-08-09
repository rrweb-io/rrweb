<p align="center">
  <img width="100px" height="100px" src="https://www.rrweb.io/favicon.png">
</p>
<p align="center">
  <a href="https://www.rrweb.io/" style="font-weight: bold">Try rrweb</a>
</p>

# rrweb

**[The new adventure of the rrweb community](http://www.myriptide.com/rrweb-community/)**

[![Join the chat at slack](https://img.shields.io/badge/slack-@rrweb-teal.svg?logo=slack)](https://join.slack.com/t/rrweb/shared_invite/zt-siwoc6hx-uWay3s2wyG8t5GpZVb8rWg)
![total gzip size](https://img.badgesize.io/https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js?compression=gzip&label=total%20gzip%20size)
![recorder gzip size](https://img.badgesize.io/https://cdn.jsdelivr.net/npm/rrweb@latest/dist/record/rrweb-record.min.js?compression=gzip&label=recorder%20gzip%20size)
[![](https://data.jsdelivr.com/v1/package/npm/rrweb/badge)](https://www.jsdelivr.com/package/npm/rrweb)

[中文文档](./README.zh_CN.md)

> I have joined Github Sponsors and highly appreciate your sponsorship.

rrweb refers to 'record and replay the web', which is a tool for recording and replaying users' interactions on the web.

## Guide

[**📚 Read the rrweb guide here. 📚**](./guide.md)

[**🍳 Recipes 🍳**](./docs/recipes/index.md)

## Project Structure

rrweb is mainly composed of 3 parts:

- **[rrweb-snapshot](https://github.com/rrweb-io/rrweb/tree/master/packages/rrweb-snapshot/)**, including both snapshot and rebuilding features. The snapshot is used to convert the DOM and its state into a serializable data structure with a unique identifier; the rebuilding feature is to rebuild the snapshot into corresponding DOM.
- **[rrweb](https://github.com/rrweb-io/rrweb)**, including two functions, record and replay. The record function is used to record all the mutations in the DOM; the replay is to replay the recorded mutations one by one according to the corresponding timestamp.
- **[rrweb-player](https://github.com/rrweb-io/rrweb/tree/master/packages/rrweb-player/)**, is a player UI for rrweb, providing GUI-based functions like pause, fast-forward, drag and drop to play at any time.

## Roadmap

- rrdom: an ad-hoc DOM for rrweb session data [#419](https://github.com/rrweb-io/rrweb/issues/419)
- storage engine: do deduplication on a large number of rrweb sessions
- more end-to-end tests
- compact mutation data in common patterns
- provide plugins via the new plugin API, including:
  - XHR plugin
  - fetch plugin
  - GraphQL plugin
  - ...

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

## Core Team Members

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/Yuyz0112">
        <img
          src="https://avatars.githubusercontent.com/u/13651389?s=100"
          width="100px;"
          alt=""
        />
        <br /><sub><b>Yuyz0112</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Mark-Fenng">
        <img
          src="https://avatars.githubusercontent.com/u/27533910?s=100"
          width="100px;"
          alt=""
        />
        <br /><sub><b>Mark-Fenng</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/eoghanmurray">
        <img
          src="https://avatars.githubusercontent.com/u/156780?s=100"
          width="100px;"
          alt=""
        />
        <br /><sub><b>eoghanmurray</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Juice10">
        <img
          src="https://avatars.githubusercontent.com/u/4106?s=100"
          width="100px;"
          alt=""
        />
        <br /><sub><b>Juice10</b></sub>
      </a>
    </td>
  </tr>
</table>

## Who's using rrweb

<p align="center">
  <a href="http://www.smartx.com/" target="_blank">
    <img width="260px" src="https://www.rrweb.io/logos/smartx.png">
  </a>
</p>
