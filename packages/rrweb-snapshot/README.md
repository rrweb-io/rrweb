# rrweb-snapshot

[![Build Status](https://travis-ci.org/rrweb-io/rrweb.svg?branch=master)](https://travis-ci.org/rrweb-io/rrweb) [![Join the chat at slack](https://img.shields.io/badge/slack-@rrweb-teal.svg?logo=slack)](https://join.slack.com/t/rrweb/shared_invite/zt-siwoc6hx-uWay3s2wyG8t5GpZVb8rWg)

Snapshot the DOM into a stateful and serializable data structure.
Also, provide the ability to rebuild the DOM via snapshot.

## API

This module export following methods:

### snapshot

`snapshot` will traverse the DOM and return a stateful and serializable data structure which can represent the current DOM **view**.

There are several things will be done during snapshot:

1. Inline some DOM states into HTML attributes, e.g, HTMLInputElement's value.
2. Turn script tags into `noscript` tags to avoid scripts being executed.
3. Try to inline stylesheets to make sure local stylesheets can be used.
4. Make relative paths in href, src, CSS to be absolute paths.
5. Give an id to each Node, and return the id node map when snapshot finished.

#### rebuild

`rebuild` will build the DOM according to the taken snapshot.

There are several things will be done during rebuild:

1. Add data-rrid attribute if the Node is an Element.
2. Create some extra DOM node like text node to place inline CSS and some states.
3. Add data-extra-child-index attribute if Node has some extra child DOM.

#### serializeNodeWithId

`serializeNodeWithId` can serialize a node into snapshot format with id.

#### buildNodeWithSN

`buildNodeWithSN` will build DOM from serialized node and store serialized information in `__sn` property.
