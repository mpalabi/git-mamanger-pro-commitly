// Enhanced types for task management and project features

export interface Task {
  id: string;
  title: string;
  description: string; // Rich text content
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
  addedAt: string; // When this commit was linked to the task
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

export interface CodeDiff {
  file: string;
  oldContent: string;
  newContent: string;
  changes: DiffChange[];
  language: string;
}

export interface DiffChange {
  type: 'added' | 'removed' | 'modified';
  lineNumber: number;
  content: string;
  oldLineNumber?: number;
}

export interface ProjectMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalCommits: number;
  commitsThisWeek: number;
  activeContributors: number;
  codeQuality: {
    testCoverage?: number;
    complexity?: number;
    maintainability?: number;
  };
}

export interface ProjectMilestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'upcoming' | 'in-progress' | 'completed' | 'overdue';
  tasks: string[]; // Task IDs
  createdAt: string;
}

export interface ProjectSettings {
  id: string;
  name: string;
  description: string;
  defaultBranch: string;
  autoSync: boolean;
  syncInterval: number; // in minutes
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

// Animation types for ReactBits integration
export interface AnimationConfig {
  type: 'fade' | 'slide' | 'scale' | 'split-text';
  duration: number;
  delay?: number;
  easing?: string;
}

export interface SplitTextConfig {
  type: 'chars' | 'words' | 'lines';
  stagger: number;
  duration: number;
  ease: string;
}
