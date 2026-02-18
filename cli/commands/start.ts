import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../../lib/config';
import fs from 'fs';

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

    // Ensure server build exists and is up to date in dev mode.
    // In published installs, source TS files are not present, so we must
    // run directly from dist and never require a local TypeScript toolchain.
    const distServerPath = path.join(__dirname, '../../server/index.js');
    const srcServerPath = path.join(__dirname, '../../../server/index.ts');
    const sourceExists = fs.existsSync(srcServerPath);
    const distExists = fs.existsSync(distServerPath);
    let needsBuild = sourceExists && !distExists;

    if (sourceExists && distExists) {
      const distStat = fs.statSync(distServerPath);
      const srcStat = fs.statSync(srcServerPath);
      if (srcStat.mtimeMs > distStat.mtimeMs) {
        needsBuild = true;
      }
    }

    if (!distExists && !sourceExists) {
      throw new Error('Server build not found. Please reinstall git-manager-pro.');
    }

    if (needsBuild) {
      spinner.text = 'Building server...';
      await new Promise<void>((resolve, reject) => {
        const build = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build:server'], {
          stdio: 'inherit',
          env: process.env,
          cwd: path.join(__dirname, '../../..'),
        });
        build.on('exit', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`build:server exited with code ${code}`));
        });
        build.on('error', reject);
      });
    }

    // Start the server
    const serverPath = distServerPath;
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
