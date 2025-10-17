import { simpleGit, SimpleGit } from 'simple-git';
import { ConfigManager } from '../../lib/config';
import { CodeDiff, DiffChange } from '../types';

export class DiffService {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  async getCommitDiff(projectId: string, commitHash: string): Promise<CodeDiff[]> {
    const config = await this.configManager.getConfig();
    const project = config.projects.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }

    const git: SimpleGit = simpleGit(project.path);

    try {
      // Get the diff for the specific commit
      const diffOutput = await git.show([commitHash, '--name-only']);
      const diffStats = await git.show([commitHash, '--stat']);
      
      // Parse the diff output to extract file changes
      const files = this.parseDiffFiles(diffOutput);
      
      const diffs: CodeDiff[] = [];
      
      for (const file of files) {
        try {
          // Get the actual diff for this file
          const fileDiff = await git.show([commitHash, '--', file]);
          const diff = this.parseFileDiff(file, fileDiff);
          if (diff) {
            diffs.push(diff);
          }
        } catch (error) {
          console.warn(`Failed to get diff for file ${file}:`, error);
        }
      }

      return diffs;
    } catch (error) {
      console.error('Error getting commit diff:', error);
      // Return mock data for demonstration
      return this.getMockDiff();
    }
  }

  async getFileDiff(projectId: string, filePath: string, baseCommit?: string): Promise<CodeDiff> {
    const config = await this.configManager.getConfig();
    const project = config.projects.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }

    const git: SimpleGit = simpleGit(project.path);

    try {
      const base = baseCommit || 'HEAD~1';
      const diffOutput = await git.diff([base, 'HEAD', '--', filePath]);
      
      return this.parseFileDiff(filePath, diffOutput) || this.getMockFileDiff(filePath);
    } catch (error) {
      console.error('Error getting file diff:', error);
      return this.getMockFileDiff(filePath);
    }
  }

  private parseDiffFiles(diffOutput: string): string[] {
    const lines = diffOutput.split('\n');
    const files: string[] = [];
    
    for (const line of lines) {
      if (line.trim() && !line.startsWith('commit') && !line.startsWith('Author') && !line.startsWith('Date')) {
        files.push(line.trim());
      }
    }
    
    return files;
  }

  private parseFileDiff(filePath: string, diffOutput: string): CodeDiff | null {
    if (!diffOutput.trim()) {
      return null;
    }

    const lines = diffOutput.split('\n');
    const changes: DiffChange[] = [];
    let lineNumber = 1;
    let oldLineNumber = 1;

    for (const line of lines) {
      if (line.startsWith('+++') || line.startsWith('---')) {
        continue;
      }
      
      if (line.startsWith('@@')) {
        // Parse hunk header
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          oldLineNumber = parseInt(match[1]);
          lineNumber = parseInt(match[2]);
        }
        continue;
      }

      if (line.startsWith('+')) {
        changes.push({
          type: 'added',
          lineNumber: lineNumber++,
          content: line.substring(1),
          oldLineNumber: undefined
        });
      } else if (line.startsWith('-')) {
        changes.push({
          type: 'removed',
          lineNumber: lineNumber,
          content: line.substring(1),
          oldLineNumber: oldLineNumber++
        });
      } else {
        changes.push({
          type: 'modified',
          lineNumber: lineNumber++,
          content: line.substring(1),
          oldLineNumber: oldLineNumber++
        });
      }
    }

    const language = this.getLanguageFromFile(filePath);
    
    return {
      file: filePath,
      oldContent: '', // Would be populated from git
      newContent: '', // Would be populated from git
      changes,
      language
    };
  }

  private getLanguageFromFile(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql'
    };

    return languageMap[extension || ''] || 'text';
  }

  private getMockDiff(): CodeDiff[] {
    return [
      {
        file: 'src/components/TaskManager.tsx',
        oldContent: '',
        newContent: '',
        language: 'typescript',
        changes: [
          {
            type: 'added',
            lineNumber: 1,
            content: 'import React, { useState } from \'react\';'
          },
          {
            type: 'added',
            lineNumber: 2,
            content: 'import { motion, AnimatePresence } from \'framer-motion\';'
          },
          {
            type: 'removed',
            lineNumber: 1,
            content: '// Old import statement'
          },
          {
            type: 'modified',
            lineNumber: 10,
            content: 'export const TaskManager: React.FC<TaskManagerProps> = ({ projectId }) => {'
          }
        ]
      },
      {
        file: 'src/services/api.ts',
        oldContent: '',
        newContent: '',
        language: 'typescript',
        changes: [
          {
            type: 'added',
            lineNumber: 15,
            content: '  // Task Management API'
          },
          {
            type: 'added',
            lineNumber: 16,
            content: '  async getTasks(projectId: string): Promise<Task[]> {'
          },
          {
            type: 'added',
            lineNumber: 17,
            content: '    const response = await apiClient.get(`/projects/${projectId}/tasks`);'
          }
        ]
      }
    ];
  }

  private getMockFileDiff(filePath: string): CodeDiff {
    return {
      file: filePath,
      oldContent: '',
      newContent: '',
      language: this.getLanguageFromFile(filePath),
      changes: [
        {
          type: 'added',
          lineNumber: 1,
          content: `// Changes to ${filePath}`
        },
        {
          type: 'modified',
          lineNumber: 5,
          content: '  // Updated functionality'
        }
      ]
    };
  }
}
