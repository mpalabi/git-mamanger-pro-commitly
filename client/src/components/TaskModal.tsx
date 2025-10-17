import React, { useState, useEffect } from 'react';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Task, Subtask } from '../types';
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

  const queryClient = useQueryClient();

  // Mock data for comments and issues (in real app, these would come from API)
  const [comments, setComments] = useState<Comment[]>([
    {
      id: '1',
      content: 'This task looks good to go. Let me know if you need any help with the implementation.',
      author: 'John Doe',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      content: 'I\'ve started working on this. Should be done by end of week.',
      author: 'Jane Smith',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ]);

  const [issues, setIssues] = useState<Issue[]>([
    {
      id: '1',
      title: 'Performance issue in data loading',
      description: 'The data loading is taking too long on mobile devices',
      type: 'bug',
      priority: 'high',
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]);

  useEffect(() => {
    if (task) {
      setEditedTask({ ...task });
      setIsEditing(false);
    }
  }, [task]);

  // Mutations
  const updateTaskMutation = useMutation({
    mutationFn: (updatedTask: Task) => api.updateTask(projectId, updatedTask.id, updatedTask),
    onSuccess: (updatedTask) => {
      onSave(updatedTask);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const handleSave = () => {
    if (editedTask) {
      updateTaskMutation.mutate(editedTask);
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
        createdAt: new Date().toISOString()
      };
      setEditedTask({
        ...editedTask,
        subtasks: [...editedTask.subtasks, subtask]
      });
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
    }
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    if (editedTask) {
      setEditedTask({
        ...editedTask,
        subtasks: editedTask.subtasks.filter(subtask => subtask.id !== subtaskId)
      });
    }
  };

  const handleAddIssue = () => {
    if (newIssue.title && newIssue.description) {
      const issue: Issue = {
        id: Date.now().toString(),
        title: newIssue.title,
        description: newIssue.description,
        type: newIssue.type || 'task',
        priority: newIssue.priority || 'medium',
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setIssues(prev => [issue, ...prev]);
      setNewIssue({});
      setShowNewIssue(false);
    }
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

  if (!isOpen || !task) return null;

  return (
    <AnimatePresence>
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
                <span className="text-sm text-muted-foreground">TASK-{task.id.substring(0, 8).toUpperCase()}</span>
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
                <h1 className="text-xl font-semibold text-foreground">{task.title}</h1>
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
                    onClick={() => setIsEditing(false)}
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
                            <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(task.status)}`}>
                              {task.status.replace('-', ' ')}
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
                            <span className={`text-sm ${getPriorityColor(task.priority)}`}>
                              {task.priority}
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
                            <div dangerouslySetInnerHTML={{ __html: task.description }} />
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
                            <span className="text-sm text-foreground">{task.assignee || 'Unassigned'}</span>
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
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-foreground">Tags</span>
                        <div className="flex flex-wrap gap-2">
                          {task.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/20"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
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
                      Subtasks ({task.subtasks.length})
                    </button>
                    {isEditing && (
                      <button
                        onClick={() => toggleSection('subtasks')}
                        className="p-2 text-primary hover:bg-primary/10 rounded-md"
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
                      {task.subtasks.map((subtask) => (
                        <div key={subtask.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
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
                      Issues ({issues.length})
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
                        {issues.map((issue) => (
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
                      Linked Commits ({task.commits.length})
                    </button>
                  </div>
                  
                  {expandedSections.has('commits') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      {task.commits.map((commit) => (
                        <div key={commit.id} className="p-4 bg-muted/30 rounded-lg border border-border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <GitCommit className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground">{commit.message}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="font-mono">{commit.commitHash.substring(0, 7)}</span>
                                <span>{commit.author}</span>
                                <span>{new Date(commit.date).toLocaleDateString()}</span>
                                <span>Linked: {new Date(commit.addedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => unlinkCommitMutation.mutate({ taskId: task.id, commitHash: commit.commitHash })}
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
                      Attachments ({task.attachments.length})
                    </button>
                    <button className="p-2 text-primary hover:bg-primary/10 rounded-md">
                      <Paperclip className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {expandedSections.has('attachments') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      {task.attachments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Paperclip className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No attachments yet</p>
                          <p className="text-xs">Click the paperclip icon to add files</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {task.attachments.map((attachment) => (
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
                    <button className="w-full flex items-center gap-2 p-2 text-sm text-foreground hover:bg-accent rounded-md">
                      <MessageSquare className="h-4 w-4" />
                      Add Comment
                    </button>
                    <button className="w-full flex items-center gap-2 p-2 text-sm text-foreground hover:bg-accent rounded-md">
                      <Plus className="h-4 w-4" />
                      Add Subtask
                    </button>
                    <button className="w-full flex items-center gap-2 p-2 text-sm text-foreground hover:bg-accent rounded-md">
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
                      <span className="text-foreground">{new Date(task.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Updated:</span>
                      <span className="text-foreground">{new Date(task.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtasks:</span>
                      <span className="text-foreground">
                        {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Comments:</span>
                      <span className="text-foreground">{comments.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Issues:</span>
                      <span className="text-foreground">{issues.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Commits:</span>
                      <span className="text-foreground">{task.commits.length}</span>
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
                        {task.subtasks.length > 0 
                          ? Math.round((task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${task.subtasks.length > 0 
                            ? (task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100
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
    </AnimatePresence>
  );
};
