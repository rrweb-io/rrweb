<p align="center">
  <img width="100px" height="100px" src="https://www.rrweb.io/favicon.png">
</p>

# rrweb extension

## Overview

The package web-extension provides a browser extension for recording and replaying web pages.

## Installation

```
yarn install
```

## Build

```bash
# build for chrome
yarn build:chrome

# build for firefox
yarn build:firefox
```

## Development

```bash
# start a development chrome browser
yarn dev:chrome
# start a development firefox browser
yarn dev:firefox
```

## How recording works

The extension has no content script that runs on every page and no host access to every site. When you press record in the popup, the extension injects the recorder into the current tab only. Opening the popup grants `activeTab` access to that tab; Chrome injects with `chrome.scripting` (the `scripting` permission), Firefox with `tabs.executeScript`.

- One recording is one tab. Switching to another tab does not move the recording.
- Pause and resume continue in the same tab.
- When the recorded tab loads a new page, reloads or closes, the recording stops as if you pressed Stop: it is saved in full, then the result opens in a new tab. Changes that keep the page, such as a hash change or `history.pushState`, do not stop it.
- Only the tab's top frame is recorded. Cross-origin iframes are not recorded.

Chrome permissions: `activeTab`, `scripting`, `storage`, `unlimitedStorage`. Firefox permissions: `activeTab`, `storage`, `unlimitedStorage`.

## Cloud

The Chrome build can save recordings to rrweb Cloud. The Firefox build only records offline.

The extension never signs in. The popup's "Connect your rrweb account" opens the dashboard's `/extension/connect` page, where a signed-in person connects an organization. The dashboard sends the extension that organization's public key with `chrome.runtime.sendMessage`. The manifest's `externally_connectable` lets only the dashboard origin send these messages, and the extension checks the sender's origin again before it answers:

| Message                                                          | Reply                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------- |
| `{ type: 'rrweb-extension-status' }`                             | `{ ok: true, version, connected: { orgId, orgName } \| null }` |
| `{ type: 'rrweb-extension-connect', orgId, orgName, publicKey }` | `{ ok: true }` or `{ ok: false, error }`                       |

Any other message gets `{ ok: false, error }`. Disconnecting is done in the extension's popup.

A Cloud recording is kept in the extension while it runs, like an offline one, with typed form input masked. When it stops, it is stored in the browser and then uploaded with the organization's public key to `POST <api>/recordings/<recordingId>/events` (newline-delimited JSON, at most 1 MiB per request). Once the upload is complete, the stored copy is deleted and the recording opens in the dashboard. If the upload fails, the recording stays in Offline sessions, and Share finishes the upload to the same recording, with the public key of the organization connected at that time.

Configure the Chrome build with these variables, for example in a `.env` file in this folder:

| Variable                   | Default                 |
| -------------------------- | ----------------------- |
| `VITE_RRWEB_API_URL`       | `https://api.rrweb.com` |
| `VITE_RRWEB_DASHBOARD_URL` | `https://app.rrweb.com` |

`VITE_RRWEB_DASHBOARD_URL` sets both where the popup links to and the origin in `externally_connectable`.

`yarn dev:chrome` and `yarn build:chrome:dev` are development builds. They embed a fixed public `key` in the manifest so the extension ID is stable:

- Development extension ID: `djilnhkggipaaljnmkpcdbglbdfkgeoe`
- Published Chrome Web Store ID: `pdaldeopoccdhlkabbkcjmecmmoninhe` (production builds carry no `key`)

The private key for the development ID is not in this repository. For a local dashboard and API:

```bash
VITE_RRWEB_API_URL=http://localhost:8797 VITE_RRWEB_DASHBOARD_URL=http://localhost:3000 yarn build:chrome:dev
```

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
        <img width="195px" src="https://raw.githubusercontent.com/rrweb-io/web/HEAD/static/logos/smartx.png" alt="SmartX">
      </a>
    </td>
    <td align="center">
      <a href="https://posthog.com?utm_source=rrweb&utm_medium=sponsorship&utm_campaign=open-source-sponsorship" target="_blank">
        <img width="195px" src="https://rrweb.com/posthog.png" alt="PostHog">
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
      <a href="https://sentry.io" target="_blank">
        <img width="195px" src="https://rrweb.com/sentry.png" alt="Sentry">
      </a>
    </td>
    <td align="center">
      <a href="https://www.pendo.io" target="_blank">
        <img width="195px" src="https://rrweb.com/pendo.png" alt="Pendo">
      </a>
    </td>
    <td align="center">
      <a href="https://mixpanel.com" target="_blank">
        <img width="195px" src="https://rrweb.com/mixpanel.png" alt="Mixpanel">
      </a>
    </td>
    <td align="center">
      <a href="https://www.datadoghq.com" target="_blank">
        <img width="195px" src="https://rrweb.com/datadog.png" alt="Datadog">
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://amplitude.com" target="_blank">
        <img width="195px" src="https://rrweb.com/amplitude.png" alt="Amplitude">
      </a>
    </td>
    <td align="center">
      <a href="https://newrelic.com" target="_blank">
        <img width="195px" src="https://rrweb.com/new%20relic.png" alt="New Relic">
      </a>
    </td>
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
  </tr>
  <tr>
    <td align="center">
      <a href="https://highlight.io" target="_blank">
        <img style="padding: 8px" alt="The open source, fullstack Monitoring Platform." width="195px" src="https://github.com/highlight/highlight/raw/main/highlight.io/public/images/logo.png">
      </a>
    </td>
    <td align="center">
      <a href="https://analyzee.io" target="_blank">
        <img style="padding: 8px" alt="Comprehensive data analytics platform that empowers businesses to gain valuable insights and make data-driven decisions." width="195px" src="https://analyzee.io/img/analyzee-main-logo.webp">
      </a>
    </td>
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
  </tr>
  <tr>
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
