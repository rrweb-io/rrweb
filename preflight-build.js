const fs = require("fs");

const dirs = ["packages/rrweb", "packages/record", "packages/rrweb-snapshot"];

const foldersToDelete = ["dist"];
const filesToDelete = ["tsconfig.tsbuildinfo"];

for (const dir of dirs) {
  const folderFiles = fs.readdirSync(`./${dir}`);

  for(const folder of foldersToDelete) {
    if(!folderFiles.includes(folder)) continue;
    fs.rmSync(`./${dir}/${folder}`, { recursive: true, force: true });
  }

  for(const file of filesToDelete) {
    if(!folderFiles.includes(file)) continue;
    fs.rmSync(`./${dir}/${file}`);
  }
}