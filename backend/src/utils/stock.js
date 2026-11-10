import mongoose from 'mongoose';
import BloodInventory from '../models/BloodInventory.js';
import { AppError } from './AppError.js';

// Remove units FEFO (first-expiry-first-out) inside a session
export const deductStock = async (ownerId, bloodGroup, units, session) => {
  const inv = await BloodInventory.findOne({ owner: ownerId, bloodGroup }).session(session);
  const usable = inv?.batches.filter((b) => b.expiresAt > new Date() && b.units > 0).sort((a, b) => a.expiresAt - b.expiresAt) || [];
  if (usable.reduce((s, b) => s + b.units, 0) < units) throw new AppError(`Insufficient ${bloodGroup} stock`, 409);
  let left = units; const taken = [];
  for (const b of usable) {
    if (!left) break;
    const t = Math.min(b.units, left);
    b.units -= t; left -= t;
    taken.push({ batchNo: b.batchNo, units: t, expiresAt: b.expiresAt });
  }
  inv.batches = inv.batches.filter((b) => b.units > 0);
  await inv.save({ session }); // optimisticConcurrency rejects stale writes
  return { inv, taken };
};

export const addStock = async (ownerId, bloodGroup, batch, session) => {
  const inv = (await BloodInventory.findOne({ owner: ownerId, bloodGroup }).session(session))
    || new BloodInventory({ owner: ownerId, bloodGroup, batches: [] });
  inv.batches.push(batch);
  await inv.save({ session });
  return inv;
};

// Run fn in a transaction with retry on write conflicts
export const withTxn = async (fn, retries = 3) => {
  for (let i = 0; ; i++) {
    const session = await mongoose.startSession();
    try {
      let out;
      await session.withTransaction(async () => { out = await fn(session); });
      return out;
    } catch (e) {
      const transient = e.hasErrorLabel?.('TransientTransactionError') || e.name === 'VersionError';
      if (!transient || i >= retries) throw e;
    } finally { session.endSession(); }
  }
};
