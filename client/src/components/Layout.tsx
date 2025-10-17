import { ReactNode } from 'react';
import { GitBranch, Settings, Search } from 'lucide-react';
import { Breadcrumb } from './ui/Breadcrumb';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-2">
            <GitBranch className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Git Manager Pro</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search projects..."
                className="h-9 w-64 rounded-md border border-input bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button className="rounded-md p-2 hover:bg-accent">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Breadcrumb Navigation */}
        <div className="border-t border-border bg-muted/30 px-6 py-3">
          <Breadcrumb />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
