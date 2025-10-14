import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

export interface Project {
  id: string;
  path: string;
  addedAt: string;
}

export interface GlobalConfig {
  version: string;
  server: {
    port: number;
    host: string;
  };
  projects: Project[];
  preferences: {
    theme: 'dark' | 'light';
    autoStart: boolean;
    notifications: boolean;
  };
  integrations: {
    github?: {
      token?: string;
    };
    gitlab?: {
      token?: string;
    };
    bitbucket?: {
      token?: string;
    };
  };
  serverPid?: number;
}

export class ConfigManager {
  private configPath: string;
  private config: GlobalConfig | null = null;

  constructor() {
    const homeDir = os.homedir();
    const gmpDir = path.join(homeDir, '.gmp');
    
    // Ensure .gmp directory exists
    if (!fs.existsSync(gmpDir)) {
      fs.mkdirSync(gmpDir, { recursive: true });
    }
    
    this.configPath = path.join(gmpDir, 'config.json');
  }

  async getConfig(): Promise<GlobalConfig> {
    if (this.config) {
      return this.config;
    }

    if (fs.existsSync(this.configPath)) {
      const content = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(content);
    } else {
      // Create default config
      this.config = this.getDefaultConfig();
      await this.saveConfig();
    }

    return this.config!;
  }

  async saveConfig(): Promise<void> {
    if (!this.config) return;
    
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  async addProject(project: Omit<Project, 'id'>): Promise<void> {
    const config = await this.getConfig();
    
    // Check if project already exists
    const existingProject = config.projects.find(p => p.path === project.path);
    if (existingProject) {
      throw new Error('Project already tracked');
    }

    const newProject: Project = {
      id: uuidv4(),
      ...project
    };

    config.projects.push(newProject);
    await this.saveConfig();
  }

  async removeProject(projectId: string): Promise<void> {
    const config = await this.getConfig();
    config.projects = config.projects.filter(p => p.id !== projectId);
    await this.saveConfig();
  }

  async getProjects(): Promise<Project[]> {
    const config = await this.getConfig();
    return config.projects;
  }

  async getProjectById(projectId: string): Promise<Project | null> {
    const config = await this.getConfig();
    return config.projects.find(p => p.id === projectId) || null;
  }

  async getProjectByPath(projectPath: string): Promise<Project | null> {
    const config = await this.getConfig();
    return config.projects.find(p => p.path === projectPath) || null;
  }

  async setServerPid(pid: number): Promise<void> {
    const config = await this.getConfig();
    config.serverPid = pid;
    await this.saveConfig();
  }

  async getServerPid(): Promise<number | null> {
    const config = await this.getConfig();
    return config.serverPid || null;
  }

  async clearServerPid(): Promise<void> {
    const config = await this.getConfig();
    delete config.serverPid;
    await this.saveConfig();
  }

  async isServerRunning(): Promise<boolean> {
    const pid = await this.getServerPid();
    if (!pid) return false;

    try {
      // Check if process exists
      process.kill(pid, 0);
      return true;
    } catch (error) {
      // Process doesn't exist, clear the PID
      await this.clearServerPid();
      return false;
    }
  }

  async updatePreferences(preferences: Partial<GlobalConfig['preferences']>): Promise<void> {
    const config = await this.getConfig();
    config.preferences = { ...config.preferences, ...preferences };
    await this.saveConfig();
  }

  async updateIntegrations(integrations: Partial<GlobalConfig['integrations']>): Promise<void> {
    const config = await this.getConfig();
    config.integrations = { ...config.integrations, ...integrations };
    await this.saveConfig();
  }

  private getDefaultConfig(): GlobalConfig {
    return {
      version: '1.0.0',
      server: {
        port: 3737,
        host: 'localhost'
      },
      projects: [],
      preferences: {
        theme: 'dark',
        autoStart: false,
        notifications: true
      },
      integrations: {}
    };
  }
}
