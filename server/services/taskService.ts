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

    return this.db.getTasks(projectId);
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

  async linkCommitToSubtask(projectId: string, taskId: string, subtaskId: string, commitHash: string): Promise<Task> {
    const task = await this.getTask(projectId, taskId);
    const subtaskIndex = task.subtasks.findIndex(s => s.id === subtaskId);
    if (subtaskIndex === -1) {
      throw new Error('Subtask not found');
    }

    const subtask = task.subtasks[subtaskIndex];
    const existing = (subtask.commits || []).find((c: TaskCommit) => c.commitHash === commitHash);
    if (existing) {
      return task;
    }

    const newCommit: TaskCommit = {
      id: uuidv4(),
      commitHash,
      message: `Commit ${commitHash.substring(0, 7)}`,
      author: 'Developer',
      date: new Date().toISOString(),
      files: [],
      addedAt: new Date().toISOString()
    };

    const updatedSubtasks = [...task.subtasks];
    const currentCommits = subtask.commits || [];
    updatedSubtasks[subtaskIndex] = {
      ...subtask,
      commits: [...currentCommits, newCommit]
    };

    const updatedTask = this.db.updateTask(projectId, taskId, {
      subtasks: updatedSubtasks
    });
    return updatedTask!;
  }

  async unlinkCommitFromSubtask(projectId: string, taskId: string, subtaskId: string, commitHash: string): Promise<Task> {
    const task = await this.getTask(projectId, taskId);
    const subtaskIndex = task.subtasks.findIndex(s => s.id === subtaskId);
    if (subtaskIndex === -1) {
      throw new Error('Subtask not found');
    }
    const subtask = task.subtasks[subtaskIndex];
    const updatedSubtasks = [...task.subtasks];
    updatedSubtasks[subtaskIndex] = {
      ...subtask,
      commits: (subtask.commits || []).filter((c: TaskCommit) => c.commitHash !== commitHash)
    };
    const updatedTask = this.db.updateTask(projectId, taskId, {
      subtasks: updatedSubtasks
    });
    return updatedTask!;
  }
}
