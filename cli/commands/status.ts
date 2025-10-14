import chalk from 'chalk';
import { ConfigManager } from '../../lib/config';

export async function status(): Promise<void> {
  try {
    const configManager = new ConfigManager();
    const isRunning = await configManager.isServerRunning();
    const projects = await configManager.getProjects();
    
    console.log(chalk.blue.bold('Git Manager Pro Status'));
    console.log(chalk.gray('─'.repeat(30)));
    
    // Server status
    if (isRunning) {
      console.log(chalk.green('🟢 Server: Running'));
      const pid = await configManager.getServerPid();
      if (pid) {
        console.log(chalk.gray(`   PID: ${pid}`));
      }
    } else {
      console.log(chalk.red('🔴 Server: Stopped'));
    }
    
    // Projects count
    console.log(chalk.blue(`📁 Projects: ${projects.length} tracked`));
    
    if (projects.length > 0) {
      console.log(chalk.gray('\nTracked Projects:'));
      projects.forEach((project, index) => {
        console.log(chalk.gray(`  ${index + 1}. ${project.path}`));
      });
    }
    
    console.log(chalk.gray('\n💡 Run "gmp start" to start the server'));
    console.log(chalk.gray('💡 Run "gmp open" to open the dashboard'));

  } catch (error) {
    console.error(chalk.red('❌ Error:'), error);
    process.exit(1);
  }
}
