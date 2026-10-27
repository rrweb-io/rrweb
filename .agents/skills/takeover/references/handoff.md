# Takeover handoff checklist

Retain the ledger and raw evidence outside the source tree unless the user requests
tracked documentation. Do not put credentials, private transcripts or bearer links
in a public handoff. No external message is sent by this checklist.

Record:

- Original goal, source task/PR, later corrections, and explicit current scope.
- Source repository/head and target repository/branch/SHA, when observed, and whether
  remote freshness was verified. Use the actual target branch, not an assumed main.
- Candidate head and an unchanged final diff after verification.
- Each intended behavior's stable ID, public surfaces, disposition, source/test anchors,
  original contributor and any remaining work. Keep supersession decisions explicit.
- Tests and independent review actually observed, their candidate head, result, and
  limitations. Record an exemption with a concrete reason where a check is inapplicable.
- Preserved authorship/co-author credit and the mapping from inherited to new commits.
- Whether the result is local-only, published, or blocked. Publication is not merging.

The optional pure helper `scripts/handoff.mjs` classifies a normalized ledger with
`assessHandoff(report)`. Run its tests with
`node --test .agents/skills/takeover/tests/*.test.mjs` from the repository root.
It does not read GitHub, execute tests, authenticate evidence, or confer authority.
The agent must inspect raw source and command output before supplying assertions.

The report has nonempty `goal`, `sourceHead`, `targetHead`, `candidateHead`, boolean
`remoteFresh`, `sourceRechecked`, and `creditPreserved`, plus `items` and `checks`.
Every item has a stable `id`, `disposition`, nonempty `evidence`, and the `targetHead`
it was assessed against. Permitted dispositions are `absorbed`, `superseded`,
`implemented`, `missing`, or `uncertain`. Use `implemented` only for remaining work
completed on `candidateHead`; retain its prior `missing` disposition in the raw ledger.
At least one check must pass on the final candidate; inapplicable checks alone
cannot establish completion. Offline work with unverified remote freshness remains
blocked even if local checks pass. Every check has a nonempty `command`, `head`, `result` as `passed`, `failed`, `blocked`,
or `not-applicable`, and nonempty `evidence`. A not-applicable check needs `reason`.

The helper returns `local-complete` only when every behavior is accounted for and
observed candidate verification is satisfactory. Missing work, uncertain absorption,
stale source/target evidence, unpreserved credit or failing checks returns `blocked`.
Its `externalActionsAuthorized: false` is constant, regardless of input. Even a
local-complete result grants no push, reply, publication or merge authority. This is
an evidence consistency check, not a semantic proof that the work is correct.
