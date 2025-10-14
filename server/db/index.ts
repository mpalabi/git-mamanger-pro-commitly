import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/lib/node';
import path from 'path';
import os from 'os';

export interface DatabaseSchema {
  projects: Array<{
    id: string;
    path: string;
    addedAt: string;
  }>;
  tasks: Array<{
    id: string;
    projectId: string;
    title: string;
    description: string;
    status: 'todo' | 'in-progress' | 'review' | 'done';
    branch?: string;
    commits: string[];
    createdAt: string;
    updatedAt: string;
  }>;
  settings: {
    theme: 'dark' | 'light';
    autoStart: boolean;
    notifications: boolean;
  };
}

export class Database {
  private db: Low<DatabaseSchema>;

  constructor() {
    const homeDir = os.homedir();
    const dbPath = path.join(homeDir, '.gmp', 'database.json');
    const adapter = new JSONFile<DatabaseSchema>(dbPath);
    
    this.db = new Low(adapter);
  }

  async initialize(): Promise<void> {
    await this.db.read();
  }

  get data(): DatabaseSchema {
    return this.db.data!;
  }

  async write(): Promise<void> {
    await this.db.write();
  }
}

