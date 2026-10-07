---
'rrweb': minor
---

Add `attributeFilter` option to `record()` for native MutationObserver attribute filtering.

When set, only mutations to the listed attribute names are observed. Unlisted attributes never fire the JS callback, eliminating CPU overhead from high-frequency style animations (carousels, sliders, animated badges).

```js
record({
  emit(event) { /* ... */ },
  attributeFilter: ['class', 'value', 'checked', 'selected', 'disabled'],
  // 'style' attribute mutations are never observed — zero CPU cost
});
```

When omitted, all attributes are observed (existing default behavior).
