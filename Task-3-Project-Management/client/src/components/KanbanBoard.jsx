import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { compareTasks } from '../utils/order.js';
import {
  Plus,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  MoreVertical,
  Tag,
  Users,
  MessageSquare,
  AlertTriangle,
  Flame,
  ArrowUpRight
} from 'lucide-react';

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: '#94a3b8', badge: 'bg-slate-800 text-slate-300' },
  { id: 'inprogress', title: 'In Progress', color: '#6366f1', badge: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' },
  { id: 'review', title: 'In Review', color: '#f59e0b', badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  { id: 'completed', title: 'Done', color: '#10b981', badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
];

export const getPriorityBadge = (priority) => {
  switch (priority) {
    case 'urgent':
      return {
        label: 'Urgent',
        className: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        icon: Flame,
      };
    case 'high':
      return {
        label: 'High',
        className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        icon: AlertTriangle,
      };
    case 'medium':
      return {
        label: 'Medium',
        className: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        icon: ArrowUpRight,
      };
    default:
      return {
        label: 'Low',
        className: 'bg-slate-800 text-slate-400 border-slate-700',
        icon: Clock,
      };
  }
};

export default function KanbanBoard({
  tasks,
  isDragDisabled = false,
  onTaskMove,
  onSelectTask,
  onOpenCreateModal,
}) {
  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    onTaskMove(draggableId, destination.droppableId, destination.index);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="overflow-x-auto pb-2">
        <div className="flex flex-row gap-4 items-start">
          {COLUMNS.map((col) => {
            const colTasks = tasks
              .filter((t) => t.status === col.id)
              .sort(compareTasks);

            return (
              <div
                key={col.id}
                className="flex-1 min-w-[260px] flex flex-col rounded-2xl bg-slate-900/40 border border-slate-800/80 p-3.5 lg:min-h-[520px] min-h-[350px]"
              >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/60">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: col.color }}
                  />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    {col.title}
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${col.badge}`}>
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => onOpenCreateModal(col.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title={`Add task to ${col.title}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Droppable Task List */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 space-y-2.5 transition-colors rounded-xl p-1 ${
                      snapshot.isDraggingOver ? 'bg-indigo-950/20 ring-1 ring-indigo-500/30' : ''
                    }`}
                  >
                    {colTasks.map((task, index) => {
                      const priorityInfo = getPriorityBadge(task.priority);
                      const PriorityIcon = priorityInfo.icon;
                      const isOverdue =
                        task.dueDate &&
                        new Date(task.dueDate) < new Date() &&
                        task.status !== 'completed';

                      return (
                        <Draggable
                          key={task._id}
                          draggableId={task._id}
                          index={index}
                          isDragDisabled={isDragDisabled}
                        >
                          {(providedDrag, snapshotDrag) => (
                            <div
                              ref={providedDrag.innerRef}
                              {...providedDrag.draggableProps}
                              {...providedDrag.dragHandleProps}
                              onClick={() => onSelectTask(task)}
                              title={isDragDisabled ? 'Clear filters to reorder tasks' : undefined}
                              className={`group p-3.5 rounded-xl border bg-slate-900/90 hover:bg-slate-850 cursor-pointer transition-all shadow-sm ${
                                snapshotDrag.isDragging
                                  ? 'border-indigo-500 shadow-xl shadow-indigo-500/20 scale-102 ring-2 ring-indigo-500/30'
                                  : 'border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              {/* Top Bar: Priority & Tags */}
                              <div className="flex items-center justify-between mb-2">
                                <span
                                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${priorityInfo.className}`}
                                >
                                  <PriorityIcon className="w-3 h-3" />
                                  <span>{priorityInfo.label}</span>
                                </span>

                                {task.tags && task.tags.length > 0 && (
                                  <div className="flex items-center space-x-1">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                                      #{task.tags[0]}
                                    </span>
                                    {task.tags.length > 1 && (
                                      <span className="text-[10px] text-slate-500">
                                        +{task.tags.length - 1}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Task Title */}
                              <h4 className="text-xs font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-2">
                                {task.title}
                              </h4>

                              {/* Description Preview */}
                              {task.description && (
                                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                  {task.description}
                                </p>
                              )}

                              {/* Footer Meta: Due Date, Comments, Assignees */}
                              <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                                <div className="flex items-center space-x-3">
                                  {task.dueDate && (
                                    <span
                                      className={`flex items-center space-x-1 font-mono text-[10px] ${
                                        isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'
                                      }`}
                                      title={isOverdue ? 'Overdue!' : 'Due Date'}
                                    >
                                      <Calendar className="w-3 h-3" />
                                      <span>
                                        {new Date(task.dueDate).toLocaleDateString(undefined, {
                                          month: 'short',
                                          day: 'numeric',
                                        })}
                                      </span>
                                    </span>
                                  )}

                                  {task.comments && task.comments.length > 0 && (
                                    <span className="flex items-center space-x-1 text-slate-400">
                                      <MessageSquare className="w-3 h-3" />
                                      <span>{task.comments.length}</span>
                                    </span>
                                  )}
                                </div>

                                {/* Assignee Avatars */}
                                {task.assignees && task.assignees.length > 0 && (
                                  <div className="flex items-center -space-x-1.5 overflow-hidden">
                                    {task.assignees.slice(0, 3).map((a) => (
                                      <div
                                        key={a._id || a}
                                        className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 border border-slate-900 flex items-center justify-center text-[9px] font-bold text-white uppercase"
                                        title={a.name || a.email}
                                      >
                                        {a.name ? a.name[0] : 'U'}
                                      </div>
                                    ))}
                                    {task.assignees.length > 3 && (
                                      <span className="text-[9px] text-slate-400 pl-1">
                                        +{task.assignees.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}

                    {colTasks.length === 0 && !snapshot.isDraggingOver && (
                      <div className="py-8 text-center text-slate-600 text-[11px] font-medium border border-dashed border-slate-800/40 rounded-xl">
                        No tasks
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </div>
    </DragDropContext>
  );
}
