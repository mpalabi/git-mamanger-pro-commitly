import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { v4 as uuidv4 } from 'uuid';
import { ConfigManager } from '../../lib/config';
import { GitService } from '../../server/services/gitService';

interface InitOptions {
  name?: string;
  gitProvider?: 'github' | 'gitlab' | 'bitbucket' | 'other';
  remoteUrl?: string;
}

export async function init(options: InitOptions = {}): Promise<void> {
  const spinner = ora('Initializing Git Manager Pro...').start();
  
  try {
    // Check if we're in a git repository
    if (!fs.existsSync('.git')) {
      spinner.fail('Not in a git repository');
      console.error(chalk.red('❌ Error: Please run this command from a git repository root.'));
      process.exit(1);
    }

    // Check if already initialized
    if (fs.existsSync('.gmp')) {
      spinner.fail('Project already initialized');
      console.error(chalk.yellow('⚠️  This project is already managed by Git Manager Pro.'));
      process.exit(1);
    }

    // Create .gmp directory
    fs.mkdirSync('.gmp');
    spinner.text = 'Creating project configuration...';

    // Get git information
    const gitService = new GitService(process.cwd());
    const currentBranch = await gitService.getCurrentBranch();
    const remoteUrl = await gitService.getRemoteUrl();

    // Generate project ID
    const projectId = uuidv4();

    // Create project config
    const projectConfig = {
      projectId,
      name: options.name || path.basename(process.cwd()),
      gitProvider: options.gitProvider || detectGitProvider(remoteUrl || ''),
      remoteUrl: options.remoteUrl || remoteUrl,
      initialized: new Date().toISOString(),
      preferences: {
        defaultBranch: currentBranch,
        autoFetch: true
      }
    };

    // Write project config
    fs.writeFileSync(
      path.join('.gmp', 'config.json'),
      JSON.stringify(projectConfig, null, 2)
    );

    // Update .gitignore
    updateGitignore();

    // Add to global config
    const configManager = new ConfigManager();
    await configManager.addProject({
      path: process.cwd(),
      addedAt: new Date().toISOString()
    });

    spinner.succeed('Project initialized successfully!');
    
    console.log(chalk.green('\n🎉 Git Manager Pro initialized!'));
    console.log(chalk.blue(`📁 Project: ${projectConfig.name}`));
    console.log(chalk.blue(`🌿 Branch: ${currentBranch}`));
    console.log(chalk.blue(`🔗 Remote: ${remoteUrl || 'None'}`));
    console.log(chalk.gray('\n💡 Run "gmp start" to launch the dashboard'));

  } catch (error) {
    spinner.fail('Initialization failed');
    console.error(chalk.red('❌ Error:'), error);
    process.exit(1);
  }
}

function detectGitProvider(remoteUrl: string): 'github' | 'gitlab' | 'bitbucket' | 'other' {
  if (!remoteUrl) return 'other';
  
  if (remoteUrl.includes('github.com')) return 'github';
  if (remoteUrl.includes('gitlab.com')) return 'gitlab';
  if (remoteUrl.includes('bitbucket.org')) return 'bitbucket';
  
  return 'other';
}

function updateGitignore(): void {
  const gitignorePath = '.gitignore';
  const gmpIgnore = '\n# Git Manager Pro\n.gmp/\n';
  
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    if (!content.includes('.gmp/')) {
      fs.appendFileSync(gitignorePath, gmpIgnore);
    }
  } else {
    fs.writeFileSync(gitignorePath, gmpIgnore);
  }
}
