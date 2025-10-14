import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../../lib/config';

export async function stop(): Promise<void> {
  const spinner = ora('Stopping Git Manager Pro...').start();
  
  try {
    const configManager = new ConfigManager();
    const isRunning = await configManager.isServerRunning();
    
    if (!isRunning) {
      spinner.fail('Server not running');
      console.log(chalk.yellow('⚠️  Git Manager Pro is not currently running.'));
      return;
    }

    const pid = await configManager.getServerPid();
    if (pid) {
      try {
        process.kill(pid, 'SIGTERM');
        await configManager.clearServerPid();
        spinner.succeed('Git Manager Pro stopped!');
      } catch (error) {
        spinner.fail('Failed to stop server');
        console.error(chalk.red('❌ Error:'), 'Could not stop the server process');
        process.exit(1);
      }
    } else {
      spinner.fail('No server PID found');
      console.log(chalk.yellow('⚠️  Server PID not found. The server may have already stopped.'));
    }

  } catch (error) {
    spinner.fail('Failed to stop server');
    console.error(chalk.red('❌ Error:'), error);
    process.exit(1);
  }
}
