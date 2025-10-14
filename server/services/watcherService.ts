import chokidar from 'chokidar';
import path from 'path';
import { ConfigManager } from '../../lib/config';
import { GitService } from './gitService';

export class WatcherService {
  private configManager: ConfigManager;
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  private websocketClients: Set<any> = new Set();

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  async startWatching(): Promise<void> {
    const projects = await this.configManager.getProjects();
    
    for (const project of projects) {
      await this.watchProject(project.id, project.path);
    }
  }

  async stopWatching(): Promise<void> {
    for (const [projectId, watcher] of this.watchers) {
      await watcher.close();
      console.log(`Stopped watching project: ${projectId}`);
    }
    this.watchers.clear();
  }

  private async watchProject(projectId: string, projectPath: string): Promise<void> {
    try {
      const gitService = new GitService(projectPath);
      
      // Check if it's a valid git repository
      if (!(await gitService.isGitRepository())) {
        console.warn(`Skipping invalid git repository: ${projectPath}`);
        return;
      }

      const watcher = chokidar.watch([
        path.join(projectPath, '.git/HEAD'),
        path.join(projectPath, '.git/refs'),
        path.join(projectPath, '.git/index'),
        path.join(projectPath, '**/*')
      ], {
        ignored: [
          /(^|[\/\\])\../, // ignore dotfiles
          /node_modules/,
          /\.gmp/,
          /\.git\/objects/,
          /\.git\/logs/
        ],
        persistent: true,
        ignoreInitial: true
      });

      watcher.on('change', async (filePath) => {
        await this.handleFileChange(projectId, filePath);
      });

      watcher.on('add', async (filePath) => {
        await this.handleFileChange(projectId, filePath);
      });

      watcher.on('unlink', async (filePath) => {
        await this.handleFileChange(projectId, filePath);
      });

      this.watchers.set(projectId, watcher);
      console.log(`Started watching project: ${projectId} at ${projectPath}`);

    } catch (error) {
      console.error(`Error setting up watcher for project ${projectId}:`, error);
    }
  }

  private async handleFileChange(projectId: string, filePath: string): Promise<void> {
    try {
      // Debounce rapid changes
      setTimeout(async () => {
        await this.notifyProjectUpdate(projectId);
      }, 500);
    } catch (error) {
      console.error(`Error handling file change for project ${projectId}:`, error);
    }
  }

  private async notifyProjectUpdate(projectId: string): Promise<void> {
    try {
      const project = await this.configManager.getProjectById(projectId);
      if (!project) return;

      const gitService = new GitService(project.path);
      const status = await gitService.getStatus();
      const currentBranch = await gitService.getCurrentBranch();

      const updateData = {
        type: 'PROJECT_STATUS_CHANGED',
        projectId,
        data: {
          currentBranch,
          isClean: status.isClean,
          uncommittedChanges: status.files.length,
          files: status.files
        }
      };

      // Broadcast to all WebSocket clients
      this.broadcastToClients(updateData);

    } catch (error) {
      console.error(`Error notifying project update for ${projectId}:`, error);
    }
  }

  public addWebSocketClient(client: any): void {
    this.websocketClients.add(client);
  }

  public removeWebSocketClient(client: any): void {
    this.websocketClients.delete(client);
  }

  private broadcastToClients(data: any): void {
    const message = JSON.stringify(data);
    
    for (const client of this.websocketClients) {
      try {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      } catch (error) {
        console.error('Error broadcasting to client:', error);
        this.websocketClients.delete(client);
      }
    }
  }
}
