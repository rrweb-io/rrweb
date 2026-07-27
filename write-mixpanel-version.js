#!/usr/bin/env node
// working around the changesets setup because we want to be able to build and deploy mixpanel's own version of rrweb
// while keeping the core business logic intact. mixpanel doesn't need the changesets, 
// so we'll just add an extra "mixpanel patch" number to indicate it's different than the rrweb-io version
// e.g.
// 2.0.0-alpha.18.1 means we have changes that are not in rrweb 2.0.0-alpha.18
// 2.0.0-alpha.19 means we are 1:1 with upstream rrweb 2.0.0-alpha.19

const fs = require('fs');
const path = require('path');

function findPackageJsonFiles(dir, results = []) {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory() && item.name !== 'node_modules') {
        findPackageJsonFiles(fullPath, results);
      } else if (item.isFile() && item.name === 'package.json') {
        results.push(fullPath);
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
  
  return results;
}

function bumpVersion(version) {
  const versionNum = version.split('alpha.')[1].split('.');
  if (versionNum.length === 1) {
    return `${version}.1`; // If no mixpanel patch, add .1
  }
  const patchNumber = parseInt(versionNum[1], 10);
  return `2.0.0-alpha.${versionNum[0]}.${patchNumber + 1}`;
}

function processPackageJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const packageJson = JSON.parse(content);
    
    if (packageJson.version) {
      const oldVersion = packageJson.version;
      packageJson.version = bumpVersion(packageJson.version);
      console.log(`${path.relative(process.cwd(), filePath)}: ${oldVersion} → ${packageJson.version}`);
      
      const updatedContent = JSON.stringify(packageJson, null, 2) + '\n';
      fs.writeFileSync(filePath, updatedContent, 'utf8');
    }
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node bump-version.js

Bumps version numbers in all package.json files in the packages directory.
Adds .1 to versions without mixpanel patches, increments existing patches.

Examples:
  2.0.0-alpha.18 → 2.0.0-alpha.18.1
  2.0.0-alpha.18.1 → 2.0.0-alpha.18.2
    `);
    return;
  }
  
  const packagesDir = path.join(__dirname, 'packages');
  
  if (!fs.existsSync(packagesDir)) {
    console.error('Error: packages directory not found');
    return;
  }
  
  const packageJsonFiles = findPackageJsonFiles(packagesDir);
  
  if (packageJsonFiles.length === 0) {
    console.log('No package.json files found');
    return;
  }
  
  console.log(`Bumping versions in ${packageJsonFiles.length} packages:\n`);
  
  packageJsonFiles.forEach(processPackageJson);
  
  console.log('\nDone!');
}

// Run the script
main();
