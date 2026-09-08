import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type PackageJson = {
  version: string;
};

function readBrowserClientVersion(): string {
  const packageJson = JSON.parse(
    readFileSync(resolve(__dirname, 'package.json'), 'utf8'),
  ) as PackageJson;
  return packageJson.version;
}

function readGitCommitHash(): string {
  if (process.env.RRWEB_COMMIT_HASH) {
    return process.env.RRWEB_COMMIT_HASH;
  }
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA;
  }
  return execSync('git rev-parse HEAD', {
    cwd: resolve(__dirname, '../..'),
    encoding: 'utf8',
  }).trim();
}

export function browserClientBuildDefines(): Record<string, string> {
  return {
    __RRWEB_BROWSER_CLIENT_VERSION__: JSON.stringify(
      readBrowserClientVersion(),
    ),
    __RRWEB_BROWSER_CLIENT_COMMIT_HASH__: JSON.stringify(readGitCommitHash()),
  };
}
