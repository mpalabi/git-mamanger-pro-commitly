import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

interface AuditLogsOptions {
  path?: string;
  action?: 'comment' | 'remove' | 'list';
  yes?: boolean;
  dryRun?: boolean;
  extensions?: string; // comma-separated, default: js,jsx,ts,tsx
}

type FoundOccurrence = {
  filePath: string;
  line: number;
  preview: string;
};

const DEFAULT_EXTS = ['.js', '.jsx', '.ts', '.tsx'];
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.next', 'out', 'coverage', '.turbo', '.cache']);

function shouldIgnoreDir(dirName: string): boolean {
  return IGNORED_DIRS.has(dirName);
}

function collectFiles(rootDir: string, allowedExts: Set<string>): string[] {
  const results: string[] = [];
  const stack: string[] = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop() as string;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!shouldIgnoreDir(entry.name)) {
          stack.push(fullPath);
        }
      } else {
        const ext = path.extname(entry.name);
        if (allowedExts.has(ext)) {
          results.push(fullPath);
        }
      }
    }
  }

  return results;
}

function findConsoleLogsInFile(filePath: string): FoundOccurrence[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const occurrences: FoundOccurrence[] = [];
  const lines = content.split(/\r?\n/);
  const pattern = /\bconsole\.log\s*\(/;

  lines.forEach((line, idx) => {
    if (pattern.test(line) && !/^\s*\/\//.test(line)) {
      occurrences.push({
        filePath,
        line: idx + 1,
        preview: line.trim().slice(0, 200),
      });
    }
  });

  return occurrences;
}

function commentOutConsoleLogs(content: string): { updated: string; changes: number } {
  const lines = content.split(/\r?\n/);
  const pattern = /\bconsole\.log\s*\(/;
  let changes = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (pattern.test(line) && !/^\s*\/\//.test(line)) {
      lines[i] = line.replace(/^(\s*)/, '$1// ');
      changes++;
    }
  }
  return { updated: lines.join('\n'), changes };
}

function removeConsoleLogs(content: string): { updated: string; changes: number } {
  // Conservative multi-line removal; matches until first ");"
  const removePattern = /\bconsole\.log\s*\([\s\S]*?\);\s*/g;
  let changes = 0;
  const updated = content.replace(removePattern, (match) => {
    changes++;
    return '';
  });
  return { updated, changes };
}

export async function auditLogs(options: AuditLogsOptions = {}): Promise<void> {
  const root = path.resolve(options.path || process.cwd());
  const exts = (options.extensions || 'js,jsx,ts,tsx')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
    .map(e => (e.startsWith('.') ? e : `.${e}`));
  const allowedExts = new Set(exts.length ? exts : DEFAULT_EXTS);

  const spinner = ora(`Scanning ${chalk.cyan(root)} for console.log...`).start();
  try {
    const files = collectFiles(root, allowedExts);
    let allOccurrences: FoundOccurrence[] = [];
    for (const f of files) {
      allOccurrences = allOccurrences.concat(findConsoleLogsInFile(f));
    }
    spinner.stop();

    if (allOccurrences.length === 0) {
      console.log(chalk.green('✅ No console.log statements found.'));
      return;
    }

    // Group by file
    const byFile = new Map<string, FoundOccurrence[]>();
    for (const occ of allOccurrences) {
      if (!byFile.has(occ.filePath)) byFile.set(occ.filePath, []);
      byFile.get(occ.filePath)!.push(occ);
    }

    console.log(chalk.yellow(`\nFound ${allOccurrences.length} console.log statement(s) across ${byFile.size} file(s):\n`));
    for (const [file, occs] of byFile.entries()) {
      console.log(chalk.bold(file));
      occs.slice(0, 5).forEach(o => {
        console.log(`  ${chalk.gray(`${o.line}:`)} ${o.preview}`);
      });
      if (occs.length > 5) {
        console.log(`  ${chalk.gray(`...and ${occs.length - 5} more`)}`);
      }
      console.log();
    }

    let action = options.action;
    if (!action && !options.yes) {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do with console.log statements?',
          choices: [
            { name: 'Comment them out', value: 'comment' },
            { name: 'Remove them', value: 'remove' },
            { name: 'List only (no changes)', value: 'list' },
            { name: 'Abort', value: 'abort' },
          ],
          default: 'list',
        },
        {
          type: 'confirm',
          name: 'dryRun',
          message: 'Do a dry run first (show changes but do not write)?',
          default: true,
          when: (ans) => ans.action !== 'list' && ans.action !== 'abort' && options.dryRun === undefined,
        },
      ]);
      action = answers.action;
      if (options.dryRun === undefined) {
        options.dryRun = answers.dryRun;
      }
    }

    if (!action || action === 'list') {
      console.log(chalk.blue('\nℹ️ Listing only. No changes were made.\n'));
      return;
    }
    if (action === 'abort') {
      console.log(chalk.gray('\nAborted. No changes were made.\n'));
      return;
    }

    const writeSpinner = ora(`${options.dryRun ? 'Dry run' : 'Applying changes'}...`).start();
    let totalChanges = 0;
    let modifiedFiles = 0;
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      let result: { updated: string; changes: number };
      if (action === 'comment') {
        result = commentOutConsoleLogs(content);
      } else {
        result = removeConsoleLogs(content);
      }
      if (result.changes > 0) {
        modifiedFiles++;
        totalChanges += result.changes;
        if (!options.dryRun) {
          fs.writeFileSync(file, result.updated, 'utf8');
        }
      }
    }
    writeSpinner.stop();

    if (options.dryRun) {
      console.log(chalk.yellow(`\n🧪 Dry run: ${totalChanges} change(s) across ${modifiedFiles} file(s) would be applied.`));
      console.log(chalk.gray('Run again without dry run to write changes.\n'));
    } else {
      console.log(chalk.green(`\n✅ Applied ${totalChanges} change(s) across ${modifiedFiles} file(s).\n`));
    }
  } catch (err) {
    spinner.fail('Failed to audit logs');
    console.error(chalk.red('Error:'), err);
    process.exit(1);
  }
}


