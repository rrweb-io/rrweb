import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const newVersion = process.argv[2];
if (!newVersion) {
  console.error('Usage: node scripts/sync-versions.mjs <version>');
  process.exit(1);
}

const AMPLITUDE_PKG_RE = /^@amplitude\/(rrweb|rrdom|rrvideo)/;

async function discoverPackageDirs() {
  const rootPkg = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8'));
  const workspaceGlobs = rootPkg.workspaces ?? [];

  const pkgDirs = [];
  for (const glob of workspaceGlobs) {
    // Support patterns like "packages/*" and "packages/plugins/*"
    const parts = glob.split('/');
    // Walk down all literal segments, then list the final wildcard segment
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

async function syncPackage(pkgDir) {
  const pkgPath = join(pkgDir, 'package.json');
  let contents;
  try {
    contents = await readFile(pkgPath, 'utf8');
  } catch {
    // No package.json here, skip
    return;
  }

  const pkg = JSON.parse(contents);
  pkg.version = newVersion;

  for (const depField of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (!pkg[depField]) continue;
    for (const [dep, _ver] of Object.entries(pkg[depField])) {
      if (AMPLITUDE_PKG_RE.test(dep)) {
        pkg[depField][dep] = newVersion;
      }
    }
  }

  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`synced ${pkg.name ?? pkgDir} → ${newVersion}`);
}

const pkgDirs = await discoverPackageDirs();
for (const dir of pkgDirs) {
  await syncPackage(dir);
}
