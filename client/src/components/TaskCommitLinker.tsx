import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, 
  GitCommit, 
  Link, 
  Unlink, 
  Search, 
  Filter,
  Clock,
  User,
  Hash,
  Calendar,
  FileText,
  Code,
  Eye,
  Link2,
  CheckCircle2,
  Circle,
  X,
  Edit3,
  Plus
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Task } from '../types';
import { TaskModal } from './TaskModal';

interface TaskCommitLinkerProps {
  projectId: string;
}


export const TaskCommitLinker: React.FC<TaskCommitLinkerProps> = ({ projectId }) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedCommits, setSelectedCommits] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [commitSearchTerm, setCommitSearchTerm] = useState('');
  const [showLinkedOnly, setShowLinkedOnly] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [showCombinedDiff, setShowCombinedDiff] = useState(false);
  const [combinedDiffs, setCombinedDiffs] = useState<any[]>([]);

  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => api.getTasks(projectId),
  });

  // Fetch commits
  const { data: commits = [], isLoading: commitsLoading } = useQuery({
    queryKey: ['commits', projectId],
    queryFn: () => api.getCommits(projectId, 50),
  });

  // Fetch project info
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.getProject(projectId),
  });

  // Link commit to task mutation
  const linkCommitMutation = useMutation({
    mutationFn: ({ taskId, commitHash }: { taskId: string; commitHash: string }) =>
      api.linkCommitToTask(projectId, taskId, commitHash),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setSelectedCommits([]);
    },
  });

  // Unlink commit from task mutation
  const unlinkCommitMutation = useMutation({
    mutationFn: ({ taskId, commitHash }: { taskId: string; commitHash: string }) =>
      api.unlinkCommitFromTask(projectId, taskId, commitHash),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  // Filter tasks based on search
  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter commits based on search and linked status
  const filteredCommits = commits.filter(commit => {
    const matchesSearch = commit.message.toLowerCase().includes(commitSearchTerm.toLowerCase()) ||
                         commit.hash.toLowerCase().includes(commitSearchTerm.toLowerCase()) ||
                         commit.author.toLowerCase().includes(commitSearchTerm.toLowerCase());
    
    if (showLinkedOnly && selectedTask) {
      const isLinked = selectedTask.commits.some(c => c.commitHash === commit.hash);
      return matchesSearch && isLinked;
    }
    
    return matchesSearch;
  });

  // Handle commit selection
  const handleCommitSelect = (commitHash: string) => {
    setSelectedCommits(prev => 
      prev.includes(commitHash) 
        ? prev.filter(hash => hash !== commitHash)
        : [...prev, commitHash]
    );
  };

  // Handle linking commits to selected task
  const handleLinkCommits = () => {
    if (!selectedTask || selectedCommits.length === 0) return;
    
    selectedCommits.forEach(commitHash => {
      linkCommitMutation.mutate({ taskId: selectedTask.id, commitHash });
    });
  };

  // Handle unlinking commit from task
  const handleUnlinkCommit = (commitHash: string) => {
    if (!selectedTask) return;
    unlinkCommitMutation.mutate({ taskId: selectedTask.id, commitHash });
  };

  const handleViewCombinedDiff = async () => {
    if (selectedCommits.length === 0) return;
    
    try {
      const diffPromises = selectedCommits.map(commitHash => 
        api.getCommitDiff(projectId, commitHash)
      );
      
      const diffs = await Promise.all(diffPromises);
      setCombinedDiffs(diffs.flat());
      setShowCombinedDiff(true);
    } catch (error) {
      console.error('Error fetching combined diffs:', error);
    }
  };

  // Check if commit is linked to selected task
  const isCommitLinked = (commitHash: string) => {
    return selectedTask?.commits.some(c => c.commitHash === commitHash) || false;
  };

  // Get task status color (GitHub/GitLab inspired)
  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'in-progress': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'blocked': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const stripHtmlTags = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  return (
    <div className="h-full flex bg-background w-full">
      {/* Left Column - Tasks */}
      <div className="w-80 border-r border-border bg-card flex flex-col flex-shrink-0">
        {/* Tasks Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Tasks</h2>
            </div>
            <button
              onClick={() => {
                // Open modal for creating a new task (pass null to indicate new task)
                setTaskToEdit(null);
                setTaskModalOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all text-sm font-medium"
              title="Create new task"
            >
              <Plus className="h-4 w-4" />
              New Task
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-10 pr-4 bg-background border border-input rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Tasks List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence>
            {filteredTasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 border-b border-border cursor-pointer transition-all duration-200 hover:bg-accent/50 hover:shadow-sm group ${
                  selectedTask?.id === task.id ? 'bg-accent border-l-4 border-l-primary shadow-sm' : ''
                }`}
                onClick={() => setSelectedTask(task)}
                onDoubleClick={() => {
                  setTaskToEdit(task);
                  setTaskModalOpen(true);
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <h3 className="font-medium text-foreground line-clamp-2">{task.title}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaskToEdit(task);
                        setTaskModalOpen(true);
                      }}
                      className="p-1 text-primary hover:text-primary-foreground hover:bg-primary rounded-md transition-all flex-shrink-0"
                      title="Edit task (or double-click)"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className={`px-2 py-1 text-xs rounded-full border ${getTaskStatusColor(task.status)}`}>
                      {task.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>
                
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {stripHtmlTags(task.description)}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className={`${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {task.commits.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Link2 className="h-3 w-3" />
                        <span>{task.commits.length}</span>
                        {selectedTask?.id === task.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Unlink all commits from this task
                              task.commits.forEach(commit => {
                                handleUnlinkCommit(commit.commitHash);
                              });
                            }}
                            className="ml-2 p-1 text-red-400 hover:bg-red-400/10 rounded text-xs"
                            title="Unlink all commits"
                          >
                            <Unlink className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Open Task Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaskToEdit(task);
                        setTaskModalOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-md border border-primary transition-all font-medium"
                      title="Open task details"
                    >
                      Open Task
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredTasks.length === 0 && !tasksLoading && (
            <div className="p-8 text-center text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No tasks found</p>
            </div>
          )}
        </div>
      </div>

      {/* Middle Column - Commits */}
      <div className="w-96 border-r border-border bg-card flex flex-col flex-shrink-0">
        {/* Commits Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <GitCommit className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              Commits for {project?.currentBranch || 'main'}
            </h2>
          </div>
          
          {/* Search and Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search commits..."
                value={commitSearchTerm}
                onChange={(e) => setCommitSearchTerm(e.target.value)}
                className="w-full h-9 pl-10 pr-4 bg-background border border-input rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLinkedOnly(!showLinkedOnly)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  showLinkedOnly 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                <Filter className="h-3 w-3" />
                Linked Only
              </button>
              
              {selectedCommits.length > 0 && (
                <button
                  onClick={handleLinkCommits}
                  disabled={!selectedTask || linkCommitMutation.isPending}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md border border-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Link className="h-3 w-3" />
                  Link ({selectedCommits.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Commits List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence>
            {filteredCommits.map((commit) => {
              const isLinked = isCommitLinked(commit.hash);
              const isSelected = selectedCommits.includes(commit.hash);
              
              return (
                <motion.div
                  key={commit.hash}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-3 border-b border-border cursor-pointer transition-all duration-200 hover:bg-accent/50 hover:shadow-sm ${
                    isSelected ? 'bg-primary/10 border-l-4 border-l-primary shadow-sm' : ''
                  } ${isLinked ? 'bg-green-500/5 border-l-2 border-l-green-500/30' : ''}`}
                  onClick={() => handleCommitSelect(commit.hash)}
                >
                  <div className="flex items-start gap-3">
                    {/* Selection indicator */}
                    <div className="mt-1">
                      {isSelected ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Commit message */}
                      <p className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                        {commit.message}
                      </p>
                      
                      {/* Commit metadata */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          <span className="font-mono">{commit.hash.substring(0, 7)}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{commit.author}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(commit.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      {/* Linked indicator */}
                      {isLinked && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
                          <Link2 className="h-3 w-3" />
                          <span>Linked to task</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      {isLinked && selectedTask && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnlinkCommit(commit.hash);
                          }}
                          className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md border border-red-400/20 hover:border-red-400/40 transition-all"
                          title="Unlink from task"
                        >
                          <Unlink className="h-3 w-3" />
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Show commit diff
                        }}
                        className="p-1.5 text-muted-foreground hover:bg-accent rounded-md border border-border hover:border-accent transition-all"
                        title="View diff"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {filteredCommits.length === 0 && !commitsLoading && (
            <div className="p-8 text-center text-muted-foreground">
              <GitCommit className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No commits found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Diffs */}
      <div className="flex-1 bg-card flex flex-col">
        {/* Diffs Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Code Diffs</h2>
          </div>
        </div>

        {/* Diffs Content */}
        <div className="flex-1 p-4">
          {selectedCommits.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {selectedCommits.length} commit{selectedCommits.length > 1 ? 's' : ''} selected
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleViewCombinedDiff}
                    className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md border border-primary hover:bg-primary/90"
                  >
                    View Combined Diff
                  </button>
                </div>
              </div>
              
              {/* Commit list for selected commits */}
              <div className="space-y-2">
                {selectedCommits.map(commitHash => {
                  const commit = commits.find(c => c.hash === commitHash);
                  if (!commit) return null;
                  
                  return (
                    <motion.div
                      key={commitHash}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3 bg-muted/30 rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {commit.message}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="font-mono">{commit.hash.substring(0, 7)}</span>
                            <span>{commit.author}</span>
                            <span>{new Date(commit.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedCommits(prev => prev.filter(hash => hash !== commitHash))}
                          className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              
              {/* Combined Diff Viewer */}
              {showCombinedDiff && combinedDiffs.length > 0 ? (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Combined Diff</h3>
                    <button
                      onClick={() => setShowCombinedDiff(false)}
                      className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {combinedDiffs.map((diff, index) => (
                      <div key={index} className="bg-muted/20 rounded-lg border border-border p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{diff.file}</span>
                          <span className="text-xs text-muted-foreground">({diff.language})</span>
                        </div>
                        <div className="bg-background rounded border border-border p-3">
                          <pre className="text-sm text-foreground font-mono whitespace-pre-wrap overflow-x-auto">
                            {diff.changes.map((change: any, changeIndex: number) => (
                              <div key={changeIndex} className={`${
                                change.type === 'added' ? 'text-green-400' :
                                change.type === 'removed' ? 'text-red-400' :
                                'text-foreground'
                              }`}>
                                {change.type === 'added' ? '+' : change.type === 'removed' ? '-' : ' '} {change.content}
                              </div>
                            ))}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-6 p-4 bg-muted/20 rounded-lg border border-border">
                  <div className="text-center text-muted-foreground py-8">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Diff viewer will show changes here</p>
                    <p className="text-xs mt-2">Click "View Combined Diff" to see all changes</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Code className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Select commits to view diffs</p>
              <p className="text-xs mt-2">Choose commits from the middle panel to see their changes</p>
            </div>
          )}
        </div>
      </div>

      {/* Task Modal */}
      <TaskModal
        task={taskToEdit}
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        onSave={(updatedTask) => {
          // Update the selected task if it's the one being edited
          if (selectedTask?.id === updatedTask.id) {
            setSelectedTask(updatedTask);
          }
          // If it's a new task (taskToEdit was null), select it
          if (!taskToEdit) {
            setSelectedTask(updatedTask);
          }
        }}
        onDelete={(taskId) => {
          // Clear selection if the deleted task was selected
          if (selectedTask?.id === taskId) {
            setSelectedTask(null);
          }
        }}
        projectId={projectId}
      />
    </div>
  );
};
