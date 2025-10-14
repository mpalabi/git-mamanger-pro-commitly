# Git Manager Pro - Project Overview

## 🎯 Project Vision
A global npm package that provides a visual, web-based dashboard for managing Git operations, commits, PRs, and tasks across multiple projects. Each project is initialized locally but managed through a centralized dashboard.

---

## 📋 Core Concept

### How It Works
1. **Global Installation**: Package installed once globally via npm
2. **Per-Project Init**: Each project runs `gmp init` to register with the manager
3. **Centralized Dashboard**: Single React app shows all registered projects
4. **Real-time Sync**: Dashboard updates automatically when git operations occur

### Key Principle
- `.gmp/` folder created in each project (auto-added to `.gitignore`)
- Global config tracks all initialized projects
- Dashboard runs as a long-lived background service
- Projects can be on different git providers (GitHub, GitLab, Bitbucket)

---

## 🏗️ Architecture

### Package Structure
```
git-manager-pro/
├── bin/
│   └── gmp.js                 # Executable entry point
├── cli/
│   ├── commands/
│   │   ├── init.js            # Initialize project
│   │   ├── start.js           # Start dashboard server
│   │   ├── stop.js            # Stop dashboard server
│   │   ├── list.js            # List tracked projects
│   │   ├── remove.js          # Remove project from tracking
│   │   └── status.js          # Show service status
│   └── index.js               # CLI router
├── server/
│   ├── api/
│   │   ├── projects.js        # Project CRUD operations
│   │   ├── git.js             # Git operations API
│   │   ├── commits.js         # Commit history
│   │   ├── branches.js        # Branch management
│   │   └── prs.js             # Pull request management
│   ├── services/
│   │   ├── gitService.js      # Git operations logic
│   │   ├── projectService.js  # Project management
│   │   ├── taskService.js     # Task management
│   │   └── watcherService.js  # File system watcher
│   ├── db/
│   │   └── index.js           # Database connection (SQLite/LowDB)
│   └── index.js               # Server entry point
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProjectList.jsx
│   │   │   ├── ProjectDetail.jsx
│   │   │   ├── CommitGraph.jsx
│   │   │   ├── TaskBoard.jsx
│   │   │   └── PRManager.jsx
│   │   ├── hooks/
│   │   │   ├── useProjects.js
│   │   │   ├── useGitStatus.js
│   │   │   └── useRealtime.js
│   │   ├── services/
│   │   │   └── api.js         # API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js
├── lib/
│   ├── config.js              # Global config management
│   ├── gitignore.js           # .gitignore manipulation
│   └── utils.js               # Shared utilities
├── package.json
└── README.md
```

---

## 🔧 Technical Stack

### CLI
- **commander** - CLI framework with command routing
- **chalk** - Colored terminal output
- **ora** - Elegant terminal spinners
- **inquirer** - Interactive CLI prompts
- **boxen** - Nice terminal boxes for output

### Backend
- **fastify** - Fast, low-overhead web framework
- **simple-git** - Git operations wrapper
- **lowdb** - Lightweight JSON database (or SQLite3)
- **@octokit/rest** - GitHub API integration
- **chokidar** - File system watcher for real-time updates
- **ws** or **socket.io** - WebSocket for real-time communication
- **node-fetch** - HTTP requests for GitLab/Bitbucket APIs

### Frontend
- **vite** - Fast build tool and dev server
- **react** + **react-dom** - UI library
- **react-router-dom** - Client-side routing
- **@tanstack/react-query** - Data fetching and caching
- **gitgraph.js** or **react-git-graph** - Git commit graph visualization
- **tailwindcss** - Utility-first CSS
- **lucide-react** - Icon library
- **recharts** - Charts for analytics
- **socket.io-client** - Real-time updates

---

## 📊 Data Models

### Project
```javascript
{
  id: "uuid",
  name: "my-awesome-project",
  path: "/Users/username/projects/my-awesome-project",
  gitProvider: "github", // github | gitlab | bitbucket | other
  remoteUrl: "https://github.com/user/repo.git",
  currentBranch: "main",
  lastSync: "2025-10-13T10:30:00Z",
  tasks: [],
  metadata: {
    language: "javascript",
    framework: "react",
    lastCommit: "abc123"
  }
}
```

### Task
```javascript
{
  id: "uuid",
  projectId: "project-uuid",
  title: "Implement user authentication",
  description: "Add JWT-based auth",
  status: "in-progress", // todo | in-progress | review | done
  branch: "feature/auth",
  commits: ["commit-hash-1", "commit-hash-2"],
  createdAt: "2025-10-13T10:00:00Z",
  updatedAt: "2025-10-13T10:30:00Z"
}
```

