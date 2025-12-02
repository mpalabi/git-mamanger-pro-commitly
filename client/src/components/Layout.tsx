import { ReactNode, useEffect, useMemo, useState, useRef } from 'react';
import { GitBranch, Settings, Search, Sun, Moon, Menu, X, FolderGit2, Plus, GitCommit, CheckSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { ToastHub } from './ui/Toast';
import { Breadcrumb } from './ui/Breadcrumb';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('gmp-theme') as 'light' | 'dark' | null;
      if (stored === 'light' || stored === 'dark') return stored;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const location = useLocation();
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<{ tasks: any[]; commits: any[] } | null>(null);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'tasks' | 'commits' | 'projects'>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('gmp-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => setSidebarOpen(true);

  const filteredProjects = useMemo(() => {
    const term = projectSearch.toLowerCase();
    if (!term) return projects;
    return projects.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.path.toLowerCase().includes(term)
    );
  }, [projects, projectSearch]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    closeSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-3 sm:px-3">
          <div className="flex items-center gap-2">
            <button onClick={openSidebar} className="rounded-md p-2 hover:bg-accent lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <GitBranch className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold">Git Manager Pro</span>
            </Link>
          </div>
          <div className="hidden md:block flex-1 mx-6">
            <div className="relative max-w-md" ref={searchBoxRef}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search globally (tasks, commits)..."
                className="h-9 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={globalQuery}
                onChange={(e) => {
                  setGlobalQuery(e.target.value);
                  if (!e.target.value.trim()) {
                    setGlobalResults(null);
                    setShowSearchPanel(false);
                    setSearchLoading(false);
                    setActiveIndex(0);
                    return;
                  }
                  // Debounce live search
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  debounceRef.current = setTimeout(async () => {
                    setSearchLoading(true);
                    try {
                      const res = await api.searchGlobal(e.target.value.trim(), 20);
                      setGlobalResults(res);
                      setShowSearchPanel(true);
                    } catch {
                      // errors are toasted globally via interceptor
                    } finally {
                      setSearchLoading(false);
                    }
                  }, 250);
                }}
                onKeyDown={async (e) => {
                  if (e.key === 'Escape') {
                    setShowSearchPanel(false);
                    (e.target as HTMLInputElement).blur();
                    return;
                  }
                  if (!showSearchPanel) return;
                  const items = computeFlatResults(globalResults, filteredProjects, activeTab);
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveIndex((i) => Math.min(i + 1, items.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveIndex((i) => Math.max(i - 1, 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const item = items[activeIndex];
                    if (item) handleNavigate(item, setShowSearchPanel);
                  }
                }}
                onFocus={() => {
                  if (globalResults && (globalResults.tasks.length || globalResults.commits.length)) {
                    setShowSearchPanel(true);
                  }
                }}
              />
              {showSearchPanel && globalResults && (
                <div className="absolute z-40 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
                  {/* Tabs / Filters */}
                  <div className="flex items-center justify-between px-2 py-2 border-b border-border">
                    <div className="flex items-center gap-2 text-xs">
                      {(['all','tasks','commits','projects'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => { setActiveTab(tab); setActiveIndex(0); }}
                          className={`px-2 py-1 rounded-md border ${activeTab === tab ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-input hover:bg-accent'}`}
                        >
                          {tab[0].toUpperCase() + tab.slice(1)}
                        </button>
                      ))}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {searchLoading ? 'Searching…' : globalQuery ? `Results for "${globalQuery}"` : 'Type to search'}
                    </div>
                  </div>
                  <div className="max-h-96 overflow-auto custom-scrollbar p-2">
                    {(globalResults.tasks.length === 0 && globalResults.commits.length === 0) && (
                      <div className="text-xs text-muted-foreground p-3">No results</div>
                    )}
                    {(activeTab === 'all' || activeTab === 'tasks') && globalResults.tasks.length > 0 && (
                      <div className="mb-2">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 py-1">Tasks</div>
                        <ul className="space-y-1">
                          {globalResults.tasks.map((t, i) => {
                            const flatIndex = getFlatIndex('tasks', i);
                            const active = flatIndex === activeIndex;
                            return (
                            <li key={`t-${t.projectId}-${t.taskId}-${i}`}>
                              <Link
                                to={`/project/${t.projectId}/tasks`}
                                className={`block px-2 py-1 rounded ${active ? 'bg-accent' : 'hover:bg-accent'}`}
                                title={t.title}
                                onClick={() => setShowSearchPanel(false)}
                              >
                                <div className="flex items-center gap-2">
                                  <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                  <div className="min-w-0">
                                    <div className="text-sm truncate">{highlight(t.title, globalQuery)}</div>
                                    <div className="text-[11px] text-muted-foreground truncate">{t.projectName}</div>
                                  </div>
                                </div>
                              </Link>
                            </li>
                          )})}
                        </ul>
                      </div>
                    )}
                    {(activeTab === 'all' || activeTab === 'commits') && globalResults.commits.length > 0 && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 py-1">Commits</div>
                        <ul className="space-y-1">
                          {globalResults.commits.map((c, i) => {
                            const flatIndex = getFlatIndex('commits', i, globalResults.tasks.length);
                            const active = flatIndex === activeIndex;
                            return (
                            <li key={`c-${c.projectId}-${c.hash}-${i}`}>
                              <Link
                                to={`/project/${c.projectId}/commits`}
                                className={`block px-2 py-1 rounded ${active ? 'bg-accent' : 'hover:bg-accent'}`}
                                title={c.message}
                                onClick={() => setShowSearchPanel(false)}
                              >
                                <div className="flex items-center gap-2">
                                  <GitCommit className="h-3.5 w-3.5 text-muted-foreground" />
                                  <div className="min-w-0">
                                    <div className="text-sm truncate">{highlight(c.message, globalQuery)}</div>
                                    <div className="text-[11px] text-muted-foreground truncate">{c.projectName} • {c.hash.substring(0,7)}</div>
                                  </div>
                                </div>
                              </Link>
                            </li>
                          )})}
                        </ul>
                      </div>
                    )}
                    {(activeTab === 'all' || activeTab === 'projects') && filteredProjects.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 py-1">Projects</div>
                        <ul className="space-y-1">
                          {filteredProjects.map((p, i) => {
                            const offset = (activeTab === 'projects') ? 0 : (globalResults.tasks.length + globalResults.commits.length);
                            const flatIndex = offset + i;
                            const active = flatIndex === activeIndex;
                            return (
                            <li key={`p-${p.id}`}>
                              <Link
                                to={`/project/${p.id}`}
                                className={`block px-2 py-1 rounded ${active ? 'bg-accent' : 'hover:bg-accent'}`}
                                title={p.name}
                                onClick={() => setShowSearchPanel(false)}
                              >
                                <div className="flex items-center gap-2">
                                  <FolderGit2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  <div className="min-w-0">
                                    <div className="text-sm truncate">{highlight(p.name, globalQuery)}</div>
                                    <div className="text-[11px] text-muted-foreground truncate">{p.path}</div>
                                  </div>
                                </div>
                              </Link>
                            </li>
                          )})}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-md p-2 hover:bg-accent"
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button className="rounded-md p-2 hover:bg-accent" title="Settings">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
        {/* Breadcrumb */}
        <div className="border-t border-border bg-muted/30 px-4 py-2 sm:px-6">
          <div className="mx-auto px-3 sm:px-3 max-w-screen-2xl">
          <Breadcrumb />
          </div>
        </div>
      </header>

      {/* Body with Sidebar + Content */}
      <div className="mx-auto flex w-full max-w-screen-2xl">
        {/* Desktop Sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-72 shrink-0 border-r border-border bg-card/40 px-3 py-4 lg:block">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Projects</span>
            </div>
            <Link to="/" className="rounded-md p-1 hover:bg-accent" title="New">
              <Plus className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              placeholder="Find a project..."
              className="h-8 w-full rounded-md border border-input bg-background pl-9 pr-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="custom-scrollbar overflow-y-auto pr-1" style={{ maxHeight: 'calc(100% - 70px)' }}>
            {filteredProjects.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">No projects</div>
            ) : (
              <ul className="space-y-1">
                {filteredProjects.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/project/${p.id}`}
                      className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                      title={p.path}
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={closeSidebar}>
            <aside
              className="absolute left-0 top-0 h-full w-72 border-r border-border bg-card px-3 py-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Projects</span>
                </div>
                <button onClick={closeSidebar} className="rounded-md p-1 hover:bg-accent" aria-label="Close menu">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Find a project..."
                  className="h-8 w-full rounded-md border border-input bg-background pl-9 pr-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="custom-scrollbar overflow-y-auto pr-1 h-[calc(100%-84px)]">
                {filteredProjects.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">No projects</div>
                ) : (
                  <ul className="space-y-1">
                    {filteredProjects.map((p) => (
                      <li key={p.id}>
                        <Link
                          to={`/project/${p.id}`}
                          className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                          title={p.path}
                        >
                          {p.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        )}

      {/* Main Content */}
        <main className="min-h-[calc(100vh-3.5rem)] flex-1">
          <div className="mx-auto max-w-screen-2xl p-4 sm:p-6">
        {children}
          </div>
      </main>
      </div>
      <ToastHub />
    </div>
  );
}

// Helpers for search UI
function highlight(text: string, query: string) {
  if (!query) return text;
  try {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);
    return (
      <span>
        {before}
        <span className="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">{match}</span>
        {after}
      </span>
    );
  } catch {
    return text;
  }
}

function getFlatIndex(section: 'tasks' | 'commits', i: number, tasksCount = 0) {
  if (section === 'tasks') return i;
  return tasksCount + i;
}

function computeFlatResults(
  results: { tasks: any[]; commits: any[] } | null,
  projects: any[],
  tab: 'all' | 'tasks' | 'commits' | 'projects'
) {
  if (!results) return [];
  const items: Array<{ type: 'task' | 'commit' | 'project'; data: any }> = [];
  if (tab === 'all' || tab === 'tasks') {
    results.tasks.forEach((t) => items.push({ type: 'task', data: t }));
  }
  if (tab === 'all' || tab === 'commits') {
    results.commits.forEach((c) => items.push({ type: 'commit', data: c }));
  }
  if (tab === 'all' || tab === 'projects') {
    projects.forEach((p) => items.push({ type: 'project', data: p }));
  }
  return items;
}

function handleNavigate(
  item: { type: 'task' | 'commit' | 'project'; data: any },
  close: (v: boolean) => void
) {
  try {
    const anchor = document.createElement('a');
    if (item.type === 'task') {
      anchor.href = `/project/${item.data.projectId}/tasks`;
    } else if (item.type === 'commit') {
      anchor.href = `/project/${item.data.projectId}/commits`;
    } else {
      anchor.href = `/project/${item.data.id}`;
    }
    anchor.click();
    close(false);
  } catch {}
}
