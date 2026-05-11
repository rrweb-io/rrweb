import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const version = process.argv[2];
const channel = process.argv[3];

if (!version) {
  console.error('Usage: node scripts/publish-packages.mjs <version> <channel>');
  process.exit(1);
}

function run(cmd, args, opts) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (result.status !== 0) {
    console.error(`Command failed: ${cmd} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

// Build all packages first
console.log('Building all packages...');
run('yarn', ['build:all'], { cwd: repoRoot });

async function discoverPackageDirs() {
  const rootPkg = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8'));
  const workspaceGlobs = rootPkg.workspaces ?? [];

  const pkgDirs = [];
  for (const glob of workspaceGlobs) {
    const parts = glob.split('/');
    let base = repoRoot;
    for (let i = 0; i < parts.length - 1; i++) {
      base = join(base, parts[i]);
    }
    const lastSegment = parts[parts.length - 1];
    if (lastSegment === '*') {
      let entries;
      try {
        entries = await readdir(base, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'node_modules') {
          pkgDirs.push(join(base, entry.name));
        }
      }
    } else {
      pkgDirs.push(join(base, lastSegment));
    }
  }
  return pkgDirs;
}

const pkgDirs = await discoverPackageDirs();

for (const pkgDir of pkgDirs) {
  const pkgPath = join(pkgDir, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  } catch {
    continue;
  }

  if (pkg.private === true) {
    console.log(`Skipping private package: ${pkg.name ?? pkgDir}`);
    continue;
  }

  const args = ['publish', '--provenance', '--access', 'public'];
  if (channel && channel !== 'latest' && channel !== 'null' && channel !== 'undefined') {
    args.push('--tag', channel);
  }

  console.log(`Publishing ${pkg.name}@${version}...`);
  run('npm', args, { cwd: pkgDir });
  console.log(`Published ${pkg.name}@${version}`);
}
