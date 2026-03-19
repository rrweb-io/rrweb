#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const changesetDir = path.join(rootDir, '.changeset');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getWorkspacePackageNames() {
  const rootPackageJson = readJson(path.join(rootDir, 'package.json'));
  const names = new Set();

  for (const workspacePattern of rootPackageJson.workspaces || []) {
    if (!workspacePattern.endsWith('/*')) continue;

    const workspaceDir = path.join(
      rootDir,
      workspacePattern.slice(0, workspacePattern.length - 2),
    );

    if (!fs.existsSync(workspaceDir)) continue;

    for (const entry of fs.readdirSync(workspaceDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const packageJsonPath = path.join(workspaceDir, entry.name, 'package.json');

      if (!fs.existsSync(packageJsonPath)) continue;

      names.add(readJson(packageJsonPath).name);
    }
  }

  return names;
}

function parseChangesetPackages(contents) {
  const match = contents.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return [];

  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const packageMatch = line.match(
        /^["']?([^"']+)["']?\s*:\s*(major|minor|patch)\s*$/,
      );

      return packageMatch?.[1];
    })
    .filter(Boolean);
}

function validateChangesetMarkdownFiles(workspacePackageNames) {
  const errors = [];

  for (const fileName of fs.readdirSync(changesetDir)) {
    if (!fileName.endsWith('.md')) continue;

    const filePath = path.join(changesetDir, fileName);
    const packages = parseChangesetPackages(fs.readFileSync(filePath, 'utf8'));

    for (const packageName of packages) {
      if (workspacePackageNames.has(packageName)) continue;

      errors.push(
        `${path.relative(rootDir, filePath)} references unknown package "${packageName}"`,
      );
    }
  }

  return errors;
}

function validatePackageList(
  sourceName,
  packageNames,
  workspacePackageNames,
  errors,
) {
  for (const packageName of packageNames) {
    if (workspacePackageNames.has(packageName)) continue;

    errors.push(`${sourceName} references unknown package "${packageName}"`);
  }
}

function validateChangesetConfig(workspacePackageNames) {
  const errors = [];
  const configPath = path.join(changesetDir, 'config.json');
  const config = readJson(configPath);

  for (const [index, fixedGroup] of (config.fixed || []).entries()) {
    validatePackageList(
      `${path.relative(rootDir, configPath)} fixed[${index}]`,
      fixedGroup,
      workspacePackageNames,
      errors,
    );
  }

  validatePackageList(
    `${path.relative(rootDir, configPath)} ignore`,
    config.ignore || [],
    workspacePackageNames,
    errors,
  );

  return errors;
}

function validatePrereleaseState(workspacePackageNames) {
  const prePath = path.join(changesetDir, 'pre.json');

  if (!fs.existsSync(prePath)) return [];

  const pre = readJson(prePath);
  const errors = [];

  validatePackageList(
    `${path.relative(rootDir, prePath)} initialVersions`,
    Object.keys(pre.initialVersions || {}),
    workspacePackageNames,
    errors,
  );

  return errors;
}

const workspacePackageNames = getWorkspacePackageNames();
const errors = [
  ...validateChangesetMarkdownFiles(workspacePackageNames),
  ...validateChangesetConfig(workspacePackageNames),
  ...validatePrereleaseState(workspacePackageNames),
];

if (errors.length > 0) {
  console.error('Changeset validation failed:\n');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Validated changesets against ${workspacePackageNames.size} workspace packages.`,
);
