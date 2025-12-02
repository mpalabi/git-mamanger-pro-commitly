import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface JsonDbSchema {
  schemaVersion: number;
  tasks: { [projectId: string]: Task[] };
  milestones: { [projectId: string]: ProjectMilestone[] };
  settings: { [projectId: string]: ProjectSettings };
  lastUpdated: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  projectId: string;
  commits: TaskCommit[];
  subtasks: Subtask[];
  attachments: TaskAttachment[];
  issues?: TaskIssue[];
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  commits?: TaskCommit[]; // Optional for backward compatibility
}

export interface TaskCommit {
  id: string;
  commitHash: string;
  message: string;
  author: string;
  date: string;
  files: string[];
  addedAt: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: 'file' | 'image' | 'link';
  url: string;
  size?: number;
  uploadedAt: string;
}

export interface TaskIssue {
  id: string;
  title: string;
  description: string;
  type: 'bug' | 'feature' | 'improvement' | 'task';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'upcoming' | 'in-progress' | 'completed' | 'overdue';
  tasks: string[];
  createdAt: string;
}

export interface ProjectSettings {
  id: string;
  name: string;
  description: string;
  defaultBranch: string;
  autoSync: boolean;
  syncInterval: number;
  notifications: {
    email: boolean;
    desktop: boolean;
    webhook?: string;
  };
  integrations: {
    github?: {
      enabled: boolean;
      token?: string;
      webhookSecret?: string;
    };
    slack?: {
      enabled: boolean;
      webhook?: string;
    };
  };
}

export class JsonDbService {
  private dbPath: string;
  private data: JsonDbSchema;

  constructor() {
    this.dbPath = this.resolveDbPath();
    this.ensureDataDirectory();
    this.data = this.loadData();
  }

