import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitBranch, 
  GitCommit, 
  AlertCircle, 
  Settings,
  BarChart3,
  TrendingUp,
  FileText,
  Code,
  CheckSquare,
  Search,
  Plus,
  Users,
  CalendarDays,
  MoreHorizontal,
  FolderKanban,
} from 'lucide-react';
import { api } from '../services/api';
import { CodeDiffViewer } from './CodeDiffViewer';
import { TaskCommitLinker } from './TaskCommitLinker';
import { emitToast } from './ui/Toast';

type TabType = 'overview' | 'tasks' | 'commits' | 'diffs' | 'metrics' | 'settings';

export const EnhancedProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);

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
    refetchInterval: 5000,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches', id],
    queryFn: () => api.getBranches(id!, { all: true }),
    enabled: !!id,
    refetchInterval: 7000,
  });

  const { data: commits } = useQuery({
    queryKey: ['commits', id],
    queryFn: () => api.getCommits(id!, 20),
    enabled: !!id,
    refetchInterval: 7000,
  });

  const { data: contributionCommits } = useQuery({
    queryKey: ['commits-contribution', id],
    queryFn: () => api.getCommits(id!, 1500, { all: true }),
    enabled: !!id,
    refetchInterval: 15000,
  });

  const { data: metrics } = useQuery({
    queryKey: ['metrics', id],
    queryFn: () => api.getProjectMetrics(id!),
    enabled: !!id,
    refetchInterval: 10000,
  });

  const { data: gitStatus } = useQuery({
    queryKey: ['git-status', id],
    queryFn: () => api.getGitStatus(id!),
    enabled: !!id,
    refetchInterval: 3000,
  });

  const { data: commitDiff } = useQuery({
    queryKey: ['commit-diff', id, selectedCommit],
    queryFn: () => api.getCommitDiff(id!, selectedCommit!),
    enabled: !!id && !!selectedCommit,
  });

  const checkoutBranchMutation = useMutation({
    mutationFn: (branchName: string) => api.checkoutBranch(id!, branchName),
    onSuccess: (_data, branchName) => {
      setBranchMenuOpen(false);
      emitToast(`Switched to ${branchName}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['branches', id] });
      queryClient.invalidateQueries({ queryKey: ['commits', id] });
      queryClient.invalidateQueries({ queryKey: ['metrics', id] });
    },
    onError: () => {
      emitToast('Failed to switch branch', 'error');
    }
  });

  const buildBranchOptions = (allBranches: any[]) => {
    const byDisplayName = new Map<string, { displayName: string; checkoutName: string; current: boolean; isRemote: boolean }>();

    for (const branch of allBranches) {
      const rawName = String(branch.name || '');
      const isRemote = rawName.startsWith('remotes/');
      const displayName = isRemote ? rawName.replace(/^remotes\/[^/]+\//, '') : rawName;
      const checkoutName = rawName;

      const existing = byDisplayName.get(displayName);
      if (!existing) {
        byDisplayName.set(displayName, {
          displayName,
          checkoutName,
          current: !!branch.current,
          isRemote,
        });
        continue;
      }

      // Prefer local branch entries over remote duplicates.
      if (existing.isRemote && !isRemote) {
        byDisplayName.set(displayName, {
          displayName,
          checkoutName,
          current: !!branch.current,
          isRemote,
        });
      } else if (branch.current) {
        existing.current = true;
      }
    }

    return Array.from(byDisplayName.values()).sort((a, b) => {
      if (a.current !== b.current) return a.current ? -1 : 1;
      if (a.isRemote !== b.isRemote) return a.isRemote ? 1 : -1;
      return a.displayName.localeCompare(b.displayName);
    });
  };

  const branchOptions = buildBranchOptions(branches || []);
  const liveStatus = gitStatus || project?.status || { isClean: true, files: [] };
  const startDate = project?.startedAt ? new Date(project.startedAt) : null;
  const hasValidStartDate = !!startDate && !Number.isNaN(startDate.getTime());
  const startedDateLabel = hasValidStartDate ? startDate.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }) : 'Unknown start date';

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-branch-switcher="true"]')) {
        setBranchMenuOpen(false);
      }
    };

    if (branchMenuOpen) {
      document.addEventListener('click', onDocumentClick);
    }

    return () => {
      document.removeEventListener('click', onDocumentClick);
    };
  }, [branchMenuOpen]);

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
        return <OverviewTab project={project} liveStatus={liveStatus} branches={branches || []} commits={commits || []} contributionCommits={contributionCommits || []} metrics={metrics} />;
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
    <div className="h-full flex flex-col bg-background">
      {/* Workspace Header */}
      <div className="px-4 pt-4 md:px-6 md:pt-6">
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FolderKanban className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground md:text-xl">{project.name}</h2>
                <p className="text-xs text-muted-foreground md:text-sm">{project.path}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:bg-accent">
                <Users className="h-4 w-4" />
                Invite
              </button>
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-input bg-background text-foreground hover:bg-accent">
                <Plus className="h-4 w-4" />
              </button>
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-input bg-background text-foreground hover:bg-accent">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:bg-accent">
                <CalendarDays className="h-4 w-4 text-primary" />
                {startedDateLabel}
              </button>
              <div className="relative" data-branch-switcher="true">
                <button
                  onClick={() => setBranchMenuOpen((prev) => !prev)}
                  disabled={checkoutBranchMutation.isPending}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <GitBranch className="h-4 w-4 text-primary" />
                  {checkoutBranchMutation.isPending ? 'Switching...' : project.currentBranch}
                </button>
                {branchMenuOpen && (
                  <div className="absolute left-0 z-30 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                    <div className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
                      {branchOptions.map((branch) => (
                        <button
                          key={branch.checkoutName}
                          onClick={() => checkoutBranchMutation.mutate(branch.checkoutName)}
                          disabled={checkoutBranchMutation.isPending || branch.current}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                            branch.current
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground hover:bg-accent'
                          } disabled:cursor-not-allowed disabled:opacity-70`}
                        >
                          <span className="truncate">{branch.displayName}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {branch.current ? 'current' : branch.isRemote ? 'remote' : ''}
                          </span>
                        </button>
                      ))}
                      {branchOptions.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">No branches available</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                {liveStatus.isClean ? 'Clean tree' : `${liveStatus.files.length} changed`}
              </span>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                readOnly
                value=""
                placeholder="Type / to search repository"
                className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 pt-3 md:px-6">
        <nav className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
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
      <div className="flex-1 overflow-hidden px-4 py-3 md:px-6 md:py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full rounded-2xl border border-border bg-card shadow-sm"
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
  liveStatus: any;
  branches: any[];
  commits: any[];
  contributionCommits: any[];
  metrics: any;
}> = ({ project, liveStatus, branches, commits, contributionCommits, metrics }) => {
  const currentYear = new Date().getFullYear();
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const parseCommitDate = (value: unknown): Date | null => {
    if (!value) return null;
    const raw = String(value).trim();
    const direct = new Date(raw);
    if (!Number.isNaN(direct.getTime())) return direct;

    // Handle git date variants like "2025-02-12 10:15:30 +0000"
    const normalized = raw.replace(/^(\d{4}-\d{2}-\d{2})\s/, '$1T');
    const fallback = new Date(normalized);
    if (!Number.isNaN(fallback.getTime())) return fallback;
    return null;
  };

  const commitSource = (contributionCommits && contributionCommits.length > 0) ? contributionCommits : commits;
  const parsedCommits = commitSource
    .map((commit: any) => {
      const parsedDate = parseCommitDate(commit.date);
      return parsedDate ? { ...commit, parsedDate } : null;
    })
    .filter((commit: any): commit is any => !!commit);

  const toDateKey = (value: Date) => {
    const y = value.getFullYear();
    const m = `${value.getMonth() + 1}`.padStart(2, '0');
    const d = `${value.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const commitDates = parsedCommits.map((commit: any) => commit.parsedDate as Date);
  const commitYears = Array.from(new Set(commitDates.map((date) => date.getFullYear()))).sort((a, b) => b - a);
  const defaultYear = commitYears.includes(currentYear) ? currentYear : (commitYears[0] || currentYear);
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState<'all' | number>('all');

  useEffect(() => {
    if (commitYears.length === 0) {
      if (selectedYear !== currentYear) setSelectedYear(currentYear);
      return;
    }
    if (!commitYears.includes(selectedYear)) {
      setSelectedYear(defaultYear);
      setSelectedMonth('all');
    }
  }, [commitYears, currentYear, selectedYear, defaultYear]);

  const periodStart = selectedMonth === 'all'
    ? new Date(selectedYear, 0, 1)
    : new Date(selectedYear, selectedMonth, 1);
  const periodEnd = selectedMonth === 'all'
    ? new Date(selectedYear, 11, 31, 23, 59, 59, 999)
    : new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);

  const commitsInDisplayPeriod = parsedCommits.filter((commit: any) => {
    const date = commit.parsedDate as Date;
    return date >= periodStart && date <= periodEnd;
  });

  const dailyCommitCounts = commitsInDisplayPeriod.reduce((acc: Record<string, number>, commit: any) => {
    const date = commit.parsedDate as Date;
    const key = toDateKey(date);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const heatmapStart = new Date(periodStart);
  heatmapStart.setDate(heatmapStart.getDate() - heatmapStart.getDay());
  const heatmapEnd = new Date(periodEnd);
  heatmapEnd.setDate(heatmapEnd.getDate() + (6 - heatmapEnd.getDay()));

  const heatmapCells: Array<{ date: Date; count: number }> = [];
  for (let cursor = new Date(heatmapStart); cursor <= heatmapEnd; cursor.setDate(cursor.getDate() + 1)) {
    const date = new Date(cursor);
    const key = toDateKey(date);
    heatmapCells.push({ date, count: dailyCommitCounts[key] || 0 });
  }

  const weeklyHeatmap: Array<Array<{ date: Date; count: number }>> = [];
  for (let i = 0; i < heatmapCells.length; i += 7) {
    weeklyHeatmap.push(heatmapCells.slice(i, i + 7));
  }

  const maxDailyCommits = Math.max(0, ...heatmapCells.map((cell) => cell.count));
  const getHeatLevel = (count: number) => {
    if (count === 0 || maxDailyCommits === 0) return 0;
    const ratio = count / maxDailyCommits;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };
  const heatLevelClass = (level: number) => {
    if (level === 0) return 'bg-muted';
    if (level === 1) return 'bg-primary/20';
    if (level === 2) return 'bg-primary/40';
    if (level === 3) return 'bg-primary/60';
    return 'bg-primary/80';
  };

  const commitByAuthor = commitsInDisplayPeriod.reduce((acc: Record<string, number>, commit: any) => {
    const name = commit.author || 'Unknown';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const activeDaysByAuthor = commitsInDisplayPeriod.reduce((acc: Record<string, Set<string>>, commit: any) => {
    const name = commit.author || 'Unknown';
    const date = toDateKey(commit.parsedDate as Date);
    if (!acc[name]) acc[name] = new Set<string>();
    acc[name].add(date);
    return acc;
  }, {});

  const memberRows = Object.entries(commitByAuthor)
    .map(([name, value]) => ({
      name,
      commits: value,
      contributionDays: activeDaysByAuthor[name]?.size || 0,
      workRate: commitsInDisplayPeriod.length > 0 ? Math.round((value / commitsInDisplayPeriod.length) * 100) : 0,
    }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 6);

  const activityItems = commits.slice(0, 6);

  const statCards = [
    { title: 'Contribute Rate', value: metrics?.activeContributors || 0, suffix: 'team', change: '+8.5%' },
    {
      title: 'Commit Rate',
      value: commitsInDisplayPeriod.length,
      suffix: selectedMonth === 'all' ? `in ${selectedYear}` : `${monthLabels[selectedMonth]} ${selectedYear}`,
      change: '+4.2%'
    },
    { title: 'Hours Rate', value: metrics?.inProgressTasks || 0, suffix: 'active', change: '+2.1%' },
    { title: 'Work Rate', value: metrics?.completedTasks || 0, suffix: 'done', change: liveStatus.isClean ? '+6.4%' : '-3.0%' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="grid h-full grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main Column */}
        <section className="border-r border-border p-4 md:p-5">
          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card, idx) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.title}</p>
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-semibold text-foreground">{card.value}</p>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{card.suffix}</span>
                  <span className={card.change.startsWith('+') ? 'text-primary' : 'text-destructive'}>{card.change}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-foreground">Project Contributors</h3>
              <div className="flex items-center gap-2">
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(Number(e.target.value));
                    setSelectedMonth('all');
                  }}
                  className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus:outline-none"
                >
                  {commitYears.length === 0 && <option value={currentYear}>{currentYear}</option>}
                  {commitYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <select
                  value={selectedMonth === 'all' ? 'all' : selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus:outline-none"
                >
                  <option value="all">All Months</option>
                  {monthLabels.map((label, monthIndex) => (
                    <option key={label} value={monthIndex}>{label}</option>
                  ))}
                </select>
                <button className="rounded-lg border border-input px-3 py-1.5 text-sm text-foreground hover:bg-accent">
                  By Member
                </button>
              </div>
            </div>
            <div className="mb-3 overflow-x-auto custom-scrollbar">
              <div className="inline-flex gap-1.5">
                {weeklyHeatmap.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1.5">
                    {week.map((cell, dayIndex) => {
                      const level = getHeatLevel(cell.count);
                      return (
                        <div
                          key={`${weekIndex}-${dayIndex}`}
                          className={`h-5 w-5 rounded-sm ${heatLevelClass(level)}`}
                          title={`${cell.count} commit${cell.count === 1 ? '' : 's'} on ${cell.date.toLocaleDateString()}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-5 flex items-center justify-between text-xs text-muted-foreground">
              <span>How to Read Contribute</span>
              <span>Less <span className="mx-2 inline-block h-3 w-16 rounded bg-gradient-to-r from-muted to-primary align-middle" /> More</span>
            </div>

            <h4 className="mb-3 text-lg font-semibold text-foreground">Member Status</h4>
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-4 bg-muted px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span>Member</span>
                <span>Contribution</span>
                <span>Commits</span>
                <span>Work Rate</span>
              </div>
              {memberRows.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground">No commit activity yet</div>
              )}
              {memberRows.map((row, idx) => (
                <div key={`${row.name}-${idx}`} className="grid grid-cols-4 items-center border-t border-border px-3 py-2 text-sm">
                  <span className="truncate text-foreground">{row.name}</span>
                  <span className="text-muted-foreground">{row.contributionDays} contribute</span>
                  <span className="text-foreground">{row.commits}</span>
                  <span className="text-primary">{row.workRate}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Rail */}
        <aside className="bg-card p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Latest Activity</h3>
            <button className="rounded-lg border border-input px-2.5 py-1.5 text-xs text-foreground hover:bg-accent">
              Main Branch
            </button>
          </div>
          <div className="space-y-3">
            {activityItems.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No recent commits yet.
              </div>
            )}
            {activityItems.map((item, idx) => (
              <motion.div
                key={item.hash}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.07 }}
                className="rounded-lg border border-border bg-background p-3"
              >
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(item.date).toLocaleDateString()}</span>
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </div>
                <p className="text-sm font-medium text-foreground line-clamp-2">{item.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.author} committed on <span className="text-primary">{item.branch}</span>
                </p>
              </motion.div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-border bg-background p-4">
            <h4 className="mb-3 text-base font-semibold text-foreground">Active Repository</h4>
            <div className="space-y-2">
              <div className="rounded-lg bg-muted p-2.5 text-sm">
                <p className="font-medium text-foreground">{project.name}</p>
                <p className="text-xs text-muted-foreground">{branches.length} branches tracked</p>
              </div>
              {project.remoteUrl && (
                <div className="rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
                  Remote: {project.remoteUrl}
                </div>
              )}
            </div>
          </div>
        </aside>
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
