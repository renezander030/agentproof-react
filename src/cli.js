import path from 'node:path';
import { collectFiles, analyzeFiles, TargetNotFoundError } from './scanner.js';

class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}

export async function runCli(argv) {
  const [, , command = 'check', ...args] = argv;
  if (command === '--help' || command === '-h' || command === 'help') return printHelp();
  if (command !== 'check') {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(2);
  }

  let options;
  let files;
  try {
    options = parseArgs(args);
    files = await readFiles(options);
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(error.message);
      printHelp();
      process.exit(2);
    }
    throw error;
  }
  const findings = await analyzeFiles(files);
  const errors = findings.filter((finding) => finding.severity === 'error');
  const warnings = findings.filter((finding) => finding.severity === 'warning');

  if (options.json) {
    console.log(JSON.stringify({ verdict: errors.length ? 'blocked' : 'passed', filesChecked: files.length, errors: errors.length, warnings: warnings.length, findings }, null, 2));
  } else {
    printReport({ files, findings, errors, warnings });
  }

  if (errors.length > 0 || (options.strict && warnings.length > 0)) process.exit(1);
}

function parseArgs(args) {
  const options = { targets: [], json: false, strict: false, changed: true };
  for (const arg of args) {
    if (arg === '--json') options.json = true;
    else if (arg === '--strict') options.strict = true;
    else if (arg === '--all') options.changed = false;
    else if (arg.startsWith('--')) throw new UsageError(`Unknown option: ${arg}`);
    else options.targets.push(arg);
  }
  return options;
}

async function readFiles(options) {
  try {
    return await collectFiles(options.targets, { changed: options.changed });
  } catch (error) {
    if (error instanceof TargetNotFoundError) throw new UsageError(error.message);
    throw error;
  }
}

function printReport({ files, findings, errors, warnings }) {
  console.log('\nAgentProof React');
  console.log('Deterministic review gates for AI-generated React.\n');
  console.log(`Checked ${files.length} React/Next.js source file${files.length === 1 ? '' : 's'}.`);

  if (findings.length === 0) {
    console.log('\n✅ No gate failures found.');
    console.log('\nShip verdict: PASS');
    return;
  }

  console.log(`\n${errors.length ? '❌' : '✅'} Errors: ${errors.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);

  for (const finding of findings) {
    const rel = path.relative(process.cwd(), finding.file) || finding.file;
    const marker = finding.severity === 'error' ? '❌' : '⚠️ ';
    console.log(`\n${marker} ${finding.title}`);
    console.log(`   ${rel}:${finding.line}:${finding.column}`);
    console.log(`   Rule: ${finding.ruleId}`);
    if (finding.excerpt) console.log(`   Code: ${finding.excerpt}`);
    console.log(`   Why: ${finding.rationale}`);
    console.log(`   Fix: ${finding.suggestion}`);
  }

  console.log(`\nShip verdict: ${errors.length ? 'BLOCKED' : 'PASS WITH WARNINGS'}`);
  if (errors.length) console.log('Reason: AI-generated code is untrusted until deterministic gates pass.');
}

function printHelp() {
  console.log(`AgentProof React

Usage:
  agentproof-react check [path...] [--all] [--strict] [--json]

Defaults to changed git files when available, otherwise scans the current directory.

Options:
  --all      Scan all source files under the target directory
  --strict   Treat warnings as failures
  --json     Print machine-readable JSON
`);
}
