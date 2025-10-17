import path from 'path';
import { ConfigManager } from '../../lib/config';
import { JsonDbService, ProjectSettings } from './jsonDbService';

export class SettingsService {
  private configManager: ConfigManager;
  private db: JsonDbService;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.db = new JsonDbService();
  }

  async getProjectSettings(projectId: string): Promise<ProjectSettings> {
    const config = await this.configManager.getConfig();
    const project = config.projects.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }

    let settings = this.db.getSettings(projectId);
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = this.db.updateSettings(projectId, {
        name: path.basename(project.path),
        description: `Git Manager Pro project for ${path.basename(project.path)}`,
        defaultBranch: 'main',
        autoSync: true,
        syncInterval: 5,
        notifications: {
          email: false,
          desktop: true
        },
        integrations: {
          github: {
            enabled: false
          },
          slack: {
            enabled: false
          }
        }
      });
    }
    
    return settings;
  }

  async updateProjectSettings(projectId: string, settings: Partial<ProjectSettings>): Promise<ProjectSettings> {
    return this.db.updateSettings(projectId, settings);
  }
}
