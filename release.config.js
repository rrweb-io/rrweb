module.exports = {
  branches: [
    'master',
    { name: 'alpha', prerelease: true },
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
    ['@semantic-release/exec', {
      prepareCmd: 'node scripts/sync-versions.mjs ${nextRelease.version}',
      publishCmd: 'node scripts/publish-packages.mjs ${nextRelease.version} ${nextRelease.channel}',
    }],
    ['@semantic-release/git', {
      assets: ['CHANGELOG.md', 'package.json', 'packages/**/package.json'],
      message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
    }],
    '@semantic-release/github',
  ],
};
