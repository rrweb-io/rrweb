import fs from 'fs';
import { pruneBranches } from '../src';

const myArgs = process.argv.slice(2);
if (myArgs.length < 3) {
  console.log('Usage: yarn prune-events <input> <output> <id> (<id> ...)');
  process.exit(1);
}

const [input, output, ...ids] = myArgs;
const events = JSON.parse(fs.readFileSync(input, 'utf8'));
const result = pruneBranches(events, { keep: ids.map((id) => parseInt(id)) });
fs.writeFileSync(output, JSON.stringify(result));