  private resolveDbPath(): string {
    // Prefer explicit env, then stable path near compiled server, then CWD fallback
    const envPath = process.env.GMP_DB_PATH;
    if (envPath && envPath.trim()) return path.resolve(envPath);
    const candidates = [
      path.resolve(__dirname, '../../data/git-manager-pro.json'),
      path.resolve(__dirname, '../../../data/git-manager-pro.json'),
      path.join(process.cwd(), 'data', 'git-manager-pro.json'),
    ];
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) return p;
      } catch {}
    }
    return candidates[0];
  }

  private ensureDataDirectory(): void {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  private loadData(): JsonDbSchema {
    try {
      if (fs.existsSync(this.dbPath)) {
        const fileContent = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        return this.migrateData(parsed);
      }
    } catch (error) {
      console.error('Error loading JSON database:', error);
      // If file exists but failed to parse, keep it safe
      try {
        if (fs.existsSync(this.dbPath)) {
          const corrupt = this.dbPath.replace(/\.json$/, `-corrupt-${Date.now()}.json`);
          fs.renameSync(this.dbPath, corrupt);
          console.warn(`Renamed corrupt DB to ${corrupt}`);
        }
      } catch {}
    }

    // Return default empty schema
    return {
      schemaVersion: 2,
      tasks: {},
      milestones: {},
      settings: {},
      lastUpdated: new Date().toISOString()
    };
  }

  private saveData(): void {
    try {
      this.data.lastUpdated = new Date().toISOString();
      // Create a timestamped backup (best-effort)
      this.rotateBackups();
      const tmp = `${this.dbPath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
      fs.renameSync(tmp, this.dbPath);
    } catch (error) {
      console.error('Error saving JSON database:', error);
      throw new Error('Failed to save data');
    }
  }

  private rotateBackups(maxBackups: number = 10): void {
    try {
      const dir = path.dirname(this.dbPath);
      const backup = path.join(dir, `backup-${Date.now()}.json`);
      fs.writeFileSync(backup, JSON.stringify(this.data, null, 2));
      const backups = fs.readdirSync(dir)
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .sort((a, b) => parseInt(b.slice(7)) - parseInt(a.slice(7)));
      const toDelete = backups.slice(maxBackups);
      for (const f of toDelete) {
        try { fs.unlinkSync(path.join(dir, f)); } catch {}
      }
    } catch {
      // ignore backup rotation errors
    }
  }

  private migrateData(input: any): JsonDbSchema {
    const data: JsonDbSchema = {
      schemaVersion: typeof input?.schemaVersion === 'number' ? input.schemaVersion : 1,
      tasks: input?.tasks || {},
      milestones: input?.milestones || {},
      settings: input?.settings || {},
      lastUpdated: input?.lastUpdated || new Date().toISOString(),
    };
    // Normalize tasks shape and fill new fields
    for (const projectId of Object.keys(data.tasks)) {
      const list = Array.isArray(data.tasks[projectId]) ? data.tasks[projectId] : [];
      data.tasks[projectId] = list.map((t: any) => {
        const task: Task = {
          id: t.id,
          title: t.title || 'Untitled',
          description: t.description || '',
          status: t.status || 'todo',
          priority: t.priority || 'medium',
          assignee: t.assignee,
          tags: Array.isArray(t.tags) ? t.tags : [],
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString(),
          dueDate: t.dueDate,
          projectId: t.projectId || projectId,
          commits: Array.isArray(t.commits) ? t.commits : [],
          subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
          attachments: Array.isArray(t.attachments) ? t.attachments : [],
          issues: Array.isArray(t.issues) ? t.issues : [],
        };
        task.subtasks = task.subtasks.map((s: any) => ({
          id: s.id,
          title: s.title || 'Untitled',
          completed: !!s.completed,
          createdAt: s.createdAt || new Date().toISOString(),
          commits: Array.isArray(s.commits) ? s.commits : [],
        }));
        return task;
      });
    }
    if (data.schemaVersion < 2) data.schemaVersion = 2;
    return data;
  }

  // Task operations
  getTasks(projectId: string): Task[] {
    return this.data.tasks[projectId] || [];
  }

  getTask(projectId: string, taskId: string): Task | null {
    const tasks = this.getTasks(projectId);
    return tasks.find(task => task.id === taskId) || null;
  }

  createTask(projectId: string, taskData: Partial<Task>): Task {
    const newTask: Task = {
      id: uuidv4(),
      title: taskData.title || 'New Task',
      description: taskData.description || '',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      assignee: taskData.assignee,
      tags: taskData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: taskData.dueDate,
      projectId,
      commits: [],
      subtasks: [],
      attachments: [],
      issues: []
    };

    if (!this.data.tasks[projectId]) {
      this.data.tasks[projectId] = [];
    }
    this.data.tasks[projectId].push(newTask);
    this.saveData();
    return newTask;
  }

  updateTask(projectId: string, taskId: string, updates: Partial<Task>): Task | null {
    const tasks = this.getTasks(projectId);
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      return null;
    }

    const updatedTask: Task = {
      ...tasks[taskIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.data.tasks[projectId][taskIndex] = updatedTask;
    this.saveData();
    return updatedTask;
  }

  deleteTask(projectId: string, taskId: string): boolean {
    const tasks = this.getTasks(projectId);
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      return false;
    }

    this.data.tasks[projectId].splice(taskIndex, 1);
    this.saveData();
    return true;
  }

  // Milestone operations
  getMilestones(projectId: string): ProjectMilestone[] {
    return this.data.milestones[projectId] || [];
  }

  getMilestone(projectId: string, milestoneId: string): ProjectMilestone | null {
    const milestones = this.getMilestones(projectId);
    return milestones.find(milestone => milestone.id === milestoneId) || null;
  }

  createMilestone(projectId: string, milestoneData: Partial<ProjectMilestone>): ProjectMilestone {
    const newMilestone: ProjectMilestone = {
      id: uuidv4(),
      title: milestoneData.title || 'New Milestone',
      description: milestoneData.description || '',
      dueDate: milestoneData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: milestoneData.status || 'upcoming',
      tasks: milestoneData.tasks || [],
      createdAt: new Date().toISOString()
    };

    if (!this.data.milestones[projectId]) {
      this.data.milestones[projectId] = [];
    }
    this.data.milestones[projectId].push(newMilestone);
    this.saveData();
    return newMilestone;
  }

  updateMilestone(projectId: string, milestoneId: string, updates: Partial<ProjectMilestone>): ProjectMilestone | null {
    const milestones = this.getMilestones(projectId);
    const milestoneIndex = milestones.findIndex(milestone => milestone.id === milestoneId);
    
    if (milestoneIndex === -1) {
      return null;
    }

    const updatedMilestone: ProjectMilestone = {
      ...milestones[milestoneIndex],
      ...updates
    };

    this.data.milestones[projectId][milestoneIndex] = updatedMilestone;
    this.saveData();
    return updatedMilestone;
  }

  deleteMilestone(projectId: string, milestoneId: string): boolean {
    const milestones = this.getMilestones(projectId);
    const milestoneIndex = milestones.findIndex(milestone => milestone.id === milestoneId);
    
    if (milestoneIndex === -1) {
      return false;
    }

    this.data.milestones[projectId].splice(milestoneIndex, 1);
    this.saveData();
    return true;
  }

  // Settings operations
  getSettings(projectId: string): ProjectSettings | null {
    return this.data.settings[projectId] || null;
  }

  updateSettings(projectId: string, settings: Partial<ProjectSettings>): ProjectSettings {
    const existingSettings = this.getSettings(projectId);
    
    const updatedSettings: ProjectSettings = {
      id: projectId,
      name: settings.name || existingSettings?.name || 'Project',
      description: settings.description || existingSettings?.description || '',
      defaultBranch: settings.defaultBranch || existingSettings?.defaultBranch || 'main',
      autoSync: settings.autoSync !== undefined ? settings.autoSync : (existingSettings?.autoSync ?? true),
      syncInterval: settings.syncInterval || existingSettings?.syncInterval || 5,
      notifications: {
        email: settings.notifications?.email ?? existingSettings?.notifications?.email ?? false,
        desktop: settings.notifications?.desktop ?? existingSettings?.notifications?.desktop ?? true,
        webhook: settings.notifications?.webhook || existingSettings?.notifications?.webhook
      },
      integrations: {
        github: {
          enabled: settings.integrations?.github?.enabled ?? existingSettings?.integrations?.github?.enabled ?? false,
          token: settings.integrations?.github?.token || existingSettings?.integrations?.github?.token,
          webhookSecret: settings.integrations?.github?.webhookSecret || existingSettings?.integrations?.github?.webhookSecret
        },
        slack: {
          enabled: settings.integrations?.slack?.enabled ?? existingSettings?.integrations?.slack?.enabled ?? false,
          webhook: settings.integrations?.slack?.webhook || existingSettings?.integrations?.slack?.webhook
        }
      }
    };

    this.data.settings[projectId] = updatedSettings;
    this.saveData();
    return updatedSettings;
  }

  // Utility methods
  getDatabaseStats(): { totalTasks: number; totalMilestones: number; totalProjects: number } {
    const totalTasks = Object.values(this.data.tasks).reduce((sum, tasks) => sum + tasks.length, 0);
    const totalMilestones = Object.values(this.data.milestones).reduce((sum, milestones) => sum + milestones.length, 0);
    const totalProjects = Object.keys(this.data.tasks).length;

    return { totalTasks, totalMilestones, totalProjects };
  }

  backup(): string {
    const backupPath = path.join(path.dirname(this.dbPath), `backup-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(this.data, null, 2));
    return backupPath;
  }
}
