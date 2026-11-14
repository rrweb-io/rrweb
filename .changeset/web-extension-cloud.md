---
"@rrweb/web-extension": minor
---

The extension can now save recordings to an rrweb Cloud account as well as keeping them in the browser. A switch in the popup chooses between Cloud and offline recording. The rrweb dashboard connects an organization to the extension. Cloud recordings mask typed form input, upload when stopped, and open in the Cloud dashboard. A recording that fails to upload stays in the browser, where Share finishes it. Offline recordings can be shared to Cloud later. Each recording now covers a single tab: the recorder is injected into that tab when recording starts, and the recording stops when the tab loads a new page or closes. Only the tab's top frame is recorded, so cross-origin iframes are no longer recorded. The toolbar icon shows a REC badge on the recorded tab. The Firefox build records offline only.
