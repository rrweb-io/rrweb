# Replay
A design principle of rrweb is to process as little as possible on the recording side, minimizing the impact on the recorded page. This means we need to do some special processing on the replay side.

## High precision timer
During replay, we will get the complete snapshot chain at one time. If all the snapshots are executed in sequence, we can directly get the last state of the recorded page, but what we need is to synchronously initialize the first full snapshot, and then apply the remaining incremental snapshots asynchronously. Using a time interval we replay each incremental snapshot one after the other, which requires a high-precision timer.

The reason why **high precision** is emphasized is because the native `setTimeout` does not guarantee accurate execution after the set delay time, for example, when the main thread is blocked.

For our replay function, this inprecise delay is unacceptable and can lead to various weird phenomena, so we implement a constantly calibrated timer with `requestAnimationFrame` to ensure that in most cases incremental snapshots have a replay delay of no more than one frame.

At the same time, the custom timer is also the basis for our "fast forward" function.

## Completing missing nodes
The delay serialization strategy when rrweb uses MutationObserver is mentioned in the [incremental snapshot design](./observer.md), which may result in the following scenarios where we cannot record a full incremental snapshot:

```
parent
    node bar
    node foo
```

1. Node `foo` is added as a child of the parent
2. Node `bar` is added before existing child `foo`

According to the actual execution order, `foo` will be serialized by rrweb first, but when serializing new nodes, we need to record adjacent nodes in addition to the parent node, to ensure that the newly added nodes can be placed in the correct position during replay. At this point `bar` already exists but has not been serialized, so we will record it as `id: -1` (or, if there are no neighbors `null` as the id to indicate it doesn't exist).

During replay, when we process the incremental snapshot of the new `foo`, we know that its neighbor hasn't been inserted yet because it has an id of -1, and then temporarily put it into the "missing node pool". It is not inserted into the DOM tree.

After processing the incremental snapshot of the new n1, we normally process and insert `bar`. After the replay is completed, we check whether the neighbor node id of `foo` points to a node which is in the missing node pool. If it matches, then it will be removed from the pool and be inserted into the DOM tree.

## Simulation Hover
CSS styles for the `:hover` selector are present in many web pages, but we can't trigger the hover state via JavaScript. So when playing back we need to simulate the hover state to make the style display correctly.

The specific method includes two parts:

1. Traverse the CSS stylesheet, adding the CSS rules for the `:hover` selector just like in the original, but with an additional special selector class, such as `.:hover`.
2. When playing back the mouse up mouse interaction event, add the `.:hover` class name to the event target and all its ancestors, and remove it when the mouse moves away again.

## Play from any point in time
In addition to the basic replay features, we also want players like `rrweb-player` to provide similar functionality to video players, such as dragging and dropping to the progress bar to any point in time.

In actual implementation, we pass a start time to the method. We can then divide the snapshot chain into two parts: The parts before and the part after the start time. Then, the snapshot chain before the start time is executed synchronously, and then the snapshot chain after the starting times uses the normal asynchronous execution. This way we can achieve starting replay from any point in time.
