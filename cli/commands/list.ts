import chalk from 'chalk';
import { ConfigManager } from '../../lib/config';

export async function list(): Promise<void> {
  try {
    const configManager = new ConfigManager();
    const projects = await configManager.getProjects();
    
    if (projects.length === 0) {
      console.log(chalk.yellow('No projects tracked yet.'));
      console.log(chalk.gray('💡 Run "gmp init" in a git repository to get started'));
      return;
    }
    
    console.log(chalk.blue.bold('Tracked Projects'));
    console.log(chalk.gray('─'.repeat(50)));
    
    projects.forEach((project, index) => {
      console.log(chalk.white(`${index + 1}. ${project.path}`));
      console.log(chalk.gray(`   Added: ${new Date(project.addedAt).toLocaleDateString()}`));
      console.log('');
    });
    
    console.log(chalk.gray(`Total: ${projects.length} project${projects.length === 1 ? '' : 's'}`));

  } catch (error) {
    console.error(chalk.red('❌ Error:'), error);
    process.exit(1);
  }
}
