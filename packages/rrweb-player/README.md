# rrweb-player

## Overview

Use this package to get a feature-rich playback UI out of the box; if you want to build your own UI use the [@rrweb/replay](../../packages/replay/README.md) package.

This is the same replayer used in the [cloud dashboard](https://app.rrweb.com/), if you want to try out a replay of your website, you can sign up and make a quick recording using the 'Test record any webpage' bookmarklet.

## How is this different from `new Replayer()`?

`new Replayer()` is from the more foundational [@rrweb/replay](../../packages/replay/README.md) package, which renders and rebuilds an rrweb event stream within an iframe. This package builds on that to provide UI in the form of play/pause controls and a timeline using the [Svelte](https://svelte.dev/) UI framework. The similar naming is unfortunate, and we aim to fix that in a future major version.

## Installation

### 1) Bundler / npm (Recommended)

```shell
npm install rrweb-player
```

```js
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';
```

### 2) Browser Without Bundler (ESM)

```html
<link
  rel="stylesheet"
  href="https://cdn.rrweb.com/rrweb-player/current/style.css"
/>
<script type="module">
  import rrwebPlayer from 'https://cdn.rrweb.com/rrweb-player/current/rrweb-player.js';
</script>
```

Use `current` for the latest stable release, or pin an exact version such as
`https://cdn.rrweb.com/rrweb-player/2.0.0/rrweb-player.js` for immutable
production URLs. See the [CDN assets docs](https://rrweb.com/docs/cloud/cdn-assets)
for the full URL shape and catalog.

### 3) Legacy Direct `<script>` Include (UMD fallback)

Use this only for compatibility with non-module environments.

```html
<link
  rel="stylesheet"
  href="https://cdn.rrweb.com/rrweb-player/current/style.css"
/>
<script src="https://cdn.rrweb.com/rrweb-player/current/rrweb-player.umd.cjs"></script>
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

| key                 | default          | description                                                                                                       |
| ------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| events              | []               | the events for replaying                                                                                          |
| width               | 1024             | the width of the replayer                                                                                         |
| height              | 576              | the height of the replayer                                                                                        |
| maxScale            | 1                | the maximum scale of the replayer (1 = 100%), set to 0 for unlimited                                              |
| autoPlay            | true             | whether to autoplay                                                                                               |
| clickToPlay         | false            | whether a click on the replay plays or pauses it                                                                  |
| showPlayOverlay     | false            | whether a paused replay shows a play button on hover                                                              |
| speed               | 1                | The default speed to play at                                                                                      |
| speedOption         | [1, 2, 4, 8]     | speed options in UI                                                                                               |
| showCaptions        | true             | display timed captions from annotation events; viewers can toggle them with CC                                    |
| showController      | true             | whether to show the controller UI                                                                                 |
| timelineMarkerColor | rgb(73, 80, 246) | color of timeline marker annotations                                                                              |
| tags                | {}               | customize the custom events style with a key-value map                                                            |
| inactiveColor       | #D4D4D4          | Customize the color of inactive periods indicator in the progress bar with a valid CSS color string.              |
| ...                 | -                | all the [rrweb Replayer options](https://github.com/rrweb-io/rrweb/blob/main/guide.md#options-1) will be bypassed |

## Playback controls

These features are off unless you turn them on, so upgrading changes nothing
for an existing player.

- `features.jump` adds back and forward buttons that jump by `seconds`
  (default 10). Its `keyboard` option lets the left and right arrows jump and
  Space play or pause: `'player'` while focus is in the player, or `'page'`
  from anywhere on the page when this is the only visible player with page
  shortcuts. Inputs, sliders, dialogs and other players keep their arrow keys,
  and buttons, links and other controls keep Space. These keys need the
  controller.
- The `clickToPlay` prop lets a click on the replay play or pause it, with or
  without the controller. A drag does not count as a click.
- The `showPlayOverlay` prop shows a play button over a paused replay while the
  pointer is on it, and touch screens show it whenever the replay is paused.

```js
const player = new rrwebPlayer({
  target: document.body,
  props: { events, features: { jump: { seconds: 5, keyboard: 'player' } } },
});

const unsubscribe = player.addEventListener(
  'ui-jump',
  ({ fromMs, toMs, source }) => {
    console.log(fromMs, toMs, source);
  },
);
player.jump('forward');
player.$set({ features: { jump: { seconds: 15 } } });
unsubscribe();
```

`player.jump()` works whether or not the buttons are shown. Jump events give
replay offsets in milliseconds and name the source: `'button'`,
`'keyboard'` or `'api'`. Jumps are ignored during live replay. While the
replay is stalled, a jump moves the position it resumes from.

### Timeline

`features.timeline` groups the timeline options. Each one is off unless you
set it.

`compressInactive` shrinks inactive periods so that together they take at
most `maxIdleShare` of the timeline's width. The share defaults to `0.2` and
accepts `0.001` to `1`; `true` uses the default. Without it the timeline stays
linear.

```js
new rrwebPlayer({
  target: document.body,
  props: {
    events,
    features: {
      timeline: { compressInactive: { maxIdleShare: 0.25 }, seekPreview: true },
    },
  },
});
```

The timeline draws compressed periods as hatched bands in `inactiveColor`, or
in a shade of the toolbar's text color with the toolbar. That includes the
inactivity after the last interaction. Markers, the playhead and seeking use
the same mapping, while playback time, progress events and `goto()` stay in
recording time. When no part of the recording counts as active, the timeline
stays linear.

`seekPreview: true` shows a dashed line and the time a click would seek to,
while a mouse or pen is over the timeline. It follows the same mapping as the
timeline, compression included. `seekPreview: { time: false }` shows the line
without the time, for embeds where the recording's timing is beside the point.

### Toolbar

`features.toolbar: true` replaces the classic button row with a compact
toolbar. It is off unless you turn it on.

- Play or pause, the jump buttons when `features.jump` is set, and the
  current and total time.
- A speed panel with a slider over the `speedOption` range and a button for
  each `speedOption` value.
- A settings panel with Skip inactive and, when the recording has captions
  or timeline notes, an Annotations switch that shows or hides both together.
  It starts in the state `showCaptions` gives it.
- Fullscreen.

The panels open on hover and stay open on click. They keep keyboard focus,
including inside a shadow root, and close with Escape.

Four CSS custom properties on the mounting element set the toolbar's colors:
`--rrweb-player-surface`, `--rrweb-player-text`, `--rrweb-player-accent` and
`--rrweb-player-focus-ring`. The player background, borders, the timeline
track, pill backgrounds and muted text are mixed from the surface and text
colors, and the playhead, progress and switches use the accent. A dark surface
with light text therefore gives a fully dark toolbar.

```css
.customer-replay {
  --rrweb-player-accent: #0b7a75;
  --rrweb-player-focus-ring: #f2a900;
}
```

Hovering or focusing the time shows when the recording started in the
viewer's local time. Set `recordingTimeZone` to the recorded user's IANA time
zone, such as `'America/New_York'`, to show their local time as well.

`features.download` adds a Download menu to the toolbar. Its rrweb events
(JSON) item saves the events the player holds, including any appended since it
loaded, as `rrweb-<start time>.json`. Pass `{ fileName }` to name the file, or
`{ json: false }` to leave the item out.

Add your own downloads, such as a video or a screenshot your server renders,
with `links`. Each link has a `label`, an `href` and an optional `description`,
and opens in a new tab. The menu lists only `http`, `https` and `blob` URLs.
The Download button appears when the menu has at least one item.

```js
features: {
  toolbar: true,
  download: {
    links: [
      { label: 'Video (MP4)', href: 'https://example.com/recording.mp4' },
    ],
  },
},
```

Two props adjust the toolbar. Neither does anything without it.

- `controls` leaves out the controls set to `false`: `play`, `jump`, `time`,
  `speed`, `activityGraph`, `settings`, `download` and `fullscreen`.
- `icons` replaces built-in icons. Each entry is a function that receives
  `{ name, seconds, document }` and returns an SVG element. The names are
  `play`, `pause`, `jump-back`, `jump-forward`, `speed`, `activityGraph`,
  `settings`, `download`, `enter-fullscreen` and `exit-fullscreen`, plus
  `click` and `navigation` for the activity graph's marks. Create the SVG with
  `document`, which may be the player's own, and give it a size: the built-in
  icons are 16 pixels.

```js
new rrwebPlayer({
  target: document.body,
  props: {
    events,
    features: { toolbar: true, jump: {} },
    controls: { settings: false },
    icons: {
      play: ({ document }) => {
        const svg = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'svg',
        );
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.innerHTML = '<path d="M8 5v14l11-7z" />';
        return svg;
      },
    },
  },
});
```

Both can be changed later with `player.$set`.

The built-in toolbar icons come from [Lucide](https://lucide.dev) (ISC
license, see `LICENSE-lucide`).

### Activity graph

`features.timeline.activityGraph` draws an activity graph over the timeline.
It is off unless you set it; `true` offers every layer.

```js
new rrwebPlayer({
  target: document.body,
  props: {
    events,
    features: {
      toolbar: true,
      timeline: { activityGraph: { layers: ['clicks', 'inputs'] } },
    },
  },
});
```

The graph appears while the pointer is over the timeline or the controls. Three
stacked bands show input events, scroll distance and pointer movement, each
scaled to its own peak, and a lane marks each click with a dot and each page
load at a new URL with a hollow dot. A page load is a Meta event whose URL differs from the one
before it. rrweb records periodic checkouts the same way, so a reload that
keeps the URL is not marked. A single-page app changes its URL without a Meta
event, so its route changes show at the next checkout, if at all. A click on the graph
seeks the replay, and so do the arrow keys followed by Enter. With
`timeline.seekPreview`, the seek preview runs across the graph. The graph
uses the same scale as the timeline, compression included.

`layers` limits the layers to `inputs`, `scroll`, `mouse`, `clicks` and
`navigation`, all five by default. With `features.toolbar`, a Timeline
activity panel lets the viewer hide the graph or any recorded layer.
`controls: { activityGraph: false }` leaves that panel out, and
`icons.activityGraph` replaces its icon. With the toolbar, `icons.click` and
`icons.navigation` replace the click and navigation dots on the graph and in
the panel, for example with a pointer or a page icon. Marks close together
share one icon. An icon of about 12 pixels fits the lane.

## Captions and timeline markers

Use `record.addAnnotation()` to add captions and timeline markers. Captions are
shown by default; set `showCaptions: false` to hide them initially. Viewers can
toggle them with CC.

```js
record.addAnnotation({ type: 'caption', text: 'Click Save.' });
record.addAnnotation({
  type: 'timelineMarker',
  text: 'Saving also creates a default workspace.',
});
record.addAnnotation({ type: 'caption', text: '' });
```

Captions persist until replaced or cleared with `''` or `false`.
`timelineMarkerColor` controls annotation marker colors independently of custom
event `tags`. Text is plain text; HTML is not interpreted.

Tab to the playback position slider to seek with the arrow keys in five-second
steps, or use Home/End to jump to the start/end.

See the [annotation recipe](../../docs/recipes/annotations.md)
for replay callbacks, keyboard interactions, seeking, and TypeScript usage.

## Methods on the rrwebPlayer component

```ts
addEventListener(event: string, handler: (params: any) => unknown): () => void;
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
