# Git Manager Pro

A global npm package that provides a visual, web-based dashboard for managing Git operations, commits, PRs, and tasks across multiple projects. Each project is initialized locally but managed through a centralized dashboard.

## 🎯 Project Vision

Git Manager Pro is designed to be a comprehensive git management solution that:
- Manages multiple git repositories from a single dashboard
- Provides real-time updates and visual git graphs
- Offers task management and PR integration
- Runs as a background service for continuous monitoring

## 🏗️ Architecture

```
git-manager-pro/
├── bin/
│   └── gmp.ts                 # Executable entry point
├── cli/
│   └── commands/              # CLI command implementations
│       ├── init.ts           # Initialize project
│       ├── start.ts          # Start dashboard server
│       ├── stop.ts           # Stop dashboard server
│       ├── list.ts           # List tracked projects
│       ├── remove.ts         # Remove project from tracking
│       ├── status.ts         # Show service status
│       └── open.ts           # Open dashboard in browser
├── server/
│   ├── services/             # Business logic services
│   │   ├── gitService.ts     # Git operations
│   │   ├── projectService.ts # Project management
│   │   └── watcherService.ts # File system watcher
│   └── index.ts              # Fastify server entry point
├── client/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # API client
│   │   └── main.tsx         # React entry point
│   └── vite.config.ts       # Vite configuration
├── lib/
│   └── config.ts            # Configuration management
└── package.json
```

## 🚀 Features

- **Multi-Project Management**: Track and manage multiple git repositories
- **Real-time Updates**: Live status updates via WebSocket connections
- **Visual Dashboard**: Modern React interface with Tailwind CSS
- **CLI Interface**: Comprehensive command-line tools
- **Git Operations**: Branch management, commits, pulls, pushes
- **File Watching**: Automatic detection of git changes
- **TypeScript**: Full type safety across the entire codebase

## 📝 Product Review: Latest Feature Drop

This release focuses on making day-to-day repository work faster inside the project detail workspace.

- **Redesigned Project Workspace**: The project view now has a clearer layout with dedicated tabs for Overview, Tasks, Commits, Diffs, Metrics, and Settings.
- **Smarter Branch Switching**: Branch selection now handles both local and remote refs more reliably, including remote-tracking checkout behavior.
- **Project Timeline Context**: Each project now surfaces a repository start date so users can quickly understand history at a glance.
- **Contributor Insights**: The Overview tab includes a contribution heatmap, year/month filters, and contributor activity summaries.
- **Live Activity Panel**: Recent commit activity and repository context are easier to scan from the right-side activity rail.
- **Task-to-Commit Deep Dive**: In task linking, users can open a focused diff for a single commit and then return to multi-commit selection.
- **Improved Rich Text Editing**: Notes and task descriptions now have better writing ergonomics, link support, synced editor state, and safer undo/redo controls.
- **Expanded Commit API Support**: Commit queries now support all-branch views (`all=true`) for broader project analysis in the UI.

## 📦 Installation

```bash
# Install globally (when published)
npm install -g git-manager-pro

# Or install locally for development
npm install
npm run install:all
```

## 🛠️ Development Setup

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Link for global testing**:
   ```bash
   npm link
   ```

4. **Initialize in a git repository**:
   ```bash
   gmp init
   ```

5. **Start the dashboard**:
   ```bash
   gmp start
   ```

6. **Open the dashboard**:
   ```bash
   gmp open
   ```

## 🎮 CLI Commands

### Core Commands
```bash
# Initialize Git Manager Pro in current repository
gmp init

# Start the dashboard server
gmp start

# Stop the dashboard server
gmp stop

# Show service status
gmp status

# List all tracked projects
gmp list

# Remove project from tracking
gmp remove [path]

# Open dashboard in browser
gmp open
```

### Development Commands
```bash
# Start development server
npm run dev:server

# Start client development
npm run dev:client

# Build everything
npm run build

# Clean build artifacts
npm run clean
```

## 🌐 API Endpoints

- `GET /api/status` - System status
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `GET /api/projects/:id/status` - Get project git status
- `GET /api/projects/:id/git/branches` - Get project branches
- `GET /api/projects/:id/git/commits` - Get project commits
- `POST /api/projects/:id/git/checkout` - Checkout branch
- `POST /api/projects/:id/git/commit` - Create commit
- `POST /api/projects/:id/git/pull` - Pull changes
- `POST /api/projects/:id/git/push` - Push changes
- `WS /ws` - WebSocket for real-time updates

## 🔧 Configuration

### Global Config (`~/.gmp/config.json`)
```json
{
  "version": "1.0.0",
  "server": {
    "port": 3737,
    "host": "localhost"
  },
  "projects": [...],
  "preferences": {
    "theme": "dark",
    "autoStart": false,
    "notifications": true
  }
}
```

### Per-Project Config (`.gmp/config.json`)
```json
{
  "projectId": "uuid",
  "name": "Project Name",
  "gitProvider": "github",
  "remoteUrl": "https://github.com/user/repo.git",
  "initialized": "2025-01-01T00:00:00Z"
}
```

## 🎨 Technology Stack

- **Backend**: Fastify, TypeScript, simple-git, chokidar
- **Frontend**: React, Vite, Tailwind CSS, React Query
- **CLI**: Commander.js, chalk, ora, inquirer
- **Real-time**: WebSocket, file system watchers
- **Database**: JSON-based configuration (LowDB ready)

## 📊 Data Models

- **Project**: Repository information and metadata
- **GitStatus**: Current branch, uncommitted changes
- **GitCommit**: Commit history with author and files
- **GitBranch**: Branch information and status

## 🔄 Real-time Features

- File system watching for automatic updates
- WebSocket connections for live status
- Automatic project synchronization
- Real-time commit and branch updates

## 🚀 Future Roadmap

- [ ] Pull Request management (GitHub, GitLab, Bitbucket)
- [ ] Task management and Kanban boards
- [ ] Visual git graph with interactive features
- [ ] Team collaboration features
- [ ] Analytics and reporting
- [ ] Custom workflows and automation

## 📝 License

MIT
