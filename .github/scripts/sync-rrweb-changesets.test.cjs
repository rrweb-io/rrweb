const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const parse = require('@changesets/parse').default;
const { updateChangeset } = require('./sync-rrweb-changesets.cjs');

const script = path.join(__dirname, 'sync-rrweb-changesets.cjs');
const source = '---\n"rrweb": minor\n---\n\nKeep this summary.\n';

// Isolate Git configuration in fixture setup and every spawned CLI process.
process.env.GIT_CONFIG_GLOBAL = os.devNull;
process.env.GIT_CONFIG_NOSYSTEM = '1';

test('adds only the wrappers whose source changed, using the rrweb bump', () => {
  assert.equal(
    updateChangeset(source, ['packages/rrweb/src/record/index.ts']),
    '---\n"rrweb": minor\n"@rrweb/record": minor\n---\n\nKeep this summary.\n',
  );
  assert.equal(
    updateChangeset(source, ['packages/rrweb/src/replay/index.ts']),
    '---\n"rrweb": minor\n"@rrweb/replay": minor\n---\n\nKeep this summary.\n',
  );
});

test('preserves explicit wrapper bumps and is safe to run again', () => {
  const changeset =
    '---\nrrweb: patch\n"@rrweb/record": major\n---\n\nSummary\n';
  const files = [
    'packages/rrweb/src/record/mutation.ts',
    'packages/rrweb/src/replay/index.ts',
  ];
  const expected =
    '---\n"rrweb": patch\n"@rrweb/record": major\n"@rrweb/replay": patch\n---\n\nSummary\n';
  assert.equal(updateChangeset(changeset, files), expected);
  assert.equal(updateChangeset(expected, files), expected);
});

test('leaves unrelated, empty, and non-releasing changesets alone', () => {
  for (const changeset of [
    '---\n"rrweb-player": minor\n---\n\nSummary\n',
    '---\n---\n',
    '---\nrrweb: none\n---\n\nSummary\n',
  ]) {
    assert.equal(
      updateChangeset(changeset, ['packages/rrweb/src/record/index.ts']),
      changeset,
    );
  }
  assert.equal(
    updateChangeset(source, [
      'packages/rrweb/src/recording/index.ts',
      'packages/rrweb/test/replay/index.test.ts',
      'packages/rrweb/src/types.ts',
    ]),
    source,
  );
});

test('preserves CRLF line endings and summary text', () => {
  const changeset = "---\r\n'rrweb': major\r\n---\r\n\r\nSummary\r\n";
  assert.equal(
    updateChangeset(changeset, ['packages/rrweb/src/replay/index.ts']),
    '---\r\n"rrweb": major\r\n"@rrweb/replay": major\r\n---\r\n\r\nSummary\r\n',
  );
});

test('handles delimiter whitespace without inserting entries into the summary', () => {
  const changeset =
    '---  \nrrweb: patch\n  ---  \n\nSummary\n\n---\nMore text\n';
  assert.equal(
    updateChangeset(changeset, ['packages/rrweb/src/record/index.ts']),
    '---  \n"rrweb": patch\n"@rrweb/record": patch\n  ---  \n\nSummary\n\n---\nMore text\n',
  );
});

test('supports frontmatter with the release on the opening delimiter line', () => {
  assert.equal(
    updateChangeset('---rrweb: patch\n---\n\nSummary\n', [
      'packages/rrweb/src/record/index.ts',
    ]),
    '---\n"rrweb": patch\n"@rrweb/record": patch\n---\n\nSummary\n',
  );
});

test('keeps indented, flow, and explicitly ended YAML mappings valid', () => {
  for (const header of [
    '  rrweb: patch',
    '{rrweb: patch}',
    'rrweb: patch\n...',
  ]) {
    const result = updateChangeset(`---\n${header}\n---\n\nSummary\n`, [
      'packages/rrweb/src/record/index.ts',
    ]);
    assert.deepEqual(parse(result), {
      releases: [
        { name: 'rrweb', type: 'patch' },
        { name: '@rrweb/record', type: 'patch' },
      ],
      summary: 'Summary',
    });
  }
});

function repository(t) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'rrweb-changesets-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
    });
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    fs.writeFileSync(path.join(cwd, file), content);
  };
  git('init', '-b', 'main');
  git('config', 'user.name', 'Changeset test');
  git('config', 'user.email', 'changesets@example.com');
  write('.changeset/config.json', '{"baseBranch":"main"}');
  write('.changeset/existing.md', source);
  write('packages/rrweb/src/record/index.ts', 'old record source');
  write('packages/rrweb/src/replay/index.ts', 'old replay source');
  git('add', '.');
  git('commit', '-qm', 'base');
  git('checkout', '-qb', 'feature');
  return { cwd, git, write };
}

test('checks without writing, then syncs committed and untracked changesets', (t) => {
  const { cwd, git, write } = repository(t);
  write('packages/rrweb/src/record/index.ts', 'new record source');
  write('.changeset/committed.md', source);
  git('add', '.');
  git('commit', '-qm', 'record change');
  write('.changeset/untracked.md', source);

  const check = spawnSync(process.execPath, [script, '--check'], {
    cwd,
    encoding: 'utf8',
  });
  assert.equal(check.status, 1, check.stderr);
  assert.match(check.stderr, /changeset:sync/);
  assert.equal(
    fs.readFileSync(path.join(cwd, '.changeset/committed.md'), 'utf8'),
    source,
  );

  execFileSync(process.execPath, [script], { cwd });
  for (const file of ['committed.md', 'untracked.md']) {
    assert.match(
      fs.readFileSync(path.join(cwd, '.changeset', file), 'utf8'),
      /"@rrweb\/record": minor/,
    );
  }
  assert.equal(
    fs.readFileSync(path.join(cwd, '.changeset/existing.md'), 'utf8'),
    source,
  );
  assert.equal(
    spawnSync(process.execPath, [script, '--check'], { cwd }).status,
    0,
  );
});

