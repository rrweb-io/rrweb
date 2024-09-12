import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import exampleEvents from './events/example';

describe('should be able to run cli', () => {
  beforeAll(() => {
    fs.mkdirSync(path.resolve(__dirname, './generated'));
    fs.writeJsonSync(
      path.resolve(__dirname, './generated/example.json'),
      exampleEvents,
      {
        spaces: 2,
      },
    );
  });
  afterAll(async () => {
    await fs.remove(path.resolve(__dirname, './generated'));
  });

  it('should throw error without input path', () => {
    expect(() => {
      execSync('node ./build/cli.js', { stdio: 'pipe' });
    }).toThrowError(/.*please pass --input to your rrweb events file.*/);
  });

  it('should generate a video without output path', () => {
    execSync('node ./build/cli.js --input ./test/generated/example.json', {
      stdio: 'pipe',
    });
    const outputFile = path.resolve(__dirname, '../rrvideo-output.webm');
    expect(fs.existsSync(outputFile)).toBe(true);
    fs.removeSync(outputFile);
  });

  it('should generate a video with specific output path', () => {
    const outputFile = path.resolve(__dirname, './generated/output.webm');
    execSync(
      `node ./build/cli.js --input ./test/generated/example.json --output ${outputFile}`,
      { stdio: 'pipe' },
    );
    expect(fs.existsSync(outputFile)).toBe(true);
    fs.removeSync(outputFile);
  });
});