### Commit (cached from git)
```javascript
{
  hash: "abc123",
  message: "Add user authentication",
  author: "John Doe",
  date: "2025-10-13T10:00:00Z",
  branch: "feature/auth",
  files: ["src/auth.js", "src/login.jsx"]
}
```

---

## 🎯 Feature Roadmap

### Phase 1: Foundation (MVP)
- [ ] CLI setup with `commander`
- [ ] `gmp init` command (create `.gmp/`, update `.gitignore`)
- [ ] Global config file to track projects
- [ ] Basic Express/Fastify server
- [ ] Simple React dashboard listing projects
- [ ] Display git status (current branch, uncommitted changes)

### Phase 2: Core Git Features
- [ ] Commit history view with timeline
- [ ] Branch listing and visualization
- [ ] Quick commit functionality (stage all + commit message)
- [ ] Git operations: checkout, pull, push
- [ ] Diff viewer for uncommitted changes
- [ ] File system watcher for real-time updates

### Phase 3: Visual Git Graph
- [ ] Implement git commit graph visualization
- [ ] Interactive branch diagram
- [ ] Merge/rebase visualization
- [ ] Click to checkout branches
- [ ] Visual conflict detection

### Phase 4: PR Management
- [ ] GitHub integration (list PRs, create PRs)
- [ ] GitLab integration
- [ ] PR status indicators
- [ ] Review comments inline
- [ ] Quick PR actions (approve, merge, close)

### Phase 5: Task Management
- [ ] Create/edit/delete tasks
- [ ] Link tasks to branches
- [ ] Link tasks to commits
- [ ] Task board view (Kanban-style)
- [ ] Task analytics (time tracking, velocity)

### Phase 6: Advanced Features
- [ ] Multi-project relationship mapping
- [ ] Dependency graph between projects
- [ ] Global search across all projects
- [ ] Git hooks integration
- [ ] Custom workflows/automation
- [ ] Team collaboration features
- [ ] Analytics dashboard (commits over time, contributor stats)

---

## 🚀 CLI Commands

### Core Commands
```bash
# Install globally
npm install -g git-manager-pro

# Start the dashboard (background service)
gmp start

# Stop the dashboard
gmp stop

# Check service status
gmp status

# Initialize current project
gmp init

# List all tracked projects
gmp list

# Remove current project from tracking
gmp remove

# Remove specific project
gmp remove /path/to/project

# Open dashboard in browser
gmp open

# Show help
gmp --help
```

### Future Commands
```bash
# Quick commit
gmp commit "feat: add login page"

# Create a task
gmp task create "Implement feature X"

# Link task to current branch
gmp task link <task-id>

# Quick PR creation
gmp pr create "Feature X implementation"
```

---

## 🔐 Configuration Files

### Global Config (`~/.gmp/config.json`)
```json
{
  "version": "1.0.0",
  "server": {
    "port": 3737,
    "host": "localhost"
  },
  "projects": [
    {
      "id": "uuid-1",
      "path": "/Users/username/projects/project-1",
      "addedAt": "2025-10-13T10:00:00Z"
    }
  ],
  "preferences": {
    "theme": "dark",
    "autoStart": false,
    "notifications": true
  },
  "integrations": {
    "github": {
      "token": "ghp_xxxxx"
    }
  }
}
```

### Per-Project Config (`.gmp/config.json`)
```json
{
  "projectId": "uuid-1",
  "name": "My Awesome Project",
  "gitProvider": "github",
  "remoteUrl": "https://github.com/user/repo.git",
  "initialized": "2025-10-13T10:00:00Z",
  "preferences": {
    "defaultBranch": "main",
    "autoFetch": true
  }
}
```

---

## 🎨 UI/UX Design Goals

### Dashboard Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Git Manager Pro                    🔍 Search    ⚙️ Settings │
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│  Projects     │  Project: my-awesome-project                │
│               │  Branch: main (↑2 ↓1)                       │
│  ✓ Project 1  │                                             │
│  ✓ Project 2  │  📊 Quick Stats                             │
│  ✓ Project 3  │  • 3 uncommitted changes                    │
│               │  • 2 commits ahead of origin                │
│  + Add        │  • 1 open PR                                │
│               │                                             │
│               │  🌿 Branches    📝 Commits    🎯 Tasks       │
│               │                                             │
│               │  [Commit Graph Visualization]               │
│               │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

