# 深入录制数据

录制数据是一组类型严格的 JSON 数据，通过熟悉其格式，可以更灵活的使用录制数据。

## 数据类型

每个 event 都拥有 `timestamp` 属性用于标记时间戳。

除此之外，也都拥有 `type` 属性标记 event 类型，其对应关系如下：

```
type -> EventType.DomContentLoaded
event -> domContentLoadedEvent

type = EventType.Load
event -> loadedEvent

type -> EventType.FullSnapshot
event -> fullSnapshotEvent

type -> EventType.IncrementalSnapshot
event -> incrementalSnapshotEvent

type -> EventType.Meta
event -> metaEvent

type -> EventType.Custom
event -> customEvent
```

其中 EventType 是 Typescipt 的 numeric enum，在运行时是从 0 开始的数字，其类型定义详见[列表](https://github.com/rrweb-io/rrweb/blob/9488deb6d54a5f04350c063d942da5e96ab74075/src/types.ts#L10)。

其中 incrementalSnapshotEvent 代表增量数据，其具体增量类型可以通过 `event.data.source` 字段进行判断：

```
source -> IncrementalSource.Mutation
data -> mutationData

source -> IncrementalSource.MouseMove
data -> mousemoveData

source -> IncrementalSource.MouseInteraction
data -> mouseInteractionData

source -> IncrementalSource.Scroll
data -> scrollData

source -> IncrementalSource.ViewportResize
data -> viewportResizeData

source -> IncrementalSource.Input
data -> inputData

source -> IncrementalSource.TouchMove
data -> mouseInteractionData

source -> IncrementalSource.MediaInteraction
data -> mediaInteractionData

source -> IncrementalSource.StyleSheetRule
data -> styleSheetRuleData

source -> IncrementalSource.CanvasMutation
data -> canvasMutationData

source -> IncrementalSource.Font
data -> fontData
```

enum IncrementalSource 的定义详见[列表](https://github.com/rrweb-io/rrweb/blob/master/src/types.ts#L64)。
