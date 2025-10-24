import { ConfigManager } from '../../lib/config';
import { JsonDbService, ProjectMilestone } from './jsonDbService';

export class MilestoneService {
  private configManager: ConfigManager;
  private db: JsonDbService;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.db = new JsonDbService();
  }

  async getMilestones(projectId: string): Promise<ProjectMilestone[]> {
    const config = await this.configManager.getConfig();
    const project = config.projects.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }

    return this.db.getMilestones(projectId);
  }


  async createMilestone(projectId: string, milestoneData: Partial<ProjectMilestone>): Promise<ProjectMilestone> {
    const config = await this.configManager.getConfig();
    const project = config.projects.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }

    return this.db.createMilestone(projectId, milestoneData);
  }

  async updateMilestone(projectId: string, milestoneId: string, updates: Partial<ProjectMilestone>): Promise<ProjectMilestone> {
    const updatedMilestone = this.db.updateMilestone(projectId, milestoneId, updates);
    
    if (!updatedMilestone) {
      throw new Error('Milestone not found');
    }
    
    return updatedMilestone;
  }

  async deleteMilestone(projectId: string, milestoneId: string): Promise<void> {
    const deleted = this.db.deleteMilestone(projectId, milestoneId);
    
    if (!deleted) {
      throw new Error('Milestone not found');
    }
  }
}
