# Serialization
If you only need to record and replay changes within the browser locally, then we can simply save the current view by deep copying the DOM object. For example, the following code implementation (simplified example with jQuery, saves only the body part):

```javascript
// record
const snapshot = $('body').clone();
// replay
$('body').replaceWith(snapshot);
```

We now implemented a snapshot by saving the whole DOM object in memory.

But the object itself is not **serializable**, meaning we can't save it to a specific text format (such as JSON) for transmission. We need that to do remote recording, and thus we need to implement a method for serializing the DOM data.

We do not use an existing open source solutions such as [parse5](https://github.com/inikulin/parse5) for two reasons:

1. We need to implement a "non-standard" serialization method, which will be discussed in detail below.
2. This part of the code needs to run on the recorded page, and we want to control the amount of code as much as possible, only retaining the necessary functions.

## Special handling in serialization
The reason why our serialization method is non-standard is because we still need to do the following parts:

1. Output needs to be descriptive. All JavaScript in the original recorded page should not be executed on replay. In rrweb we do this by replacing `script` tags with placeholder `noscript` tags in snapshots. The content inside the script is no longer important. We instead record any changes to the DOM that scripts cause, and we ​​do not need to fully record large amounts of script content that may be present on the original web page.
2. Recording view state that is not reflected in the HTML. For example, the value of `<input type="text" />` will not be reflected in its HTML, but will be recorded by the `value` attribute. We need to read the value and store it as a property when serializing. So it will look like `<input type="text" value="recordValue" />`.
3. Relative paths are converted to absolute paths. During replay, we will place the recorded page in an `<iframe>`. The page URL at this time is the address of the replay page. If there are some relative paths in the recorded page, an error will occur when the user tries to open them, so when recording we need to convert relative paths. Relative paths in the CSS style sheet also need to be converted.
4. We want to record the contents of the CSS style sheet. If the recorded page links to external style sheets, we can get its parsed CSS rules from the browser, generate an inline style sheet containing all these rules. This way stylesheets that are not always accessible (for example, because they are located on an intranet or localhost) are included in the recording and can be replayed correctly.

## Uniquely identifies
At the same time, our serialization should also include both full and incremental types. Full serialization can transform a DOM tree into a corresponding tree data structure.

For example, the following DOM tree:

```html
<html>
  <body>
    <header>
    </header>
  </body>
</html>
```

Will be serialized into a data structure like this:

```json
{
  "type": "Document",
  "childNodes": [
    {
      "type": "Element",
      "tagName": "html",
      "attributes": {},
      "childNodes": [
        {
          "type": "Element",
          "tagName": "head",
          "attributes": {},
          "childNodes": [],
          "id": 3
        },
        {
          "type": "Element",
          "tagName": "body",
          "attributes": {},
          "childNodes": [
            {
              "type": "Text",
              "textContent": "\n    ",
              "id": 5
            },
            {
              "type": "Element",
              "tagName": "header",
              "attributes": {},
              "childNodes": [
                {
                  "type": "Text",
                  "textContent": "\n    ",
                  "id": 7
                }
              ],
              "id": 6
            }
          ],
          "id": 4
        }
      ],
      "id": 2
    }
  ],
  "id": 1
}
```

There are two things to note in this serialization result:

1. When we traverse the DOM tree, we use Node as the unit. Therefore, in addition to the "element type" nodes in the DOM, we also include records of all other types of Nodes such as Text Node and Comment Node.
2. We add a unique identifier `id` to each Node, which is used for subsequent incremental snapshots.

Imagine if we recorded the click of a button on the same page and played it back, we can record the operation in the following format (that is what we call an incremental snapshot):

```javascript
type clickSnapshot = {
  source: 'MouseInteraction';
  type: 'Click';
  node: HTMLButtonElement;
}
```

The operation can be executed again by `snapshot.node.click()`.

However, in the actual scenario, although we have reconstructed the complete DOM, there is no way to associate the interacting DOM nodes in the incremental snapshot with the existing DOM.

This is the reason for the identifier `id`. We maintain the `id -> Node` mapping that is exactly the same over time on both the recording and replay sides, and they both are updated when DOM nodes are created and destroyed, ensuring that we use unique increasing numbers in the snapshots, and only the `id` needs to be recorded to find the corresponding DOM node during replay.

The data structure in the above example becomes correspondingly:

```typescript
type clickSnapshot = {
  source: 'MouseInteraction';
  type: 'Click';
  id: Number;
}
```
