import { spawn } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../../lib/config';

export async function open(): Promise<void> {
  const spinner = ora('Opening dashboard...').start();
  
  try {
    const configManager = new ConfigManager();
    const isRunning = await configManager.isServerRunning();
    
    if (!isRunning) {
      spinner.fail('Server not running');
      console.log(chalk.yellow('⚠️  Git Manager Pro server is not running.'));
      console.log(chalk.blue('💡 Run "gmp start" to start the server first'));
      return;
    }

    const config = await configManager.getConfig();
    const url = `http://${config.server.host}:${config.server.port}`;
    
    // Open in default browser
    const platform = process.platform;
    let command: string;
    
    switch (platform) {
      case 'darwin':
        command = 'open';
        break;
      case 'win32':
        command = 'start';
        break;
      default:
        command = 'xdg-open';
    }
    
    spawn(command, [url], { detached: true, stdio: 'ignore' });
    
    spinner.succeed('Dashboard opened!');
    console.log(chalk.green(`🌐 Dashboard: ${url}`));

  } catch (error) {
    spinner.fail('Failed to open dashboard');
    console.error(chalk.red('❌ Error:'), error);
    process.exit(1);
  }
}
