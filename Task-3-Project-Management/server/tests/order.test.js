import test from 'node:test';
import assert from 'node:assert/strict';

import { applyTaskMove, compareTasks, nextOrder } from '../src/utils/order.js';
import {
  applyTaskMove as clientApplyTaskMove,
  compareTasks as clientCompareTasks,
  nextOrder as clientNextOrder,
} from '../../client/src/utils/order.js';

const task = (id, status, order, createdAt = '2026-01-01T00:00:00.000Z') => ({
  _id: id,
  status,
  order,
  createdAt,
});

const byId = (updates) => new Map(updates.map((update) => [update.id, update]));

const column = [
  task('A', 'todo', 0, '2026-01-01T00:00:00.000Z'),
  task('B', 'todo', 1, '2026-01-02T00:00:00.000Z'),
  task('C', 'todo', 2, '2026-01-03T00:00:00.000Z'),
];

test('moves a card upward and reindexes every sibling', () => {
  const updates = byId(applyTaskMove(column, 'A', 'todo', 2));

  assert.equal(updates.size, 3);
  assert.deepEqual(updates.get('A'), { id: 'A', status: 'todo', order: 2 });
  assert.deepEqual(updates.get('B'), { id: 'B', status: 'todo', order: 0 });
  assert.deepEqual(updates.get('C'), { id: 'C', status: 'todo', order: 1 });
});

test('moves a card downward and reindexes every sibling', () => {
  const updates = byId(applyTaskMove(column, 'C', 'todo', 0));

  assert.equal(updates.size, 3);
  assert.deepEqual(updates.get('C'), { id: 'C', status: 'todo', order: 0 });
  assert.deepEqual(updates.get('A'), { id: 'A', status: 'todo', order: 1 });
  assert.deepEqual(updates.get('B'), { id: 'B', status: 'todo', order: 2 });
});

test('moves a card across columns and reindexes source and destination', () => {
  const tasks = [
    ...column,
    task('X', 'inprogress', 0, '2026-02-01T00:00:00.000Z'),
    task('Y', 'inprogress', 1, '2026-02-02T00:00:00.000Z'),
    task('Z', 'review', 0, '2026-03-01T00:00:00.000Z'),
  ];

  const updates = byId(applyTaskMove(tasks, 'B', 'inprogress', 1));

  assert.equal(updates.size, 5); // 2 source siblings + 3 destination tasks
  assert.deepEqual(updates.get('B'), { id: 'B', status: 'inprogress', order: 1 });
  assert.deepEqual(updates.get('A'), { id: 'A', status: 'todo', order: 0 });
  assert.deepEqual(updates.get('C'), { id: 'C', status: 'todo', order: 1 });
  assert.deepEqual(updates.get('X'), { id: 'X', status: 'inprogress', order: 0 });
  assert.deepEqual(updates.get('Y'), { id: 'Y', status: 'inprogress', order: 2 });
  assert.equal(updates.has('Z'), false, 'unrelated columns must not be touched');
});

test('moves a card into an empty column', () => {
  const updates = byId(applyTaskMove(column, 'A', 'review', 0));

  assert.equal(updates.size, 3);
  assert.deepEqual(updates.get('A'), { id: 'A', status: 'review', order: 0 });
  assert.deepEqual(updates.get('B'), { id: 'B', status: 'todo', order: 0 });
  assert.deepEqual(updates.get('C'), { id: 'C', status: 'todo', order: 1 });
});

test('clamps an out-of-range index to the end of the column', () => {
  const updates = byId(applyTaskMove(column, 'A', 'todo', 99));
  assert.deepEqual(updates.get('A'), { id: 'A', status: 'todo', order: 2 });
});

test('returns no updates for an unknown task', () => {
  assert.deepEqual(applyTaskMove(column, 'MISSING', 'todo', 0), []);
});

test('nextOrder avoids duplicate orders after deletions leave gaps', () => {
  const withGap = [
    task('A', 'todo', 0),
    task('C', 'todo', 2),
    task('D', 'inprogress', 0),
  ];

  assert.equal(nextOrder(withGap, 'todo'), 3);
  assert.equal(nextOrder(withGap, 'review'), 0);
  assert.equal(nextOrder([], 'todo'), 0);
});

test('compareTasks breaks ties by createdAt then id', () => {
  const earlier = task('B', 'todo', 0, '2026-01-01T00:00:00.000Z');
  const later = task('C', 'todo', 0, '2026-01-02T00:00:00.000Z');
  assert.ok(compareTasks(earlier, later) < 0);

  const sameTimeA = task('B', 'todo', 0, '2026-01-01T00:00:00.000Z');
  const sameTimeB = task('A', 'todo', 0, '2026-01-01T00:00:00.000Z');
  assert.ok(compareTasks(sameTimeB, sameTimeA) < 0);
});

test('client and server helpers produce identical results', () => {
  const tasks = [
    ...column,
    task('X', 'inprogress', 0),
    task('Y', 'review', 0, '2026-04-01T00:00:00.000Z'),
    task('Z', 'review', 0, '2026-04-02T00:00:00.000Z'),
  ];
  const cases = [
    ['A', 'todo', 2],
    ['C', 'todo', 0],
    ['B', 'inprogress', 1],
    ['X', 'review', 1],
    ['Z', 'completed', 0],
  ];

  for (const [id, status, index] of cases) {
    assert.deepEqual(
      applyTaskMove(tasks, id, status, index),
      clientApplyTaskMove(tasks, id, status, index)
    );
  }
  assert.equal(nextOrder(tasks, 'todo'), clientNextOrder(tasks, 'todo'));
  assert.equal(compareTasks(task('A', 'todo', 0), task('B', 'todo', 1)), clientCompareTasks(task('A', 'todo', 0), task('B', 'todo', 1)));
});
