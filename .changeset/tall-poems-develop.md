---
"@rrweb/utils": patch
"@rrweb/record": patch
---

AngularJS: Load unpatched versions of browser APIs from the `zone` object when present (Angular monkeypatches them), so we don't need to apply our own monkeypatch avoidance mechanism.
