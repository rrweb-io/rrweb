---
"rrweb": minor
"@rrweb/types": minor
---

Added a styleMap to store and retrieve adopted stylesheets not initially in the styleMirror when using the virtual DOM. When using the virtual DOM, adopted styles are applied after mutations, so any adopted styles from nodes - including styles from their child nodes - removed will not be applied to nodes that share the same styleId.