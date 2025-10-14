import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GitBranch, GitCommit, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();

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
    queryFn: () => api.getCommits(id!, 10),
    enabled: !!id,
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

  return (
    <div className="p-6">
      {/* Project Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{project.name}</h2>
            <p className="text-muted-foreground">{project.path}</p>
          </div>
          <div className="flex items-center space-x-2">
            {project.status.isClean ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            <span className="text-sm">
              {project.status.isClean ? 'Clean' : `${project.status.files.length} changes`}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <GitBranch className="h-4 w-4" />
            <span>{project.currentBranch}</span>
          </div>
          {project.remoteUrl && (
            <div className="flex items-center space-x-1">
              <span>Remote: {project.remoteUrl}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 border border-border rounded-lg bg-card">
          <h3 className="font-semibold mb-2">Status</h3>
          <p className="text-2xl font-bold">
            {project.status.isClean ? 'Clean' : 'Dirty'}
          </p>
          <p className="text-sm text-muted-foreground">
            {project.status.files.length} uncommitted changes
          </p>
        </div>

        <div className="p-4 border border-border rounded-lg bg-card">
          <h3 className="font-semibold mb-2">Branches</h3>
          <p className="text-2xl font-bold">{branches?.length || 0}</p>
          <p className="text-sm text-muted-foreground">
            {branches?.filter(b => b.current).length || 0} active
          </p>
        </div>

        <div className="p-4 border border-border rounded-lg bg-card">
          <h3 className="font-semibold mb-2">Last Sync</h3>
          <p className="text-sm">
            {new Date(project.lastSync).toLocaleString()}
          </p>
          <button className="text-xs text-primary hover:underline">
            <RefreshCw className="h-3 w-3 inline mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branches */}
        <div className="border border-border rounded-lg bg-card">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Branches</h3>
          </div>
          <div className="p-4">
            {branches && branches.length > 0 ? (
              <div className="space-y-2">
                {branches.map((branch) => (
                  <div
                    key={branch.name}
                    className={`flex items-center justify-between p-2 rounded ${
                      branch.current ? 'bg-accent' : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <GitBranch className="h-4 w-4" />
                      <span className={branch.current ? 'font-semibold' : ''}>
                        {branch.name}
                      </span>
                    </div>
                    {branch.current && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                        current
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No branches found</p>
            )}
          </div>
        </div>

        {/* Recent Commits */}
        <div className="border border-border rounded-lg bg-card">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Recent Commits</h3>
          </div>
          <div className="p-4">
            {commits && commits.length > 0 ? (
              <div className="space-y-3">
                {commits.map((commit) => (
                  <div key={commit.hash} className="flex items-start space-x-3">
                    <GitCommit className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {commit.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {commit.author} • {new Date(commit.date).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {commit.hash.substring(0, 7)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No commits found</p>
            )}
          </div>
        </div>
      </div>

      {/* Uncommitted Changes */}
      {!project.status.isClean && (
        <div className="mt-6 border border-border rounded-lg bg-card">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Uncommitted Changes</h3>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {project.status.files.map((file, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded">
                    {file.status}
                  </span>
                  <span className="text-sm">{file.file}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}