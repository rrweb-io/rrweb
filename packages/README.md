# rrweb Packages

rrweb is a monorepo containing the following packages:

- [rrweb](rrweb/) — Main package including both record and replay
- [@rrweb/record](record/) — The record related code in rrweb and is designed to be published in a frontend app/webpage
- [@rrweb/replay](replay/) — Rebuild and replay recorded events in an iframe
- [rrweb-player (ui)](rrweb-player/) — Builds on @rrweb/replay to provide a feature-rich playback UI out of the box
- [rrweb-snapshot](rrweb-snapshot/) — Snapshot the DOM into a stateful and serializable data structure &mdash; basis of the FullSnapshot event in an rrweb recording
- [@rrweb/types](types/) — Shared types used across rrweb packages
- [@rrweb/utils](utils/) — Shared utility functions used across rrweb packages
- [rrdom](rrdom/) — a virtual dom library used to fast forward DOM mutation during replay
- [rrdom-nodejs](rrdom-nodejs/) — A Node.js implementation of the `rrdom` library for use in server side processing of rrweb data
- [rrvideo](rrvideo/) — A tool for transforming the session recorded by rrweb into a video
- [web-extension](web-extension/) — Provides a browser extension for recording and replaying web pages
- [@rrweb/packer](packer/) — Basic per-event compression before network transmission
- [@rrweb/all](all/) — Convenience package that includes record, replay + the packer, but no longer includes any plugins

See also [plugin packages](../docs/recipes/plugin-api.md).
