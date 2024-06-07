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
2. Run `yarn install` in the root to install required dependencies for all sub-packages (note: `npm install` is _not_ recommended).
3. Run `yarn dev` in the root to get auto-building for all the sub-packages whenever you modify anything.
4. Navigate to one of the sub-packages (in the `packages` folder) where you'd like to make a change.
5. Patch the code and run `yarn test` to run the tests, make sure they pass before you commit anything.
6. Push the code and create a pull request.

Protip: You can run `yarn test` in the root folder to run all the tests.

In addition to adding integration tests and unit tests, rrweb also provides a REPL testing tool.

[Using the REPL tool](../../guide.md#REPL-tool)

## Sponsors

[Become a sponsor](https://opencollective.com/rrweb#sponsor) and get your logo on our README on Github with a link to your site.

### Gold Sponsors 🥇

<div dir="auto">

<a href="https://opencollective.com/rrweb/tiers/gold-sponsor/0/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/gold-sponsor/0/avatar.svg?requireActive=false&avatarHeight=225" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/gold-sponsor/1/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/gold-sponsor/1/avatar.svg?requireActive=false&avatarHeight=225" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/gold-sponsor/2/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/gold-sponsor/2/avatar.svg?requireActive=false&avatarHeight=225" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/gold-sponsor/3/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/gold-sponsor/3/avatar.svg?requireActive=false&avatarHeight=225" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/gold-sponsor/4/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/gold-sponsor/4/avatar.svg?requireActive=false&avatarHeight=225" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/gold-sponsor/5/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/gold-sponsor/5/avatar.svg?requireActive=false&avatarHeight=225" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/gold-sponsor/6/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/gold-sponsor/6/avatar.svg?requireActive=false&avatarHeight=225" alt="sponsor"></a>

</div>

### Silver Sponsors 🥈

<div dir="auto">

<a href="https://opencollective.com/rrweb/tiers/silver-sponsor/0/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/silver-sponsor/0/avatar.svg?requireActive=false&avatarHeight=158" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/silver-sponsor/1/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/silver-sponsor/1/avatar.svg?requireActive=false&avatarHeight=158" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/silver-sponsor/2/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/silver-sponsor/2/avatar.svg?requireActive=false&avatarHeight=158" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/silver-sponsor/3/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/silver-sponsor/3/avatar.svg?requireActive=false&avatarHeight=158" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/silver-sponsor/4/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/silver-sponsor/4/avatar.svg?requireActive=false&avatarHeight=158" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/silver-sponsor/5/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/silver-sponsor/5/avatar.svg?requireActive=false&avatarHeight=158" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/silver-sponsor/6/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/silver-sponsor/6/avatar.svg?requireActive=false&avatarHeight=158" alt="sponsor"></a>

</div>

### Bronze Sponsors 🥉

<div dir="auto">

<a href="https://opencollective.com/rrweb/tiers/sponsors/0/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/sponsors/0/avatar.svg?requireActive=false&avatarHeight=70" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/sponsors/1/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/sponsors/1/avatar.svg?requireActive=false&avatarHeight=70" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/sponsors/2/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/sponsors/2/avatar.svg?requireActive=false&avatarHeight=70" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/sponsors/3/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/sponsors/3/avatar.svg?requireActive=false&avatarHeight=70" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/sponsors/4/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/sponsors/4/avatar.svg?requireActive=false&avatarHeight=70" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/sponsors/5/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/sponsors/5/avatar.svg?requireActive=false&avatarHeight=70" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/sponsors/6/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/sponsors/6/avatar.svg?requireActive=false&avatarHeight=70" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/sponsors/7/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/sponsors/7/avatar.svg?requireActive=false&avatarHeight=70" alt="sponsor"></a>
<a href="https://opencollective.com/rrweb/tiers/sponsors/8/website?requireActive=false" target="_blank"><img src="https://opencollective.com/rrweb/tiers/sponsors/8/avatar.svg?requireActive=false&avatarHeight=70" alt="sponsor"></a>

</div>

### Backers

<a href="https://opencollective.com/rrweb#sponsor" rel="nofollow"><img src="https://opencollective.com/rrweb/tiers/backers.svg?avatarHeight=36"></a>

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
        <br /><br />
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/YunFeng0817">
        <img
          src="https://avatars.githubusercontent.com/u/27533910?s=100"
          width="100px;"
          alt=""
        />
        <br /><sub><b>Yun Feng</b></sub>
        <br /><br />
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
        <br /><br />
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
        <br /><sub>open for rrweb consulting</sub>
      </a>
    </td>
  </tr>
</table>

## Who's using rrweb?

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
      <a href="https://recordonce.com/" target="_blank">
        <img width="195px" alt="Smart screen recording for SaaS" src="https://uploads-ssl.webflow.com/5f3d133183156245630d4446/5f3d1940abe8db8612c23521_Record-Once-logo-554x80px.svg">
      </a>
    </td>
  </tr>
    <tr>
    <td align="center">
      <a href="https://cux.io" target="_blank">
        <img style="padding: 8px" alt="The first ever UX automation tool" width="195px" src="https://cux.io/cux-logo.svg">
      </a>
    </td>
    <td align="center">
      <a href="https://remsupp.com" target="_blank">
        <img style="padding: 8px" alt="Remote Access & Co-Browsing" width="195px" src="https://remsupp.com/images/logo.png">
      </a>
    </td>
    <td align="center">
      <a href="https://highlight.io" target="_blank">
        <img style="padding: 8px" alt="The open source, fullstack Monitoring Platform." width="195px" src="https://github.com/highlight/highlight/raw/main/highlight.io/public/images/logo.png">
      </a>
    </td>
    <td align="center">
      <a href="https://analyzee.io" target="_blank">
        <img style="padding: 8px" alt="Comprehensive data analytics platform that empowers businesses to gain valuable insights and make data-driven decisions." width="195px" src="https://cdn.analyzee.io/assets/analyzee-logo.png">
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://requestly.io" target="_blank">
        <img style="padding: 8px" alt="Intercept, Modify, Record & Replay HTTP Requests." width="195px" src="https://github.com/requestly/requestly/assets/16779465/652552db-c867-44cb-9bb5-94a2026e04ca">
      </a>
    </td>
    <td align="center">
      <a href="https://gleap.io" target="_blank">
        <img style="padding: 8px" alt="In-app bug reporting & customer feedback platform." width="195px" src="https://assets-global.website-files.com/6506f3f29c68b1724807619d/6506f56010237164c6306591_GleapLogo.svg">
      </a>
    </td>
    <td align="center">
      <a href="https://uxwizz.com" target="_blank">
        <img style="padding: 8px" alt="Self-hosted website analytics with heatmaps and session recordings." width="195px" src="https://github.com/UXWizz/public-files/raw/main/assets/logo.png">
      </a>
    </td>
    <td align="center">
      <a href="https://www.howdygo.com" target="_blank">
        <img style="padding: 8px" alt="Interactive product demos for small marketing teams" width="195px" src="https://assets-global.website-files.com/650afb446f1dd5bd410f00cc/650b2cec6188ff54dd9b01e1_Logo.svg">
      </a>
    </td>
  </tr>
</table>
