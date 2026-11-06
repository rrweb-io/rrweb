const { spawnSync } = require('node:child_process');
const mri = require('mri');
const { getSince, syncChangesets } = require('./sync-rrweb-changesets.cjs');

const args = process.argv.slice(2);
// Match the CLI's argument parsing so flags may precede a subcommand.
const parsed = mri(args, {
  boolean: ['sinceMaster', 'verbose', 'empty', 'open', 'gitTag', 'snapshot'],
  string: [
    'output',
    'otp',
    'since',
    'ignore',
    'message',
    'tag',
    'snapshot',
    'snapshotPrereleaseTemplate',
  ],
  alias: {
    v: 'verbose',
    o: 'output',
    m: 'message',
    'since-master': 'sinceMaster',
    'git-tag': 'gitTag',
    'snapshot-prerelease-template': 'snapshotPrereleaseTemplate',
  },
});
const createsChangeset =
  (parsed._.length === 0 || parsed._[0] === 'add') &&
  !parsed.empty &&
  !parsed.help &&
  !parsed.version &&
  !parsed.h;
let since;
try {
  if (createsChangeset) since = getSince(args);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  [require.resolve('@changesets/cli/bin.js'), ...args],
  {
    stdio: 'inherit',
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

// Leave publish/version/status and intentionally empty changesets to the CLI.
if (result.status === 0 && createsChangeset) {
  try {
    const updated = syncChangesets({ since });
    if (updated.length)
      console.log(`Added rrweb wrapper releases to:\n${updated.join('\n')}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
