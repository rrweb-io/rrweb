---
"rrweb": minor
"@rrweb/record": minor
"rrweb-snapshot": minor
"@rrweb/utils": minor
---

支持录制期间创建的 closed Shadow DOM，并通过 `record.registerShadowRoot()` 和快照包的 `registerShadowRoot()` 接入调用方持有的已有根。保留原页面的 closed 语义，复用现有快照与回放格式，并覆盖内部事件、iframe 和移除后重新插入的场景。

统一通过 `dom.shadowRoot()` 读取 open 根与已注册的 closed 根，根引用及注册逻辑集中在 `@rrweb/utils`。
