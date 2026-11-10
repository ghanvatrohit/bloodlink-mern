// Live connection to the backend (Socket.io) for real-time updates.
import { io } from 'socket.io-client';
import { SERVER_URL } from '../constants';

let socket = null;

export function connectSocket(token) {
  if (socket) socket.disconnect();
  socket = io(SERVER_URL, { auth: { token }, transports: ['websocket'] });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) socket.disconnect();
  socket = null;
}
