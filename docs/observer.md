# Incremental snapshots

After completing a full snapshot, we need to look at all the events that could cause the view to changed base on the current view state.

Right now, rrweb records the following events (we will expand upon this):

- DOM changes
  - Node creation, deletion
  - Node attribute changes
  - Text changes
- Mouse movement
- Mouse interaction
  - mouse up, mouse down
  - click, double click, context menu
  - focus, blur
  - touch start, touch move, touch end
- Page or element scrolling
- Window size changes
- Input

## Mutation Observer

Since we don't execute any JavaScript during replay, we instead need to record all the user actions.

Consider this scenario:

> User clicks a button and the dropdown menu appears. Then, user selects the first item and the dropdown menu disappears.

During replay, the dropdown menu does not automatically appear after the "click button" is executed, because the original JavaScript is not part of the recording. Thus, we need to record the creation of the dropdown menu DOM nodes, the selection of the first item, and subsequent deletion of the dropdown menu DOM nodes. This is the most difficult part.

Fortunately, modern browsers have provided us with a very powerful API which can do exactly this: [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver).

This documentation does not explain the basic usages of MutationObserver, but only focuses on aspects in particular relevant to rrweb.

The first thing to understand is that MutationObserver uses a **Bulk Asynchronous** callback. Specifically, there will be a single callback after a series of DOM changes occur, and it is passed an array of multiple mutation records.

This mechanism is not problematic for normal use, because we do not only have the mutation record, but we can also directly access the DOM object of the mutated node as well as any parent, child and sibling nodes.

However in rrweb, since we have a serialization process, we need more sophisticated solution to be able to deal with various scenarios.

### Add node

For example, the following two operations generate the same DOM structure, but produce a different set of mutation records:

```
body
  n1
    n2
```

1. Create node n1 and append it as child of body, then create node n2 and append it as child of n1.
2. Create nodes n1 and n2, then append n2 as child to of n1, then append n1 as child of body.

In the first case, two mutation records will be generated, namely adding node n1 and adding node n2; in the second case, only one mutation record will be generated, that is, node n1 (including children) is added.

**Note**: In the first case, although n1 has no child node when it is added, due to the above-mentioned batch asynchronous callback mechanism, when we receive the mutation record and process the n1 node the it already has the child node n2 in the DOM.

Due to the second case, when processing new nodes we must traverse all its descendants to ensure that all new nodes are recorded, however this strategy will cause n2 to be (incorrectly) recorded during the first record. Then, when processing the second record, adding a the node for a second time will result in a DOM structure that is inconsistent with the original page during replay.

Therefore, when dealing with multiple mutation records in a callback, we need to "lazily" process the newly-added nodes, that is, first collect all raw, unprocessed nodes when we go through each mutation record, and then after we've been through all the mutation records we determine the order in which the nodes were added to the DOM. When these new nodes are added, we perform deduplication to ensure that each node is only recorded once and we check no nodes were missed.

We already introduced in the [serialization design document](./serialization.md) that we need to maintain a mapping of `id -> Node`, so when new nodes appear, we need to serialize the new nodes and add them to the map. But since we want to perform deduplication, and thus only serialize after all the mutation records have been processed, some problems may arise, as demonstrated in the following example:

1. mutation record 1, add node n1. We will not serialize it yet, since we are waiting for the final deduplication.
2. mutation record 2, n1 added attribute a1. We tried to record it as an incremental snapshot, but we found that we couldn't find the id for n1 from the map because it was not serialized yet.

As you can see, since we have delayed serialization of the newly added nodes, all mutation records also need to be processed first, and only then the new nodes can be de-duplicated without causing trouble.

### Remove node

When processing mutation records, we may encounter a removed node that has not yet been serialized. That indicates that it is a newly added node, and the "add node" mutation record is also somewhere in the mutation records we received. We label these nodes as "dropped nodes".

There are two cases we need to handle here:

1. Since the node was removed already, there is no need to replay it, and thus we remove it from the newly added node pool.
2. This also applies to descendants of the dropped node, thus when processing newly added nodes we need to check if it has a dropped node as an ancestor.

### Attribute change

Although MutationObserver is an asynchronous batch callback, we can still assume that the time interval between mutations occurring in a callback is extremely short, so we can optimize the size of the incremental snapshot by overwriting some data when recording the DOM property changes.

For example, resizing a `<textarea>` will trigger a large number of mutation records with varying width and height properties. While a full record will make replay more realistic, it can also result in a large increase in the number of incremental snapshots. After making a trade-off, we think that only the final value of an attribute of the same node needs to be recorded in a single mutation callback, that is, each subsequent mutation record will overwrite the attribute change part of the mutation record that existing before the write.

## Mouse movement

By recording the mouse movement position, we can simulate the mouse movement trajectory during replay.

Try to ensure that the mouse moves smoothly during replay and also minimize the number of corresponding incremental snapshots, so we need to perform two layers of throttling while listening to mousemove. The first layer records the mouse coordinates at most once every 20 ms, the second layer transmits the mouse coordinate set at most once every 500 ms to ensure a single snapshot doesn't accumulate a lot of mouse position data and becomes too large.

### Time reversal

We record a timestamp when each snapshot is generated so that during replay it can be applied at the correct time. However, due to the effect of throttling, the timestamps of the mouse movement corresponding to the incremental snapshot will be later than the actual recording time, so we need to record a negative time difference for correction and time calibration during replay.

## Input

We need to observe the input of the three elements `<input>`, `<textarea>`, `<select>`, including human input and programmatic changes.

### Human input

For human input, we mainly rely on listening to the input and change events. It is necessary to deduplicate different events triggered for the same the human input action. In addition, `<input type="radio" />` is also a special kind of control. If the multiple radio elements have the same name attribute, then when one is selected, the others will be reversed, but no event will be triggered on those others, so this needs to be handled separately.

### Programmatic changes

Setting the properties of these elements directly through the code will not trigger the MutationObserver. We can still achieve monitoring by hijacking the setter of the corresponding property. The sample code is as follows:

```typescript
function hookSetter<T>(
  target: T,
  key: string | number | symbol,
  d: PropertyDescriptor,
): hookResetter {
  const original = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, {
    set(value) {
      // put hooked setter into event loop to avoid of set latency
      setTimeout(() => {
        d.set!.call(this, value);
      }, 0);
      if (original && original.set) {
        original.set.call(this, value);
      }
    },
  });
  return () => hookSetter(target, key, original || {});
}
```

Note that in order to prevent our logic in the setter from blocking the normal interaction of the recorded page, we should put the logic into the event loop and execute it asynchronously.
