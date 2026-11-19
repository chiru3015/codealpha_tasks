import { io } from 'socket.io-client';

let socket = null;

const readToken = () => {
  try {
    const raw = localStorage.getItem('pm_user');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return typeof parsed?.token === 'string' ? parsed.token : undefined;
  } catch (_) {
    return undefined;
  }
};

export const initSocket = () => {
  if (!socket) {
    socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: (cb) => cb({ token: readToken() }),
    });
  }
  return socket;
};

export const getSocket = () => socket || initSocket();

export const reconnectSocket = () => {
  const s = initSocket();
  s.disconnect();
  s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket) socket.disconnect();
};