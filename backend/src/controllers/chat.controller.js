import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { ah, AppError } from '../utils/AppError.js';

// Who may chat with whom
const CHAT_MATRIX = {
  patient: ['hospital', 'donor'], donor: ['hospital', 'organization', 'patient'],
  hospital: ['patient', 'organization', 'donor'], organization: ['donor', 'hospital'], admin: [],
};

export const ensureConversation = async (a, b, request) => {
  const pairKey = [a.toString(), b.toString()].sort().join('_');
  return Conversation.findOneAndUpdate({ pairKey }, { $setOnInsert: { participants: [a, b], pairKey, request } }, { upsert: true, new: true });
};

export const startConversation = ah(async (req, res) => {
  const other = await User.findById(req.body.userId);
  if (!other) throw new AppError('User not found', 404);
  if (!CHAT_MATRIX[req.user.role].includes(other.role)) throw new AppError(`${req.user.role} cannot chat with ${other.role}`, 403);
  const c = await ensureConversation(req.user._id, other._id);
  res.json(await c.populate('participants', 'name role city'));
});

export const myConversations = ah(async (req, res) => {
  res.json(await Conversation.find({ participants: req.user._id }).sort({ updatedAt: -1 }).populate('participants', 'name role city'));
});

export const messages = ah(async (req, res) => {
  const c = await Conversation.exists({ _id: req.params.id, participants: req.user._id });
  if (!c && req.user.role !== 'admin') throw new AppError('Forbidden', 403);
  const before = req.query.before ? { createdAt: { $lt: new Date(req.query.before) } } : {};
  const rows = await Message.find({ conversation: req.params.id, deleted: false, ...before }).sort({ createdAt: -1 }).limit(50).populate('sender', 'name role');
  res.json(rows.reverse());
});

export const flagMessage = ah(async (req, res) => {
  const m = await Message.findById(req.params.id);
  if (!m || !(await Conversation.exists({ _id: m.conversation, participants: req.user._id }))) throw new AppError('Not found', 404);
  m.flagged = true; m.flagReason = req.body.reason || 'user-report';
  await m.save();
  res.json({ message: 'Reported' });
});

export const contacts = ah(async (req, res) => {
  const roles = CHAT_MATRIX[req.user.role];
  const q = { role: { $in: roles }, _id: { $ne: req.user._id }, ...(req.query.q && { name: new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, ''), 'i') }) };
  res.json(await User.find(q).select('name role city').limit(30));
});
