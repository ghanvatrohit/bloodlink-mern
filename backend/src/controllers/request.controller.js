import BloodRequest from '../models/BloodRequest.js';
import User from '../models/User.js';
import { ah, AppError } from '../utils/AppError.js';
import { deductStock, withTxn } from '../utils/stock.js';
import { audit } from '../utils/audit.js';
import { getIO } from '../socket/index.js';
import { CAN_DONATE_TO } from '../utils/constants.js';
import { ensureConversation } from './chat.controller.js';

// Allowed transitions for the request pipeline
const FLOW = { Pending: ['Accepted', 'Cancelled'], Accepted: ['In-Transit', 'Fulfilled', 'Cancelled'], 'In-Transit': ['Fulfilled', 'Cancelled'], Fulfilled: [], Cancelled: [] };

export const createRequest = ah(async (req, res) => {
  const b = req.body;
  if (b.targetType !== 'public') {
    if (!b.target) throw new AppError('Target facility required');
    if (!(await User.exists({ _id: b.target, role: b.targetType }))) throw new AppError('Target not found', 404);
  }
  if (req.user.role === 'hospital' && b.targetType !== 'organization') throw new AppError('Hospitals can only request from organizations', 403);
  const r = await BloodRequest.create({
    ...b, requester: req.user._id, requesterRole: req.user.role,
    prescriptionUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
    timeline: [{ status: 'Pending', by: req.user._id }],
  });
  const io = getIO();
  if (b.target) io?.to(`user:${b.target}`).emit('request:new', r);
  if (b.targetType === 'public') notifyDonors(r, req.user.name);
  res.status(201).json(r);
});

// Push to matching active donors in city
const notifyDonors = (r, fromName) => {
  const groups = Object.entries(CAN_DONATE_TO).filter(([, to]) => to.includes(r.bloodGroup)).map(([g]) => g);
  groups.forEach((g) => getIO()?.to(`donors:${r.city}:${g}`).emit('sos:alert', { requestId: r._id, bloodGroup: r.bloodGroup, units: r.units, city: r.city, urgency: r.urgency, from: fromName }));
};

// SOS: one-click critical public broadcast
export const sos = ah(async (req, res) => {
  const r = await BloodRequest.create({
    bloodGroup: req.body.bloodGroup, units: req.body.units || 1, city: (req.body.city || req.user.city).toLowerCase(),
    urgency: 'Critical', targetType: 'public', isSOS: true, requester: req.user._id, requesterRole: req.user.role === 'hospital' ? 'hospital' : 'patient',
    timeline: [{ status: 'Pending', by: req.user._id, note: 'SOS' }],
  });
  notifyDonors(r, req.user.name);
  getIO()?.to(`city:${r.city}`).emit('sos:broadcast', { requestId: r._id, bloodGroup: r.bloodGroup, city: r.city });
  res.status(201).json(r);
});

export const listRequests = ah(async (req, res) => {
  const u = req.user; const { status, scope } = req.query;
  let q = {};
  if (u.role === 'patient') q = { requester: u._id };
  else if (u.role === 'hospital') q = scope === 'outgoing' ? { requester: u._id } : { target: u._id };
  else if (u.role === 'organization') q = { target: u._id };
  else if (u.role === 'donor') q = { targetType: 'public', city: u.city, status: { $in: ['Pending', 'Accepted'] }, bloodGroup: { $in: CAN_DONATE_TO[u.bloodGroup] || [] } };
  if (status) q.status = status;
  const rows = await BloodRequest.find(q).sort({ urgency: 1, createdAt: -1 }).limit(200)
    .populate('requester', 'name mobile city role').populate('target', 'name role city').populate('assignedTo', 'name role');
  res.json(rows);
});

export const getRequest = ah(async (req, res) => {
  const r = await BloodRequest.findById(req.params.id).populate('requester target assignedTo volunteers', 'name role city mobile');
  if (!r) throw new AppError('Not found', 404);
  res.json(r);
});

// Hospital/org allots stock to request atomically (prevents last-unit races)
export const allot = ah(async (req, res) => {
  const updated = await withTxn(async (s) => {
    const r = await BloodRequest.findOne({ _id: req.params.id, target: req.user._id, status: 'Pending' }).session(s);
    if (!r) throw new AppError('Request not pending or not yours', 409);
    if (r.requesterRole === 'patient' && r.prescriptionUrl && !req.body.verified) throw new AppError('Verify prescription first');
    const { taken } = await deductStock(req.user._id, r.bloodGroup, r.units, s);
    r.status = 'Accepted'; r.assignedTo = req.user._id; r.allottedBatches = taken; r.prescriptionVerified = !!req.body.verified;
    r.timeline.push({ status: 'Accepted', by: req.user._id, note: `Allotted ${r.units}u` });
    await r.save({ session: s });
    await audit({ action: 'ALLOT', actor: req.user._id, entity: 'BloodRequest', entityId: r._id, meta: { bloodGroup: r.bloodGroup, units: r.units, taken }, ip: req.ip }, s);
    return r;
  });
  await ensureConversation(req.user._id, updated.requester, updated._id);
  getIO()?.to(`user:${updated.requester}`).emit('request:updated', updated);
  res.json(updated);
});

export const updateStatus = ah(async (req, res) => {
  const r = await BloodRequest.findById(req.params.id);
  if (!r) throw new AppError('Not found', 404);
  const u = req.user; const { status, note } = req.body;
  const isOwner = r.requester.equals(u._id);
  const isHandler = r.target?.equals(u._id) || r.assignedTo?.equals(u._id) || u.role === 'admin';
  if (status === 'Cancelled' ? !(isOwner || isHandler) : !isHandler) throw new AppError('Forbidden', 403);
  if (!FLOW[r.status].includes(status)) throw new AppError(`Cannot move ${r.status} -> ${status}`, 409);
  r.status = status; r.timeline.push({ status, by: u._id, note });
  await r.save();
  await audit({ action: 'REQUEST_STATUS', actor: u._id, entity: 'BloodRequest', entityId: r._id, meta: { status, note }, ip: req.ip });
  [r.requester, r.target, r.assignedTo].filter(Boolean).forEach((id) => getIO()?.to(`user:${id}`).emit('request:updated', r));
  res.json(r);
});

// Donor volunteers for a public request
export const volunteer = ah(async (req, res) => {
  const d = req.user.refreshCooldown();
  if (d.availability !== 'Active' || !d.healthEligible) throw new AppError('You are not currently eligible to donate', 409);
  const r = await BloodRequest.findOneAndUpdate({ _id: req.params.id, targetType: 'public', status: { $in: ['Pending', 'Accepted'] } }, { $addToSet: { volunteers: d._id } }, { new: true });
  if (!r) throw new AppError('Request unavailable', 404);
  await ensureConversation(d._id, r.requester, r._id);
  getIO()?.to(`user:${r.requester}`).emit('request:volunteer', { requestId: r._id, donor: { _id: d._id, name: d.name, bloodGroup: d.bloodGroup } });
  res.json(r);
});
