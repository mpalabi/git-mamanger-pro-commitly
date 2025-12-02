import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import websocket from '@fastify/websocket';
import path from 'path';
import { ConfigManager } from '../lib/config';
import { ProjectService } from './services/projectService';
import { GitService } from './services/gitService';
import { WatcherService } from './services/watcherService';
import { TaskService } from './services/taskService';
import { DiffService } from './services/diffService';
import { MetricsService } from './services/metricsService';
import { MilestoneService } from './services/milestoneService';
import { SettingsService } from './services/settingsService';

const fastify = Fastify({
  logger: {
    level: 'info'
  }
});

// Register plugins
fastify.register(cors, {
  origin: true
});

fastify.register(websocket);

// Serve static files from client build
fastify.register(staticFiles, {
  root: path.join(__dirname, '../../client/dist'),
  prefix: '/'
});

// Initialize services
const configManager = new ConfigManager();
const projectService = new ProjectService(configManager);
const watcherService = new WatcherService(configManager);
const taskService = new TaskService(configManager);
const diffService = new DiffService(configManager);
const metricsService = new MetricsService(configManager);
const milestoneService = new MilestoneService(configManager);
const settingsService = new SettingsService(configManager);

// API Routes
fastify.register(async function (fastify) {
  // System status
  fastify.get('/api/status', async (request, reply) => {
    return {
      status: 'running',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  });

  // Projects
  fastify.get('/api/projects', async (request, reply) => {
    return await projectService.getAllProjects();
  });

  // Meta routes - useful for debugging endpoints existence
  fastify.get('/api/meta/routes', async (request, reply) => {
    try {
      const routes = fastify.printRoutes();
      reply.type('application/json');
      return { routes };
    } catch (e) {
      return { routes: '' };
    }
  });

  fastify.get('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return await projectService.getProject(id);
  });

  fastify.get('/api/projects/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    return await projectService.getProjectStatus(id);
  });

  // Git operations
  fastify.get('/api/projects/:id/git/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    return await projectService.getGitStatus(id);
  });

  fastify.get('/api/projects/:id/git/branches', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { all } = request.query as { all?: string | boolean };
    const includeRemotes =
      typeof all === 'string'
        ? all === 'true' || all === '1'
        : (all ?? true);
    return await projectService.getBranches(id, includeRemotes);
  });

  fastify.get('/api/projects/:id/git/commits', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { limit = 10 } = request.query as { limit?: number };
    return await projectService.getCommits(id, limit);
  });

  fastify.post('/api/projects/:id/git/checkout', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { branch } = request.body as { branch: string };
    return await projectService.checkoutBranch(id, branch);
  });

  fastify.post('/api/projects/:id/git/commit', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { message, files } = request.body as { message: string; files?: string[] };
    return await projectService.commit(id, message, files);
  });

  fastify.post('/api/projects/:id/git/pull', async (request, reply) => {
    const { id } = request.params as { id: string };
    return await projectService.pull(id);
  });

  fastify.post('/api/projects/:id/git/push', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { branch } = request.body as { branch?: string };
    return await projectService.push(id, branch);
  });

  // Task Management API
  fastify.get('/api/projects/:id/tasks', async (request, reply) => {
    const { id } = request.params as { id: string };
    return await taskService.getTasks(id);
  });

  fastify.get('/api/projects/:id/tasks/:taskId', async (request, reply) => {
    const { id, taskId } = request.params as { id: string; taskId: string };
    return await taskService.getTask(id, taskId);
  });

  fastify.post('/api/projects/:id/tasks', async (request, reply) => {
    const { id } = request.params as { id: string };
    const taskData = request.body as any;
    return await taskService.createTask(id, taskData);
  });

  fastify.put('/api/projects/:id/tasks/:taskId', async (request, reply) => {
    const { id, taskId } = request.params as { id: string; taskId: string };
    const updates = request.body as any;
    return await taskService.updateTask(id, taskId, updates);
  });

  fastify.delete('/api/projects/:id/tasks/:taskId', async (request, reply) => {
    const { id, taskId } = request.params as { id: string; taskId: string };
    await taskService.deleteTask(id, taskId);
    return { success: true };
  });

  fastify.post('/api/projects/:id/tasks/:taskId/commits', async (request, reply) => {
    const { id, taskId } = request.params as { id: string; taskId: string };
    const { commitHash } = request.body as { commitHash: string };
    return await taskService.linkCommitToTask(id, taskId, commitHash);
  });

  fastify.delete('/api/projects/:id/tasks/:taskId/commits/:commitHash', async (request, reply) => {
    const { id, taskId, commitHash } = request.params as { id: string; taskId: string; commitHash: string };
    return await taskService.unlinkCommitFromTask(id, taskId, commitHash);
  });

  // Subtask commit linking
  fastify.post('/api/projects/:id/tasks/:taskId/subtasks/:subtaskId/commits', async (request, reply) => {
    const { id, taskId, subtaskId } = request.params as { id: string; taskId: string; subtaskId: string };
    const { commitHash } = request.body as { commitHash: string };
    return await taskService.linkCommitToSubtask(id, taskId, subtaskId, commitHash);
  });

  fastify.delete('/api/projects/:id/tasks/:taskId/subtasks/:subtaskId/commits/:commitHash', async (request, reply) => {
    const { id, taskId, subtaskId, commitHash } = request.params as { id: string; taskId: string; subtaskId: string; commitHash: string };
    return await taskService.unlinkCommitFromSubtask(id, taskId, subtaskId, commitHash);
  });

  // Code Diff API
  fastify.get('/api/projects/:id/git/commits/:commitHash/diff', async (request, reply) => {
    const { id, commitHash } = request.params as { id: string; commitHash: string };
    return await diffService.getCommitDiff(id, commitHash);
  });

  fastify.get('/api/projects/:id/git/diff', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { file, base } = request.query as { file: string; base?: string };
    return await diffService.getFileDiff(id, file, base);
  });

  // Project Management API
  fastify.get('/api/projects/:id/metrics', async (request, reply) => {
    const { id } = request.params as { id: string };
    return await metricsService.getProjectMetrics(id);
  });

  fastify.get('/api/projects/:id/milestones', async (request, reply) => {
    const { id } = request.params as { id: string };
    return await milestoneService.getMilestones(id);
  });

  fastify.post('/api/projects/:id/milestones', async (request, reply) => {
    const { id } = request.params as { id: string };
    const milestoneData = request.body as any;
    return await milestoneService.createMilestone(id, milestoneData);
  });

  fastify.get('/api/projects/:id/settings', async (request, reply) => {
    const { id } = request.params as { id: string };
    return await settingsService.getProjectSettings(id);
  });

  fastify.put('/api/projects/:id/settings', async (request, reply) => {
    const { id } = request.params as { id: string };
    const settings = request.body as any;
    return await settingsService.updateProjectSettings(id, settings);
  });

  // WebSocket for real-time updates
  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
      connection.socket.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('WebSocket message:', data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      connection.socket.on('close', () => {
        console.log('WebSocket connection closed');
      });
    });
  });
});

// Catch all handler for SPA routing
fastify.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api/')) {
    reply.code(404).send({ error: 'API endpoint not found' });
  } else {
    // Serve index.html for client-side routing
    reply.sendFile('index.html');
  }
});

// Start server
const start = async () => {
  try {
    const config = await configManager.getConfig();
    const port = parseInt(process.env.PORT || config.server.port.toString());
    const host = process.env.HOST || config.server.host;

    await fastify.listen({ port, host });
    
    console.log(`🌐 Git Manager Pro running on http://${host}:${port}`);
    console.log(`📊 API available at http://${host}:${port}/api`);
    console.log(`🔌 WebSocket available at ws://${host}:${port}/ws`);

    // Start file watchers for all projects
    await watcherService.startWatching();

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Git Manager Pro...');
  await watcherService.stopWatching();
  await fastify.close();
  process.exit(0);
});

start();