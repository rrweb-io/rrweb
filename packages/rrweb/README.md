<p align="center">
  <img width="100px" height="100px" src="https://www.rrweb.io/favicon.png">
</p>
<p align="center">
  <a href="https://www.rrweb.io/" style="font-weight: bold">Try rrweb</a>
</p>

# rrweb

**This is a simpler version of the [original rrewb README](../../README.md) within this rrweb subpackage**

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

- [serialization](../../docs/serialization.md)
- [incremental snapshot](../../docs/observer.md)
- [replay](../../docs/replay.md)
- [sandbox](../../docs/sandbox.md)

## Contribute Guide

Since we want the record and replay sides to share a strongly typed data structure, rrweb is developed with typescript which provides stronger type support.

[Typescript handbook](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)

1. Fork this repository.
2. Run `yarn install` in the root to install required dependencies for all sub-packages (note: `npm install` is _not_ recommended).
3. Run `yarn dev` in the root to get auto-building for all the sub-packages whenever you modify anything.
4. Navigate to one of the sub-packages (in the `packages` folder) where you'd like to make a change.
5. Patch the code and run `yarn test` to run the tests, make sure they pass before you commit anything.
6. Push the code and create a pull request.

Protip: You can run `yarn test` in the root folder to run all the tests.

In addition to adding integration tests and unit tests, rrweb also provides a REPL testing tool.

[Using the REPL tool](../../guide.md#REPL-tool)

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

<table>
  <tr>
    <td align="center">
      <a href="http://www.smartx.com/" target="_blank">
        <img width="195px" src="https://www.rrweb.io/logos/smartx.png">
      </a>
    </td>
    <td align="center">
      <a href="https://posthog.com?utm_source=rrweb&utm_medium=sponsorship&utm_campaign=open-source-sponsorship" target="_blank">
        <img width="195px" src="https://www.rrweb.io/logos/posthog.png">
      </a>
    </td>
    <td align="center">
      <a href="https://statcounter.com/session-replay/" target="_blank">
        <img width="195px" src="https://statcounter.com/images/logo-statcounter-arc-blue.svg">
      </a>
    </td>
    <td align="center">
      <a href="https://cux.io" target="_blank">
        <img style="padding: 8px" alt="The first ever UX automation tool" width="195px" src="https://static.cux.io/logo.svg">
      </a>
    </td>
  </tr>
    <tr>
    <td align="center">
      <a href="https://recordonce.com/" target="_blank">
        <img width="195px" src="https://uploads-ssl.webflow.com/5f3d133183156245630d4446/5f3d1940abe8db8612c23521_Record-Once-logo-554x80px.svg">
      </a>
    </td>
    <td align="center">
      <a href="https://remsupp.com" target="_blank">
        <img style="padding: 8px" alt="Remote Access & Co-Browsing" width="195px" src="https://remsupp.com/images/logo.png">
      </a>
    </td>
  </tr>
</table>
