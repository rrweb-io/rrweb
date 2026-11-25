---
"rrweb-player": minor
---

Add an opt-in compact toolbar (`features.toolbar`) with speed and settings panels, a time display that shows when the recording started (optionally in the recorded user’s `recordingTimeZone`), and fullscreen, themed with four CSS custom properties. `features.download` adds a Download menu that saves the recording's events as a JSON file and lists download links the host provides, such as a rendered video. The `controls` prop leaves out individual toolbar controls and the `icons` prop replaces its icons. Fullscreen now fits the replay around the controls, restores the embedded size on exit and works inside a shadow root. The classic controls are unchanged and stay the default.
