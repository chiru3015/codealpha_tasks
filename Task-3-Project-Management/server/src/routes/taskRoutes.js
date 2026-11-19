import express from 'express';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import { ensureDB, protect } from '../middleware/auth.js';
import { isValidObjectId } from '../utils/validators.js';
import { applyTaskMove } from '../utils/order.js';
import { canWriteProject, isProjectMember } from '../utils/permissions.js';

const router = express.Router();

const STATUSES = ['todo', 'inprogress', 'review', 'completed'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const invalidId = (res) => res.status(400).json({ message: 'Invalid ID provided.' });

const isValidAssignees = (assignees) =>
  assignees === undefined ||
  (Array.isArray(assignees) && assignees.every((id) => isValidObjectId(id)));

const isValidTags = (tags) =>
  tags === undefined || (Array.isArray(tags) && tags.every((tag) => typeof tag === 'string'));

const handleError = (res, err) => {
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ message: 'Invalid task data.' });
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid task data.' });
  }
  console.error('Task route error:', err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
};

// GET /api/tasks?project=:projectId
router.get('/', ensureDB, protect, async (req, res) => {
  try {
    const { project: projectId, status, priority, assignee } = req.query;

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'A valid project query param is required.' });
    }
    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status filter.' });
    }
    if (priority && !PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority filter.' });
    }
    if (assignee && !isValidObjectId(assignee)) {
      return res.status(400).json({ message: 'Invalid assignee filter.' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!isProjectMember(project, req.user._id))
      return res.status(403).json({ message: 'Access denied.' });

    const filter = { project: projectId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignees = assignee;

    const tasks = await Task.find(filter)
      .populate('assignees', 'name email')
      .populate('createdBy', 'name email')
      .populate('comments.author', 'name email')
      .sort({ order: 1, createdAt: 1 });

    res.json(tasks);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/tasks
router.post('/', ensureDB, protect, async (req, res) => {
  try {
    const {
      title,
      description,
      project: projectId,
      assignees,
      priority,
      dueDate,
      status,
      tags,
    } = req.body || {};

    if (typeof title !== 'string' || !title.trim() || !isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'A task title and valid project are required.' });
    }
    if (!isValidAssignees(assignees)) {
      return res.status(400).json({ message: 'Invalid assignees.' });
    }
    if (!isValidTags(tags)) {
      return res.status(400).json({ message: 'Invalid tags.' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!canWriteProject(project, req.user._id))
      return res
        .status(403)
        .json({ message: 'You do not have permission to create tasks in this project.' });

    const targetStatus = status || 'todo';
    const lastTask = await Task.findOne({ project: projectId, status: targetStatus })
      .sort({ order: -1 })
      .select('order');
    const task = await Task.create({
      title: title.trim(),
      description,
      project: projectId,
      assignees: assignees || [],
      priority: priority || 'medium',
      dueDate,
      status: targetStatus,
      tags: tags || [],
      order: lastTask ? (Number(lastTask.order) || 0) + 1 : 0,
      createdBy: req.user._id,
      activity: [{ user: req.user._id, action: 'created task' }],
    });

    await task.populate('assignees', 'name email');
    await task.populate('createdBy', 'name email');

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) io.to(`project:${projectId}`).emit('task:created', task);

    res.status(201).json(task);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/tasks/:id
router.get('/:id', ensureDB, protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return invalidId(res);

    const task = await Task.findById(req.params.id)
      .populate('assignees', 'name email')
      .populate('createdBy', 'name email')
      .populate('comments.author', 'name email')
      .populate('activity.user', 'name email');
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const project = await Project.findById(task.project);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!isProjectMember(project, req.user._id))
      return res.status(403).json({ message: 'Access denied.' });

    res.json(task);
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/tasks/reorder — persist a complete column reorder after drag-and-drop.
// Declared before /:id so "reorder" is never treated as an ObjectId.
router.put('/reorder', ensureDB, protect, async (req, res) => {
  try {
    const { project: projectId, taskId, status, order } = req.body || {};

    if (!isValidObjectId(projectId) || !isValidObjectId(taskId)) return invalidId(res);
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }
    if (!Number.isInteger(order) || order < 0) {
      return res.status(400).json({ message: 'Invalid destination index.' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!isProjectMember(project, req.user._id)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    if (!canWriteProject(project, req.user._id)) {
      return res
        .status(403)
        .json({ message: 'You do not have permission to reorder tasks in this project.' });
    }

    const task = await Task.findById(taskId);
    if (!task || task.project.toString() !== projectId.toString()) {
      return res.status(404).json({ message: 'Task not found in this project.' });
    }

    const tasks = await Task.find({ project: projectId }).select('_id status order createdAt');
    const updates = applyTaskMove(tasks, taskId, status, order);
    if (!updates.length) {
      return res.status(400).json({ message: 'Unable to reorder tasks.' });
    }

    await Task.bulkWrite(
      updates.map((update) => ({
        updateOne: {
          filter: { _id: update.id },
          update: { $set: { status: update.status, order: update.order } },
        },
      }))
    );

    const updatedTasks = await Task.find({ _id: { $in: updates.map((u) => u.id) } })
      .populate('assignees', 'name email')
      .populate('createdBy', 'name email')
      .populate('comments.author', 'name email');

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('task:reordered', {
        projectId: projectId.toString(),
        tasks: updatedTasks,
      });
    }

    res.json(updatedTasks);
  } catch (err) {
    handleError(res, err);
  }
});

// PUT /api/tasks/:id
router.put('/:id', ensureDB, protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return invalidId(res);

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const project = await Project.findById(task.project);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!canWriteProject(project, req.user._id))
      return res
        .status(403)
        .json({ message: 'You do not have permission to edit tasks in this project.' });

    if (req.body?.assignees !== undefined && !isValidAssignees(req.body.assignees)) {
      return res.status(400).json({ message: 'Invalid assignees.' });
    }
    if (req.body?.tags !== undefined && !isValidTags(req.body.tags)) {
      return res.status(400).json({ message: 'Invalid tags.' });
    }

    const fields = ['title', 'description', 'assignees', 'priority', 'dueDate', 'status', 'tags', 'order'];
    const activityLog = [];

    fields.forEach((f) => {
      if (req.body[f] !== undefined && req.body[f] !== task[f]?.toString()) {
        if (f === 'status' || f === 'priority') {
          activityLog.push({ user: req.user._id, action: `changed ${f}`, from: task[f], to: req.body[f] });
        }
        task[f] = req.body[f];
      }
    });

    if (activityLog.length) task.activity.push(...activityLog);
    await task.save();
    await task.populate('assignees', 'name email');
    await task.populate('createdBy', 'name email');
    await task.populate('comments.author', 'name email');

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) io.to(`project:${task.project}`).emit('task:updated', task);

    res.json(task);
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', ensureDB, protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return invalidId(res);

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const project = await Project.findById(task.project);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!canWriteProject(project, req.user._id))
      return res
        .status(403)
        .json({ message: 'You do not have permission to delete tasks in this project.' });

    const pId = task.project.toString();
    await task.deleteOne();

    const io = req.app.get('io');
    if (io) io.to(`project:${pId}`).emit('task:deleted', { projectId: pId, taskId: req.params.id });

    res.json({ message: 'Task deleted.' });
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', ensureDB, protect, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return invalidId(res);

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const project = await Project.findById(task.project);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!canWriteProject(project, req.user._id))
      return res
        .status(403)
        .json({ message: 'You do not have permission to comment on tasks in this project.' });

    const { text } = req.body || {};
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }

    task.comments.push({ author: req.user._id, text: text.trim() });
    task.activity.push({ user: req.user._id, action: 'added a comment' });
    await task.save();
    await task.populate('comments.author', 'name email');
    await task.populate('activity.user', 'name email');

    const newComment = task.comments[task.comments.length - 1];
    const io = req.app.get('io');
    if (io) io.to(`project:${task.project}`).emit('task:comment', { taskId: req.params.id, task });

    res.status(201).json(newComment);
  } catch (err) {
    handleError(res, err);
  }
});

export default router;