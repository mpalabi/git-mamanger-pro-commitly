import fs from 'fs';
import path from 'path';
import { ConfigManager, Project } from '../../lib/config';
import { GitService, GitStatus, GitCommit, GitBranch } from './gitService';

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  gitProvider: 'github' | 'gitlab' | 'bitbucket' | 'other';
  remoteUrl: string | null;
  currentBranch: string;
  lastSync: string;
  status: GitStatus;
  metadata: {
    language?: string;
    framework?: string;
    lastCommit?: string;
  };
}

export class ProjectService {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  async getAllProjects(): Promise<ProjectInfo[]> {
    const projects = await this.configManager.getProjects();
    const projectInfos: ProjectInfo[] = [];

    for (const project of projects) {
      try {
        const projectInfo = await this.getProject(project.id);
        if (projectInfo) {
          projectInfos.push(projectInfo);
        }
      } catch (error) {
        console.error(`Error loading project ${project.id}:`, error);
      }
    }

    return projectInfos;
  }

  async getProject(projectId: string): Promise<ProjectInfo | null> {
    const project = await this.configManager.getProjectById(projectId);
    if (!project) {
      return null;
    }

    try {
      const gitService = new GitService(project.path);
      
      // Check if it's still a valid git repository
      if (!(await gitService.isGitRepository())) {
        throw new Error('Not a valid git repository');
      }

      const currentBranch = await gitService.getCurrentBranch();
      const remoteUrl = await gitService.getRemoteUrl();
      const status = await gitService.getStatus();
      const commits = await gitService.getRecentCommits(1);

      // Load project config
      const projectConfig = await this.loadProjectConfig(project.path);

      return {
        id: project.id,
        name: projectConfig?.name || path.basename(project.path),
        path: project.path,
        gitProvider: projectConfig?.gitProvider || 'other',
        remoteUrl,
        currentBranch,
        lastSync: new Date().toISOString(),
        status,
        metadata: {
          language: this.detectLanguage(project.path),
          framework: this.detectFramework(project.path),
          lastCommit: commits[0]?.hash
        }
      };
    } catch (error) {
      console.error(`Error getting project ${projectId}:`, error);
      return null;
    }
  }

  async getProjectStatus(projectId: string): Promise<GitStatus> {
    const project = await this.configManager.getProjectById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const gitService = new GitService(project.path);
    return await gitService.getStatus();
  }

  async getGitStatus(projectId: string): Promise<GitStatus> {
    return await this.getProjectStatus(projectId);
  }

  async getBranches(projectId: string): Promise<GitBranch[]> {
    const project = await this.configManager.getProjectById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const gitService = new GitService(project.path);
    return await gitService.getBranches();
  }

  async getCommits(projectId: string, limit: number = 10): Promise<GitCommit[]> {
    const project = await this.configManager.getProjectById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const gitService = new GitService(project.path);
    return await gitService.getRecentCommits(limit);
  }

  async checkoutBranch(projectId: string, branchName: string): Promise<void> {
    const project = await this.configManager.getProjectById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const gitService = new GitService(project.path);
    await gitService.checkoutBranch(branchName);
  }

  async commit(projectId: string, message: string, files?: string[]): Promise<void> {
    const project = await this.configManager.getProjectById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const gitService = new GitService(project.path);
    await gitService.commit(message, files);
  }

  async pull(projectId: string): Promise<void> {
    const project = await this.configManager.getProjectById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const gitService = new GitService(project.path);
    await gitService.pull();
  }

  async push(projectId: string, branch?: string): Promise<void> {
    const project = await this.configManager.getProjectById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const gitService = new GitService(project.path);
    await gitService.push(branch);
  }

  private async loadProjectConfig(projectPath: string): Promise<any> {
    const configPath = path.join(projectPath, '.gmp', 'config.json');
    
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(content);
    }
    
    return null;
  }

  private detectLanguage(projectPath: string): string | undefined {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const requirementsPath = path.join(projectPath, 'requirements.txt');
    const cargoPath = path.join(projectPath, 'Cargo.toml');
    const goModPath = path.join(projectPath, 'go.mod');

    if (fs.existsSync(packageJsonPath)) return 'javascript';
    if (fs.existsSync(requirementsPath)) return 'python';
    if (fs.existsSync(cargoPath)) return 'rust';
    if (fs.existsSync(goModPath)) return 'go';

    return undefined;
  }

  private detectFramework(projectPath: string): string | undefined {
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const content = fs.readFileSync(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(content);
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

        if (dependencies.react) return 'react';
        if (dependencies.vue) return 'vue';
        if (dependencies.angular) return 'angular';
        if (dependencies.next) return 'next';
        if (dependencies.nuxt) return 'nuxt';
        if (dependencies.express) return 'express';
        if (dependencies.fastify) return 'fastify';
        if (dependencies.koa) return 'koa';
      } catch (error) {
        // Ignore parsing errors
      }
    }

    return undefined;
  }
}
