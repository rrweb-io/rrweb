---
"rrweb": patch
"@rrweb/record": patch
---

fix: disconnect shadow-DOM observers when their host is removed

Each observed shadow root kept a live `MutationObserver` plus its mutation buffer for the rest of the recording session even if its host was removed, a memory leak problem for component-heavy pages. Fix: release shadow observers and buffers as soon as we observe them as removed/detached from dom with tests added for the still-attached host-moved case, and to ensure they get re-observed on reinsertion.