### Key UI Principles
- **Clean & Minimal** - Focus on essential information
- **Real-time** - Updates without refresh
- **Keyboard Shortcuts** - Power user friendly
- **Dark Mode First** - With light mode option
- **Responsive** - Works on different screen sizes

---

## 🔄 Real-time Updates

### WebSocket Events
```javascript
// Server → Client
{
  type: "PROJECT_STATUS_CHANGED",
  projectId: "uuid",
  data: {
    currentBranch: "main",
    uncommittedChanges: 3,
    commitsAhead: 2
  }
}

{
  type: "NEW_COMMIT",
  projectId: "uuid",
  commit: { hash, message, author, date }
}

{
  type: "BRANCH_CHANGED",
  projectId: "uuid",
  branch: "feature/new-feature"
}
```

### File Watcher Triggers
- `.git/HEAD` changes → Branch switch detected
- `.git/refs/` changes → New commits detected
- Working directory changes → Uncommitted changes detected

---

## 🧪 Testing Strategy

### Unit Tests
- Git operations logic
- Config file manipulation
- CLI command handlers
- API endpoints

### Integration Tests
- Full CLI command flow
- Server ↔ Git operations
- Client ↔ Server API

### E2E Tests
- Complete user workflows
- Multi-project scenarios
- Real git repository operations

---

## 📦 Distribution

### NPM Package
```json
{
  "name": "git-manager-pro",
  "version": "1.0.0",
  "bin": {
    "gmp": "./bin/gmp.js"
  },
  "files": [
    "bin",
    "cli",
    "server",
    "client/dist",
    "lib"
  ]
}
```

### Installation Flow
1. User runs `npm install -g git-manager-pro`
2. Binary `gmp` becomes available globally
3. Client assets bundled and served by server
4. First `gmp start` creates config directory

---

## 🛠️ Development Setup

```bash
# Clone repo
git clone https://github.com/yourusername/git-manager-pro.git
cd git-manager-pro

# Install dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Build client
cd client && npm run build && cd ..

# Link package globally for testing
npm link

# Start development
# Terminal 1: Server
npm run dev:server

# Terminal 2: Client
cd client && npm run dev

# Test CLI commands
gmp init
gmp start
```

---

## 🐛 Known Challenges & Solutions

### Challenge 1: Multiple Git Providers
**Solution**: Abstract git provider API calls behind a unified interface. Create adapters for GitHub, GitLab, Bitbucket.

### Challenge 2: Large Repositories
**Solution**: Implement pagination for commits, lazy load git history, cache frequently accessed data.

### Challenge 3: Concurrent Git Operations
**Solution**: Queue git operations per project, prevent simultaneous operations on same repo.

### Challenge 4: Cross-platform Compatibility
**Solution**: Test on Windows, macOS, Linux. Use `path.resolve()` for all paths, handle line endings.

### Challenge 5: Background Service Management
**Solution**: Use PM2 or similar process manager, or implement simple PID file management.

---

## 📚 Resources & References

### Libraries Documentation
- [simple-git](https://github.com/steveukx/git-js)
- [commander.js](https://github.com/tj/commander.js)
- [Fastify](https://www.fastify.io/)
- [React Query](https://tanstack.com/query/latest)
- [GitGraph.js](https://gitgraphjs.com/)

### Git API Documentation
- [GitHub REST API](https://docs.github.com/en/rest)
- [GitLab API](https://docs.gitlab.com/ee/api/)
- [Bitbucket API](https://developer.atlassian.com/cloud/bitbucket/rest/)

---

## 🎯 Success Metrics

### Technical Goals
- ✅ CLI initialization under 500ms
- ✅ Dashboard loads in under 2s
- ✅ Real-time updates within 200ms
- ✅ Support 50+ projects simultaneously
- ✅ Memory usage under 200MB

### User Experience Goals
- ✅ One-command project initialization
- ✅ Zero-config for basic usage
- ✅ Visual git graph for complex histories
- ✅ Quick actions accessible in under 2 clicks

---

## 📝 Next Steps for Cursor Agent

1. **Start with CLI setup**: Create the basic commander structure and `init` command
2. **Implement config management**: Global config file + per-project config
3. **Build minimal server**: Fastify server with basic project listing endpoint
4. **Create React scaffold**: Basic Vite + React app with project list
5. **Integrate simple-git**: Implement core git operations
6. **Add real-time updates**: WebSocket connection for live status

Would you like me to start with any specific component?