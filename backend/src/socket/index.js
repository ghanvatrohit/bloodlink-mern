import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { logger } from '../utils/logger.js';

let io;
const BANNED = /\b(fuck|shit|scam|sell blood|paid donor)\b/i;

export const initSocket = (server) => {
  io = new Server(server, { cors: { origin: env.clientUrl, credentials: true } });

  // JWT handshake auth
  io.use(async (socket, next) => {
    try {
      const { id } = jwt.verify(socket.handshake.auth?.token, env.accessSecret);
      const user = await User.findById(id);
      if (!user || user.isBlocked) return next(new Error('Unauthorized'));
      socket.user = user;
      next();
    } catch { next(new Error('Unauthorized')); }
  });

  io.on('connection', (socket) => {
    const u = socket.user;
    socket.join(`user:${u._id}`);
    socket.join(`role:${u.role}`);
    socket.join(`city:${u.city}`);
    if (u.role === 'donor' && u.bloodGroup) socket.join(`donors:${u.city}:${u.bloodGroup}`);
    io.emit('presence:online', { userId: u._id });

    socket.on('chat:join', async (conversationId) => {
      const c = await Conversation.exists({ _id: conversationId, participants: u._id });
      if (c) socket.join(`conv:${conversationId}`);
    });

    socket.on('chat:send', async ({ conversationId, text }, ack) => {
      try {
        const conv = await Conversation.findOne({ _id: conversationId, participants: u._id });
        if (!conv || !text?.trim()) return ack?.({ error: 'Invalid' });
        const msg = await Message.create({ conversation: conv._id, sender: u._id, text: text.slice(0, 2000), flagged: BANNED.test(text), flagReason: BANNED.test(text) ? 'auto:keyword' : undefined, readBy: [u._id] });
        conv.lastMessage = { text: msg.text, at: msg.createdAt, sender: u._id };
        await conv.save();
        const payload = await msg.populate('sender', 'name role');
        io.to(`conv:${conv._id}`).emit('chat:message', payload);
        conv.participants.forEach((p) => io.to(`user:${p}`).emit('chat:notify', { conversationId: conv._id, text: msg.text, from: u.name }));
        if (msg.flagged) io.to('role:admin').emit('moderation:flagged', payload);
        ack?.({ ok: true, message: payload });
      } catch (e) { logger.error(e); ack?.({ error: 'Failed' }); }
    });

    socket.on('chat:typing', ({ conversationId }) => socket.to(`conv:${conversationId}`).emit('chat:typing', { userId: u._id, name: u.name }));
    socket.on('chat:read', async ({ conversationId }) => {
      await Message.updateMany({ conversation: conversationId, readBy: { $ne: u._id } }, { $addToSet: { readBy: u._id } });
      socket.to(`conv:${conversationId}`).emit('chat:read', { conversationId, userId: u._id });
    });
    socket.on('disconnect', () => io.emit('presence:offline', { userId: u._id }));
  });
  return io;
};
export const getIO = () => io;
