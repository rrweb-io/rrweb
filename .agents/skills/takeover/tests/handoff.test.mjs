import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assessHandoff } from '../scripts/handoff.mjs';
const fixture = () => ({
  goal: 'Preserve replay behavior',
  sourceHead: 'source',
  targetHead: 'target',
  candidateHead: 'candidate',
  remoteFresh: true,
  sourceRechecked: true,
  creditPreserved: true,
  items: [
    {
      id: 'R1',
      disposition: 'absorbed',
      evidence: 'target source and test',
      targetHead: 'target',
    },
  ],
  checks: [
    {
      command: 'focused test',
      result: 'passed',
      head: 'candidate',
      evidence: 'observed output',
    },
  ],
});
test('complete local evidence never authorizes external actions', () => {
  const r = fixture();
  r.externalActionsAuthorized = true;
  assert.deepEqual(assessHandoff(r), {
    state: 'local-complete',
    blockers: [],
    externalActionsAuthorized: false,
  });
});
test('partial absorption cannot hide missing behavior', () => {
  const r = fixture();
  r.items.push({
    id: 'R2',
    disposition: 'missing',
    targetHead: 'target',
    evidence: 'caller still absent',
  });
  assert.equal(assessHandoff(r).state, 'blocked');
});
test('implemented remainder needs the final candidate', () => {
  const r = fixture();
  r.items[0].disposition = 'implemented';
  assert.equal(assessHandoff(r).state, 'blocked');
  r.items[0].candidateHead = 'candidate';
  assert.equal(assessHandoff(r).state, 'local-complete');
});
for (const key of ['remoteFresh', 'sourceRechecked', 'creditPreserved'])
  test(`requires ${key}`, () => {
    assert.equal(
      assessHandoff({ ...fixture(), [key]: false }).state,
      'blocked',
    );
  });
for (const result of ['failed', 'blocked', 'unknown'])
  test(`rejects ${result} verification`, () => {
    const r = fixture();
    r.checks[0].result = result;
    assert.equal(assessHandoff(r).state, 'blocked');
  });
test('rejects stale target and prior-author test reports', () => {
  const r = fixture();
  r.items[0].targetHead = 'old';
  r.checks[0].head = 'source';
  assert.ok(
    assessHandoff(r).blockers.includes(
      'Stale or missing absorption evidence: R1.',
    ),
  );
  assert.ok(
    assessHandoff(r).blockers.includes(
      'Stale or missing verification evidence.',
    ),
  );
});
test('rejects uncertain and duplicate behavior IDs', () => {
  const r = fixture();
  r.items.push({ ...r.items[0], disposition: 'uncertain' });
  assert.equal(assessHandoff(r).state, 'blocked');
  r.items[1].id = 'R2';
  assert.equal(assessHandoff(r).state, 'blocked');
});
test('requires a reason for an inapplicable check', () => {
  const r = fixture();
  r.checks[0].result = 'not-applicable';
  assert.equal(assessHandoff(r).state, 'blocked');
  r.checks[0].reason = 'Skill-only change, no browser behavior';
  assert.equal(assessHandoff(r).state, 'blocked');
  r.checks.push(fixture().checks[0]);
  assert.equal(assessHandoff(r).state, 'local-complete');
});
test('missing report and empty evidence fail closed', () => {
  for (const r of [
    null,
    {},
    { ...fixture(), items: [] },
    { ...fixture(), checks: [] },
  ])
    assert.equal(assessHandoff(r).state, 'blocked');
});

test('duplicate otherwise satisfied IDs block completion', () => {
  const r = fixture();
  r.items.push({ ...r.items[0] });
  assert.ok(
    assessHandoff(r).blockers.includes('Missing or duplicate behavior ID.'),
  );
});
test('superseded behavior with evidence is accounted for', () => {
  const r = fixture();
  r.items[0].disposition = 'superseded';
  assert.equal(assessHandoff(r).state, 'local-complete');
});
