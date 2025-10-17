import { simpleGit, SimpleGit } from 'simple-git';
import { ConfigManager } from '../../lib/config';
import { JsonDbService } from './jsonDbService';
import { ProjectMetrics } from '../types';

export class MetricsService {
  private configManager: ConfigManager;
  private db: JsonDbService;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.db = new JsonDbService();
  }

  async getProjectMetrics(projectId: string): Promise<ProjectMetrics> {
    const config = await this.configManager.getConfig();
    const project = config.projects.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }

    try {
      const git: SimpleGit = simpleGit(project.path);
      
      // Get commit statistics
      const totalCommits = await this.getTotalCommits(git);
      const commitsThisWeek = await this.getCommitsThisWeek(git);
      const activeContributors = await this.getActiveContributors(git);
      
      // Get task metrics (mock data for now)
      const taskMetrics = await this.getTaskMetrics(projectId);
      
      // Get code quality metrics (mock data for now)
      const codeQuality = await this.getCodeQualityMetrics(projectId);

      return {
        totalTasks: taskMetrics.totalTasks,
        completedTasks: taskMetrics.completedTasks,
        inProgressTasks: taskMetrics.inProgressTasks,
        overdueTasks: taskMetrics.overdueTasks,
        totalCommits,
        commitsThisWeek,
        activeContributors,
        codeQuality
      };
    } catch (error) {
      console.error('Error getting project metrics:', error);
      // Return mock data
      return this.getMockMetrics();
    }
  }

  private async getTotalCommits(git: SimpleGit): Promise<number> {
    try {
      const log = await git.log();
      return log.total;
    } catch (error) {
      console.error('Error getting total commits:', error);
      return 0;
    }
  }

  private async getCommitsThisWeek(git: SimpleGit): Promise<number> {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const log = await git.log({
        since: oneWeekAgo.toISOString().split('T')[0] // Use date format instead of ISO string
      });
      
      return log.total;
    } catch (error) {
      console.error('Error getting commits this week:', error);
      return 0;
    }
  }

  private async getActiveContributors(git: SimpleGit): Promise<number> {
    try {
      const log = await git.log();
      const contributors = new Set();
      
      log.all.forEach(commit => {
        contributors.add(commit.author_name);
      });
      
      return contributors.size;
    } catch (error) {
      console.error('Error getting active contributors:', error);
      return 0;
    }
  }

  private async getTaskMetrics(projectId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
  }> {
    const tasks = this.db.getTasks(projectId);
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'done').length;
    const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
    
    const now = new Date();
    const overdueTasks = tasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < now && 
      task.status !== 'done'
    ).length;
    
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks
    };
  }

  private async getCodeQualityMetrics(projectId: string): Promise<{
    testCoverage?: number;
    complexity?: number;
    maintainability?: number;
  }> {
    // Mock data - in a real implementation, this would run code analysis tools
    return {
      testCoverage: 85,
      complexity: 12,
      maintainability: 78
    };
  }

  private getMockMetrics(): ProjectMetrics {
    return {
      totalTasks: 15,
      completedTasks: 10,
      inProgressTasks: 4,
      overdueTasks: 1,
      totalCommits: 45,
      commitsThisWeek: 8,
      activeContributors: 3,
      codeQuality: {
        testCoverage: 82,
        complexity: 15,
        maintainability: 75
      }
    };
  }
}
