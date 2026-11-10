import mongoose from 'mongoose';
import { BLOOD_GROUPS } from '../utils/constants.js';

const batchSchema = new mongoose.Schema({
  batchNo: { type: String, required: true },
  units: { type: Number, required: true, min: 0 },
  collectedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  sourceDonor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  storageUnit: String,
}, { _id: true });

const inventorySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
  totalUnits: { type: Number, default: 0, min: 0 },
  threshold: { type: Number, default: 5 },
  batches: [batchSchema],
  storageTempC: { type: Number, default: 4 },
}, { timestamps: true, optimisticConcurrency: true });

inventorySchema.index({ owner: 1, bloodGroup: 1 }, { unique: true });
inventorySchema.index({ bloodGroup: 1, totalUnits: -1 });
inventorySchema.index({ 'batches.expiresAt': 1 });

// Keep total in sync with batches
inventorySchema.pre('save', function (next) {
  this.totalUnits = this.batches.reduce((s, b) => s + b.units, 0);
  next();
});
export default mongoose.model('BloodInventory', inventorySchema);