test('includes staged deletions, renames, and untracked source against an explicit base', (t) => {
  const { cwd, git, write } = repository(t);
  const base = git('rev-parse', 'HEAD').trim();
  git('mv', 'packages/rrweb/src/record/index.ts', 'packages/rrweb/removed.ts');
  git('rm', '-q', 'packages/rrweb/src/replay/index.ts');
  write('packages/rrweb/src/record/new.ts', 'new file');
  write('.changeset/new.md', source);
  execFileSync(process.execPath, [script, '--since', base], { cwd });
  const updated = fs.readFileSync(path.join(cwd, '.changeset/new.md'), 'utf8');
  assert.match(updated, /"@rrweb\/record": minor/);
  assert.match(updated, /"@rrweb\/replay": minor/);
});

test('keeps status read-only when flags precede the subcommand', (t) => {
  const { cwd, git, write } = repository(t);
  write(
    'package.json',
    JSON.stringify({ private: true, workspaces: ['packages/*'] }),
  );
  write(
    'packages/rrweb/package.json',
    JSON.stringify({ name: 'rrweb', version: '1.0.0' }),
  );
  write('packages/rrweb/src/record/index.ts', 'new record source');
  write('.changeset/new.md', source);
  git('add', '.');
  git('commit', '-qm', 'record change');
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, 'changeset.cjs'), '--since', 'main', 'status'],
    { cwd, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    fs.readFileSync(path.join(cwd, '.changeset/new.md'), 'utf8'),
    source,
  );
});

test('includes staged source edits even when the working tree reverses them', (t) => {
  const { cwd, git, write } = repository(t);
  write('packages/rrweb/src/record/index.ts', 'staged record change');
  write('.changeset/new.md', source);
  git('add', '.');
  write('packages/rrweb/src/record/index.ts', 'old record source');
  execFileSync(process.execPath, [script], { cwd });
  assert.match(
    fs.readFileSync(path.join(cwd, '.changeset/new.md'), 'utf8'),
    /"@rrweb\/record": minor/,
  );
});

test('uses the remote base when local main is stale or missing', (t) => {
  const { cwd, git, write } = repository(t);
  write('packages/rrweb/src/record/index.ts', 'already merged source');
  write('.changeset/merged.md', source);
  git('add', '.');
  git('commit', '-qm', 'already on origin/main');
  git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  execFileSync(process.execPath, [script], { cwd });
  assert.equal(
    fs.readFileSync(path.join(cwd, '.changeset/merged.md'), 'utf8'),
    source,
  );
  git('branch', '-D', 'main');
  assert.equal(
    spawnSync(process.execPath, [script, '--check'], { cwd }).status,
    0,
  );
});

test('rejects missing or empty explicit base refs before changing files', (t) => {
  const { cwd, write } = repository(t);
  write('packages/rrweb/src/record/index.ts', 'new record source');
  write('.changeset/new.md', source);
  for (const args of [['--since'], ['--since='], ['--since', '--check']]) {
    const result = spawnSync(process.execPath, [script, ...args], {
      cwd,
      encoding: 'utf8',
    });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /--since requires/);
    assert.equal(
      fs.readFileSync(path.join(cwd, '.changeset/new.md'), 'utf8'),
      source,
    );
  }
});

test('does not confuse a remote branch namespace with the configured base', (t) => {
  const { cwd, git, write } = repository(t);
  write('packages/rrweb/src/record/index.ts', 'new record source');
  write('.changeset/new.md', source);
  git('add', '.');
  git('commit', '-qm', 'record change');
  git('update-ref', 'refs/remotes/origin/main/topic', 'HEAD');
  const result = spawnSync(process.execPath, [script, '--check'], { cwd });
  assert.equal(result.status, 1);
});

test('reports malformed changesets without partially rewriting valid ones', (t) => {
  const { cwd, write } = repository(t);
  write('packages/rrweb/src/record/index.ts', 'new record source');
  write('.changeset/a-valid.md', source);
  write('.changeset/z-invalid.md', 'not a changeset');
  const result = spawnSync(process.execPath, [script], {
    cwd,
    encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.equal(
    fs.readFileSync(path.join(cwd, '.changeset/a-valid.md'), 'utf8'),
    source,
  );
  assert.match(result.stderr, /\.changeset\/z-invalid\.md/);
});

test('rejects an empty creation baseline before starting interactive prompts', (t) => {
  const { cwd, write } = repository(t);
  write(
    'package.json',
    JSON.stringify({ private: true, workspaces: ['packages/*'] }),
  );
  write(
    'packages/rrweb/package.json',
    JSON.stringify({ name: 'rrweb', version: '1.0.0' }),
  );
  write('packages/rrweb/src/record/index.ts', 'new record source');
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, 'changeset.cjs'), '--since='],
    { cwd, encoding: 'utf8', input: '', timeout: 3000 },
  );
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /--since requires/);
  assert.doesNotMatch(result.stdout, /What kind of change|Which packages/);
});
