# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Cursor, Gemini CLI, …)
working in this repository. Human contributors should also read
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Comments

Prefer low-to-zero comments; invest in clear naming instead. This applies to
`//`, `/* */`, docstrings, and JSDoc. This is a dense codebase and code
additions and edits add an extra comprehension and maintenance burden that is
counterproductive and liable to go out of date.

Existing comments reflect an understanding of the overall state, mechanisms
and goals of the project, and you don't have that full context when narrowly
addressing a bug or new feature.

Put what you would have written in a comment/explanation on the **test case**
that you are adding to cover the same section of code. This has longer
durability than the codebase which may be refactored so long as the test case
still holds. Comments and explanations record a point in time and are better
suited to the **commit message**, especially the motivations for the change i.e.
the non-obvious _why_.

Keep a comment when you are editing one that already exists, move it with the
code it is attached to when you are refactoring. When you edit code with an
associated comment, edit it only to keep it true against the new reality,
or when a maintainer explicitly asks for one. When editing a file that is
already heavily commented, match its existing density rather than stripping
comments out.

## Before starting work on a new PR

Search for an existing pull request _before_ you start — someone may already be
proposing the same fix or feature, and checking first avoids duplicated work.

- Check open PRs: `gh pr list --search "<keywords>"`, or search
  <https://github.com/rrweb-io/rrweb/pulls>.
- Also scan recently closed and merged PRs for the same change.

If an open PR already covers it, review or build on that one (and reference it)
rather than opening a duplicate. If a closed PR covers it, read why it was
closed before re-proposing.
