<!-- markdownlint-disable MD043 -->

# Shadow DOM

rrweb can record open Shadow DOM and closed Shadow DOM created through
`attachShadow()` during recording. The recorder keeps references to the roots;
`host.shadowRoot` on the original page still returns `null` for closed roots.
Recording does not change closed roots to open roots.

## Closed roots that existed before recording

Browsers do not expose existing closed roots through ordinary DOM APIs.
Applications, browser extensions, or CDP integrations that hold a root reference
can register it explicitly:

```js
import { record } from '@rrweb/record';

const root = host.attachShadow({ mode: 'closed' });
root.innerHTML = '<p>Component content</p>';

record.registerShadowRoot(root);
const stop = record({ emit: saveEvent });
```

Calling `record.registerShadowRoot(root)` during recording takes a new full
snapshot to capture the existing content, then continues recording incremental
changes. Roots whose hosts are not yet in the document are captured when their
hosts are inserted. Registering the same root does not install duplicate
observers.

When using `rrweb-snapshot` on its own, use `registerShadowRoot(root)` exported
from that package, then call `snapshot()`.

## Iframes and replay

Same-origin iframes inside a root use the existing same-origin recording
mechanism. Cross-origin iframes still require `recordCrossOriginIframes: true`
in both the parent and child pages. See
[Cross origin iframes](./cross-origin-iframes.md).

Closed roots use the existing Shadow DOM event format. During replay, roots are
rebuilt as open roots inside the sandbox so that subsequent changes can be
applied. Roots on the original page remain closed.

## Limitations

- Roots created before the recorder starts, including declarative closed Shadow
  DOM, require the caller to provide root references. Upgrading alone cannot
  automatically recover these roots.
- Closed roots created while recording is stopped also require explicit
  registration.
- Closed roots in an iframe must be created after observation starts for that
  document, or registered with the recorder responsible for that document.
- DOM mutations, input, clicks, mouse movement, media events, scrolling, and
  adopted stylesheets use the existing recording mechanisms. This feature does
  not add support for Canvas or text selections inside closed roots.
- Configure input masking and recording exclusions as appropriate for your
  application.
