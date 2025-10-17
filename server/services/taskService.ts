import { v4 as uuidv4 } from 'uuid';
import { ConfigManager } from '../../lib/config';
import { JsonDbService, Task, TaskCommit } from './jsonDbService';

export class TaskService {
  private configManager: ConfigManager;
  private db: JsonDbService;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.db = new JsonDbService();
  }

  async getTasks(projectId: string): Promise<Task[]> {
    const config = await this.configManager.getConfig();
    const project = config.projects.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }

    const tasks = this.db.getTasks(projectId);
    
    // If no tasks exist, create some sample tasks
    if (tasks.length === 0) {
      const sampleTasks = this.createSampleTasks(projectId);
      return sampleTasks;
    }
    
    return tasks;
  }

  private createSampleTasks(projectId: string): Task[] {
    const task1 = this.db.createTask(projectId, {
      title: 'Implement user authentication',
      description: '<p>Add JWT-based authentication system with login/logout functionality.</p><ul><li>Create login form</li><li>Implement JWT tokens</li><li>Add protected routes</li></ul>',
      status: 'in-progress',
      priority: 'high',
      assignee: 'Developer',
      tags: ['auth', 'security', 'frontend'],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    const task2 = this.db.createTask(projectId, {
      title: 'Fix responsive design issues',
      description: '<p>Address mobile responsiveness problems in the dashboard.</p>',
      status: 'todo',
      priority: 'medium',
      tags: ['ui', 'responsive', 'mobile']
    });

    const task3 = this.db.createTask(projectId, {
      title: 'Add unit tests',
      description: '<p>Implement comprehensive unit tests for core functionality.</p>',
      status: 'done',
      priority: 'medium',
      tags: ['testing', 'quality']
    });

    return [task1, task2, task3];
  }

  async getTask(projectId: string, taskId: string): Promise<Task> {
    const task = this.db.getTask(projectId, taskId);
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    return task;
  }

  async createTask(projectId: string, taskData: Partial<Task>): Promise<Task> {
    const config = await this.configManager.getConfig();
    const project = config.projects.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }

    return this.db.createTask(projectId, taskData);
  }

  async updateTask(projectId: string, taskId: string, updates: Partial<Task>): Promise<Task> {
    const updatedTask = this.db.updateTask(projectId, taskId, updates);
    
    if (!updatedTask) {
      throw new Error('Task not found');
    }
    
    return updatedTask;
  }

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    const deleted = this.db.deleteTask(projectId, taskId);
    
    if (!deleted) {
      throw new Error('Task not found');
    }
  }

  async linkCommitToTask(projectId: string, taskId: string, commitHash: string): Promise<Task> {
    const task = await this.getTask(projectId, taskId);
    
    // Check if commit is already linked
    const existingCommit = task.commits.find((c: TaskCommit) => c.commitHash === commitHash);
    if (existingCommit) {
      return task;
    }

    // Create new commit link
    const newCommit: TaskCommit = {
      id: uuidv4(),
      commitHash,
      message: `Commit ${commitHash.substring(0, 7)}`,
      author: 'Developer',
      date: new Date().toISOString(),
      files: [],
      addedAt: new Date().toISOString()
    };

    const updatedTask = this.db.updateTask(projectId, taskId, {
      commits: [...task.commits, newCommit]
    });

    return updatedTask!;
  }

  async unlinkCommitFromTask(projectId: string, taskId: string, commitHash: string): Promise<Task> {
    const task = await this.getTask(projectId, taskId);
    
    const updatedTask = this.db.updateTask(projectId, taskId, {
      commits: task.commits.filter((c: TaskCommit) => c.commitHash !== commitHash)
    });

    return updatedTask!;
  }
}
