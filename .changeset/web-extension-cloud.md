---
"@rrweb/web-extension": minor
---

The extension can now save recordings to an rrweb Cloud account as well as keeping them in the browser. A switch in the popup chooses between Cloud and offline recording. Signing in links an organization, and Cloud recordings upload while they happen, mask form fields, and open in the Cloud dashboard when stopped. Offline recordings can be shared to Cloud later. Each recording now covers a single tab: the recorder is injected into that tab when recording starts, and the recording stops when the tab loads a new page or closes. The toolbar icon shows a REC badge on the recorded tab. The Firefox build records offline only.
