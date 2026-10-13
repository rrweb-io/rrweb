---
"rrweb": patch
---

fix: disconnect shadow-DOM observers when their host is removed

Each observed shadow root kept a live `MutationObserver` plus its mutation buffer for the rest of the recording session, so repeatedly removing and recreating web components retained every detached shadow tree. Removed hosts now release their shadow observers and buffers once detached, while moved or reinserted hosts keep being observed. Registry loops use a copy so mid-loop removal can't strand buffers locked.
