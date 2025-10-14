import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../../lib/config';

export async function remove(projectPath?: string): Promise<void> {
  const targetPath = projectPath || process.cwd();
  const spinner = ora(`Removing project from tracking...`).start();
  
  try {
    const configManager = new ConfigManager();
    const projects = await configManager.getProjects();
    
    // Find the project
    const project = projects.find(p => p.path === targetPath);
    
    if (!project) {
      spinner.fail('Project not found');
      console.error(chalk.red('❌ Error: Project not found in tracked projects.'));
      console.log(chalk.gray('💡 Run "gmp list" to see all tracked projects'));
      return;
    }

    // Remove from global config
    await configManager.removeProject(project.id);
    
    // Remove .gmp directory if it exists
    const gmpDir = path.join(targetPath, '.gmp');
    if (fs.existsSync(gmpDir)) {
      fs.rmSync(gmpDir, { recursive: true, force: true });
    }
    
    spinner.succeed('Project removed successfully!');
    console.log(chalk.green(`✅ Removed: ${targetPath}`));
    console.log(chalk.gray('💡 The project is no longer tracked by Git Manager Pro'));

  } catch (error) {
    spinner.fail('Failed to remove project');
    console.error(chalk.red('❌ Error:'), error);
    process.exit(1);
  }
}
