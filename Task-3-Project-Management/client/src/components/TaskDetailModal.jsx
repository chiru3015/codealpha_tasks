import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Trash2,
  Users,
  MessageSquare,
  History,
  Send,
  Tag,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { getPriorityBadge } from './KanbanBoard';

export default function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onAddComment,
  members = [],
  currentUser,
}) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [status, setStatus] = useState(task?.status || 'todo');
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? String(task.dueDate).split('T')[0] : ''
  );
  const [tagsInput, setTagsInput] = useState(task?.tags ? task.tags.join(', ') : '');
  const [assignees, setAssignees] = useState(
    task?.assignees ? task.assignees.map((a) => a._id || a) : []
  );

  const [activeTab, setActiveTab] = useState('comments'); // 'comments' | 'activity'
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title || '');
    setDescription(task.description || '');
    setPriority(task.priority || 'medium');
    setStatus(task.status || 'todo');
    setDueDate(task.dueDate ? String(task.dueDate).split('T')[0] : '');
    setTagsInput(task.tags ? task.tags.join(', ') : '');
    setAssignees(task.assignees ? task.assignees.map((a) => a._id || a) : []);
  }, [task]);

  const handleSave = async () => {
    setSaving(true);
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    await onUpdateTask(task._id, {
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      dueDate: dueDate || undefined,
      tags,
      assignees,
    });
    setSaving(false);
  };

  const toggleAssignee = (userId) => {
    setAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    await onAddComment(task._id, commentText.trim());
    setCommentText('');
    setSubmittingComment(false);
  };

  // All hooks must run before any conditional return (Rules of Hooks).
  if (!isOpen || !task) return null;

  const priorityInfo = getPriorityBadge(priority);
  const PriorityIcon = priorityInfo.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${priorityInfo.className}`}>
              <PriorityIcon className="w-3.5 h-3.5" />
              <span>{priorityInfo.label}</span>
            </span>
            <span className="text-xs text-slate-500 font-mono">#{task._id?.slice(-6)}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onDeleteTask(task._id)}
              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Delete Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title input */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              className="w-full text-lg font-bold text-white bg-transparent border-b border-transparent hover:border-slate-800 focus:border-indigo-500 focus:outline-none py-1 transition-colors"
            />
          </div>

          {/* Controls Bar: Status, Priority, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-400 block mb-1 font-medium">Status</span>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  onUpdateTask(task._id, { status: e.target.value });
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="review">In Review</option>
                <option value="completed">Done</option>
              </select>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 font-medium">Priority</span>
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  onUpdateTask(task._id, { priority: e.target.value });
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 font-medium">Due Date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  onUpdateTask(task._id, { dueDate: e.target.value || undefined });
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              placeholder="Add detailed task notes or specifications..."
              className="w-full p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Assignees & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Assignees
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800 min-h-[44px]">
                {members.map((m) => {
                  const mUser = m.user;
                  const isSelected = assignees.includes(mUser?._id);
                  return (
                    <button
                      key={mUser?._id}
                      type="button"
                      onClick={() => {
                        const next = isSelected
                          ? assignees.filter((id) => id !== mUser?._id)
                          : [...assignees, mUser?._id];
                        setAssignees(next);
                        onUpdateTask(task._id, { assignees: next });
                      }}
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] border transition-colors ${
                        isSelected
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                          : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                      }`}
                    >
                      <span>{mUser?.name?.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Tags
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onBlur={handleSave}
                placeholder="Design, Auth, Backend"
                className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Tabs: Comments vs Activity */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center space-x-4 mb-4 border-b border-slate-800/80 pb-2">
              <button
                onClick={() => setActiveTab('comments')}
                className={`flex items-center space-x-1.5 text-xs font-semibold pb-1 border-b-2 transition-colors ${
                  activeTab === 'comments'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Discussion ({task.comments?.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex items-center space-x-1.5 text-xs font-semibold pb-1 border-b-2 transition-colors ${
                  activeTab === 'activity'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Activity History ({task.activity?.length || 0})</span>
              </button>
            </div>

            {/* Comments Tab View */}
            {activeTab === 'comments' && (
              <div className="space-y-4">
                {/* Comments List */}
                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {task.comments && task.comments.length > 0 ? (
                    task.comments.map((c, i) => (
                      <div
                        key={c._id || i}
                        className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start space-x-3"
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0 mt-0.5">
                          {c.author?.name ? c.author.name[0] : 'U'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-200">
                              {c.author?.name || 'Workspace Member'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 whitespace-pre-wrap">{c.text}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-500">
                      No comments yet. Start a discussion below!
                    </div>
                  )}
                </div>

                {/* Add Comment Input */}
                <form onSubmit={handleCommentSubmit} className="flex items-center space-x-2 pt-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment or update..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !commentText.trim()}
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* Activity History Tab View */}
            {activeTab === 'activity' && (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {task.activity && task.activity.length > 0 ? (
                  task.activity.map((act, i) => (
                    <div
                      key={act._id || i}
                      className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs text-slate-400 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        <span className="font-medium text-slate-300">
                          {act.user?.name || 'User'}
                        </span>
                        <span>{act.action}</span>
                        {act.from && act.to && (
                          <span className="font-mono text-[10px] text-indigo-400">
                            {act.from} → {act.to}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {act.createdAt ? new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No activity recorded yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {saving ? 'Saving changes...' : 'Changes saved automatically'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
