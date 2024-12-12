_Looking for a Vue.js version? Go here --> [@preflight-hq/rrweb-player-vue](https://github.com/Preflight-HQ/rrweb-player-vue)_

---

# rrweb-player

Since rrweb's replayer only provides a basic UI, you can choose rrweb-replayer which is based on rrweb's public APIs but has a feature-rich replayer UI.

## How is this different from `rrweb.Replayer`?

rrweb-player uses rrweb's Replayer under the hood, but as Replayer doesn't include any UI for controls, rrweb-player adds those.

## Installation

rrweb-player can also be included with `<script>`：

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/rrweb-player@latest/dist/style.css"
/>
<script src="https://cdn.jsdelivr.net/npm/rrweb-player@latest/dist/index.umd.cjs"></script>
```

Or installed by using NPM：

```shell
npm install --save rrweb-player
```

```js
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';
```

## Usage

```js
new rrwebPlayer({
  target: document.body, // customizable root element
  props: {
    events,
  },
});
```

## Options

| key            | default      | description                                                                                                         |
| -------------- | ------------ | ------------------------------------------------------------------------------------------------------------------- |
| events         | []           | the events for replaying                                                                                            |
| width          | 1024         | the width of the replayer                                                                                           |
| height         | 576          | the height of the replayer                                                                                          |
| maxScale       | 1            | the maximum scale of the replayer (1 = 100%), set to 0 for unlimited                                                |
| autoPlay       | true         | whether to autoplay                                                                                                 |
| speed          | 1            | The default speed to play at                                                                                        |
| speedOption    | [1, 2, 4, 8] | speed options in UI                                                                                                 |
| showController | true         | whether to show the controller UI                                                                                   |
| tags           | {}           | customize the custom events style with a key-value map                                                              |
| inactiveColor  | #D4D4D4      | Customize the color of inactive periods indicator in the progress bar with a valid CSS color string.                |
| ...            | -            | all the [rrweb Replayer options](https://github.com/rrweb-io/rrweb/blob/master/guide.md#options-1) will be bypassed |

## methods on the rrwebPlayer component

```ts
addEventListener(event: string, handler: (params: any) => unknown): void;
```

```ts
addEvent(event: eventWithTime): void;
```

```ts
getMetaData() => {
    startTime: number;
    endTime: number;
    totalTime: number;
}
```

```ts
getReplayer() => Replayer;
```

```ts
getMirror() => Mirror;
```

Toggles between play/pause

```ts
toggle();
```

Sets speed of player

```ts
setSpeed(speed: number)
```

Turns on/off skip inactive

```ts
toggleSkipInactive();
```

Triggers resize, do this whenever you change width/height

```ts
triggerResize();
```

Plays replay

```ts
play();
```

Pauses replay

```ts
pause();
```

Go to a point in time and pause or play from then

```ts
goto(timeOffset: number, play?: boolean)
```

Plays from a time to a time and (optionally) loop

```ts
playRange(
    timeOffset: number,
    endTimeOffset: number,
    startLooping: boolean = false,
    afterHook: undefined | (() => void) = undefined,
  )
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
