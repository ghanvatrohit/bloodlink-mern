import User from '../models/User.js';
import BloodInventory from '../models/BloodInventory.js';
import BloodRequest from '../models/BloodRequest.js';
import Message from '../models/Message.js';
import AuditLog from '../models/AuditLog.js';
import Broadcast from '../models/Broadcast.js';
import Donation from '../models/Donation.js';
import { ah, AppError } from '../utils/AppError.js';
import { audit } from '../utils/audit.js';
import { getIO } from '../socket/index.js';

// Aggregated platform analytics
export const stats = ah(async (_req, res) => {
  const [units, roles, donorGroups, emergencies, statusCounts, shortages, donations] = await Promise.all([
    BloodInventory.aggregate([{ $group: { _id: '$bloodGroup', units: { $sum: '$totalUnits' } } }, { $sort: { _id: 1 } }]),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.aggregate([{ $match: { role: 'donor' } }, { $group: { _id: { group: '$bloodGroup', availability: '$availability' }, count: { $sum: 1 } } }]),
    BloodRequest.aggregate([{ $match: { urgency: 'Critical', status: { $in: ['Pending', 'Accepted', 'In-Transit'] } } }, { $group: { _id: { city: '$city', group: '$bloodGroup' }, count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    BloodRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    BloodInventory.find({ $expr: { $lt: ['$totalUnits', '$threshold'] } }).populate('owner', 'name city role').limit(50),
    Donation.countDocuments({ status: 'Accepted' }),
  ]);
  res.json({ units, roles, donorGroups, emergencies, statusCounts, shortages, donations });
});

export const listUsers = ah(async (req, res) => {
  const { role, q, page = 1 } = req.query;
  const filter = { ...(role && { role }), ...(q && { $or: [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }] }) };
  const [rows, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 20).limit(20), User.countDocuments(filter)]);
  res.json({ rows, total });
});
export const createUser = ah(async (req, res) => {
  const u = await User.create({ ...req.body, isVerified: true });
  await audit({ action: 'USER_ADMIN', actor: req.user._id, entity: 'User', entityId: u._id, meta: { op: 'create' } });
  res.status(201).json(u);
});
export const updateUser = ah(async (req, res) => {
  const { password, tokenVersion, ...rest } = req.body;
  const u = await User.findByIdAndUpdate(req.params.id, { ...rest, ...(rest.isBlocked && { $inc: { tokenVersion: 1 } }) }, { new: true, runValidators: true });
  if (!u) throw new AppError('Not found', 404);
  await audit({ action: 'USER_ADMIN', actor: req.user._id, entity: 'User', entityId: u._id, meta: { op: 'update', fields: Object.keys(rest) } });
  res.json(u);
});
export const deleteUser = ah(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  await audit({ action: 'USER_ADMIN', actor: req.user._id, entity: 'User', entityId: req.params.id, meta: { op: 'delete' } });
  res.json({ message: 'Deleted' });
});

export const allInventory = ah(async (_req, res) => res.json(await BloodInventory.find().populate('owner', 'name role city')));
export const adjustInventory = ah(async (req, res) => {
  const inv = await BloodInventory.findById(req.params.id);
  if (!inv) throw new AppError('Not found', 404);
  if (req.body.threshold !== undefined) inv.threshold = req.body.threshold;
  await inv.save();
  await audit({ action: 'INVENTORY_ADJUST', actor: req.user._id, entity: 'BloodInventory', entityId: inv._id, meta: { op: 'admin', ...req.body } });
  res.json(inv);
});

export const moderation = ah(async (req, res) => {
  const { q, flagged = 'true' } = req.query;
  const filter = { deleted: false, ...(flagged === 'true' && { flagged: true }), ...(q && { $text: { $search: q } }) };
  res.json(await Message.find(filter).sort({ createdAt: -1 }).limit(100).populate('sender', 'name role email'));
});
export const deleteMessage = ah(async (req, res) => {
  const m = await Message.findByIdAndUpdate(req.params.id, { deleted: true }, { new: true });
  if (!m) throw new AppError('Not found', 404);
  await audit({ action: 'MESSAGE_DELETE', actor: req.user._id, entity: 'Message', entityId: m._id, meta: { reason: m.flagReason } });
  getIO()?.to(`conv:${m.conversation}`).emit('chat:deleted', { messageId: m._id });
  res.json({ message: 'Removed' });
});

export const broadcast = ah(async (req, res) => {
  const b = await Broadcast.create({ ...req.body, createdBy: req.user._id });
  const io = getIO();
  const room = req.body.city ? io?.to(`city:${req.body.city.toLowerCase()}`) : io;
  room?.emit('broadcast:alert', b);
  res.status(201).json(b);
});
export const listBroadcasts = ah(async (_req, res) => res.json(await Broadcast.find().sort({ createdAt: -1 }).limit(20)));

export const auditLogs = ah(async (req, res) => {
  const { action, page = 1 } = req.query;
  res.json(await AuditLog.find(action ? { action } : {}).sort({ createdAt: -1 }).skip((page - 1) * 50).limit(50).populate('actor', 'name role'));
});
