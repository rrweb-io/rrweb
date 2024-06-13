# rrweb Documentation Style Guide

These are the guidelines for writing rrweb documentation.

## Headings

- Each page must have a single `#`-level title at the top.
- Chapters in the same page must have `##`-level headings.
- Sub-chapters need to increase the number of `#` in the heading according to
  their nesting depth.
- The page's title must follow [APA title case][title-case].
- All chapters must follow [APA sentence case][sentence-case].

Using `Quick Start` as example:

```markdown
# Quick Start

...

## Replay

...

## Record

...

## Events

...

### Understanding Events

...

### Custom Events

...
```

For API references, there are exceptions to this rule.

## Markdown rules

This repository uses the [`markdownlint`][markdownlint] package to enforce consistent
Markdown styling. For the exact rules, see the `.markdownlint.yaml` file in the root
folder.

There are a few style guidelines that aren't covered by the linter rules:

<!--TODO(erickzhao): make sure this matches with the lint:markdownlint task-->

- Use `sh` instead of `cmd` in code blocks (due to the syntax highlighter).
- Keep line lengths between 80 and 100 characters if possible for readability
  purposes.
- No nesting lists more than 2 levels (due to the markdown renderer).
- All `js` and `javascript` code blocks are linted with
  [standard-markdown](https://www.npmjs.com/package/standard-markdown).
- For unordered lists, use asterisks instead of dashes.

## Picking words

- Use "will" over "would" when describing outcomes.
- Don't use words such as "just" or "simply". If it needs to be explained then it is not self evident.

## Documentation translations

When adding something to an English doc file, please add a translation if possible, or a placeholder in the respective \*.zh-CN.md files.

[title-case]: https://apastyle.apa.org/style-grammar-guidelines/capitalization/title-case
[sentence-case]: https://apastyle.apa.org/style-grammar-guidelines/capitalization/sentence-case
[markdownlint]: https://github.com/DavidAnson/markdownlint
