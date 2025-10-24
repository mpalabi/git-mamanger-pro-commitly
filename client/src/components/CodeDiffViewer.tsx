import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Plus, 
  Minus, 
  ArrowRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { CodeDiff, DiffChange } from '../types';
import { SplitText, SplitTextPresets } from './ui/SplitText';

interface CodeDiffViewerProps {
  diffs: CodeDiff[];
  commitHash?: string;
  className?: string;
}

export const CodeDiffViewer: React.FC<CodeDiffViewerProps> = ({
  diffs,
  commitHash,
  className = ''
}) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(
    diffs.length > 0 ? diffs[0].file : null
  );
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());


  const toggleFileCollapse = (fileName: string) => {
    setCollapsedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileName)) {
        newSet.delete(fileName);
      } else {
        newSet.add(fileName);
      }
      return newSet;
    });
  };

  const isFileCollapsed = (fileName: string) => {
    return collapsedFiles.has(fileName);
  };


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadDiff = () => {
    const diffText = diffs.map(diff => 
      `--- ${diff.file}\n+++ ${diff.file}\n${diff.changes.map(change => 
        `${change.type === 'added' ? '+' : change.type === 'removed' ? '-' : ' '}${change.content}`
      ).join('\n')}`
    ).join('\n\n');
    
    const blob = new Blob([diffText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diff-${commitHash || 'changes'}.patch`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getChangeIcon = (type: DiffChange['type']) => {
    switch (type) {
      case 'added':
        return <Plus className="h-3 w-3 text-green-400" />;
      case 'removed':
        return <Minus className="h-3 w-3 text-red-400" />;
      case 'modified':
        return <ArrowRight className="h-3 w-3 text-blue-400" />;
    }
  };

  const getChangeColor = (type: DiffChange['type']) => {
    switch (type) {
      case 'added':
        return 'bg-green-500/10 border-l-4 border-green-500';
      case 'removed':
        return 'bg-red-500/10 border-l-4 border-red-500';
      case 'modified':
        return 'bg-blue-500/10 border-l-4 border-blue-500';
    }
  };

  const getStats = (diff: CodeDiff) => {
    const added = diff.changes.filter(c => c.type === 'added').length;
    const removed = diff.changes.filter(c => c.type === 'removed').length;
    return { added, removed };
  };

  const highlightCode = (content: string, _language: string) => {
    // For now, just return the clean content without HTML artifacts
    // We can add proper syntax highlighting later with a dedicated library
    return content;
  };

  return (
    <div className={`bg-card rounded-lg border border-border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <SplitText 
              text="Code Changes" 
              config={SplitTextPresets.subtitle}
              as="h3"
              className="text-lg font-semibold"
            />
            {commitHash && (
              <span className="px-2 py-1 bg-muted text-foreground text-xs rounded font-mono">
                {commitHash.substring(0, 7)}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Toggle line numbers"
            >
              {showLineNumbers ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button
              onClick={downloadDiff}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Download diff"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* File List */}
        <div className="flex flex-wrap gap-2">
          {diffs.map((diff, index) => {
            const stats = getStats(diff);
            
            return (
              <motion.button
                key={diff.file}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedFile(diff.file)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  selectedFile === diff.file
                    ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                    : 'bg-muted border-border hover:bg-muted'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium truncate max-w-32">
                  {diff.file.split('/').pop()}
                </span>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-green-400">+{stats.added}</span>
                  <span className="text-red-400">-{stats.removed}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          <div className="p-4 space-y-4">
            {diffs.map((diff, index) => {
              const isCollapsed = isFileCollapsed(diff.file);
              const stats = getStats(diff);
              
              return (
                <motion.div
                  key={diff.file}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  {/* File Header - Collapsible */}
                  <div 
                    className="flex items-center justify-between p-3 bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => toggleFileCollapse(diff.file)}
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                      <FileText className="h-4 w-4 text-foreground" />
                      <span className="font-medium text-foreground">{diff.file}</span>
                      <span className="px-2 py-1 bg-background text-foreground text-xs rounded">
                        {diff.language}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-400">+{stats.added}</span>
                        <span className="text-red-400">-{stats.removed}</span>
                        <span className="text-muted-foreground">{stats.added + stats.removed} changes</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(diff.newContent);
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy file content"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* File Content - Collapsible */}
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4">
                          {/* Diff Lines */}
                          <div className="font-mono text-sm">
                            {diff.changes.map((change, changeIndex) => (
                              <motion.div
                                key={changeIndex}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: changeIndex * 0.02 }}
                                className={`flex items-start gap-2 p-2 ${getChangeColor(change.type)}`}
                              >
                                {showLineNumbers && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-24 flex-shrink-0">
                                    {change.oldLineNumber && (
                                      <span className="w-8 text-right font-mono">
                                        {change.oldLineNumber}
                                      </span>
                                    )}
                                    {change.oldLineNumber && change.lineNumber && (
                                      <span className="text-muted-foreground">→</span>
                                    )}
                                    <span className="w-8 text-right font-mono">
                                      {change.lineNumber}
                                    </span>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2 min-w-6">
                                  {getChangeIcon(change.type)}
                                </div>
                                
                                <div className="flex-1">
                                  <pre className={`font-mono text-sm text-foreground whitespace-pre-wrap break-words ${change.type === 'removed' ? 'line-through opacity-70' : ''}`}>
                                    {highlightCode(change.content, diff.language)}
                                  </pre>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Compact Diff Viewer for inline use
export const CompactDiffViewer: React.FC<{
  diff: CodeDiff;
  maxLines?: number;
}> = ({ diff, maxLines = 10 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleChanges = isExpanded ? diff.changes : diff.changes.slice(0, maxLines);
  const hasMore = diff.changes.length > maxLines;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="p-3 bg-muted border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-foreground" />
            <span className="font-medium text-sm">{diff.file}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-400">
              +{diff.changes.filter(c => c.type === 'added').length}
            </span>
            <span className="text-red-400">
              -{diff.changes.filter(c => c.type === 'removed').length}
            </span>
          </div>
        </div>
      </div>
      
      <div className="font-mono text-xs">
        {visibleChanges.map((change, index) => (
          <div
            key={index}
            className={`flex items-start gap-2 p-1 ${
              change.type === 'added' ? 'bg-green-50' :
              change.type === 'removed' ? 'bg-red-50' :
              'bg-blue-50'
            }`}
          >
            <span className="w-4 text-center">
              {change.type === 'added' ? '+' : change.type === 'removed' ? '-' : ' '}
            </span>
            <span className="flex-1 break-all">
              {change.content}
            </span>
          </div>
        ))}
        
        {hasMore && !isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full p-2 text-center text-muted-foreground hover:bg-muted transition-colors"
          >
            Show {diff.changes.length - maxLines} more changes...
          </button>
        )}
        
        {hasMore && isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="w-full p-2 text-center text-muted-foreground hover:bg-muted transition-colors"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
};
