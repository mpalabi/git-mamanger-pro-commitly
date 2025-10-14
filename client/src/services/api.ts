import axios from 'axios';

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

  async getBranches(id: string): Promise<GitBranch[]> {
    const response = await apiClient.get(`/projects/${id}/git/branches`);
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
};