import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitBranch, 
  GitCommit, 
  AlertCircle, 
  CheckCircle, 
  Settings,
  BarChart3,
  Clock,
  TrendingUp,
  Activity,
  FileText,
  Code,
  CheckSquare
} from 'lucide-react';
import { api } from '../services/api';
import { CodeDiffViewer } from './CodeDiffViewer';
import { TaskCommitLinker } from './TaskCommitLinker';
import { SplitText, SplitTextPresets } from './ui/SplitText';

type TabType = 'overview' | 'tasks' | 'commits' | 'diffs' | 'metrics' | 'settings';

export const EnhancedProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

  // Update active tab based on URL
  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    if (pathSegments.length >= 3) {
      const tabFromUrl = pathSegments[2] as TabType;
      if (['overview', 'tasks', 'commits', 'diffs', 'metrics', 'settings'].includes(tabFromUrl)) {
        setActiveTab(tabFromUrl);
      }
    } else {
      setActiveTab('overview');
    }
  }, [location.pathname]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'overview') {
      navigate(`/project/${id}`);
    } else {
      navigate(`/project/${id}/${tab}`);
    }
  };

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.getProject(id!),
    enabled: !!id,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches', id],
    queryFn: () => api.getBranches(id!),
    enabled: !!id,
  });

  const { data: commits } = useQuery({
    queryKey: ['commits', id],
    queryFn: () => api.getCommits(id!, 20),
    enabled: !!id,
  });

  const { data: metrics } = useQuery({
    queryKey: ['metrics', id],
    queryFn: () => api.getProjectMetrics(id!),
    enabled: !!id,
  });

  const { data: commitDiff } = useQuery({
    queryKey: ['commit-diff', id, selectedCommit],
    queryFn: () => api.getCommitDiff(id!, selectedCommit!),
    enabled: !!id && !!selectedCommit,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">Project not found</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'commits', label: 'Commits', icon: GitCommit },
    { id: 'diffs', label: 'Diffs', icon: Code },
    { id: 'metrics', label: 'Metrics', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab project={project} branches={branches || []} commits={commits || []} metrics={metrics} />;
      case 'tasks':
        return <TaskCommitLinker projectId={project.id} />;
      case 'commits':
        return <CommitsTab commits={commits || []} onCommitSelect={setSelectedCommit} />;
      case 'diffs':
        return <DiffsTab commitDiff={commitDiff || []} selectedCommit={selectedCommit} />;
      case 'metrics':
        return <MetricsTab metrics={metrics} />;
      case 'settings':
        return <SettingsTab projectId={project.id} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Project Header */}
      <div className="p-6 border-b border-border bg-gradient-to-r from-muted/50 to-accent/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <SplitText 
              text={project.name} 
              config={SplitTextPresets.title}
              as="h2"
              className="text-3xl font-bold text-foreground"
            />
            <p className="text-muted-foreground mt-1">{project.path}</p>
          </div>
          <div className="flex items-center space-x-2">
            {project.status.isClean ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : (
              <AlertCircle className="h-6 w-6 text-yellow-500" />
            )}
            <span className="text-sm font-medium">
              {project.status.isClean ? 'Clean' : `${project.status.files.length} changes`}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-6 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <GitBranch className="h-4 w-4" />
            <span>{project.currentBranch}</span>
          </div>
          {project.remoteUrl && (
            <div className="flex items-center space-x-1">
              <span>Remote: {project.remoteUrl}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>Last sync: {new Date(project.lastSync).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{
  project: any;
  branches: any[];
  commits: any[];
  metrics: any;
}> = ({ project, branches, commits, metrics }) => {
  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-card border border-border rounded-lg shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className="text-2xl font-bold text-foreground">
                {project.status.isClean ? 'Clean' : 'Dirty'}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {project.status.files.length} uncommitted changes
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-card border border-border rounded-lg shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Branches</p>
              <p className="text-2xl font-bold text-foreground">{branches?.length || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <GitBranch className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {branches?.filter(b => b.current).length || 0} active
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="p-6 bg-card border border-border rounded-lg shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Commits</p>
              <p className="text-2xl font-bold text-foreground">{commits?.length || 0}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <GitCommit className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {metrics?.commitsThisWeek || 0} this week
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="p-6 bg-card border border-border rounded-lg shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tasks</p>
              <p className="text-2xl font-bold text-foreground">{metrics?.totalTasks || 0}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <CheckSquare className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {metrics?.completedTasks || 0} completed
          </p>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg shadow-sm">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold">Recent Commits</h3>
          </div>
          <div className="p-6">
            {commits && commits.length > 0 ? (
              <div className="space-y-4">
                {commits.slice(0, 5).map((commit, index) => (
                  <motion.div
                    key={commit.hash}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-3 p-3 hover:bg-accent rounded-lg transition-colors"
                  >
                    <GitCommit className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {commit.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {commit.author} • {new Date(commit.date).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {commit.hash.substring(0, 7)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No commits found</p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-sm">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold">Branches</h3>
          </div>
          <div className="p-6">
            {branches && branches.length > 0 ? (
              <div className="space-y-3">
                {branches.map((branch, index) => (
                  <motion.div
                    key={branch.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      branch.current ? 'bg-blue-50 border border-blue-200' : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                      <span className={`font-medium ${branch.current ? 'text-blue-700' : 'text-foreground'}`}>
                        {branch.name}
                      </span>
                    </div>
                    {branch.current && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        current
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No branches found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Commits Tab Component
const CommitsTab: React.FC<{
  commits: any[];
  onCommitSelect: (commitHash: string) => void;
}> = ({ commits, onCommitSelect }) => {
  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="space-y-4">
        {commits?.map((commit, index) => (
          <motion.div
            key={commit.hash}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onCommitSelect(commit.hash)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-2">{commit.message}</h4>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{commit.author}</span>
                  <span>{new Date(commit.date).toLocaleString()}</span>
                  <span className="font-mono">{commit.hash.substring(0, 7)}</span>
                </div>
              </div>
              <button className="p-2 text-muted-foreground hover:text-muted-foreground">
                <FileText className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Diffs Tab Component
const DiffsTab: React.FC<{
  commitDiff: any[];
  selectedCommit: string | null;
}> = ({ commitDiff, selectedCommit }) => {
  if (!selectedCommit) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Select a commit to view changes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <CodeDiffViewer diffs={commitDiff || []} commitHash={selectedCommit} />
    </div>
  );
};

// Metrics Tab Component
const MetricsTab: React.FC<{
  metrics: any;
}> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No metrics available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Task Metrics */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Task Progress</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Total Tasks</span>
              <span className="font-semibold">{metrics.totalTasks}</span>
            </div>
            <div className="flex justify-between">
              <span>Completed</span>
              <span className="font-semibold text-green-600">{metrics.completedTasks}</span>
            </div>
            <div className="flex justify-between">
              <span>In Progress</span>
              <span className="font-semibold text-blue-600">{metrics.inProgressTasks}</span>
            </div>
            <div className="flex justify-between">
              <span>Overdue</span>
              <span className="font-semibold text-red-600">{metrics.overdueTasks}</span>
            </div>
          </div>
        </div>

        {/* Commit Metrics */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Commit Activity</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Total Commits</span>
              <span className="font-semibold">{metrics.totalCommits}</span>
            </div>
            <div className="flex justify-between">
              <span>This Week</span>
              <span className="font-semibold">{metrics.commitsThisWeek}</span>
            </div>
            <div className="flex justify-between">
              <span>Contributors</span>
              <span className="font-semibold">{metrics.activeContributors}</span>
            </div>
          </div>
        </div>

        {/* Code Quality */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Code Quality</h3>
          <div className="space-y-3">
            {metrics.codeQuality?.testCoverage && (
              <div className="flex justify-between">
                <span>Test Coverage</span>
                <span className="font-semibold">{metrics.codeQuality.testCoverage}%</span>
              </div>
            )}
            {metrics.codeQuality?.complexity && (
              <div className="flex justify-between">
                <span>Complexity</span>
                <span className="font-semibold">{metrics.codeQuality.complexity}</span>
              </div>
            )}
            {metrics.codeQuality?.maintainability && (
              <div className="flex justify-between">
                <span>Maintainability</span>
                <span className="font-semibold">{metrics.codeQuality.maintainability}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Settings Tab Component
const SettingsTab: React.FC<{
  projectId: string;
}> = () => {
  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-2xl">
        <h3 className="text-lg font-semibold mb-6">Project Settings</h3>
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h4 className="font-medium mb-4">General</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="w-full p-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h4 className="font-medium mb-4">Sync Settings</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Auto Sync</label>
                  <p className="text-xs text-muted-foreground">Automatically sync with git repository</p>
                </div>
                <input type="checkbox" className="rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Sync Interval (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  className="w-20 p-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
