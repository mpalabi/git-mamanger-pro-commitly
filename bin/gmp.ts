#!/usr/bin/env node

import { program } from 'commander';
import { init } from '../cli/commands/init';
import { start } from '../cli/commands/start';
import { stop } from '../cli/commands/stop';
import { list } from '../cli/commands/list';
import { remove } from '../cli/commands/remove';
import { status } from '../cli/commands/status';
import { open } from '../cli/commands/open';
import { auditLogs } from '../cli/commands/audit-logs';
import { updateSelf } from '../cli/commands/update';
import { checkForUpdates } from '../lib/updateCheck';

program
  .name('gmp')
  .description('Git Manager Pro - Visual git management dashboard')
  .version('1.0.0');

// Core commands
program
  .command('init')
  .description('Initialize Git Manager Pro in the current repository')
  .action(init);

program
  .command('start')
  .description('Start the Git Manager Pro dashboard server')
  .option('-p, --port <port>', 'Port to run the server on', '3737')
  .option('-h, --host <host>', 'Host to bind the server to', 'localhost')
  .action(start);

program
  .command('stop')
  .description('Stop the Git Manager Pro dashboard server')
  .action(stop);

program
  .command('status')
  .description('Show Git Manager Pro service status')
  .action(status);

program
  .command('list')
  .description('List all tracked projects')
  .action(list);

program
  .command('remove')
  .description('Remove current or specified project from tracking')
  .argument('[path]', 'Path to project to remove (defaults to current directory)')
  .action(remove);

program
  .command('open')
  .description('Open the dashboard in your default browser')
  .action(async () => { await open(); await checkForUpdates(); });

program
  .command('audit-logs')
  .description('Scan for console.log statements and optionally comment or remove them')
  .argument('[path]', 'Directory to scan (defaults to current directory)')
  .option('-a, --action <action>', 'Action to take: comment | remove | list', 'list')
  .option('--yes', 'Skip prompt and proceed with provided action', false)
  .option('--dry-run', 'Preview changes without writing to files', false)
  .option('--extensions <exts>', 'Comma-separated extensions to scan', 'js,jsx,ts,tsx')
  .action(async (pathArg: string | undefined, opts: any) => {
    await auditLogs({
      path: pathArg,
      action: opts.action,
      yes: !!opts.yes,
      dryRun: !!opts.dryRun,
      extensions: opts.extensions
    });
    await checkForUpdates();
  });

program
  .command('update')
  .description('Update git-manager-pro to the latest version')
  .action(updateSelf);

// Wrap core commands to show update notice after execution
program.commands.forEach((cmd) => {
  const name = cmd.name();
  if (['init','start','stop','status','list','remove'].includes(name)) {
    const original = (cmd as any)._actionHandler;
    if (original) {
      cmd.action(async (...args: any[]) => {
        await original(...args);
        await checkForUpdates();
      });
    }
  }
});

program.parse();
