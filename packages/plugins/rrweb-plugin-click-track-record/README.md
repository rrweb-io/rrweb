# @rrweb/rrweb-plugin-click-track-record

Records a stable, semantic data about of every click/touch, not tied to the internal rrweb mirror id of the target element. 

Instead, a stable and robust CSS selector is generated for the target element of the click is attributed to, exactly where within that element the click was located (percentX/percentY), and (for buttons and anchors) the element's innerText.

For clicks within elements, e.g. a click on an image icon within a button, we prefer a 'significant' target (a parent button or anchor) in order that we can better attribute the click against the element and any associated hrefs, but the real target is not lost but recorded in recursive `.inner` data.  The inner data can also record where exactly within a ShadowDOM the click occurred, while also remaining useful to consumers who opt to ignore shadow dom.

Selectors are generated with [`semantic-selector`](https://github.com/eoghanmurray/semantic-selector), so they favour meaningful, human-readable class/attribute paths over brittle positional ordinals, and stay resolvable across page revisions. The `semantic-selector` library does not output a *unique* selector for the element (the rrweb mirror id covers this in the context of a particular recording), but rather focuses on picking out the semantic classes and attributes in the target's ancestor path, to maximize the chances of the 'same' element being addressable in a different version of the page.  We augment the css selector with a `selectorMatchIndex` (and `selectorMatchCount`) to discriminate between multiple elements (rather than injecting`:nth-of-type` / `:nth-child` into the selector to force uniqueness)

Useful for click heatmaps and click analytics independently of the rrweb replayer (this plugin can also be run standalone without rrweb).

See the [guide](../../../guide.md) for more info on rrweb.

## Install

```bash
npm install @rrweb/rrweb-plugin-click-track-record
```

## Usage

### As an rrweb record plugin

```js
import * as rrweb from 'rrweb';
import { getRecordClickTrackPlugin } from '@rrweb/rrweb-plugin-click-track-record';

rrweb.record({
  emit(event) {
    // click-track payloads arrive as rrweb plugin events
  },
  plugins: [getRecordClickTrackPlugin()],
});
```

`getRecordClickTrackPlugin(options?)` accepts a `Partial<ClickTrackOptions>`
(see [Options](#options)).

### Standalone (no rrweb)

```js
import { createClickTracker } from '@rrweb/rrweb-plugin-click-track-record';

const stop = createClickTracker({
  callback: (payload) => {
    fetch('/api/clicks', { method: 'POST', body: JSON.stringify(payload) });
  },
  // ...any ClickTrackOptions
});

// later, to detach the listeners:
stop();
```

The tracker listens on `pointerdown` (to recover the pointer type) and `click`
(fired for both mouse and touch) using capture-phase listeners on the window.

## Options

All options are optional; defaults are shown.

| Option                | Type                | Default                                                                 | Description                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------- | ------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `targetText`          | `boolean \| string` | `'button,a,input[type="submit"],input[type="button"],[role="button"]'`  | Which clicked elements get their text recorded. `true` = all elements, `false` = none, or a comma-separated list of **CSS selectors** — the element's text is recorded when it matches any of them. Text is `innerText` (falling back to `textContent`), truncated to 40 characters; for `input` it is the element `value`, and only ever for `type="submit"`/`type="button"` so text-field input is never captured. |
| `shadow`              | `boolean`           | `false`                                                                 | Descend into **open** shadow roots, recording the real inner target as a chain of `inner` hops (one per boundary crossed). When off, a click inside a shadow tree is recorded against the shadow host in the regular document.                                                                                                                                                                                       |
| `significantSelector` | `string`            | `'a[href],area[href],button,input[type="submit"],input[type="button"]'` | CSS selector for the element a click is *attributed* to. The plugin walks up from the real target and stops at the first matching ancestor (the link/button/control level); a finer descendant that was actually clicked is recorded as an `inner` hop. Falls back to the clicked element itself when nothing matches.                                                                                               |

> **Leaf text.** By default only links/buttons/controls get `targetText`. To also
> capture the text of bare "leaf" elements (e.g. a `<div class="k">Where</div>`),
> add `:not(:has(*))` (an element with no child elements) to `targetText`:
> `'button,a,input[type="submit"],input[type="button"],[role="button"],:not(:has(*))'`.
> Note `:has()` requires a reasonably modern browser (Chrome 105+, Safari 15.4+,
> Firefox 121+); on older engines the selector is skipped and no text is recorded
> for those clicks. Consider that leaf text can contain PII.

## Return shape

Each click produces one `ClickTrackPayload`. It is a `PositionedTarget` for the
significant element (its fields are inlined at the top level) plus viewport and
click metadata, with an optional `inner` chain drilling down to the precise node
hit.

```jsonc
{
  // --- PositionedTarget for the significant element (inlined) ---
  "targetSelector": ".fact .fg-link",  // semantic-selector output, relative to root
  "percentX": 42.1,        // click X as % of the element's box width (0–100)
  "percentY": 55.0,        // click Y as % of the element's box height (0–100)
  "aspect": 6.3,           // element width / height
  "selectorMatchIndex": 0, // present only when the selector matched >1 element
  "selectorMatchCount": 3, // present only when the selector matched >1 element

  // --- payload metadata ---
  "viewportWidth": 1280,
  "viewportHeight": 720,
  "targetText": "Add to Cart", // present per `targetText` option
  "pointerType": "mouse",                     // 'mouse' | 'touch' | 'pen'

  // --- finer target actually clicked (optional, recursive) ---
  "inner": {
    "targetSelector": "svg", // resolved within the parent element's root
    "percentX": 80.0,
    "percentY": 50.0,
    "aspect": 1.0
  }
}
```

Field reference (`PositionedTarget`, reused at the top level and for every `inner`):

| Field                   | Type                | Notes                                                                                                                                  |
| ----------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `targetSelector`        | `string`            | CSS selector from `semantic-selector`, resolvable within this node's root.                                                             |
| `percentX` / `percentY` | `number`            | Click position within the element's bounding box, 0–100.                                                                               |
| `aspect`                | `number`            | Element aspect ratio (width / height).                                                                                                 |
| `selectorMatchIndex`    | `number?`           | 0-based index of the hit element among all `targetSelector` matches in its root. Present only when more than one matched.              |
| `selectorMatchCount`    | `number?`           | Total elements `targetSelector` matched in its root. Present only when more than one matched.                                          |
| `inner`                 | `PositionedTarget?` | The next, more precise target (a shadow host's content, or the plain descendant clicked when it differs from the significant element). |
| `innerBoundary`         | `'shadow'?`         | How to descend to `inner`: `'shadow'` = this element's open shadow root; absent = a descendant within the same root.                   |

Payload-only fields (`ClickTrackPayload`):

| Field                              | Type                           | Notes                                                                                                                                                                               |
| ---------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `viewportWidth` / `viewportHeight` | `number`                       | Viewport size in CSS pixels at click time.                                                                                                                                          |
| `targetText`                       | `string?`                      | Element text (≤40 chars), per the `targetText` option.                                                                                                                              |
| `pointerType`                      | `'mouse' \| 'touch' \| 'pen'?` | From the preceding `pointerdown`, when available.                                                                                                                                   |
| `shadowDeferred`                   | `boolean?`                     | Set when the significant element is inside a shadow root, so its selector cannot be resolved from the document. Recorded for measurement; reconstruction should skip these for now. |

## Selectors and resolving a target

Selectors come from [`semantic-selector`](https://github.com/eoghanmurray/semantic-selector),
whose signature is `semanticSelector(el, root = document.body): string`. It aims
for **stable, human-meaningful** selectors and deliberately avoids positional
ordinals (`:nth-child`) and machine-generated identifiers (React `useId`, UUIDs,
styled-components hashes, stateful classes e.g. `.active` etc.).

A consequence is that `semantic-selector` **does not guarantee uniqueness** — one
selector may match several same-identity elements. This plugin currently disambiguates by pairing the selector with a **match index + count** at record time (later we could add further signals like target bounding box). 

- When `targetSelector` matched exactly one element, `selectorMatchIndex` /
  `selectorMatchCount` are **omitted** — resolve with a plain
  `root.querySelector(targetSelector)`.

- When it matched several, both are present. Resolve with:
  
  ```js
  const matches = root.querySelectorAll(node.targetSelector);
  const el =
    matches.length === node.selectorMatchCount
      ? matches[node.selectorMatchIndex] // counts agree — index is trustworthy
      : /* DOM changed since record; fall back / verify by other signals */ null;
  ```

`targetText`, when present, can be used as an extra signal to verify the match index.

Each `inner` hop resolves within the **parent** node's element (its root), not the
document — walk the chain, resolving each `targetSelector` inside the element
resolved for the previous hop, crossing an open shadow boundary wherever
`innerBoundary === 'shadow'`. Stop at the deepest hop you can resolve.

### Reconstruction signals and gaps

`semantic-selector` suggests match-index + count plus text/`clientRect` as
verification signals. What this plugin records against that:

- **Match index + count** — recorded (see above). Disambiguates by DOM order, so
  it is reliable only while the relative order of same-identity matches is
  unchanged between record and replay.
- **Text** — recorded as `targetText`, but by default **only** for
  links/buttons/controls. If you rely on text to disambiguate arbitrary elements
  (e.g. several matching leaf nodes), widen `targetText` (see the leaf-text note
  above) or set it to `true` — mind the PII trade-off.
- **Box geometry** — the plugin records `aspect` (ratio) and the click's relative
  `percentX`/`percentY`, but **not** the element's absolute width/height or page
  offset, so you cannot verify a match by exact size or position — only by aspect
  ratio.
- **Shadow DOM** — not addressed by `semantic-selector`; this plugin adds the
  `inner`/`innerBoundary` chain and the `shadowDeferred` flag for it.

## Sponsors

[Become a sponsor](https://opencollective.com/rrweb#sponsor) and get your logo on
our README on GitHub with a link to your site.
