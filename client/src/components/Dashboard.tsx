import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { GitBranch, GitCommit, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { api } from '../services/api';

export function Dashboard() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: api.getProjects,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">Failed to load projects</p>
        </div>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No projects tracked</h3>
          <p className="text-muted-foreground mb-4">
            Initialize Git Manager Pro in your git repositories to get started.
          </p>
          <code className="bg-muted px-3 py-1 rounded text-sm">
            gmp init
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Projects</h2>
        <p className="text-muted-foreground">
          {projects.length} project{projects.length === 1 ? '' : 's'} tracked
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/project/${project.id}`}
            className="block p-6 border border-border rounded-lg bg-card hover:bg-accent transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="min-w-0">
                <h3
                  className="font-semibold text-lg truncate max-w-[16rem] md:max-w-[18rem] lg:max-w-[20rem]"
                  title={project.name}
                >
                  {project.name}
                </h3>
                <p
                  className="text-sm text-muted-foreground truncate max-w-[22rem] md:max-w-[26rem] lg:max-w-[28rem]"
                  title={project.path}
                >
                  {project.path}
                </p>
              </div>
              <div className="flex items-center space-x-1">
                {project.status.isClean ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm min-w-0">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span className="truncate" title={project.currentBranch}>{project.currentBranch}</span>
              </div>

              <div className="flex items-center space-x-2 text-sm">
                <GitCommit className="h-4 w-4 text-muted-foreground" />
                <span>
                  {project.status.isClean ? 'Clean' : `${project.status.files.length} changes`}
                </span>
              </div>

              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {new Date(project.lastSync).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {project.metadata.language && (
              <div className="mt-4">
                <span className="inline-block px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded">
                  {project.metadata.language}
                </span>
                {project.metadata.framework && (
                  <span className="inline-block px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded ml-2">
                    {project.metadata.framework}
                  </span>
                )}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}