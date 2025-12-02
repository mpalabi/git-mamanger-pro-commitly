import axios from 'axios';
import { Task, ProjectMetrics, ProjectMilestone, ProjectSettings, CodeDiff } from '../types';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export interface Project {
  id: string;
  name: string;
  path: string;
  gitProvider: 'github' | 'gitlab' | 'bitbucket' | 'other';
  remoteUrl: string | null;
  currentBranch: string;
  lastSync: string;
  status: {
    isClean: boolean;
    files: Array<{
      status: string;
      file: string;
    }>;
  };
  metadata: {
    language?: string;
    framework?: string;
    lastCommit?: string;
  };
}

export interface GitBranch {
  name: string;
  current: boolean;
  commit: string;
  label: string;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  branch: string;
  files?: string[];
}

export const api = {
  async getProjects(): Promise<Project[]> {
    const response = await apiClient.get('/projects');
    return response.data;
  },

  async getProject(id: string): Promise<Project> {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
  },

  async getProjectStatus(id: string) {
    const response = await apiClient.get(`/projects/${id}/status`);
    return response.data;
  },

  async getGitStatus(id: string) {
    const response = await apiClient.get(`/projects/${id}/git/status`);
    return response.data;
  },

  async getBranches(id: string, options?: { all?: boolean }): Promise<GitBranch[]> {
    const response = await apiClient.get(`/projects/${id}/git/branches`, {
      params: { all: options?.all ?? true }
    });
    return response.data;
  },

  async getCommits(id: string, limit: number = 10): Promise<GitCommit[]> {
    const response = await apiClient.get(`/projects/${id}/git/commits`, {
      params: { limit }
    });
    return response.data;
  },

  async checkoutBranch(id: string, branch: string) {
    const response = await apiClient.post(`/projects/${id}/git/checkout`, {
      branch
    });
    return response.data;
  },

  async commit(id: string, message: string, files?: string[]) {
    const response = await apiClient.post(`/projects/${id}/git/commit`, {
      message,
      files
    });
    return response.data;
  },

  async pull(id: string) {
    const response = await apiClient.post(`/projects/${id}/git/pull`);
    return response.data;
  },

  async push(id: string, branch?: string) {
    const response = await apiClient.post(`/projects/${id}/git/push`, {
      branch
    });
    return response.data;
  },

  // Task Management API
  async getTasks(projectId: string): Promise<Task[]> {
    const response = await apiClient.get(`/projects/${projectId}/tasks`);
    return response.data;
  },

  async getTask(projectId: string, taskId: string): Promise<Task> {
    const response = await apiClient.get(`/projects/${projectId}/tasks/${taskId}`);
    return response.data;
  },

  async createTask(projectId: string, task: Partial<Task>): Promise<Task> {
    const response = await apiClient.post(`/projects/${projectId}/tasks`, task);
    return response.data;
  },

  async updateTask(projectId: string, taskId: string, updates: Partial<Task>): Promise<Task> {
    const response = await apiClient.put(`/projects/${projectId}/tasks/${taskId}`, updates);
    return response.data;
  },

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/tasks/${taskId}`);
  },

  async linkCommitToTask(projectId: string, taskId: string, commitHash: string): Promise<Task> {
    const response = await apiClient.post(`/projects/${projectId}/tasks/${taskId}/commits`, {
      commitHash
    });
    return response.data;
  },

  async unlinkCommitFromTask(projectId: string, taskId: string, commitHash: string): Promise<Task> {
    const response = await apiClient.delete(`/projects/${projectId}/tasks/${taskId}/commits/${commitHash}`);
    return response.data;
  },

  async linkCommitToSubtask(projectId: string, taskId: string, subtaskId: string, commitHash: string): Promise<Task> {
    const response = await apiClient.post(`/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}/commits`, {
      commitHash
    });
    return response.data;
  },

  async unlinkCommitFromSubtask(projectId: string, taskId: string, subtaskId: string, commitHash: string): Promise<Task> {
    const response = await apiClient.delete(`/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}/commits/${commitHash}`);
    return response.data;
  },

  // Code Diff API
  async getCommitDiff(projectId: string, commitHash: string): Promise<CodeDiff[]> {
    const response = await apiClient.get(`/projects/${projectId}/git/commits/${commitHash}/diff`);
    return response.data;
  },

  async getFileDiff(projectId: string, filePath: string, baseCommit?: string): Promise<CodeDiff> {
    const response = await apiClient.get(`/projects/${projectId}/git/diff`, {
      params: { file: filePath, base: baseCommit }
    });
    return response.data;
  },

  // Project Management API
  async getProjectMetrics(projectId: string): Promise<ProjectMetrics> {
    const response = await apiClient.get(`/projects/${projectId}/metrics`);
    return response.data;
  },

  async getProjectMilestones(projectId: string): Promise<ProjectMilestone[]> {
    const response = await apiClient.get(`/projects/${projectId}/milestones`);
    return response.data;
  },

  async createMilestone(projectId: string, milestone: Partial<ProjectMilestone>): Promise<ProjectMilestone> {
    const response = await apiClient.post(`/projects/${projectId}/milestones`, milestone);
    return response.data;
  },

  async getProjectSettings(projectId: string): Promise<ProjectSettings> {
    const response = await apiClient.get(`/projects/${projectId}/settings`);
    return response.data;
  },

  async updateProjectSettings(projectId: string, settings: Partial<ProjectSettings>): Promise<ProjectSettings> {
    const response = await apiClient.put(`/projects/${projectId}/settings`, settings);
    return response.data;
  },
};