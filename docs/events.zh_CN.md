# 事件

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

enum IncrementalSource 的定义详见[列表](https://github.com/rrweb-io/rrweb/blob/98e71cd0d23628cd1fbdbe47664a65748084c4a4/packages/types/src/index.ts#L69)。

## 录制

要让录制数据可被回放，通常应以一个 `Meta` 事件开始，其中包含页面的 URL 和屏幕尺寸，随后是一个用于重建 HTML 状态的 `FullSnapshot` 事件。用户操作和页面状态变化都会通过后续的 `IncrementalSnapshot` 事件传入，其中状态变化对应 `source: IncrementalSource.Mutation`。这类事件被称为「mutation 事件」（变更事件），它们彼此层层叠加，因此必须按正确的顺序回放；如果其中某个事件丢失，后续的变更可能会失败（例如某个变更添加了一个导航元素，而下一个变更包含了表示菜单中某个导航项 hover 状态的属性变化）。关于如何调试事件顺序问题，参见 [Sequential ID 插件](packages/plugins/rrweb-plugin-sequential-id-record/)。

当用户导航到网站的另一个页面时，该过程会以另一对 Meta + FullSnapshot 事件重新开始。每个后续的 mutation 事件都是在某次页面加载的首个 FullSnapshot 基础上增量构建的。只要变更与正确的全量快照相关联，多段事件流就可以线性地组合成单个「会话回放」（Session Replay）。请注意，rrweb Cloud 提供了额外的能力来正确地重建多标签页浏览会话；概览可参见 cloud 的[回放指南](https://rrweb.com/docs/cloud/replaying-guide)，或参阅 [Get replay](https://rrweb.com/docs/operations/get-replays-%7BgroupingProp%7D-%7BreplayValue%7D) 接口了解如何组合或合并多段录制数据。
