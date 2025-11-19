const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Helper to find all package.json files in workspaces
function findAllPackageJsons(startDir) {
  let results = [];
  if (!fs.existsSync(startDir)) return results;

  const list = fs.readdirSync(startDir);
  list.forEach((file) => {
    const filePath = path.join(startDir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file === 'node_modules' || file === '.git') return;

      const packageJsonPath = path.join(filePath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        results.push(packageJsonPath);
      }
      results = results.concat(findAllPackageJsons(filePath));
    }
  });
  return results;
}

const allPackageJsons = findAllPackageJsons(path.join(rootDir, 'packages'));

console.log(`Found ${allPackageJsons.length} packages.`);

allPackageJsons.forEach((pkgPath) => {
  try {
    const pkgContent = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgContent);

    if (pkg.name && !pkg.name.startsWith('@rrwebcloud')) {
      if (pkg.private) {
        console.log(`Skipping ${pkg.name} (already private)`);
        return;
      }
      console.log(`Marking ${pkg.name} as private`);
      pkg.private = true;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    } else {
      console.log(`Keeping ${pkg.name} public (matches prefix or no name)`);
    }
  } catch (e) {
    console.error(`Error processing ${pkgPath}:`, e);
  }
});
