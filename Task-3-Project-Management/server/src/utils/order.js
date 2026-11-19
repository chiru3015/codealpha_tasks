// Pure, dependency-free ordering helpers for Kanban task moves.
// Keep in sync with client/src/utils/order.js (used for optimistic updates).

export const STATUSES = ['todo', 'inprogress', 'review', 'completed'];

export const taskId = (task) => {
  if (task === null || task === undefined) return '';
  if (typeof task === 'object') {
    if (task._id !== undefined && task._id !== null) return String(task._id);
    if (task.id !== undefined && task.id !== null) return String(task.id);
  }
  return String(task);
};

const timeValue = (value) => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

// Deterministic order: numeric order, then creation time, then id.
export const compareTasks = (a, b) => {
  const orderDiff = (Number(a?.order) || 0) - (Number(b?.order) || 0);
  if (orderDiff !== 0) return orderDiff;
  const timeDiff = timeValue(a?.createdAt) - timeValue(b?.createdAt);
  if (timeDiff !== 0) return timeDiff;
  return taskId(a).localeCompare(taskId(b));
};

// Next gap-free order for a column (max + 1), safe after deletions.
export const nextOrder = (tasks, status) => {
  const orders = (tasks || [])
    .filter((task) => task?.status === status)
    .map((task) => Number(task?.order) || 0);
  return orders.length ? Math.max(...orders) + 1 : 0;
};

// Returns the complete set of affected { id, status, order } updates.
// Source and destination siblings are reindexed to contiguous 0..n-1 values.
export const applyTaskMove = (tasks, movedTaskId, toStatus, toIndex) => {
  const id = taskId(movedTaskId);
  const source = (tasks || []).find((task) => taskId(task) === id);
  if (!source) return [];

  const fromStatus = source.status;

  const columnIds = (status) =>
    (tasks || [])
      .filter((task) => taskId(task) !== id && task?.status === status)
      .sort(compareTasks)
      .map(taskId);

  const sourceIds = columnIds(fromStatus);
  const destinationIds = fromStatus === toStatus ? [...sourceIds] : columnIds(toStatus);
  const safeIndex = Math.max(
    0,
    Math.min(Number.isInteger(toIndex) ? toIndex : 0, destinationIds.length)
  );
  destinationIds.splice(safeIndex, 0, id);

  const updates = new Map();
  if (fromStatus !== toStatus) {
    sourceIds.forEach((taskKey, order) => {
      updates.set(taskKey, { id: taskKey, status: fromStatus, order });
    });
  }
  destinationIds.forEach((taskKey, order) => {
    updates.set(taskKey, { id: taskKey, status: toStatus, order });
  });

  return [...updates.values()];
};
