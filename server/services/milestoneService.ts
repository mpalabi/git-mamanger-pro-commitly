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

    const milestones = this.db.getMilestones(projectId);
    
    // If no milestones exist, create some sample milestones
    if (milestones.length === 0) {
      const sampleMilestones = this.createSampleMilestones(projectId);
      return sampleMilestones;
    }
    
    return milestones;
  }

  private createSampleMilestones(projectId: string): ProjectMilestone[] {
    const milestone1 = this.db.createMilestone(projectId, {
      title: 'MVP Release',
      description: 'Initial version with core functionality',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'in-progress',
      tasks: []
    });

    const milestone2 = this.db.createMilestone(projectId, {
      title: 'Authentication System',
      description: 'Complete user authentication and authorization',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'upcoming',
      tasks: []
    });

    const milestone3 = this.db.createMilestone(projectId, {
      title: 'UI/UX Improvements',
      description: 'Enhanced user interface and user experience',
      dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed',
      tasks: []
    });

    return [milestone1, milestone2, milestone3];
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
