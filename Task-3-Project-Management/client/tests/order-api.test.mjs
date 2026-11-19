import test from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';

// Run against the live dev server: node --test client/tests/order-api.test.mjs
const BASE = process.env.TEST_API_URL || 'http://localhost:5002';
const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const api = async (method, path, token, body) => {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
};

const connect = (token) =>
  new Promise((resolve, reject) => {
    const socket = io(BASE, {
      transports: ['websocket'],
      reconnection: false,
      auth: { token },
    });
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Socket connect timed out'));
    }, 8000);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once('connect_error', (err) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(err);
    });
  });

const join = (socket, projectId) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('join:project ack timed out')), 8000);
    socket.emit('join:project', projectId, (ack) => {
      clearTimeout(timer);
      if (ack?.ok) resolve(ack);
      else reject(new Error(ack?.message || 'join:project failed'));
    });
  });

const nextEvent = (socket, event, timeout = 8000) =>
  new Promise((resolve, reject) => {
    const onEvent = (payload) => {
      clearTimeout(timer);
      socket.off(event, onEvent);
      resolve(payload);
    };
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`${event} timed out`));
    }, timeout);
    socket.once(event, onEvent);
  });

const register = async (label) => {
  const email = `phaseb-order-${label}-${unique}@example.test`;
  const response = await api('POST', '/api/auth/register', null, {
    name: `PhaseB ${label}`,
    email,
    password: 'testpass123',
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  return { email, token: response.data.token, id: response.data._id };
};

const reorder = (token, projectId, taskId, status, order) =>
  api('PUT', '/api/tasks/reorder', token, { project: projectId, taskId, status, order });

const board = async (token, projectId) => {
  const response = await api('GET', `/api/tasks?project=${projectId}`, token);
  assert.equal(response.status, 200);
  return response.data;
};

const titles = (tasks, status) =>
  tasks
    .filter((task) => task.status === status)
    .sort((a, b) => a.order - b.order)
    .map((task) => task.title);

const assertUniqueOrders = (tasks) => {
  const keys = tasks.map((task) => `${task.status}:${task.order}`);
  assert.equal(new Set(keys).size, keys.length, `duplicate status/order found: ${keys.join(', ')}`);
};

test('Phase B Task 1 — Kanban order persistence (live API + Socket.io)', async (t) => {
  const owner = await register('owner');
  const member = await register('member');
  const viewer = await register('viewer');
  const sockets = [];

  let project;
  let otherProject;
  let A;
  let B;
  let C;
  let X;

  try {
    await t.test('setup project, members and authenticated sockets', async () => {
      const created = await api('POST', '/api/projects', owner.token, {
        name: `PhaseB Order ${unique}`,
      });
      assert.equal(created.status, 201, JSON.stringify(created.data));
      project = created.data;

      const other = await api('POST', '/api/projects', owner.token, {
        name: `PhaseB Other ${unique}`,
      });
      assert.equal(other.status, 201);
      otherProject = other.data;

      assert.equal(
        (await api('POST', `/api/projects/${project._id}/members`, owner.token, {
          userId: member.id,
          role: 'member',
        })).status,
        200
      );
      assert.equal(
        (await api('POST', `/api/projects/${project._id}/members`, owner.token, {
          userId: viewer.id,
          role: 'viewer',
        })).status,
        200
      );

      for (const account of [owner, member, viewer]) {
        const socket = await connect(account.token);
        await join(socket, project._id);
        sockets.push(socket);
      }

      const create = async (title, status) => {
        const response = await api('POST', '/api/tasks', owner.token, {
          title,
          project: project._id,
          status,
        });
        assert.equal(response.status, 201, JSON.stringify(response.data));
        return response.data;
      };

      A = await create('A', 'todo');
      B = await create('B', 'todo');
      C = await create('C', 'todo');
      X = await create('X', 'inprogress');
      assert.deepEqual(titles(await board(owner.token, project._id), 'todo'), ['A', 'B', 'C']);
    });

    await t.test('move upward within a column', async () => {
      const response = await reorder(owner.token, project._id, C._id, 'todo', 0);
      assert.equal(response.status, 200, JSON.stringify(response.data));
      const updated = new Map(response.data.map((task) => [task._id, task]));
      assert.equal(updated.get(C._id).order, 0);
      assert.equal(updated.get(A._id).order, 1);
      assert.equal(updated.get(B._id).order, 2);
      assert.deepEqual(titles(await board(owner.token, project._id), 'todo'), ['C', 'A', 'B']);
    });

    await t.test('move downward within a column', async () => {
      const response = await reorder(owner.token, project._id, C._id, 'todo', 2);
      assert.equal(response.status, 200);
      assert.deepEqual(titles(await board(owner.token, project._id), 'todo'), ['A', 'B', 'C']);
    });

    await t.test('move to another column', async () => {
      const response = await reorder(owner.token, project._id, B._id, 'inprogress', 1);
      assert.equal(response.status, 200);
      const tasks = await board(owner.token, project._id);
      assert.deepEqual(titles(tasks, 'todo'), ['A', 'C']);
      assert.deepEqual(titles(tasks, 'inprogress'), ['X', 'B']);
      assertUniqueOrders(tasks);
    });

    await t.test('move into an empty column', async () => {
      const response = await reorder(owner.token, project._id, A._id, 'completed', 0);
      assert.equal(response.status, 200);
      const tasks = await board(owner.token, project._id);
      assert.deepEqual(titles(tasks, 'completed'), ['A']);
      assert.deepEqual(titles(tasks, 'todo'), ['C']);
      assertUniqueOrders(tasks);
    });

    await t.test('second connected client receives task:reordered', async () => {
      const received = nextEvent(sockets[1], 'task:reordered');
      const response = await reorder(owner.token, project._id, X._id, 'todo', 1);
      assert.equal(response.status, 200);

      const payload = await received;
      assert.equal(payload.projectId, project._id);
      assert.ok(Array.isArray(payload.tasks));
      const updated = new Map(payload.tasks.map((task) => [task._id, task]));
      assert.equal(updated.get(X._id).status, 'todo');
      assert.equal(updated.get(X._id).order, 1);
      assert.equal(updated.get(C._id).order, 0);
    });

    await t.test('delete then create leaves no duplicate order values', async () => {
      const deleted = await api('DELETE', `/api/tasks/${C._id}`, owner.token);
      assert.equal(deleted.status, 200);

      const created = await api('POST', '/api/tasks', owner.token, {
        title: 'NEW',
        project: project._id,
        status: 'todo',
      });
      assert.equal(created.status, 201);
      assert.equal(created.data.order, 2, 'expected max(existing order) + 1 after a gap');

      const tasks = await board(owner.token, project._id);
      assert.deepEqual(titles(tasks, 'todo'), ['X', 'NEW']);
      assertUniqueOrders(tasks);
    });

    await t.test('order survives a fresh server read (browser refresh equivalent)', async () => {
      const tasks = await board(owner.token, project._id);
      assert.deepEqual(titles(tasks, 'todo'), ['X', 'NEW']);
      assert.deepEqual(titles(tasks, 'inprogress'), ['B']);
      assert.deepEqual(titles(tasks, 'completed'), ['A']);
      assertUniqueOrders(tasks);
    });

    await t.test('viewer receives HTTP 403', async () => {
      const response = await reorder(viewer.token, project._id, B._id, 'todo', 0);
      assert.equal(response.status, 403, JSON.stringify(response.data));
    });

    await t.test('invalid ids, statuses and indices are rejected', async () => {
      assert.equal((await reorder(owner.token, 'bad-id', B._id, 'todo', 0)).status, 400);
      assert.equal((await reorder(owner.token, project._id, 'bad-id', 'todo', 0)).status, 400);
      assert.equal((await reorder(owner.token, project._id, B._id, 'unknown', 0)).status, 400);
      assert.equal((await reorder(owner.token, project._id, B._id, 'todo', -1)).status, 400);
      assert.equal((await reorder(owner.token, project._id, B._id, 'todo', 1.5)).status, 400);
      assert.equal((await reorder(null, project._id, B._id, 'todo', 0)).status, 401);

      // Task from a different project must not be movable into this one.
      const foreign = await api('POST', '/api/tasks', owner.token, {
        title: 'FOREIGN',
        project: otherProject._id,
        status: 'todo',
      });
      assert.equal(foreign.status, 201);
      const cross = await reorder(owner.token, project._id, foreign.data._id, 'todo', 0);
      assert.equal(cross.status, 404, JSON.stringify(cross.data));
    });
  } finally {
    for (const socket of sockets) socket.disconnect();
    if (project) await api('DELETE', `/api/projects/${project._id}`, owner.token);
    if (otherProject) await api('DELETE', `/api/projects/${otherProject._id}`, owner.token);
  }
});
