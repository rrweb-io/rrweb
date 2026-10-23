const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const parse = require('@changesets/parse').default;

function updateChangeset(source, changedFiles) {
  const { releases } = parse(source);
  const rrweb = releases.find((release) => release.name === 'rrweb');
  if (!rrweb || rrweb.type === 'none') return source;

  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const additions = ['record', 'replay']
    .filter(
      (name) =>
        changedFiles.some((file) =>
          file.startsWith(`packages/rrweb/src/${name}/`),
        ) && !releases.some((release) => release.name === `@rrweb/${name}`),
    )
    .map((name) => ({ name: `@rrweb/${name}`, type: rrweb.type }));
  if (!additions.length) return source;

  const header = [...releases, ...additions]
    .map(({ name, type }) => `${JSON.stringify(name)}: ${type}`)
    .join(newline);

  // Use the same delimiter boundaries accepted by @changesets/parse.
  return source.replace(
    /(\s*---[ \t]*)[\s\S]*?(\r?\n\s*---\s*(?:\n|$)[\s\S]*)/,
    (_, opening, rest) => `${opening}${newline}${header}${rest}`,
  );
}

function syncChangesets({ cwd = process.cwd(), since, check = false } = {}) {
  const git = (...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8' }).trimEnd();
  const config = JSON.parse(
    fs.readFileSync(path.join(cwd, '.changeset/config.json'), 'utf8'),
  );
  const remoteRef = `refs/remotes/origin/${config.baseBranch}`;
  const ref =
    since ||
    (git('for-each-ref', '--format=%(refname)', remoteRef)
      .split('\n')
      .includes(remoteRef)
      ? remoteRef
      : config.baseBranch);
  const base = git('merge-base', ref, 'HEAD');
  // Disabling rename detection includes source paths moved out of record/replay.
  const changedFiles = [
    ...git('diff', '--name-only', '--no-renames', '-z', base, '--').split('\0'),
    ...git(
      'diff',
      '--cached',
      '--name-only',
      '--no-renames',
      '-z',
      base,
      '--',
    ).split('\0'),
    ...git('ls-files', '--others', '--exclude-standard', '-z').split('\0'),
  ];
  const updated = [];
  for (const file of new Set(changedFiles)) {
    if (
      !/^\.changeset\/[^/]+\.md$/.test(file) ||
      file === '.changeset/README.md'
    )
      continue;
    const filename = path.join(cwd, file);
    if (!fs.existsSync(filename)) continue;
    const source = fs.readFileSync(filename, 'utf8');
    let result;
    try {
      result = updateChangeset(source, changedFiles);
    } catch (error) {
      throw new Error(`${file}: ${error.message}`);
    }
    if (result === source) continue;
    updated.push({ file, filename, result });
  }
  if (!check) {
    for (const { filename, result } of updated)
      fs.writeFileSync(filename, result);
  }
  return updated.map(({ file }) => file);
}

function getSince(args) {
  const index = args.indexOf('--since');
  const inline = args.find((arg) => arg.startsWith('--since='));
  if (index === -1 && inline === undefined) return undefined;
  const value =
    index === -1 ? inline.slice('--since='.length) : args[index + 1];
  if (!value?.trim() || value.startsWith('-')) {
    throw new Error('--since requires a non-empty Git ref');
  }
  return value;
}

if (require.main === module) {
  try {
    const check = process.argv.includes('--check');
    const updated = syncChangesets({
      since: getSince(process.argv.slice(2)),
      check,
    });
    if (check && updated.length) {
      console.error(
        `Run yarn changeset:sync to add missing rrweb wrapper releases:\n${updated.join(
          '\n',
        )}`,
      );
      process.exitCode = 1;
    } else if (updated.length) {
      console.log(`Added rrweb wrapper releases to:\n${updated.join('\n')}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { getSince, syncChangesets, updateChangeset };
