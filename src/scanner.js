import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { rules } from './rules.js';

const execFileAsync = promisify(execFile);
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);

export class TargetNotFoundError extends Error {
  constructor(target) {
    super(`Target not found: ${target}`);
    this.name = 'TargetNotFoundError';
  }
}

export async function collectFiles(targets, options = {}) {
  const explicit = targets.filter(Boolean);
  if (explicit.length > 0) {
    const files = [];
    for (const target of explicit) files.push(...await walk(target, { explicit: true }));
    return unique(files);
  }

  if (options.changed) {
    const changed = await gitChangedFiles();
    if (changed.length > 0) return changed.filter(isSourceFile);
  }

  return walk(process.cwd());
}

export async function analyzeFiles(files) {
  const findings = [];
  for (const file of files) {
    const source = await fs.readFile(file, 'utf8');
    for (const rule of rules) {
      const matches = rule.detector ? rule.detector(source, file) : patternMatches(rule.pattern, source);
      for (const match of matches) {
        const location = locate(source, match.index || 0);
        findings.push({
          ruleId: rule.id,
          title: rule.title,
          severity: rule.severity,
          rationale: rule.rationale,
          suggestion: rule.suggestion,
          file,
          line: location.line,
          column: location.column,
          excerpt: compact(match.text || source.slice(match.index || 0, (match.index || 0) + 120))
        });
      }
    }
  }
  return findings;
}

function patternMatches(pattern, source) {
  const matches = [];
  if (!pattern) return matches;
  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(source))) matches.push({ index: match.index, text: match[0] });
  return matches;
}

async function walk(target, options = {}) {
  const absolute = path.resolve(target);
  const stat = await fs.stat(absolute).catch(() => null);
  if (!stat) {
    if (options.explicit) throw new TargetNotFoundError(target);
    return [];
  }
  if (stat.isFile()) return isSourceFile(absolute) ? [absolute] : [];
  if (!stat.isDirectory()) return [];

  const entries = await fs.readdir(absolute, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
    files.push(...await walk(path.join(absolute, entry.name)));
  }
  return files;
}

function isSourceFile(file) {
  return EXTENSIONS.has(path.extname(file));
}

async function gitChangedFiles() {
  try {
    await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: process.cwd() });
    const [staged, unstaged, untracked] = await Promise.all([
      gitLines(['diff', '--name-only', '--cached']),
      gitLines(['diff', '--name-only']),
      gitLines(['ls-files', '--others', '--exclude-standard'])
    ]);
    const changed = unique([...staged, ...unstaged, ...untracked]).map((file) => path.resolve(file));
    return existingFiles(changed);
  } catch {
    return [];
  }
}

async function gitLines(args) {
  const { stdout } = await execFileAsync('git', args, { cwd: process.cwd() }).catch(() => ({ stdout: '' }));
  return stdout.split('\n').filter(Boolean);
}

async function existingFiles(files) {
  const existing = [];
  for (const file of files) {
    if (await fs.stat(file).then((stat) => stat.isFile(), () => false)) existing.push(file);
  }
  return existing;
}

function locate(source, index) {
  const lines = source.slice(0, index).split('\n');
  return { line: lines.length, column: lines.at(-1).length + 1 };
}

function compact(value) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 160);
}

function unique(values) {
  return [...new Set(values)];
}
