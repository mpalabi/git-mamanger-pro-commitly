import { spawn } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

export async function updateSelf(): Promise<void> {
  const spinner = ora('Updating git-manager-pro to latest...').start();
  try {
    await new Promise<void>((resolve, reject) => {
      const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const child = spawn(cmd, ['i', '-g', 'git-manager-pro@latest'], {
        stdio: 'inherit',
        env: process.env
      });
      child.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`npm exited with code ${code}`));
      });
      child.on('error', reject);
    });
    spinner.succeed('Updated successfully!');
    console.log(chalk.green('✨ git-manager-pro is now up to date.'));
  } catch (e: any) {
    spinner.fail('Update failed');
    console.error(chalk.red('❌ Error:'), e?.message || e);
    process.exit(1);
  }
}


