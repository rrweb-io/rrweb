# Changelog

This objective of this document is to track the changes being made in the rrweb package files

## v0.3.0

### Features

- Added image masking capability on img tags using class selector 'ue-mask'
- Added masking capability on input tags using class selector 'ue-input-mask'

### Changes

/packages/rrweb-snapshot/src/snapshot.ts

- added img masking logic in function serializeElementNode(n, options) on line 793

/packages/rrweb/src/record/mutation.ts

- added mutation logic for masking img in function processMutation on line 670

/packages/rrweb/src/record/observer.ts

- added masking logic for input tags in function eventHandler on line 470

/packages/rrweb/src/record/index.ts

- added property 'maskInputClass' on line number 76 and 530 inside record and observe functions.

/packages/rrweb/src/types.ts

- updated types recordOptions and observeParam, added maskTextClass property in both.

## v0.3.4

### Fix

- Memory leak issues on IframeManager and observers

### Changes

/packages/rrweb/src/record/observer.ts

- flushMutationBuffers() added to clear mutationBuffers

/packages/rrweb/src/record/iframe-manager.ts

- function to cleanup handleMessage() in eventListener

/packages/rrweb/src/record/index.ts

- calling flushMutationBuffers & IframeManger cleanup() in record()
