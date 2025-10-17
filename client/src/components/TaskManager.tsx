import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search,
  Calendar,
  Tag, 
  GitCommit,
  Clock,
  CheckCircle,
  Circle,
  AlertCircle,
  Play,
  Eye,
  Trash2,
  Edit,
  Link as LinkIcon
} from 'lucide-react';
import { Task } from '../types';
import { api } from '../services/api';
import { SplitText, SplitTextPresets } from './ui/SplitText';
import { RichTextEditor } from './ui/RichTextEditor';

interface TaskManagerProps {
  projectId: string;
}

export const TaskManager: React.FC<TaskManagerProps> = ({ projectId }) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'todo' | 'in-progress' | 'review' | 'done'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => api.getTasks(projectId),
  });

  const createTaskMutation = useMutation({
    mutationFn: (task: Partial<Task>) => api.createTask(projectId, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setIsCreating(false);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) =>
      api.updateTask(projectId, taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => api.deleteTask(projectId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setSelectedTask(null);
    },
  });

  const filteredTasks = tasks.filter(task => {
    const matchesFilter = filter === 'all' || task.status === filter;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'todo':
        return <Circle className="h-4 w-4 text-muted-foreground" />;
      case 'in-progress':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'review':
        return <Eye className="h-4 w-4 text-yellow-500" />;
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low':
        return 'bg-muted text-muted-foreground';
      case 'medium':
        return 'bg-blue-500/20 text-blue-400';
      case 'high':
        return 'bg-orange-500/20 text-orange-400';
      case 'urgent':
        return 'bg-red-500/20 text-red-400';
    }
  };

  const handleCreateTask = (taskData: Partial<Task>) => {
    createTaskMutation.mutate({
      ...taskData,
      projectId,
      status: 'todo',
      priority: 'medium',
      tags: [],
      commits: [],
      subtasks: [],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <SplitText 
            text="Task Management" 
            config={SplitTextPresets.title}
            as="h2"
            className="text-2xl font-bold"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Task
          </motion.button>
        </div>

        {/* Filters and Search */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Tasks</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          <AnimatePresence>
            {filteredTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedTask(task)}
                className="mb-4 p-4 border border-border rounded-lg cursor-pointer hover:shadow-md transition-shadow bg-card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(task.status)}
                      <h3 className="font-semibold text-lg">{task.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    
                    <div className="text-foreground text-sm mb-3 line-clamp-2" 
                         dangerouslySetInnerHTML={{ __html: task.description }} />
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(task.createdAt).toLocaleDateString()}
                      </div>
                      {task.dueDate && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <GitCommit className="h-3 w-3" />
                        {task.commits.length} commits
                      </div>
                      {task.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {task.tags.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setSelectedTask(task);
                      }}
                      className="p-2 text-muted-foreground hover:text-foreground"
                    >
                      <Edit className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        deleteTaskMutation.mutate(task.id);
                      }}
                      className="p-2 text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredTasks.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tasks found</p>
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdate={(updates) => updateTaskMutation.mutate({ taskId: selectedTask.id, updates })}
            projectId={projectId}
          />
        )}
      </AnimatePresence>

      {/* Create Task Modal */}
      <AnimatePresence>
        {isCreating && (
          <CreateTaskModal
            onClose={() => setIsCreating(false)}
            onCreate={handleCreateTask}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Task Detail Modal Component
const TaskDetailModal: React.FC<{
  task: Task;
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  projectId: string;
}> = ({ task, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);

  const handleSave = () => {
    onUpdate(editedTask);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{task.title}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isEditing ? (
            <div className="space-y-4">
              <input
                type="text"
                value={editedTask.title}
                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                className="w-full p-2 border border-border rounded-lg"
              />
              <RichTextEditor
                content={editedTask.description}
                onChange={(content) => setEditedTask({ ...editedTask, description: content })}
                placeholder="Task description..."
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditedTask(task);
                    setIsEditing(false);
                  }}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div dangerouslySetInnerHTML={{ __html: task.description }} />
              
              {/* Commits Section */}
              <div>
                <h3 className="font-semibold mb-3">Linked Commits</h3>
                {task.commits.length > 0 ? (
                  <div className="space-y-2">
                    {task.commits.map((commit) => (
                      <div key={commit.id} className="p-3 border border-border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{commit.message}</p>
                            <p className="text-sm text-muted-foreground">
                              {commit.author} • {new Date(commit.date).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {commit.commitHash.substring(0, 7)}
                            </p>
                          </div>
                          <button className="p-1 text-muted-foreground hover:text-red-600">
                            <LinkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No commits linked to this task</p>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Create Task Modal Component
const CreateTaskModal: React.FC<{
  onClose: () => void;
  onCreate: (task: Partial<Task>) => void;
}> = ({ onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onCreate({ title: title.trim(), description, priority });
      setTitle('');
      setDescription('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="bg-card rounded-lg shadow-xl max-w-2xl w-full"
      >
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="text-xl font-bold mb-4">Create New Task</h2>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
            
            <RichTextEditor
              content={description}
              onChange={setDescription}
              placeholder="Task description..."
            />
            
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Task['priority'])}
              className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          
          <div className="flex gap-2 mt-6">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Task
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-lg hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
