import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Home, FolderOpen, CheckSquare, GitCommit, Code, BarChart3, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const getRouteInfo = (pathname: string): BreadcrumbItem[] => {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: 'Dashboard',
      href: '/',
      icon: <Home className="h-4 w-4" />
    }
  ];

  if (segments.length === 0) {
    return breadcrumbs;
  }

  // Project detail page
  if (segments[0] === 'project' && segments[1]) {
    const projectId = segments[1];
    breadcrumbs.push({
      label: 'Project',
      href: `/project/${projectId}`,
      icon: <FolderOpen className="h-4 w-4" />
    });

    // Check for sub-routes
    if (segments[2]) {
      const subRoute = segments[2];
      const subRouteMap: { [key: string]: { label: string; icon: React.ReactNode } } = {
        'tasks': { label: 'Tasks', icon: <CheckSquare className="h-4 w-4" /> },
        'commits': { label: 'Commits', icon: <GitCommit className="h-4 w-4" /> },
        'diffs': { label: 'Code Diffs', icon: <Code className="h-4 w-4" /> },
        'metrics': { label: 'Metrics', icon: <BarChart3 className="h-4 w-4" /> },
        'settings': { label: 'Settings', icon: <Settings className="h-4 w-4" /> }
      };

      if (subRouteMap[subRoute]) {
        breadcrumbs.push({
          label: subRouteMap[subRoute].label,
          href: `/project/${projectId}/${subRoute}`,
          icon: subRouteMap[subRoute].icon,
          current: true
        });
      }
    } else {
      // Overview page
      breadcrumbs.push({
        label: 'Overview',
        href: `/project/${projectId}`,
        icon: <BarChart3 className="h-4 w-4" />,
        current: true
      });
    }
  }

  return breadcrumbs;
};

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  const location = useLocation();
  const breadcrumbItems = items || getRouteInfo(location.pathname);

  return (
    <nav className={`flex items-center space-x-1 text-sm ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="mx-2 text-muted-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </motion.div>
            )}
            
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center"
            >
              {item.href && !item.current ? (
                <Link
                  to={item.href}
                  className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {item.icon && (
                    <span className="flex-shrink-0">
                      {item.icon}
                    </span>
                  )}
                  <span className="truncate max-w-[120px]">{item.label}</span>
                </Link>
              ) : (
                <div className={`flex items-center space-x-1 ${
                  item.current 
                    ? 'text-foreground font-medium' 
                    : 'text-muted-foreground'
                }`}>
                  {item.icon && (
                    <span className="flex-shrink-0">
                      {item.icon}
                    </span>
                  )}
                  <span className="truncate max-w-[120px]">{item.label}</span>
                </div>
              )}
            </motion.div>
          </li>
        ))}
      </ol>
    </nav>
  );
};

// Hook for getting breadcrumb items
export const useBreadcrumbs = (): BreadcrumbItem[] => {
  const location = useLocation();
  return getRouteInfo(location.pathname);
};

// Preset breadcrumb configurations
export const BreadcrumbPresets = {
  dashboard: [
    { label: 'Dashboard', href: '/', icon: <Home className="h-4 w-4" />, current: true }
  ],
  projectOverview: (projectId: string) => [
    { label: 'Dashboard', href: '/', icon: <Home className="h-4 w-4" /> },
    { label: 'Project', href: `/project/${projectId}`, icon: <FolderOpen className="h-4 w-4" /> },
    { label: 'Overview', icon: <BarChart3 className="h-4 w-4" />, current: true }
  ],
  projectTasks: (projectId: string) => [
    { label: 'Dashboard', href: '/', icon: <Home className="h-4 w-4" /> },
    { label: 'Project', href: `/project/${projectId}`, icon: <FolderOpen className="h-4 w-4" /> },
    { label: 'Tasks', icon: <CheckSquare className="h-4 w-4" />, current: true }
  ],
  projectCommits: (projectId: string) => [
    { label: 'Dashboard', href: '/', icon: <Home className="h-4 w-4" /> },
    { label: 'Project', href: `/project/${projectId}`, icon: <FolderOpen className="h-4 w-4" /> },
    { label: 'Commits', icon: <GitCommit className="h-4 w-4" />, current: true }
  ],
  projectDiffs: (projectId: string) => [
    { label: 'Dashboard', href: '/', icon: <Home className="h-4 w-4" /> },
    { label: 'Project', href: `/project/${projectId}`, icon: <FolderOpen className="h-4 w-4" /> },
    { label: 'Code Diffs', icon: <Code className="h-4 w-4" />, current: true }
  ],
  projectMetrics: (projectId: string) => [
    { label: 'Dashboard', href: '/', icon: <Home className="h-4 w-4" /> },
    { label: 'Project', href: `/project/${projectId}`, icon: <FolderOpen className="h-4 w-4" /> },
    { label: 'Metrics', icon: <BarChart3 className="h-4 w-4" />, current: true }
  ],
  projectSettings: (projectId: string) => [
    { label: 'Dashboard', href: '/', icon: <Home className="h-4 w-4" /> },
    { label: 'Project', href: `/project/${projectId}`, icon: <FolderOpen className="h-4 w-4" /> },
    { label: 'Settings', icon: <Settings className="h-4 w-4" />, current: true }
  ]
};
