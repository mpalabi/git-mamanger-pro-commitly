import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Edit3, 
  Save, 
  Trash2, 
  Plus, 
  MessageSquare, 
  Paperclip, 
  GitCommit, 
  AlertTriangle, 
  CheckCircle2, 
  Circle, 
  User, 
  Calendar, 
  ChevronDown,
  ChevronRight,
  Send,
  FileText
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Task, Subtask, TaskIssue } from '../types';
import { RichTextEditor } from './ui/RichTextEditor';

interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
  projectId: string;
}

interface Comment {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt?: string;
}

interface Issue {
  id: string;
  title: string;
  description: string;
  type: 'bug' | 'feature' | 'improvement' | 'task';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete,
  projectId
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [newIssue, setNewIssue] = useState<Partial<Issue>>({});
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['details', 'subtasks']));
  const [newTag, setNewTag] = useState('');
  const [activeCommitPicker, setActiveCommitPicker] = useState<string | null>(null);
  const [commitSearchTerm, setCommitSearchTerm] = useState('');
  const [subtasksDirty, setSubtasksDirty] = useState(false);
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const subtaskInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const originalTaskSnapshotRef = useRef<string | null>(null);

  const queryClient = useQueryClient();

  // Load recent commits for linking (compact list)
  const { data: commits = [] } = useQuery({
    queryKey: ['commits', projectId],
    queryFn: () => api.getCommits(projectId, 50),
  });

  // Comments are local in modal
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (task) {
      setEditedTask({ ...task });
      originalTaskSnapshotRef.current = JSON.stringify(task);
      setIsEditing(false);
    } else {
      // Create a new task template when task is null
      const newTask: Task = {
        id: Date.now().toString(), // Temporary ID
        title: 'New Task',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignee: '',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dueDate: '',
        projectId: projectId,
        commits: [],
        subtasks: [],
        attachments: [],
        issues: []
      };
      setEditedTask(newTask);
      originalTaskSnapshotRef.current = JSON.stringify(newTask);
      setIsEditing(true); // Start in editing mode for new tasks
    }
  }, [task, projectId]);

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (newTask: Task) => api.createTask(projectId, newTask),
    onSuccess: (createdTask) => {
      onSave(createdTask);
      setEditedTask(createdTask);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: (updatedTask: Task) => api.updateTask(projectId, updatedTask.id, updatedTask),
    onSuccess: (updatedTask) => {
      onSave(updatedTask);
      setEditedTask(updatedTask);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => api.deleteTask(projectId, taskId),
    onSuccess: () => {
      onDelete(task?.id || '');
      onClose();
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });


  const unlinkCommitMutation = useMutation({
    mutationFn: ({ taskId, commitHash }: { taskId: string; commitHash: string }) =>
      api.unlinkCommitFromTask(projectId, taskId, commitHash),
    onSuccess: (updatedTask) => {
      // Keep modal state in sync immediately
      setEditedTask(updatedTask);
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const linkCommitToSubtaskMutation = useMutation({
    mutationFn: ({ subtaskId, commitHash }: { subtaskId: string; commitHash: string }) =>
      api.linkCommitToSubtask(projectId, editedTask?.id || '', subtaskId, commitHash),
    onSuccess: (updatedTask) => {
      setEditedTask(updatedTask);
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const unlinkCommitFromSubtaskMutation = useMutation({
    mutationFn: ({ subtaskId, commitHash }: { subtaskId: string; commitHash: string }) =>
      api.unlinkCommitFromSubtask(projectId, editedTask?.id || '', subtaskId, commitHash),
    onSuccess: (updatedTask) => {
      setEditedTask(updatedTask);
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const handleSave = () => {
    if (editedTask) {
      // Check if this is a new task (no original task) or an existing task
      if (!task) {
        // Creating a new task
        createTaskMutation.mutate(editedTask);
      } else {
        // Updating an existing task
        updateTaskMutation.mutate(editedTask);
      }
    }
  };

  const handleDelete = () => {
    if (task && window.confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(task.id);
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        content: newComment,
        author: 'Current User', // In real app, get from auth context
        createdAt: new Date().toISOString()
      };
      setComments(prev => [comment, ...prev]);
      setNewComment('');
    }
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim() && editedTask) {
      const subtask: Subtask = {
        id: Date.now().toString(),
        title: newSubtask,
        completed: false,
        createdAt: new Date().toISOString(),
        commits: []
      };
      setEditedTask({
        ...editedTask,
        subtasks: [...editedTask.subtasks, subtask]
      });
      setSubtasksDirty(true);
      setNewSubtask('');
    }
  };

  const handleToggleSubtask = (subtaskId: string) => {
    if (editedTask) {
      setEditedTask({
        ...editedTask,
        subtasks: editedTask.subtasks.map(subtask =>
          subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
        )
      });
      setSubtasksDirty(true);
    }
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    if (editedTask) {
      setEditedTask({
        ...editedTask,
        subtasks: editedTask.subtasks.filter(subtask => subtask.id !== subtaskId)
      });
      setSubtasksDirty(true);
    }
  };

  const handleAddIssue = async () => {
    if (!editedTask || !newIssue.title || !newIssue.description) return;
    const issue: TaskIssue = {
      id: Date.now().toString(),
      title: newIssue.title,
      description: newIssue.description,
      type: (newIssue.type as any) || 'task',
      priority: (newIssue.priority as any) || 'medium',
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated: Task = { ...editedTask, issues: [issue, ...(editedTask.issues || [])] };
    setEditedTask(updated);
    setNewIssue({});
    setShowNewIssue(false);
    if (task) {
      try {
        const saved = await api.updateTask(projectId, editedTask.id, { issues: updated.issues });
        setEditedTask(saved);
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      } catch {}
    }
  };

  const ensureSubtasksPersisted = async () => {
    if (!editedTask || !subtasksDirty) return;
    try {
      const saved = await api.updateTask(projectId, editedTask.id, { subtasks: editedTask.subtasks });
      setEditedTask(saved);
      setSubtasksDirty(false);
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    } catch {}
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const ensureSectionOpen = (section: string) => {
    setExpandedSections(prev => {
      if (prev.has(section)) return prev;
      const next = new Set(prev);
      next.add(section);
      return next;
    });
  };

  const addTag = () => {
    if (newTag.trim() && editedTask && !editedTask.tags.includes(newTag.trim())) {
      setEditedTask(prev => prev ? { 
        ...prev, 
        tags: [...prev.tags, newTag.trim()] 
      } : null);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (editedTask) {
      setEditedTask(prev => prev ? { 
        ...prev, 
        tags: prev.tags.filter(tag => tag !== tagToRemove) 
      } : null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'in-progress': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'blocked': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getIssueTypeColor = (type: string) => {
    switch (type) {
      case 'bug': return 'text-red-400 bg-red-500/10';
      case 'feature': return 'text-blue-400 bg-blue-500/10';
      case 'improvement': return 'text-green-400 bg-green-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-primary" />
                <span className="text-sm text-muted-foreground">TASK-{editedTask?.id.substring(0, 8).toUpperCase()}</span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editedTask?.title || ''}
                  onChange={(e) => setEditedTask(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="text-xl font-semibold bg-transparent border-none outline-none text-foreground"
                  autoFocus
                />
              ) : (
                <h1 className="text-xl font-semibold text-foreground">{editedTask?.title}</h1>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={updateTaskMutation.isPending}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      if (task) {
                        setEditedTask({ ...task });
                        setIsEditing(false);
                      } else {
                        onClose();
                      }
                    }}
                    className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-6">
                {/* Task Details Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSection('details')}
                      className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary"
                    >
                      {expandedSections.has('details') ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      Details
                    </button>
                  </div>
                  
                  {expandedSections.has('details') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      {/* Status and Priority */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Status:</span>
                          {isEditing ? (
                            <select
                              value={editedTask?.status || ''}
                              onChange={(e) => setEditedTask(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                              className="px-3 py-1 bg-background border border-input rounded-md text-sm"
                            >
                              <option value="todo">To Do</option>
                              <option value="in-progress">In Progress</option>
                              <option value="review">Review</option>
                              <option value="done">Done</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(editedTask?.status || 'todo')}`}>
                              {editedTask?.status.replace('-', ' ')}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Priority:</span>
                          {isEditing ? (
                            <select
                              value={editedTask?.priority || ''}
                              onChange={(e) => setEditedTask(prev => prev ? { ...prev, priority: e.target.value as any } : null)}
                              className="px-3 py-1 bg-background border border-input rounded-md text-sm"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          ) : (
                            <span className={`text-sm ${getPriorityColor(editedTask?.priority || 'medium')}`}>
                              {editedTask?.priority}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-foreground">Description</span>
                        {isEditing ? (
                          <RichTextEditor
                            content={editedTask?.description || ''}
                            onChange={(content) => setEditedTask(prev => prev ? { ...prev, description: content } : null)}
                            placeholder="Describe the task..."
                          />
                        ) : (
                          <div className="prose prose-sm max-w-none text-foreground">
                            <div dangerouslySetInnerHTML={{ __html: editedTask?.description || '' }} />
                          </div>
                        )}
                      </div>

                      {/* Assignee and Due Date */}
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Assignee:</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedTask?.assignee || ''}
                              onChange={(e) => setEditedTask(prev => prev ? { ...prev, assignee: e.target.value } : null)}
                              placeholder="Assign to..."
                              className="px-3 py-1 bg-background border border-input rounded-md text-sm"
                            />
                          ) : (
                            <span className="text-sm text-foreground">{editedTask?.assignee || 'Unassigned'}</span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Due Date:</span>
                          {isEditing ? (
                            <input
                              type="date"
                              value={editedTask?.dueDate || ''}
                              onChange={(e) => setEditedTask(prev => prev ? { ...prev, dueDate: e.target.value } : null)}
                              className="px-3 py-1 bg-background border border-input rounded-md text-sm"
                            />
                          ) : (
                            <span className="text-sm text-foreground">
                              {editedTask?.dueDate ? new Date(editedTask.dueDate).toLocaleDateString() : 'No due date'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-foreground">Tags</span>
                        <div className="flex flex-wrap gap-2">
                          {(editedTask?.tags || []).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/20 flex items-center gap-1"
                            >
                              {tag}
                              {isEditing && (
                                <button
                                  onClick={() => removeTag(tag)}
                                  className="ml-1 text-primary/70 hover:text-red-400"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                        {isEditing && (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newTag}
                              onChange={(e) => setNewTag(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && addTag()}
                              placeholder="Add a tag..."
                              className="px-3 py-1 bg-background border border-input rounded-md text-sm flex-1"
                            />
                            <button
                              onClick={addTag}
                              className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
                            >
                              Add
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Subtasks Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleSection('subtasks')}
                      className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary"
                    >
                      {expandedSections.has('subtasks') ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      Subtasks ({editedTask?.subtasks.length || 0})
                    </button>
                    {isEditing && (
                      <button
                        onClick={() => {
                          ensureSectionOpen('subtasks');
                          setTimeout(() => subtaskInputRef.current?.focus(), 0);
                        }}
                        className="p-2 text-primary hover:bg-primary/10 rounded-md"
                        title="Add subtask"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  {expandedSections.has('subtasks') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      {/* Add new subtask */}
                      {isEditing && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSubtask}
                            onChange={(e) => setNewSubtask(e.target.value)}
                            placeholder="Add a subtask..."
                            className="flex-1 px-3 py-2 bg-background border border-input rounded-md text-sm"
                            ref={subtaskInputRef}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                          />
                          <button
                            onClick={handleAddSubtask}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                          >
                            Add
                          </button>
                        </div>
                      )}
                      
                      {/* Subtasks list */}
                      {(editedTask?.subtasks || []).map((subtask) => (
                        <div key={subtask.id} className="relative flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                          <button
                            onClick={() => handleToggleSubtask(subtask.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {subtask.completed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-400" />
                            ) : (
                              <Circle className="h-5 w-5" />
                            )}
                          </button>
                          <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {subtask.title}
                          </span>
                          {/* Compact subtask commit linker */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setActiveCommitPicker(prev => prev === subtask.id ? null : subtask.id);
                            }}
                            className="relative px-2 py-1 rounded-md hover:bg-accent text-muted-foreground"
                            title="Link commits to this subtask"
                          >
                            <GitCommit className="h-4 w-4" />
                            <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                              {(subtask.commits?.length || 0)}
                            </span>
                          </button>
                          {activeCommitPicker === subtask.id && (
                            <div className="absolute z-10 right-2 top-12 w-80 max-w-[calc(100vw-4rem)] bg-popover border border-border rounded-md shadow-lg">
                              <div className="p-2 border-b border-border">
                                <input
                                  value={commitSearchTerm}
                                  onChange={(e) => setCommitSearchTerm(e.target.value)}
                                  placeholder="Search commits..."
                                  className="w-full px-2 py-1.5 bg-background border border-input rounded-md text-xs"
                                />
                              </div>
                              <div className="max-h-64 overflow-auto custom-scrollbar">
                                {commits
                                  .filter((c) => {
                                    const term = commitSearchTerm.toLowerCase();
                                    return (
                                      !term ||
                                      c.message.toLowerCase().includes(term) ||
                                      c.hash.toLowerCase().includes(term) ||
                                      c.author.toLowerCase().includes(term)
                                    );
                                  })
                                  .map((c) => {
                                    const linked = (subtask.commits || []).some(sc => sc.commitHash === c.hash);
                                    return (
                                      <div
                                        key={c.hash}
                                        className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                                      >
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-muted-foreground">{c.hash.substring(0,7)}</span>
                                            <span className="truncate">{c.message}</span>
                                          </div>
                                          <div className="text-[10px] text-muted-foreground">{c.author} • {new Date(c.date).toLocaleDateString()}</div>
                                        </div>
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (!editedTask) return;
                                            await ensureSubtasksPersisted();
                                            if (linked) {
                                              unlinkCommitFromSubtaskMutation.mutate({ subtaskId: subtask.id, commitHash: c.hash });
                                            } else {
                                              linkCommitToSubtaskMutation.mutate({ subtaskId: subtask.id, commitHash: c.hash });
                                            }
                                          }}
                                          className={`ml-3 px-2 py-1 rounded text-xs border ${
                                            linked
                                              ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                              : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                                          }`}
                                        >
                                          {linked ? 'Unlink' : 'Link'}
                                        </button>
                                      </div>
                                    );
                                  })}
                                {commits.length === 0 && (
                                  <div className="px-3 py-6 text-xs text-center text-muted-foreground">No commits found</div>
                                )}
                              </div>
                              <div className="p-2 border-t border-border flex justify-end">
                                <button
                                  onClick={() => {
                                    setActiveCommitPicker(null);
                                    setCommitSearchTerm('');
                                  }}
                                  className="px-2 py-1 text-xs rounded-md hover:bg-accent"
                                >
                                  Close
                                </button>
                              </div>
                            </div>
                          )}
                          {isEditing && (
                            <button
                              onClick={() => handleDeleteSubtask(subtask.id)}
                              className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Comments Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleSection('comments')}
                      className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary"
                    >
                      {expandedSections.has('comments') ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      Comments ({comments.length})
                    </button>
                  </div>
                  
                  {expandedSections.has('comments') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      {/* Add comment */}
                      <div className="space-y-2">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="w-full p-3 bg-background border border-input rounded-md text-sm resize-none"
                          rows={3}
                          ref={commentTextareaRef}
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={handleAddComment}
                            disabled={!newComment.trim()}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                          >
                            <Send className="h-4 w-4" />
                            Comment
                          </button>
                        </div>
                      </div>
                      
                      {/* Comments list */}
                      <div className="space-y-3">
                        {comments.map((comment) => (
                          <div key={comment.id} className="p-4 bg-muted/30 rounded-lg border border-border">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium text-foreground">{comment.author}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-foreground">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Issues Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleSection('issues')}
                      className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary"
                    >
                      {expandedSections.has('issues') ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      Issues ({(editedTask?.issues || []).length})
                    </button>
                    <button
                      onClick={() => setShowNewIssue(!showNewIssue)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-md"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {expandedSections.has('issues') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      {/* Add new issue */}
                      {showNewIssue && (
                        <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                          <input
                            type="text"
                            value={newIssue.title || ''}
                            onChange={(e) => setNewIssue(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Issue title..."
                            className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
                          />
                          <textarea
                            value={newIssue.description || ''}
                            onChange={(e) => setNewIssue(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Issue description..."
                            className="w-full p-3 bg-background border border-input rounded-md text-sm resize-none"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <select
                              value={newIssue.type || 'task'}
                              onChange={(e) => setNewIssue(prev => ({ ...prev, type: e.target.value as any }))}
                              className="px-3 py-2 bg-background border border-input rounded-md text-sm"
                            >
                              <option value="task">Task</option>
                              <option value="bug">Bug</option>
                              <option value="feature">Feature</option>
                              <option value="improvement">Improvement</option>
                            </select>
                            <select
                              value={newIssue.priority || 'medium'}
                              onChange={(e) => setNewIssue(prev => ({ ...prev, priority: e.target.value as any }))}
                              className="px-3 py-2 bg-background border border-input rounded-md text-sm"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                            </select>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setShowNewIssue(false)}
                              className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleAddIssue}
                              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                            >
                              Add Issue
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Issues list */}
                      <div className="space-y-3">
                        {(editedTask?.issues || []).map((issue) => (
                          <div key={issue.id} className="p-4 bg-muted/30 rounded-lg border border-border">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground">{issue.title}</span>
                                <span className={`px-2 py-1 text-xs rounded-full ${getIssueTypeColor(issue.type)}`}>
                                  {issue.type}
                                </span>
                                <span className={`text-xs ${getPriorityColor(issue.priority)}`}>
                                  {issue.priority}
                                </span>
                              </div>
                              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(issue.status)}`}>
                                {issue.status}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{issue.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Created: {new Date(issue.createdAt).toLocaleDateString()}</span>
                              <span>Updated: {new Date(issue.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Commits Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleSection('commits')}
                      className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary"
                    >
                      {expandedSections.has('commits') ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      Linked Commits ({editedTask?.commits.length || 0})
                    </button>
                  </div>
                  
                  {expandedSections.has('commits') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      {(editedTask?.commits || []).map((commit) => (
                        <div key={commit.id} className="p-4 bg-muted/30 rounded-lg border border-border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <GitCommit className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground truncate max-w-[22rem]" title={commit.message}>
                                  {commit.message}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="font-mono" title={commit.commitHash}>{commit.commitHash.substring(0, 7)}</span>
                                <span>{commit.author}</span>
                                <span>{new Date(commit.date).toLocaleDateString()}</span>
                                <span>Linked: {new Date(commit.addedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!editedTask) return;
                                unlinkCommitMutation.mutate({ taskId: editedTask.id, commitHash: commit.commitHash });
                              }}
                              className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                              title="Unlink commit"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Attachments Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleSection('attachments')}
                      className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary"
                    >
                      {expandedSections.has('attachments') ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      Attachments ({editedTask?.attachments.length || 0})
                    </button>
                    <div>
                      <input
                        type="file"
                        multiple
                        ref={attachmentInputRef}
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (!files.length || !editedTask) return;
                          const newAttachments = files.map((file) => ({
                            id: `${Date.now()}-${file.name}`,
                            name: file.name,
                            type: (file.type.startsWith('image') ? 'image' : 'file') as 'image' | 'file',
                            url: URL.createObjectURL(file),
                            size: file.size,
                            uploadedAt: new Date().toISOString(),
                          }));
                          const updated: Task = {
                            ...editedTask,
                            attachments: [...(editedTask.attachments || []), ...newAttachments],
                          };
                          setEditedTask(updated);
                          // Persist immediately if the task already exists
                          if (task) {
                            try {
                              const saved = await api.updateTask(projectId, editedTask.id, { attachments: updated.attachments });
                              setEditedTask(saved);
                              queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
                            } catch {}
                          }
                          // reset input
                          if (attachmentInputRef.current) attachmentInputRef.current.value = '';
                        }}
                      />
                      <button
                        className="p-2 text-primary hover:bg-primary/10 rounded-md"
                        title="Add attachments"
                        onClick={() => attachmentInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {expandedSections.has('attachments') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      {(editedTask?.attachments.length || 0) === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Paperclip className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No attachments yet</p>
                          <p className="text-xs">Click the paperclip icon to add files</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {(editedTask?.attachments || []).map((attachment) => (
                            <div key={attachment.id} className="p-3 bg-muted/30 rounded-lg border border-border">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground truncate">{attachment.name}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(attachment.uploadedAt).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-80 border-l border-border bg-muted/20 p-6">
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="w-full flex items-center gap-2 p-2 text-sm text-foreground hover:bg-accent rounded-md"
                    >
                      <Edit3 className="h-4 w-4" />
                      {isEditing ? 'Stop Editing' : 'Edit Task'}
                    </button>
                    <button
                      onClick={() => {
                        ensureSectionOpen('comments');
                        setTimeout(() => commentTextareaRef.current?.focus(), 0);
                      }}
                      className="w-full flex items-center gap-2 p-2 text-sm text-foreground hover:bg-accent rounded-md"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Add Comment
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        ensureSectionOpen('subtasks');
                        setTimeout(() => subtaskInputRef.current?.focus(), 0);
                      }}
                      className="w-full flex items-center gap-2 p-2 text-sm text-foreground hover:bg-accent rounded-md"
                    >
                      <Plus className="h-4 w-4" />
                      Add Subtask
                    </button>
                    <button
                      onClick={() => {
                        ensureSectionOpen('issues');
                        setShowNewIssue(true);
                      }}
                      className="w-full flex items-center gap-2 p-2 text-sm text-foreground hover:bg-accent rounded-md"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Report Issue
                    </button>
                  </div>
                </div>

                {/* Task Stats */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Task Stats</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="text-foreground">{new Date(editedTask?.createdAt || '').toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Updated:</span>
                      <span className="text-foreground">{new Date(editedTask?.updatedAt || '').toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtasks:</span>
                      <span className="text-foreground">
                        {(editedTask?.subtasks || []).filter(s => s.completed).length}/{(editedTask?.subtasks || []).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Comments:</span>
                      <span className="text-foreground">{comments.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Issues:</span>
                      <span className="text-foreground">{(editedTask?.issues || []).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Commits:</span>
                      <span className="text-foreground">{editedTask?.commits.length || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Progress</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtasks</span>
                      <span className="text-foreground">
                        {(editedTask?.subtasks.length || 0) > 0
                          ? Math.round(((editedTask?.subtasks || []).filter(s => s.completed).length / (editedTask?.subtasks.length || 1)) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(editedTask?.subtasks.length || 0) > 0
                            ? ((editedTask?.subtasks || []).filter(s => s.completed).length / (editedTask?.subtasks.length || 1)) * 100
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
