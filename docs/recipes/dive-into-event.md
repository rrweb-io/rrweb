# Dive Into Events

The events recorded by rrweb are a set of strictly-typed JSON data. You may discover some flexible ways to use them when you are familiar with the details.

## Data Types

Every event has a `timestamp` attribute to record the time it was emitted.

There is also a `type` attribute indicates the event's type, the semantic of event's type is:

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

The EventType is Typescript's numeric enum, which is a self-increased number from 0 in runtime. You can find its definition in this [list](https://github.com/rrweb-io/rrweb/blob/9488deb6d54a5f04350c063d942da5e96ab74075/src/types.ts#L10).

In these kinds of events, the incrementalSnapshotEvent is the event that contains incremental data. You can use `event.data.source` to find which kind of incremental data it belongs to:

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

enum IncrementalSource's definition can be found in this [list](https://github.com/rrweb-io/rrweb/blob/master/packages/rrweb/typings/types.d.ts#L62).
