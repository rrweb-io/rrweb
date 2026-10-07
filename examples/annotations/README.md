# rrweb annotations playground

A standalone Vite demo of captions and clickable timeline markers from PR #1928.
It uses the published `8fbd401` preview packages, including their linked preview
dependencies. No workspace build, API key, recording backend, or account is needed
to run the demo.

## Try it

- [Open the saved StackBlitz demo](https://stackblitz.com/edit/vitejs-vite-nsrczbi7?file=main.js&view=preview)
- [Import this example from GitHub](https://stackblitz.com/github/rrweb-io/rrweb/tree/codex/player-annotations/examples/annotations?file=main.js)

Or run locally:

```sh
npm install
npm run dev
```

The player starts paused with captions enabled. Press **Replay from start**, hover
and click the green timeline markers, or edit annotation text and timing and press
**Apply edits**. An empty caption clears the current text. **Reset example** restores
the original annotations. Edits made in the preview are in memory; change `defaults`
in `main.js` and save your StackBlitz project to keep a new example.

`recording.json` is a 16-second recording of a fictional project-management app,
created for this demo. It contains no customer session data. `main.js` adds the
editable annotation events to that fixture using recording-relative timestamps.
In a real application, call `record.addAnnotation()` while recording instead.

`skipInactive: false` preserves the pauses so viewers have time to read captions.
Text is rendered as plain text. The callback below the player shows annotation
events emitted during playback; seeking can skip callbacks for earlier events,
while the player restores the appropriate caption automatically.

## Check the production build

```sh
npm run build
```
