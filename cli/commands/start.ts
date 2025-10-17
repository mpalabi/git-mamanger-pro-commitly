import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../../lib/config';

interface StartOptions {
  port?: string;
  host?: string;
}

export async function start(options: StartOptions): Promise<void> {
  const spinner = ora('Starting Git Manager Pro...').start();
  
  try {
    const port = options.port || '3737';
    const host = options.host || 'localhost';
    
    // Check if server is already running
    const configManager = new ConfigManager();
    const isRunning = await configManager.isServerRunning();
    
    if (isRunning) {
      spinner.fail('Server already running');
      console.log(chalk.yellow('⚠️  Git Manager Pro is already running.'));
      console.log(chalk.blue('💡 Run "gmp open" to open the dashboard'));
      return;
    }

    // Start the server
    const serverPath = path.join(__dirname, '../../server/index.js');
    const server: ChildProcess = spawn('node', [serverPath], {
      stdio: 'inherit',
      env: { 
        ...process.env, 
        PORT: port,
        HOST: host
      }
    });

    // Save server PID
    await configManager.setServerPid(server.pid || 0);
    
    server.on('error', (err: Error) => {
      spinner.fail('Failed to start server');
      console.error(chalk.red('❌ Error:'), err.message);
      process.exit(1);
    });

    server.on('close', (code: number | null) => {
      console.log(chalk.gray(`\nServer process exited with code ${code}`));
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n🛑 Shutting down Git Manager Pro...'));
      server.kill('SIGINT');
      configManager.clearServerPid();
      process.exit(0);
    });

    spinner.succeed('Git Manager Pro started!');
    console.log(chalk.green(`🌐 Dashboard: http://${host}:${port}`));
    console.log(chalk.blue('💡 Press Ctrl+C to stop the server'));

  } catch (error) {
    spinner.fail('Failed to start server');
    console.error(chalk.red('❌ Error:'), error);
    process.exit(1);
  }
}
