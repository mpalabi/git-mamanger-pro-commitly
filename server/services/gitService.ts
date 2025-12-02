import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import path from 'path';
import fs from 'fs';

export interface GitStatus {
  isClean: boolean;
  files: Array<{
    status: string;
    file: string;
  }>;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  branch: string;
  files?: string[];
}

export interface GitBranch {
  name: string;
  current: boolean;
  commit: string;
  label: string;
}

export class GitService {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    
    const options: Partial<SimpleGitOptions> = {
      baseDir: repoPath,
      binary: 'git',
      maxConcurrentProcesses: 6,
      trimmed: false,
    };

    this.git = simpleGit(options);
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      return branch.trim();
    } catch (error) {
      throw new Error('Failed to get current branch');
    }
  }

  async getRemoteUrl(): Promise<string | null> {
    try {
      const remotes = await this.git.getRemotes(true);
      const origin = remotes.find(remote => remote.name === 'origin');
      return origin?.refs?.fetch || null;
    } catch (error) {
      return null;
    }
  }

  async getStatus(): Promise<GitStatus> {
    try {
      const status = await this.git.status();
      
      return {
        isClean: status.isClean(),
        files: status.files.map(file => ({
          status: file.working_dir + file.index,
          file: file.path
        }))
      };
    } catch (error) {
      throw new Error('Failed to get git status');
    }
  }

  async getBranches(includeRemotes: boolean = true): Promise<GitBranch[]> {
    try {
      // Ensure we have the latest refs for remote branches
      if (includeRemotes) {
        try {
          await this.git.fetch(['--all', '--prune']);
        } catch {
          // Ignore fetch errors; we'll still return local branches
        }
      }

      const summary = includeRemotes ? await this.git.branch(['-a']) : await this.git.branchLocal();
      const currentBranch = await this.getCurrentBranch();

      const names = summary.all
        // Drop HEAD pointers like "remotes/origin/HEAD -> origin/main"
        .filter((name) => !name.includes('->'));

      // De-duplicate in case refs overlap (e.g., 'main' and 'remotes/origin/main')
      const seen = new Set<string>();
      const uniqNames = names.filter((n) => {
        if (seen.has(n)) return false;
        seen.add(n);
        return true;
      });

      return uniqNames.map((name) => {
        const info = summary.branches[name] || summary.branches[name.replace('remotes/', '')] || ({} as any);
        return {
          name,
          current: name === currentBranch || info.current === true,
          commit: info.commit || '',
          label: info.label || name
        };
      });
    } catch (error) {
      throw new Error('Failed to get branches');
    }
  }

  async getRecentCommits(limit: number = 10): Promise<GitCommit[]> {
    try {
      const log = await this.git.log({ maxCount: limit });
      
      const currentBranch = await this.getCurrentBranch();
      return log.all.map(commit => ({
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name,
        date: commit.date,
        branch: currentBranch,
        files: commit.diff?.files?.map(file => file.file) || []
      }));
    } catch (error) {
      throw new Error('Failed to get recent commits');
    }
  }

  async getCommitHistory(branch?: string, limit: number = 50): Promise<GitCommit[]> {
    try {
      const options: any = { maxCount: limit };
      if (branch) {
        options.from = branch;
      }
      
      const log = await this.git.log(options);
      
      const currentBranch = branch || await this.getCurrentBranch();
      return log.all.map(commit => ({
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name,
        date: commit.date,
        branch: currentBranch,
        files: commit.diff?.files?.map(file => file.file) || []
      }));
    } catch (error) {
      throw new Error('Failed to get commit history');
    }
  }

  async checkoutBranch(branchName: string): Promise<void> {
    try {
      await this.git.checkout(branchName);
    } catch (error) {
      throw new Error(`Failed to checkout branch: ${branchName}`);
    }
  }

  async createBranch(branchName: string): Promise<void> {
    try {
      await this.git.checkoutLocalBranch(branchName);
    } catch (error) {
      throw new Error(`Failed to create branch: ${branchName}`);
    }
  }

  async deleteBranch(branchName: string, force: boolean = false): Promise<void> {
    try {
      if (force) {
        await this.git.deleteLocalBranch(branchName, true);
      } else {
        await this.git.deleteLocalBranch(branchName);
      }
    } catch (error) {
      throw new Error(`Failed to delete branch: ${branchName}`);
    }
  }

  async pull(): Promise<void> {
    try {
      await this.git.pull();
    } catch (error) {
      throw new Error('Failed to pull changes');
    }
  }

  async push(branch?: string): Promise<void> {
    try {
      if (branch) {
        await this.git.push('origin', branch);
      } else {
        await this.git.push();
      }
    } catch (error) {
      throw new Error('Failed to push changes');
    }
  }

  async commit(message: string, files?: string[]): Promise<void> {
    try {
      if (files && files.length > 0) {
        await this.git.add(files);
      } else {
        await this.git.add('.');
      }
      await this.git.commit(message);
    } catch (error) {
      throw new Error('Failed to commit changes');
    }
  }

  async isGitRepository(): Promise<boolean> {
    try {
      await this.git.revparse(['--git-dir']);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getDiff(file?: string): Promise<string> {
    try {
      if (file) {
        return await this.git.diff([file]);
      } else {
        return await this.git.diff();
      }
    } catch (error) {
      throw new Error('Failed to get diff');
    }
  }

  async getStagedDiff(): Promise<string> {
    try {
      return await this.git.diff(['--cached']);
    } catch (error) {
      throw new Error('Failed to get staged diff');
    }
  }
}
