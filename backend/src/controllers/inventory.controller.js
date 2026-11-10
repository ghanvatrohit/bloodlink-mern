import BloodInventory from '../models/BloodInventory.js';
import User from '../models/User.js';
import BloodRequest from '../models/BloodRequest.js';
import { ah, AppError } from '../utils/AppError.js';
import { addStock, deductStock, withTxn } from '../utils/stock.js';
import { audit } from '../utils/audit.js';
import { getIO } from '../socket/index.js';
import { BLOOD_GROUPS } from '../utils/constants.js';

// Return all 8 groups (zero-filled) for the facility
export const myInventory = ah(async (req, res) => {
  const owner = req.user.role === 'admin' && req.query.owner ? req.query.owner : req.user._id;
  const rows = await BloodInventory.find({ owner }).lean();
  const now = Date.now();
  res.json(BLOOD_GROUPS.map((g) => {
    const r = rows.find((x) => x.bloodGroup === g) || { bloodGroup: g, totalUnits: 0, threshold: 5, batches: [] };
    const expiringSoon = r.batches.filter((b) => new Date(b.expiresAt) - now < 7 * 864e5).reduce((s, b) => s + b.units, 0);
    return { ...r, expiringSoon, low: r.totalUnits < r.threshold };
  }));
});

export const addBatch = ah(async (req, res) => {
  const { bloodGroup, ...batch } = req.body;
  if (batch.expiresAt <= new Date()) throw new AppError('Expiry must be in the future');
  const inv = await withTxn(async (s) => {
    const i = await addStock(req.user._id, bloodGroup, batch, s);
    await audit({ action: 'INVENTORY_ADJUST', actor: req.user._id, entity: 'BloodInventory', entityId: i._id, meta: { op: 'add', bloodGroup, ...batch }, ip: req.ip }, s);
    return i;
  });
  getIO()?.to(`user:${req.user._id}`).emit('inventory:updated', inv);
  res.status(201).json(inv);
});

export const removeBatch = ah(async (req, res) => {
  const inv = await withTxn(async (s) => {
    const i = await BloodInventory.findOne({ owner: req.user._id, 'batches._id': req.params.batchId }).session(s);
    if (!i) throw new AppError('Batch not found', 404);
    const b = i.batches.id(req.params.batchId);
    const meta = { op: 'discard', bloodGroup: i.bloodGroup, batchNo: b.batchNo, units: b.units, reason: req.body?.reason };
    b.deleteOne();
    await i.save({ session: s });
    await audit({ action: 'INVENTORY_ADJUST', actor: req.user._id, entity: 'BloodInventory', entityId: i._id, meta, ip: req.ip }, s);
    return i;
  });
  res.json(inv);
});

export const setThreshold = ah(async (req, res) => {
  const inv = await BloodInventory.findOneAndUpdate({ owner: req.user._id, bloodGroup: req.params.group }, { threshold: Number(req.body.threshold) }, { new: true, upsert: true });
  res.json(inv);
});

// Organization transfers stock to a hospital atomically
export const transferToHospital = ah(async (req, res) => {
  const { hospitalId, bloodGroup, units, requestId } = req.body;
  if (!(await User.exists({ _id: hospitalId, role: 'hospital' }))) throw new AppError('Hospital not found', 404);
  const result = await withTxn(async (s) => {
    const { taken } = await deductStock(req.user._id, bloodGroup, units, s);
    for (const t of taken) await addStock(hospitalId, bloodGroup, { batchNo: t.batchNo, units: t.units, expiresAt: t.expiresAt, storageUnit: 'received' }, s);
    if (requestId) {
      await BloodRequest.updateOne({ _id: requestId, target: req.user._id }, { status: 'Fulfilled', assignedTo: req.user._id, allottedBatches: taken, $push: { timeline: { status: 'Fulfilled', by: req.user._id, note: 'Stock transferred' } } }, { session: s });
    }
    await audit({ action: 'TRANSFER', actor: req.user._id, entity: 'BloodInventory', meta: { to: hospitalId, bloodGroup, units, taken, requestId }, ip: req.ip }, s);
    return taken;
  });
  getIO()?.to(`user:${hospitalId}`).emit('inventory:received', { from: req.user.name, bloodGroup, units });
  res.json({ message: 'Transferred', batches: result });
});

// Network-wide availability by group & city
export const availability = ah(async (req, res) => {
  const { bloodGroup, city } = req.query;
  const facilities = await User.find({ role: { $in: ['hospital', 'organization'] }, ...(city && { city: city.toLowerCase() }) }).select('_id name role city');
  const inv = await BloodInventory.find({ owner: { $in: facilities.map((f) => f._id) }, ...(bloodGroup && { bloodGroup }), totalUnits: { $gt: 0 } }).select('owner bloodGroup totalUnits');
  res.json(inv.map((i) => ({ ...i.toObject(), facility: facilities.find((f) => f._id.equals(i.owner)) })));
});
