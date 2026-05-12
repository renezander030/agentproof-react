import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyzeFiles, collectFiles } from '../src/scanner.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(root, 'bin/agentproof-react.js');

const badFiles = await collectFiles([path.join(root, 'examples/bad')], { changed: false });
const badFindings = await analyzeFiles(badFiles);
assert.equal(badFiles.length, 1);
assert.ok(badFindings.some((finding) => finding.ruleId === 'react/no-index-key'));
assert.ok(badFindings.some((finding) => finding.ruleId === 'next/no-server-import-in-client-component'));
assert.ok(badFindings.some((finding) => finding.ruleId === 'security/dangerous-html'));
assert.equal(badFindings.filter((finding) => finding.ruleId === 'agent/placeholder-logic').length, 1);

const goodFiles = await collectFiles([path.join(root, 'examples/good')], { changed: false });
const goodFindings = await analyzeFiles(goodFiles);
assert.equal(goodFiles.length, 1);
assert.equal(goodFindings.length, 0);

await assert.rejects(
  collectFiles([path.join(root, 'examples/missing')], { changed: false }),
  /Target not found/
);

const badJson = spawnSync(process.execPath, [bin, 'check', 'examples/bad', '--json'], {
  cwd: root,
  encoding: 'utf8'
});
assert.equal(badJson.status, 1);
const badReport = JSON.parse(badJson.stdout);
assert.equal(badReport.verdict, 'blocked');
assert.equal(badReport.errors, 6);
assert.equal(badReport.warnings, 4);

const goodJson = spawnSync(process.execPath, [bin, 'check', 'examples/good', '--json'], {
  cwd: root,
  encoding: 'utf8'
});
assert.equal(goodJson.status, 0);
assert.equal(JSON.parse(goodJson.stdout).verdict, 'passed');

const unknownOption = spawnSync(process.execPath, [bin, 'check', '--definitely-not-real'], {
  cwd: root,
  encoding: 'utf8'
});
assert.equal(unknownOption.status, 2);
assert.match(unknownOption.stderr, /Unknown option: --definitely-not-real/);

const missingTarget = spawnSync(process.execPath, [bin, 'check', 'examples/missing'], {
  cwd: root,
  encoding: 'utf8'
});
assert.equal(missingTarget.status, 2);
assert.match(missingTarget.stderr, /Target not found: examples\/missing/);

console.log('All tests passed.');
