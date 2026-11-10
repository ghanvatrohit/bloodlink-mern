import mongoose from 'mongoose';
import { BLOOD_GROUPS, REQUEST_STATUS } from '../utils/constants.js';

const requestSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requesterRole: { type: String, enum: ['patient', 'hospital'], required: true },
  // 'facility' targets a hospital/org; 'public' is open to donors
  targetType: { type: String, enum: ['hospital', 'organization', 'public'], required: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
  units: { type: Number, required: true, min: 1, max: 20 },
  urgency: { type: String, enum: ['Normal', 'Critical'], default: 'Normal' },
  patientName: String,
  city: { type: String, required: true, lowercase: true },
  prescriptionUrl: String,
  prescriptionVerified: { type: Boolean, default: false },
  status: { type: String, enum: REQUEST_STATUS, default: 'Pending' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  volunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  allottedBatches: [{ batchNo: String, units: Number }],
  timeline: [{ status: String, at: { type: Date, default: Date.now }, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, note: String }],
  isSOS: { type: Boolean, default: false },
}, { timestamps: true });

requestSchema.index({ status: 1, urgency: -1, createdAt: -1 });
requestSchema.index({ target: 1, status: 1 });
requestSchema.index({ requester: 1, createdAt: -1 });
requestSchema.index({ city: 1, bloodGroup: 1, targetType: 1, status: 1 });
export default mongoose.model('BloodRequest', requestSchema);
