import assert from 'node:assert/strict';
import { readFile, realpath, access } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const canonical = resolve(root, '.agents/skills/takeover/SKILL.md');
test('runtime entry points resolve one implementation', async () => {
  assert.equal(
    await realpath(resolve(root, '.codex/skills/takeover/SKILL.md')),
    canonical,
  );
  const adapter = await readFile(
    resolve(root, '.claude/skills/takeover/SKILL.md'),
    'utf8',
  );
  assert.match(adapter, /disable-model-invocation: true/);
  assert.match(
    adapter,
    /\.\.\/\.\.\/\.\.\/\.agents\/skills\/takeover\/SKILL.md/,
  );
  const adapterPath = resolve(root, '.claude/skills/takeover/SKILL.md');
  for (const [, target] of adapter.matchAll(/\]\(([^)]+)\)/g)) {
    assert.equal(
      await realpath(resolve(dirname(adapterPath), target)),
      canonical,
    );
  }
});
test('local dependencies exist without backend or vendor skills installed', async () => {
  const body = await readFile(canonical, 'utf8');
  for (const [, target] of body.matchAll(/\]\(([^)]+)\)/g)) {
    if (!target.startsWith('https://'))
      await access(resolve(dirname(canonical), target));
  }
  assert.doesNotMatch(
    body,
    /\/Users\/|repos\/backend|Use `modernize`|use `file-pr`/,
  );
});
test('scope and partial absorption protections are discoverable', async () => {
  const body = await readFile(canonical, 'utf8');
  for (const phrase of [
    'Activation alone',
    'force-push',
    'merge queue',
    'Never delegate an unauthorized action',
    '#1975/#1971',
    'later corrections',
    'original commit',
    'source head before handoff',
    "Prior authors' test reports",
  ])
    assert.ok(body.includes(phrase), phrase);
});
