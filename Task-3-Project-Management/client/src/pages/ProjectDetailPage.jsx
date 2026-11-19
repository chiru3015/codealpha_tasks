import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import api from '../services/api';
import { applyTaskMove, taskId as getTaskId } from '../utils/order.js';
import KanbanBoard from '../components/KanbanBoard';
import CreateTaskModal from '../components/CreateTaskModal';
import TaskDetailModal from '../components/TaskDetailModal';
import {
  ArrowLeft,
  Users,
  Settings,
  Calendar,
  Plus,
  Trash2,
  X,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  BarChart3,
  Clock,
  Layers,
  Sparkles,
  Flame
} from 'lucide-react';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [createTaskDefaultStatus, setCreateTaskDefaultStatus] = useState('todo');
  const [selectedTask, setSelectedTask] = useState(null);

  // Edit Project form
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('#6366f1');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [updating, setUpdating] = useState(false);

  // Members modal search
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRole, setSelectedRole] = useState('member');
  const [addingMember, setAddingMember] = useState(false);

  // Search & Filter state (Phase 7)
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

  // Fetch Project & Tasks
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks?project=${id}`),
      ]);
      setProject(projRes.data);
      setEditName(projRes.data.name);
      setEditDescription(projRes.data.description || '');
      setEditColor(projRes.data.color || '#6366f1');
      setEditDueDate(projRes.data.dueDate ? projRes.data.dueDate.split('T')[0] : '');
      setEditStatus(projRes.data.status || 'active');

      setTasks(tasksRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load project details.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // Socket.io Real-Time Synchronization (Phase 6)
  useEffect(() => {
    const socket = getSocket();
    socket.emit('join:project', id);

    const handleTaskCreated = (newTask) => {
      setTasks((prev) => {
        if (prev.some((t) => t._id === newTask._id)) return prev;
        return [...prev, newTask];
      });
    };

    const handleTaskUpdated = (updatedTask) => {
      setTasks((prev) =>
        prev.map((t) => (t._id === updatedTask._id ? updatedTask : t))
      );
      setSelectedTask((prev) => (prev?._id === updatedTask._id ? updatedTask : prev));
    };

    const handleTaskDeleted = ({ projectId: eventProjectId, taskId }) => {
      if (eventProjectId && eventProjectId !== id) return;
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      setSelectedTask((prev) => (prev?._id === taskId ? null : prev));
    };

    const handleTaskComment = ({ taskId, task: updatedTask }) => {
      if (updatedTask) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? updatedTask : t))
        );
        setSelectedTask((prev) => (prev?._id === taskId ? updatedTask : prev));
      }
    };

    const handleTasksReordered = ({ projectId: eventProjectId, tasks: reorderedTasks }) => {
      if (eventProjectId && eventProjectId !== id) return;
      if (!Array.isArray(reorderedTasks)) return;
      const byId = new Map(reorderedTasks.map((t) => [t._id, t]));
      setTasks((prev) => prev.map((t) => (byId.has(t._id) ? byId.get(t._id) : t)));
      setSelectedTask((prev) => (prev && byId.has(prev._id) ? byId.get(prev._id) : prev));
    };

    const handleProjectDeleted = ({ projectId: eventProjectId }) => {
      if (eventProjectId && eventProjectId !== id) return;
      alert('This project has been deleted.');
      navigate('/');
    };

    const handleMemberAdded = ({ projectId: eventProjectId, member }) => {
      if (eventProjectId && eventProjectId !== id) return;
      setProject((prev) =>
        prev
          ? {
              ...prev,
              members: [...prev.members, { user: member, role: member.role }],
            }
          : prev
      );
    };

    const handleMemberRemoved = ({ projectId: eventProjectId, removedUserId }) => {
      if (eventProjectId && eventProjectId !== id) return;
      setProject((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.filter(
                (m) => (m.user?._id || m.user) !== removedUserId
              ),
            }
          : prev
      );
      if (user?._id === removedUserId) {
        alert('You have been removed from this project.');
        navigate('/');
      }
    };

    const handleAccessRevoked = ({ projectId: eventProjectId }) => {
      if (eventProjectId && eventProjectId !== id) return;
      alert('Your access to this project has been revoked.');
      navigate('/');
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('task:comment', handleTaskComment);
    socket.on('task:reordered', handleTasksReordered);
    socket.on('project:deleted', handleProjectDeleted);
    socket.on('member:added', handleMemberAdded);
    socket.on('member:removed', handleMemberRemoved);
    socket.on('project:access_revoked', handleAccessRevoked);

    return () => {
      socket.emit('leave:project', id);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('task:comment', handleTaskComment);
      socket.off('task:reordered', handleTasksReordered);
      socket.off('project:deleted', handleProjectDeleted);
      socket.off('member:added', handleMemberAdded);
      socket.off('member:removed', handleMemberRemoved);
      socket.off('project:access_revoked', handleAccessRevoked);
    };
  }, [id]);

  // Project Permissions
  const isOwner = project?.owner?._id === user?._id || project?.owner === user?._id;
  const isProjectAdmin =
    isOwner ||
    project?.members?.some(
      (m) =>
        (m.user?._id === user?._id || m.user === user?._id) &&
        ['admin', 'owner'].includes(m.role)
    );

  // Update Project Info
  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const { data } = await api.put(`/projects/${id}`, {
        name: editName.trim(),
        description: editDescription.trim(),
        color: editColor,
        dueDate: editDueDate || undefined,
        status: editStatus,
      });
      setProject(data);
      setIsEditModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update project.');
    } finally {
      setUpdating(false);
    }
  };

  // Delete Project
  const handleDeleteProject = async () => {
    if (!window.confirm('Are you sure you want to delete this project? All associated tasks will be permanently removed.')) {
      return;
    }
    try {
      await api.delete(`/projects/${id}`);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete project.');
    }
  };

  // User search for members
  useEffect(() => {
    if (!userSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/auth/users?keyword=${encodeURIComponent(userSearch.trim())}`);
        const currentMemberIds = project?.members?.map((m) => m.user?._id || m.user) || [];
        setSearchResults(data.filter((u) => !currentMemberIds.includes(u._id)));
      } catch (_) {}
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, project]);

  const handleAddMember = async (userId) => {
    setAddingMember(true);
    try {
      const { data } = await api.post(`/projects/${id}/members`, {
        userId,
        role: selectedRole,
      });
      setProject(data);
      setUserSearch('');
      setSearchResults([]);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add member.');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      const { data } = await api.delete(`/projects/${id}/members/${userId}`);
      setProject(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  // Task Actions (Phase 3 & Phase 4)
  const handleCreateTask = async (taskData) => {
    try {
      const { data } = await api.post('/tasks', {
        ...taskData,
        project: id,
      });
      // Local addition handled also via socket, but fallback here
      setTasks((prev) => (prev.some((t) => t._id === data._id) ? prev : [...prev, data]));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create task.');
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    // Optimistic local update
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, ...updates } : t))
    );
    if (selectedTask?._id === taskId) {
      setSelectedTask((prev) => ({ ...prev, ...updates }));
    }

    try {
      const { data } = await api.put(`/tasks/${taskId}`, updates);
      setTasks((prev) => prev.map((t) => (t._id === taskId ? data : t)));
      if (selectedTask?._id === taskId) setSelectedTask(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update task.');
      fetchData(); // Rollback
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    setSelectedTask(null);

    try {
      await api.delete(`/tasks/${taskId}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete task.');
      fetchData();
    }
  };

  const handleAddComment = async (taskId, text) => {
    try {
      const { data } = await api.post(`/tasks/${taskId}/comments`, { text });
      // Fetch fresh task to get populated comment
      const fullTask = await api.get(`/tasks/${taskId}`);
      setTasks((prev) => prev.map((t) => (t._id === taskId ? fullTask.data : t)));
      if (selectedTask?._id === taskId) setSelectedTask(fullTask.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post comment.');
    }
  };

  // Drag and drop task status & order change
  const handleTaskMove = async (taskId, newStatus, newIndex) => {
    if (!tasks.some((t) => getTaskId(t) === taskId)) return;

    const updates = applyTaskMove(tasks, taskId, newStatus, newIndex);
    if (!updates.length) return;

    const previousTasks = tasks;
    const previousSelectedTask = selectedTask;
    const updateMap = new Map(updates.map((u) => [u.id, u]));

    // Optimistic state: reindex every affected sibling, not just the moved card.
    setTasks((prev) =>
      prev.map((t) => {
        const update = updateMap.get(getTaskId(t));
        return update ? { ...t, status: update.status, order: update.order } : t;
      })
    );
    if (previousSelectedTask && updateMap.has(getTaskId(previousSelectedTask))) {
      const update = updateMap.get(getTaskId(previousSelectedTask));
      setSelectedTask((prev) => ({ ...prev, status: update.status, order: update.order }));
    }

    try {
      await api.put('/tasks/reorder', {
        project: id,
        taskId,
        status: newStatus,
        order: newIndex,
      });
    } catch (err) {
      // Restore the pre-drag server state.
      setTasks(previousTasks);
      setSelectedTask(previousSelectedTask);
      await fetchData(true);
      alert(err.response?.data?.message || 'Failed to reorder tasks.');
    }
  };

  // Filters change DnD indices; disable dragging so full-column ordering stays authoritative.
  const hasActiveFilters = Boolean(
    searchQuery.trim() || priorityFilter !== 'all' || assigneeFilter !== 'all' || onlyOverdue
  );

  // Search & Filtered Tasks (Phase 7)
  const filteredTasks = tasks.filter((t) => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchTags = t.tags?.some((tag) => tag.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTags) return false;
    }
    // Priority filter
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) {
      return false;
    }
    // Assignee filter
    if (assigneeFilter !== 'all') {
      const isAssigned = t.assignees?.some((a) => (a._id || a) === assigneeFilter);
      if (!isAssigned) return false;
    }
    // Overdue filter
    if (onlyOverdue) {
      const isTaskOverdue =
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed';
      if (!isTaskOverdue) return false;
    }
    return true;
  });

  // Basic Analytics (Phase 7)
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'inprogress').length;
  const overdueCount = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
  ).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">Loading Kanban board...</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="p-8 rounded-2xl border border-rose-500/20 bg-rose-500/5 max-w-md mx-auto">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Project Not Found</h2>
          <p className="text-xs text-slate-400 mt-1 mb-5">{error || 'Unable to access this project.'}</p>
          <Link
            to="/"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-white hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header: Breadcrumb & Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <Link
            to="/"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center space-x-2.5">
            <span
              className="w-4 h-4 rounded-full ring-4 ring-slate-950 shadow-sm"
              style={{ backgroundColor: project.color || '#6366f1' }}
            />
            <h1 className="text-xl font-bold text-white tracking-tight">{project.name}</h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
              {project.status}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setCreateTaskDefaultStatus('todo');
              setIsCreateTaskModalOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>

          <button
            onClick={() => setIsMembersModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Members ({project.members?.length || 1})</span>
          </button>

          {isProjectAdmin && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Settings</span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={handleDeleteProject}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors"
              title="Delete Project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Analytics & Progress Overview Bar (Phase 7) */}
      <div className="mt-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Metric Badges */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Total:</span>
            <span className="font-bold text-white font-mono">{totalTasks}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-indigo-400">In Progress:</span>
            <span className="font-bold text-white font-mono">{inProgressTasks}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-emerald-400">Done:</span>
            <span className="font-bold text-white font-mono">{completedTasks}</span>
          </div>
          {overdueCount > 0 && (
            <div className="flex items-center space-x-1.5 text-rose-400 font-semibold">
              <Flame className="w-3.5 h-3.5 text-rose-500 animate-bounce" />
              <span>{overdueCount} Overdue</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="flex items-center space-x-3 w-full md:w-64">
          <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-mono font-bold text-slate-300 shrink-0">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Filter & Search Bar (Phase 7) */}
      <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tasks by title, description or #tag..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 w-full sm:w-auto"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Assignee Filter */}
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 w-full sm:w-auto"
        >
          <option value="all">All Assignees</option>
          {project.members?.map((m) => (
            <option key={m.user?._id} value={m.user?._id}>
              {m.user?.name}
            </option>
          ))}
        </select>

        {/* Overdue quick toggle */}
        <button
          onClick={() => setOnlyOverdue(!onlyOverdue)}
          className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center space-x-1.5 w-full sm:w-auto justify-center ${
            onlyOverdue
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Overdue Only</span>
        </button>
      </div>

      {/* Interactive Kanban Board (Phase 4) */}
      <div className="mt-6">
        <KanbanBoard
          tasks={filteredTasks}
          isDragDisabled={hasActiveFilters}
          onTaskMove={handleTaskMove}
          onSelectTask={(task) => setSelectedTask(task)}
          onOpenCreateModal={(colStatus) => {
            setCreateTaskDefaultStatus(colStatus);
            setIsCreateTaskModalOpen(true);
          }}
        />
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onSubmit={handleCreateTask}
        defaultStatus={createTaskDefaultStatus}
        members={project.members || []}
      />

      {/* Task Detail & Comments Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        onAddComment={handleAddComment}
        members={project.members || []}
        currentUser={user}
      />

      {/* Edit Project Settings Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white mb-1">Edit Project Settings</h2>
            <p className="text-xs text-slate-400 mb-5">Update project details, status, or accent theme.</p>

            <form onSubmit={handleUpdateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Project Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Accent Color</label>
                <div className="flex items-center space-x-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        editColor === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {isMembersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl relative">
            <button
              onClick={() => setIsMembersModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white mb-1">Project Members</h2>
            <p className="text-xs text-slate-400 mb-5">Manage workspace collaborators and access permissions.</p>

            {isProjectAdmin && (
              <div className="mb-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-xs font-medium text-slate-300 mb-2 flex items-center space-x-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Invite Registered User</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search user by name or email..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 divide-y divide-slate-800/80">
                    {searchResults.map((u) => (
                      <div
                        key={u._id}
                        className="p-2.5 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-200">{u.name}</div>
                          <div className="text-[10px] text-slate-400">{u.email}</div>
                        </div>
                        <button
                          type="button"
                          disabled={addingMember}
                          onClick={() => handleAddMember(u._id)}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {project.members?.map((m) => {
                const memberUser = m.user;
                const memberRole = m.role || 'member';
                const isMemberOwner = memberUser?._id === project.owner?._id || memberUser?._id === project.owner;

                return (
                  <div
                    key={memberUser?._id || m._id}
                    className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white uppercase">
                        {memberUser?.name ? memberUser.name[0] : 'U'}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                          <span>{memberUser?.name}</span>
                          {isMemberOwner && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Owner
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">{memberUser?.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono capitalize px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
                        {memberRole}
                      </span>
                      {isProjectAdmin && !isMemberOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(memberUser?._id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
